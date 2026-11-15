/**
 * Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz
 * a las de la API con el contrato vocabulario.json (copia de packages/schemas; la guarda un test de Python).
 * Offline primero: nada aquí lanza por falta de red; devuelve false y el dato sigue en el almacén local.
 */
import type { Alerta } from "../../../packages/engine/engine.ts"
import vocabulario from "./vocabulario.json" with { type: "json" }
import type { ContenidoReporte, ReporteServidor } from "./cola"
import { MOTOR } from "./strings.ts"
import type { CheckInEntry, IndicatorId, Layer, ProfileId, Report, Status, Symptom } from "./types"

// Por defecto, el proxy del mismo origen (next.config.mjs); NEXT_PUBLIC_VIGIA_API_URL lo salta con una URL directa.
export const API_BASE_URL = process.env.NEXT_PUBLIC_VIGIA_API_URL || "/vigia-api"

type Lectura = { indicador: string; valor: number; t_real: string; origen: "manual" | "sensor"; metodo: string | null }
type Sintoma = { codigo: string; gravedad: number; t_real: string }

export interface LecturaServidor {
  id: number
  tripulante_id: number
  indicador: string
  valor: number
  t_real: string
  t_mision: string | null
  origen: "manual" | "sensor" | "simulado"
  metodo: string | null
  naturaleza: "Real" | "Simulado"
}

export interface SintomaServidor {
  id: number
  tripulante_id: number
  t_real: string
  t_mision: string | null
  codigo: string
  gravedad: number
}

export type OrigenLineaBase = "tierra" | "vuelo"

export interface LineaBaseServidor {
  tripulante_id?: number
  indicador?: string
  origen?: OrigenLineaBase
  mediana: number
  mad: number
  n: number
  desde: string
  hasta: string
}

export interface AlertaInServidor {
  indicador: string
  capa: "A" | "B" | "C" | "contexto"
  nivel: "verde" | "ambar" | "rojo"
  valor: number
  t_real: string
  explicacion: string
  regla_version: string
  tramo?: string | null
}

export interface AlertaServidor extends AlertaInServidor {
  id?: number
  alerta_id?: number
  escalamiento_id?: number
  tripulante_id: number
  t_mision?: string | null
}

export interface EscalamientoServidor {
  id: number
  alerta_id: number
  tripulante_id: number
  destinatario_id: number
  enviado_t_real: string
  contenido: { indicador: string; valor: number; t_real: string; tramo: string | null }
  contexto_astronauta: string | null
}

const IDS: Record<string, string> = Object.fromEntries(
  vocabulario.indicadores.filter((i) => i.ui).map((i) => [i.ui as string, i.id]),
)
const SINTOMA_UI: Record<string, Symptom> = Object.fromEntries(
  Object.entries(vocabulario.sintomas).map(([ui, api]) => [api, ui as Symptom]),
)
const INDICADOR_MOTOR: Record<string, string> = {
  fc: "frecuencia_cardiaca_reposo",
  pas: "presion_arterial_sistolica",
  sueno: "sueno",
  animo: "estado_animo",
  conductual: "sueno",
  news2: "frecuencia_cardiaca_reposo",
  co2: "spo2",
}

export const indicadorApi = (id: IndicatorId): string => IDS[id]
export const indicadorMotorApi = (ind: string): string => INDICADOR_MOTOR[ind] ?? IDS[ind] ?? ind
export const nivelApi = (s: Status): string => vocabulario.niveles[s]
export const capaApi = (c: Layer): string => vocabulario.capas[c]
export const perfilApi = (p: ProfileId): string => vocabulario.perfiles[p]
export const retardoMin = (p: ProfileId): number => vocabulario.retardo_min[p]

/** `t_real` canónico de la API: UTC sin milisegundos (YYYY-MM-DDTHH:MM:SSZ). */
export const tReal = (iso: string): string => new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z")

/** Convierte un día de misión (1 = 2026-11-14 en la misión demo) en un `t_real` UTC canónico. */
export const tRealDeDia = (dia: number, hora = "06:30:00"): string => {
  const base = Date.UTC(2026, 10, 14 + (dia - 1))
  const fecha = new Date(base).toISOString().slice(0, 10)
  return `${fecha}T${hora}Z`
}

/** Extrae el día de misión de `D022T08:00:00` o devuelve null. */
export const diaDeTMision = (tMision: string | null | undefined): number | null => {
  const m = tMision ? /^D(\d{3})T/.exec(tMision) : null
  return m ? Number(m[1]) : null
}

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
    valor === null ? [] : [{ indicador, valor, t_real: t, origen, metodo }],
  )
}

/** La interfaz no pide gravedad: se envía 1 (leve). */
export const sintomasDeCheckIn = (e: CheckInEntry): Sintoma[] =>
  e.symptoms.map((s) => ({ codigo: vocabulario.sintomas[s], gravedad: 1, t_real: tReal(e.createdAt) }))

async function enviar(ruta: string, tripulante: number, cuerpo: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}${ruta}`, {
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
    ...lecturasDeCheckIn(e).map((l) => enviar(`/tripulantes/${tripulante}/lecturas`, tripulante, l)),
    ...sintomasDeCheckIn(e).map((s) => enviar(`/tripulantes/${tripulante}/sintomas`, tripulante, s)),
  ]
  return (await Promise.all(envios)).every(Boolean)
}

/** Encola un reporte con el retardo del perfil (o `retardo` si se acorta, como en la demo); devuelve su id o null. */
export async function encolarReporte(perfil: ProfileId, creado: string, tripulante: number, retardo = retardoMin(perfil), contenido?: ContenidoReporte): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/reportes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify({ creado_t_real: tReal(creado), retardo_min: retardo, contenido }),
    })
    return res.ok ? ((await res.json()) as { id: number }).id : null
  } catch {
    return null
  }
}

/** Reportes propios con su estado en la cola; lista vacía si no hay red. */
export async function listarReportes(tripulante: number): Promise<ReporteServidor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/reportes`, { headers: { "X-Tripulante": String(tripulante) } })
    return res.ok ? ((await res.json()) as ReporteServidor[]) : []
  } catch {
    return []
  }
}

/** Un reporte de la API en el modelo de la interfaz. Sin `contenido` (encolado por otra vía) muestra solo el estado. */
export function reporteDeServidor(s: ReporteServidor): Report {
  const c = s.contenido
  return {
    id: String(s.id), serverId: s.id, createdAt: Date.parse(s.creado_t_real), delayMinutes: s.retardo_min,
    title: c?.titulo ?? `#${s.id}`, summary: c?.resumen ?? "", reading: c?.lectura ?? "", baseline: c?.linea_base ?? "",
    environment: c?.entorno ?? "", actionTaken: c?.accion ?? "",
  }
}

/** Avanza el reloj de la cola en la API para entregar los reportes con `llega_t_real <= ahora`. */
export async function avanzarCola(ahoraIso: string, actor = 1): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/reportes/avanzar`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(actor) },
      body: JSON.stringify({ ahora: tReal(ahoraIso) }),
    })
    return res.ok ? ((await res.json()) as { entregados: number }).entregados : null
  } catch {
    return null
  }
}

/** Guarda la respuesta del Cirujano de Vuelo sobre un reporte ya entregado. */
export async function responderReporte(reporteId: number, respuesta: string, tRealIso: string, actor = 2): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/reportes/${reporteId}/respuesta`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(actor) },
      body: JSON.stringify({ respuesta, t_real: tReal(tRealIso) }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Lista las lecturas del tripulante guardadas en SQLite (`GET /tripulantes/{id}/lecturas`). */
export async function listarLecturas(
  tripulante: number,
  filtros: { indicador?: string; desde?: string; hasta?: string } = {},
): Promise<LecturaServidor[]> {
  try {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString()
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/lecturas${qs ? `?${qs}` : ""}`, {
      headers: { "X-Tripulante": String(tripulante) },
      cache: "no-store",
    })
    return res.ok ? ((await res.json()) as LecturaServidor[]) : []
  } catch {
    return []
  }
}

/** Lista los síntomas del tripulante guardados en SQLite (`GET /tripulantes/{id}/sintomas`). */
export async function listarSintomas(
  tripulante: number,
  filtros: { desde?: string; hasta?: string } = {},
): Promise<SintomaServidor[]> {
  try {
    const qs = new URLSearchParams(
      Object.entries(filtros).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString()
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/sintomas${qs ? `?${qs}` : ""}`, {
      headers: { "X-Tripulante": String(tripulante) },
      cache: "no-store",
    })
    return res.ok ? ((await res.json()) as SintomaServidor[]) : []
  } catch {
    return []
  }
}

/** Reconstruye entradas de registro a partir de las filas de `lectura` y `sintoma` devueltas por la API. */
export function checkInsDeServidor(
  lecturas: LecturaServidor[],
  sintomas: SintomaServidor[],
  diaDefecto = 24,
): CheckInEntry[] {
  const porTiempo = new Map<string, CheckInEntry>()
  const obtener = (t_real: string, t_mision: string | null): CheckInEntry => {
    let reg = porTiempo.get(t_real)
    if (!reg) {
      reg = {
        id: `srv-${t_real}`,
        day: diaDeTMision(t_mision) ?? diaDefecto,
        createdAt: t_real,
        durationSec: 45,
        restingHr: null,
        hrFromWatch: false,
        hrInstrument: "manual",
        systolic: null,
        diastolic: null,
        spo2: null,
        spo2Site: "Dedo",
        spo2FromWatch: false,
        tempC: null,
        tempMethod: "",
        sleepH: null,
        mood: 7,
        symptoms: [],
        glucose: null,
        glucoseEnzyme: "",
        massKg: null,
        massMethod: "",
        status: "ok",
      }
      porTiempo.set(t_real, reg)
    }
    return reg
  }
  for (const l of lecturas) {
    const reg = obtener(l.t_real, l.t_mision)
    if (l.indicador === "frecuencia_cardiaca_reposo") {
      reg.restingHr = l.valor
      reg.hrFromWatch = l.origen === "sensor"
      reg.hrInstrument = l.metodo ?? (l.origen === "sensor" ? "galaxy_watch4" : "manual")
    } else if (l.indicador === "presion_arterial_sistolica") reg.systolic = l.valor
    else if (l.indicador === "presion_arterial_diastolica") reg.diastolic = l.valor
    else if (l.indicador === "spo2") {
      reg.spo2 = l.valor
      reg.spo2FromWatch = l.origen === "sensor"
      reg.spo2Site = l.metodo ?? (l.origen === "sensor" ? "Muñeca (reloj)" : "Dedo")
    } else if (l.indicador === "temperatura_central") {
      reg.tempC = l.valor
      reg.tempMethod = l.metodo ?? ""
    } else if (l.indicador === "sueno") reg.sleepH = l.valor
    else if (l.indicador === "estado_animo") reg.mood = l.valor
    else if (l.indicador === "glucosa") {
      reg.glucose = l.valor
      reg.glucoseEnzyme = l.metodo ?? ""
    } else if (l.indicador === "masa_corporal") {
      reg.massKg = l.valor
      reg.massMethod = l.metodo ?? ""
    }
  }
  for (const s of sintomas) {
    const ui = SINTOMA_UI[s.codigo]
    if (!ui) continue
    const reg = obtener(s.t_real, s.t_mision)
    if (!reg.symptoms.includes(ui)) reg.symptoms.push(ui)
  }
  return [...porTiempo.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** Guarda la línea base (`tierra` o `vuelo`) de un indicador en SQLite (`PUT /tripulantes/{id}/linea-base/...`). */
export async function guardarLineaBase(
  tripulante: number,
  indicador: IndicatorId | string,
  origen: OrigenLineaBase,
  datos: LineaBaseServidor,
): Promise<boolean> {
  const ind = IDS[indicador] ?? indicador
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/linea-base/${ind}/${origen}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify({
        mediana: datos.mediana,
        mad: datos.mad,
        n: datos.n,
        desde: tReal(datos.desde),
        hasta: tReal(datos.hasta),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Lee la línea base (`tierra` o `vuelo`) de un indicador desde SQLite (`GET /tripulantes/{id}/linea-base/...`). */
export async function leerLineaBase(
  tripulante: number,
  indicador: IndicatorId | string,
  origen: OrigenLineaBase,
): Promise<LineaBaseServidor | null> {
  const ind = IDS[indicador] ?? indicador
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/linea-base/${ind}/${origen}`, {
      headers: { "X-Tripulante": String(tripulante) },
      cache: "no-store",
    })
    return res.ok ? ((await res.json()) as LineaBaseServidor) : null
  } catch {
    return null
  }
}

/** Traduce una alerta calculada por el motor (`packages/engine`) al contrato `AlertaIn` de `POST /tripulantes/{id}/alertas`. */
export function alertaInDeMotor(a: Alerta): AlertaInServidor {
  const capaUi = a.capa === "contexto" ? "context" : a.capa
  const nombreInd = MOTOR.indicador[a.indicador as keyof typeof MOTOR.indicador] ?? a.indicador
  const banda = MOTOR.banda[capaUi]
  const causa = MOTOR.causa[capaUi]
  const accion = MOTOR.accion[a.indicador as keyof typeof MOTOR.accion] ?? ""
  return {
    indicador: indicadorMotorApi(a.indicador),
    capa: a.capa,
    nivel: a.nivel,
    valor: a.valor ?? 0,
    t_real: tRealDeDia(a.dia_mision),
    explicacion: `${causa} ${accion}`.trim(),
    regla_version: "1",
    tramo: `${nombreInd}: ${banda}`,
  }
}

/** Registra una alerta del motor en SQLite (`POST /tripulantes/{id}/alertas`). */
export async function crearAlerta(
  tripulante: number,
  cuerpo: AlertaInServidor,
): Promise<{ id: number; escalamiento_id: number | null } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/alertas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify(cuerpo),
    })
    return res.ok ? ((await res.json()) as { id: number; escalamiento_id: number | null }) : null
  } catch {
    return null
  }
}

/** Lista las alertas visibles de un tripulante (`GET /tripulantes/{id}/alertas`). */
export async function listarAlertas(tripulante: number, actor = tripulante): Promise<AlertaServidor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/alertas`, {
      headers: { "X-Tripulante": String(actor) },
      cache: "no-store",
    })
    return res.ok ? ((await res.json()) as AlertaServidor[]) : []
  } catch {
    return []
  }
}

/** Lista los escalamientos recibidos por el actor (`GET /escalamientos`). */
export async function listarEscalamientosRecibidos(actor = 2): Promise<EscalamientoServidor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/escalamientos`, {
      headers: { "X-Tripulante": String(actor) },
      cache: "no-store",
    })
    return res.ok ? ((await res.json()) as EscalamientoServidor[]) : []
  } catch {
    return []
  }
}

/** Lista los escalamientos enviados sobre el propio tripulante (`GET /tripulantes/{id}/escalamientos`). */
export async function listarEscalamientosPropios(tripulante: number): Promise<EscalamientoServidor[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/tripulantes/${tripulante}/escalamientos`, {
      headers: { "X-Tripulante": String(tripulante) },
      cache: "no-store",
    })
    return res.ok ? ((await res.json()) as EscalamientoServidor[]) : []
  } catch {
    return []
  }
}

/** Añade contexto una sola vez a un escalamiento propio (`POST /escalamientos/{id}/contexto`). */
export async function agregarContextoEscalamiento(
  escalamientoId: number,
  texto: string,
  tripulante: number,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/escalamientos/${escalamientoId}/contexto`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify({ texto }),
    })
    return res.ok
  } catch {
    return false
  }
}
