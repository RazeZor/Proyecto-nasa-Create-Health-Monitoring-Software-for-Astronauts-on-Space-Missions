import { peticion, esDemoPublica } from "./sesion.ts"
/**
 * Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz
 * a las de la API con el contrato vocabulario.json (copia de packages/schemas; la guarda un test de Python).
 * Offline primero: nada aquí lanza por falta de red; devuelve false y el dato sigue en el almacén local.
 */
import vocabulario from "./vocabulario.json" with { type: "json" }
import { IDIOMA } from "./strings.ts"
import type { AvisoRojo } from "./alertas-sync.ts"
import type { ContenidoReporte, ReporteServidor } from "./cola.ts"
import type { CheckInEntry, IndicatorId, Layer, ProfileId, Report, Status } from "./types.ts"

// Por defecto, el proxy del mismo origen (next.config.mjs); NEXT_PUBLIC_VIGIA_API_URL lo salta con una URL directa.
export const API_BASE_URL = process.env.NEXT_PUBLIC_VIGIA_API_URL || "/vigia-api"

type Lectura = { indicador: string; valor: number; t_real: string; origen: "manual" | "sensor"; metodo: string | null; naturaleza: "Real" }
type Sintoma = { codigo: string; gravedad: number; t_real: string; operacion_id: string }

const IDS: Record<string, string> = Object.fromEntries(
  vocabulario.indicadores.filter((i) => i.ui).map((i) => [i.ui as string, i.id]),
)
export const indicadorApi = (id: IndicatorId): string => IDS[id]
export const nivelApi = (s: Status): string => vocabulario.niveles[s]
export const capaApi = (c: Layer): string => vocabulario.capas[c]
export const perfilApi = (p: ProfileId): string => vocabulario.perfiles[p]
export const retardoMin = (p: ProfileId): number => vocabulario.retardo_min[p]
/** Retardo con el que se encola un informe: el del perfil en modo real; en demo se acorta a 1 min para ver la cola avanzar. */
export const retardoEnvio = (modo: "real" | "demo", p: ProfileId): number => (modo === "demo" ? Math.min(retardoMin(p), 1) : retardoMin(p))

/** `t_real` canónico de la API: UTC sin milisegundos (YYYY-MM-DDTHH:MM:SSZ). */
export const tReal = (iso: string): string => new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z")

/** Una lectura por cada medida con valor; la diastólica no es un `IndicatorId` y va aparte. */
export function lecturasDeCheckIn(e: CheckInEntry): Lectura[] {
  const t = tReal(e.createdAt)
  const medidas: [string, number | null, string | null, "manual" | "sensor"][] = [
    [IDS.restingHr, e.restingHr, e.hrInstrument ?? null, e.hrFromWatch ? "sensor" : "manual"],
    [IDS.systolic, e.systolic, null, "manual"],
    ["presion_arterial_diastolica", e.diastolic, null, "manual"],
    [IDS.spo2, e.spo2, e.spo2FromWatch ? "galaxy_watch4" : e.spo2Site || null, e.spo2FromWatch ? "sensor" : "manual"],
    [IDS.tempC, e.tempC, e.tempMethod || null, "manual"],
    [IDS.sleepH, e.sleepH, null, "manual"],
    [IDS.mood, e.mood, null, "manual"],
    [IDS.glucose, e.glucose, e.glucoseEnzyme || null, "manual"],
    [IDS.massKg, e.massKg, e.massMethod || null, "manual"],
  ]
  return medidas.flatMap(([indicador, valor, metodo, origen]) =>
    // solo se suben registros del modo real: lo que el tripulante midió de verdad
    valor === null ? [] : [{ indicador, valor, t_real: t, origen, metodo, naturaleza: "Real" as const }],
  )
}

const UNIDADES: Record<string, string> = {
  frecuencia_cardiaca_reposo: "lpm", presion_arterial_sistolica: "mmHg", presion_arterial_diastolica: "mmHg",
  spo2: "%", temperatura_central: "°C", sueno: "h", estado_animo: "puntos", glucosa: "mg/dL", masa_corporal: "kg",
}

/** La hora de envío nunca sustituye la hora desconocida de una toma. */
export function observacionesDeCheckIn(e: CheckInEntry) {
  const inverso = Object.fromEntries(Object.entries(IDS).map(([ui, id]) => [id, ui]))
  return lecturasDeCheckIn(e).map(({ naturaleza: _naturaleza, ...l }) => {
    const ui = (inverso[l.indicador] ?? "diastolic") as IndicatorId | "diastolic"
    const hora = e.tiemposMedicion?.[ui]
    return {
      ...l, id: `${e.id}:${l.indicador}`, operacion_id: `${e.id}:${l.indicador}`, unidad: UNIDADES[l.indicador],
      t_real: hora ? tReal(hora) : null, precision_tiempo: hora ? "declarada" as const : "desconocida" as const,
      uso: "operativo" as const, instrumento: l.metodo, sitio: ui === "spo2" ? e.spo2Site || null : null,
      comparable: l.origen === "manual", configuracion_version: "captura-v1", corrige_id: null,
    }
  })
}

/** La interfaz no pide gravedad: se envía 1 (leve). */
export const sintomasDeCheckIn = (e: CheckInEntry): Sintoma[] =>
  e.symptoms.map((s) => ({ codigo: vocabulario.sintomas[s], gravedad: 1, t_real: tReal(e.createdAt), operacion_id: `${e.id}:${s}` }))

async function enviar(ruta: string, tripulante: number, cuerpo: unknown): Promise<boolean> {
  try {
    const res = await peticion(`${API_BASE_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify(cuerpo),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Envía el registro del día; true solo si todo llegó. Reenviarlo es seguro: la API ignora lecturas repetidas. */
export async function enviarCheckIn(e: CheckInEntry, tripulante: number): Promise<boolean> {
  const envios = [
    ...observacionesDeCheckIn(e).map(async (l) => {
      try {
        const res = await peticion(`${API_BASE_URL}/tripulantes/${tripulante}/observaciones`, {
          method: "POST", headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) }, body: JSON.stringify(esDemoPublica() ? { ...l, uso: "escenario" } : l),
        })
        if (!res.ok) return false
        const acuse = await res.json() as { id?: unknown; recibido_t_real?: unknown }
        return acuse.id === l.id && typeof acuse.recibido_t_real === "string"
      } catch { return false }
    }),
    ...sintomasDeCheckIn(e).map((s) => enviar(`/tripulantes/${tripulante}/sintomas`, tripulante, s)),
  ]
  return (await Promise.all(envios)).every(Boolean)
}

/** Encola un reporte con el retardo del perfil (o `retardo` si se acorta, como en la demo); devuelve su id o null. */
export type AcuseReporte = { id: number } | { error: "conflicto" | "reintentar" }

export async function enviarReporte(perfil: ProfileId, creado: string, tripulante: number, retardo = retardoMin(perfil), contenido?: ContenidoReporte, operacionId?: string): Promise<AcuseReporte> {
  try {
    const res = await peticion(`${API_BASE_URL}/tripulantes/${tripulante}/reportes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify({ creado_t_real: tReal(creado), retardo_min: retardo, contenido, operacion_id: operacionId }),
    })
    if (res.status === 409) return { error: "conflicto" }
    if (!res.ok) return { error: "reintentar" }
    const acuse = await res.json() as { id?: unknown }
    return typeof acuse.id === "number" && Number.isSafeInteger(acuse.id) && acuse.id > 0 ? { id: acuse.id } : { error: "reintentar" }
  } catch {
    return { error: "reintentar" }
  }
}

export async function encolarReporte(perfil: ProfileId, creado: string, tripulante: number, retardo = retardoMin(perfil), contenido?: ContenidoReporte): Promise<number | null> {
  const acuse = await enviarReporte(perfil, creado, tripulante, retardo, contenido)
  return "id" in acuse ? acuse.id : null
}

/** Reportes propios con su estado en la cola; `null` si no hay red o la API falla (nunca se finge una cola vacía). */
export async function listarReportes(tripulante: number): Promise<ReporteServidor[] | null> {
  try {
    const res = await peticion(`${API_BASE_URL}/tripulantes/${tripulante}/reportes?lang=${IDIOMA}`, { headers: { "X-Tripulante": String(tripulante) } })
    return res.ok ? ((await res.json()) as ReporteServidor[]) : null
  } catch {
    return null
  }
}

export async function listarReportesRecibidos(): Promise<ReporteServidor[] | null> {
  try { const res = await peticion(`${API_BASE_URL}/reportes/recibidos`, { cache: "no-store" }); return res.ok ? await res.json() as ReporteServidor[] : null }
  catch { return null }
}

/** El médico de vuelo responde un reporte ya entregado. shortcut: la API acepta a cualquier tripulante conocido. */
export const responderReporte = (reporteId: number, respuesta: string, actor: number) =>
  enviar(`/reportes/${reporteId}/respuesta`, actor, { respuesta, t_real: tReal(new Date().toISOString()) })

/** Un reporte de la API en el modelo de la interfaz. Sin `contenido` (encolado por otra vía) muestra solo el estado. */
export function reporteDeServidor(s: ReporteServidor): Report {
  const c = s.contenido
  return {
    id: String(s.id), serverId: s.id, createdAt: Date.parse(s.creado_t_real), delayMinutes: s.retardo_min,
    title: c?.titulo ?? `#${s.id}`, summary: c?.resumen ?? "", reading: c?.lectura ?? "", plainReading: c?.lectura_humana ?? "",
    baseline: c?.linea_base ?? "", environment: c?.entorno ?? "", actionTaken: c?.accion ?? "",
    ...(c?.accion_hecha ? { actionDone: c.accion_hecha } : {}), ...(c?.accion_nota ? { actionNote: c.accion_nota } : {}),
  }
}

/** Un escalamiento tal como lo guarda la API: el dato mínimo que salió y, si lo hay, el contexto del afectado. */
export interface Escalamiento {
  id: number
  alerta_id: number
  tripulante_id: number
  destinatario_id: number
  enviado_t_real: string
  contenido: { indicador: string; valor: number; t_real: string; tramo: string | null }
  contexto_astronauta: string | null
}

/** Registra un rojo de capa A; la API lo escala al oficial médico. Devuelve el id del escalamiento, null si la API
 *  lo guardó sin escalar (sin destinatario o sin consentimiento) o `undefined` si no respondió. */
export async function enviarAlertaRoja(a: AvisoRojo, tripulante: number, explicacion: string): Promise<number | null | undefined> {
  try {
    const res = await peticion(`${API_BASE_URL}/tripulantes/${tripulante}/alertas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify({ indicador: a.indicador, capa: "A", nivel: "rojo", valor: a.valor, t_real: tReal(a.t_real), tramo: a.tramo, explicacion, regla_version: "news2-2017" }),
    })
    if (!res.ok) return undefined
    return ((await res.json()) as { escalamiento_id: number | null }).escalamiento_id
  } catch {
    return undefined
  }
}

async function leer<T>(ruta: string, actor: number): Promise<T | null> {
  try {
    const res = await peticion(`${API_BASE_URL}${ruta}`, { headers: { "X-Tripulante": String(actor) }, cache: "no-store" })
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

/** Transparencia (§5.4): lo que salió sobre el tripulante, a quién y con qué contenido. */
export const escalamientosPropios = (tripulante: number) => leer<Escalamiento[]>(`/tripulantes/${tripulante}/escalamientos`, tripulante)
/** Bandeja del oficial médico (o del comandante de respaldo). */
export const escalamientosRecibidos = (actor: number) => leer<Escalamiento[]>("/escalamientos", actor)
export const leerTripulacion = (actor: number) => leer<{ id: number; alias: string; rol: string }[]>("/tripulacion", actor)

/** El afectado añade contexto una sola vez; no puede cancelar el aviso. */
export const agregarContexto = (escalamientoId: number, texto: string, tripulante: number) =>
  enviar(`/escalamientos/${escalamientoId}/contexto`, tripulante, { texto })
