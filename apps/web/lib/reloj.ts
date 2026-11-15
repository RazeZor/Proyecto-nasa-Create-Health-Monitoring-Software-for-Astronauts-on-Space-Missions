/**
 * Reloj en vivo (Galaxy Watch4) a través de apps/api: la app no habla con el servidor del reloj, solo con
 * la API (`GET /tripulantes/{id}/reloj` y `POST .../reloj/ordenes`, ver apps/api/puente_reloj.py).
 * El núcleo (`siguienteEstado`) es puro para poder probarlo sin red.
 */
import { API_BASE_URL } from "./api-registro.ts"
import type { DeviceState } from "./types.ts"

/** Una lectura deja de contar como "en vivo" pasado este tiempo sin otra (anexo A.5). */
export const VIGENCIA_LECTURA_MS = 10_000
/** Tiempo que se espera la primera lectura tras pulsar "Conectar" antes de dar la conexión por perdida. */
export const ESPERA_CONEXION_MS = 15_000
export const INTERVALO_SONDEO_MS = 1_500

export interface ChequeoReloj {
  t: string
  fc_reposo_lpm: number | null
  rmssd_ms: number | null
  spo2_pct: number | null
  valido: boolean
  motivo: string | null
  segundos_medidos?: number
}

export interface DatosReloj {
  nombre: string
  conectado: boolean
  dispositivos: string[]
  modelo: string | null
  sdk: boolean | null
  fc_lpm: number | null
  ultima_lectura: { t: string; fc_lpm: number | null; en_muneca?: boolean; calidad?: string } | null
  serie: { t: string; fc_lpm: number | null }[]
  resumen: {
    rmssd_ms?: number | null
    spo2?: { valor: number; t: string } | null
    fc_reposo_dia?: { valor: number; fuente: "chequeo" | "sueno" | "continua"; t: string } | null
    sueno?: { inicio: string; fin: string; minutos: number; fc_reposo: number | null; experimental: boolean } | null
  } | null
  chequeos: ChequeoReloj[]
  chequeo_estado: string | null
  chequeo_progreso: { quietos: number; ventana: number; transcurridos: number; maximo: number } | null
  avisos: { t: string; tipo: string; detalle: string | null; codigo?: string }[]
  notas: { t: string; tipo: string; detalle: string | null }[]
  /** Segundos desde que la API recibió la última lectura (reloj del servidor): la vigencia no depende de la hora del reloj. */
  recibido_hace_s?: number | null
}

export interface MiembroReloj {
  nombre: string
  conectado: boolean
  relojes_conectados: number
  ultima_lectura: string | null
  /** true = chequeo válido hoy; false = solo fallidos; null = sin chequeo */
  chequeo_hoy: boolean | null
  /** Nombre de fábrica («Tripulante XXXX»): no se puede vincular hasta cambiarlo en el reloj. */
  nombre_por_defecto?: boolean
  vinculado?: boolean
  tripulante_id?: number | null
}

export type PresetTolerancia = "estricta" | "normal" | "flexible" | "personalizada"
export interface Tolerancia {
  preset: PresetTolerancia
  mov_quieto?: number
  mov_inquieto?: number
  mov_sacudida?: number
  max_inquietos_pct?: number
}
export interface ConfigReloj {
  tolerancia: Tolerancia | null
  presets: Record<string, Omit<Tolerancia, "preset">> | null
}

export interface RespuestaReloj {
  puente: {
    configurado: boolean
    conectado: boolean
    ultima_vez: string | null
    error: string | null
    desactivado?: boolean
    url_live?: string | null
    ip_lan?: string | null
    /** Lo que hay que escribir en el campo Servidor de la app del reloj. */
    url_reloj_sugerida?: string | null
    avisos?: { t: string; tipo: string; detalle: string | null }[]
  }
  vinculado: boolean
  /** Nombres de reloj que la API asocia a este tripulante (alias y vínculos). */
  nombres?: string[]
  reloj: DatosReloj | null
}

export type OrdenReloj = "medir_spo2" | "iniciar_chequeo"

/** La última lectura con pulso es reciente y el reloj sigue conectado al servidor. */
export function lecturaVigente(r: RespuestaReloj | null, ahoraMs: number): boolean {
  const l = r?.reloj?.ultima_lectura
  if (!r?.puente.conectado || !r.reloj?.conectado || !l || l.fc_lpm == null) return false
  // preferimos la antigüedad medida por la API: un reloj con la hora desfasada no debe parecer «sin señal»
  const recibido = r.reloj.recibido_hace_s
  if (recibido != null) return recibido * 1000 <= VIGENCIA_LECTURA_MS
  return ahoraMs - Date.parse(l.t) <= VIGENCIA_LECTURA_MS
}

export type PasoConexionId = "api" | "server" | "watch" | "wrist"
export interface PasoConexion { id: PasoConexionId; ok: boolean }

/**
 * Diagnóstico de la conexión en cuatro pasos encadenados, para mostrar cuál falla y qué hacer:
 * la API responde → la API habla con smart-monitor → el reloj está vinculado y transmite → hay pulso reciente.
 */
export function pasosConexion(r: RespuestaReloj | null, ahoraMs: number): PasoConexion[] {
  const api = r !== null
  const server = api && r.puente.conectado
  const watch = server && r.vinculado && Boolean(r.reloj?.conectado)
  const wrist = watch && lecturaVigente(r, ahoraMs)
  return [{ id: "api", ok: api }, { id: "server", ok: server }, { id: "watch", ok: watch }, { id: "wrist", ok: wrist }]
}

/**
 * Estado del dispositivo a partir del sondeo. "disconnected" lo decide el usuario y no cambia aquí;
 * "connecting" pasa a "connected" con la primera lectura vigente o a "lost" si no llega a tiempo;
 * "connected" pasa a "lost" si dejan de llegar lecturas, y "lost" se recupera solo.
 */
export function siguienteEstado(actual: DeviceState, r: RespuestaReloj | null, ahoraMs: number, desdeMs: number): DeviceState {
  if (actual === "disconnected") return actual
  if (lecturaVigente(r, ahoraMs)) return "connected"
  if (actual === "connecting") return ahoraMs - desdeMs > ESPERA_CONEXION_MS ? "lost" : "connecting"
  return "lost"
}

/** Un corte de la curva cuando pasan más de 3 s entre lecturas o falta el pulso (como el panel de smart-monitor). */
export const HUECO_MS = 3_000

/** Tramos continuos de la serie de FC, para dibujarlos sin unir los huecos. */
export function tramosSerie(serie: { t: string; fc_lpm: number | null }[]): { ms: number; fc: number }[][] {
  const tramos: { ms: number; fc: number }[][] = []
  let actual: { ms: number; fc: number }[] = []
  const puntos = serie.map((p) => ({ ms: Date.parse(p.t), fc: p.fc_lpm })).filter((p) => !Number.isNaN(p.ms)).sort((a, b) => a.ms - b.ms)
  for (const p of puntos) {
    const previo = actual.at(-1)
    if (p.fc == null || (previo && p.ms - previo.ms > HUECO_MS)) {
      if (actual.length) tramos.push(actual)
      actual = []
    }
    if (p.fc != null) actual.push({ ms: p.ms, fc: p.fc })
  }
  if (actual.length) tramos.push(actual)
  return tramos
}

/** FC en reposo del día que sugiere el reloj para el registro diario (A.6: nunca una lectura instantánea). */
export function fcReposoSugerida(r: RespuestaReloj | null): { valor: number; fuente: "chequeo" | "sueno" | "continua" } | null {
  const dia = r?.reloj?.resumen?.fc_reposo_dia
  return dia && Number.isFinite(dia.valor) ? { valor: Math.round(dia.valor), fuente: dia.fuente } : null
}

/** La SpO2 del reloj sirve para el registro mientras tenga menos de esto (la del chequeo de la mañana vale el día). */
export const VIGENCIA_SPO2_MS = 12 * 3600_000

/** Última SpO2 del reloj (chequeo o medición a demanda), si es reciente. Se mide en la muñeca. */
export function spo2Sugerida(r: RespuestaReloj | null, ahoraMs: number): number | null {
  const s = r?.reloj?.resumen?.spo2
  if (!s || !Number.isFinite(s.valor)) return null
  const edad = ahoraMs - Date.parse(s.t)
  return edad >= 0 && edad <= VIGENCIA_SPO2_MS ? Math.round(s.valor) : null
}

/** Horas de sueño estimadas por el reloj (experimental), con un decimal. */
export function suenoSugerido(r: RespuestaReloj | null): number | null {
  const m = r?.reloj?.resumen?.sueno?.minutos
  return m != null && m > 0 ? Math.round((m / 60) * 10) / 10 : null
}

/** La nota de cambio de instrumento más reciente (A.6: la línea base de la FC deja de ser comparable). */
export function ultimoCambioInstrumento(r: RespuestaReloj | null): { t: string; detalle: string | null } | null {
  return r?.reloj?.notas?.filter((n) => n.tipo === "cambio_instrumento").at(-1) ?? null
}

const cabeceras = (tripulante: number) => ({ "X-Tripulante": String(tripulante) })

/** null si la API no responde (sin red): quien llama lo trata como "sin datos", no como error fatal. */
export async function leerReloj(tripulante: number): Promise<RespuestaReloj | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/reloj`, { headers: cabeceras(tripulante), cache: "no-store" })
    return res.ok ? ((await res.json()) as RespuestaReloj) : null
  } catch {
    return null
  }
}

export async function enviarOrdenReloj(tripulante: number, tipo: OrdenReloj): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/reloj/ordenes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cabeceras(tripulante) },
      body: JSON.stringify({ tipo }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function pedirJson<T>(ruta: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${ruta}`, { cache: "no-store", ...init })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

export const leerTripulacionReloj = (actor: number) =>
  pedirJson<MiembroReloj[]>("/reloj/tripulacion", { headers: cabeceras(actor) })

export const leerConfigReloj = () => pedirJson<ConfigReloj>("/reloj/config")

/** «Este es mi reloj»: asocia el nombre configurado en el reloj con el tripulante. Devuelve el motivo si la API lo rechaza. */
export async function vincularReloj(tripulante: number, nombre: string): Promise<{ ok: true } | { ok: false; motivo: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/reloj/vinculo`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...cabeceras(tripulante) },
      body: JSON.stringify({ nombre }),
    })
    if (res.ok) return { ok: true }
    const cuerpo = (await res.json().catch(() => null)) as { detail?: unknown } | null
    return { ok: false, motivo: typeof cuerpo?.detail === "string" ? cuerpo.detail : String(res.status) }
  } catch {
    return { ok: false, motivo: "offline" }
  }
}

export async function cambiarTolerancia(actor: number, tolerancia: Tolerancia): Promise<boolean> {
  const r = await pedirJson("/reloj/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...cabeceras(actor) },
    body: JSON.stringify(tolerancia),
  })
  return r !== null
}

/** Descarga el CSV del reloj (la ruta pide X-Tripulante, así que no basta con un enlace). */
export async function descargarCsvReloj(tripulante: number, desde?: string): Promise<boolean> {
  try {
    const q = desde ? `?desde=${encodeURIComponent(desde)}` : ""
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/reloj/export.csv${q}`, { headers: cabeceras(tripulante) })
    if (!res.ok) return false
    const url = URL.createObjectURL(await res.blob())
    const a = Object.assign(document.createElement("a"), { href: url, download: `reloj-${tripulante}.csv` })
    a.click()
    URL.revokeObjectURL(url)
    return true
  } catch {
    return false
  }
}
