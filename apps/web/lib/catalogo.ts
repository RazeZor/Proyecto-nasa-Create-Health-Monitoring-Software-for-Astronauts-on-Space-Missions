/**
 * Todo lo que la app muestra y no escribe el usuario sale de la API: perfiles, fichas, referencia de
 * entorno, historial simulado, recordatorios y mensajes. Aquí solo se piden y se traducen al modelo de
 * la interfaz; los textos de presentación (zonas, prevención por defecto, límites de las gráficas) son
 * de la interfaz. Sin API no hay catálogo: `cargarCatalogo` devuelve null.
 */
import { API_BASE_URL } from "./api-registro.ts"
import type { Lectura } from "../../../packages/engine/engine.ts"
import { guardarCache, leerCache } from "./storage.ts"
import { IDIOMA, S } from "./strings.ts"
import type { IndicatorId, IndicatorInfo, MissionProfile, Mode, ProfileId, Provenance, ThreadMessage, ZoneId } from "./types.ts"

export type FichaJson = {
  id: string
  nombre: string
  que_es: string
  unidad: string | null
  como_se_mide_en_vuelo: { estacion: string; transito: string; superficie: string }
  por_que: string
  peligro: string[]
  referencia_en_vuelo: string | null
  cuando_avisar: string
  prevencion: string | null
  fuentes: { titulo: string; url: string | null }[]
}

type PerfilApi = { id: string; nombre: string; presion_cabina_mmHg: number; retardo_demo_min: number; gravedad_etiqueta: string }

export interface LecturaHistorial extends Lectura {
  pad_mmHg?: number | null
  glucosa_mg_dl?: number | null
  masa_kg?: number | null
  /** Instrumento de la FC en reposo (modo real): "manual" o "galaxy_watch4:<dispositivo>". */
  fc_instrumento?: string | null
  /** Hora real de la última medida del día (modo real). */
  t_real?: string | null
}
/** De dónde sale un dato ambiental: medición real reanclada (con su fecha real) o escenario simulado. */
export interface OrigenDato { naturaleza: "Real" | "Simulado"; fuente: string; fecha_real: string | null }
export interface EventoSep { sepID: string; t_real: string; link: string | null; fuente: string }
export interface EntornoHistorial {
  dia_mision: number
  /** CO2 real de cabina en ppm (EDA): se convierte a mmHg con la presión del perfil. */
  co2_ppm_max_horario?: number | null
  /** CO2 simulado, ya en mmHg. */
  co2_mmhg_max_horario?: number | null
  co2_origen?: OrigenDato | null
  flujo_protones_10mev_pfu?: number | null
  flujo_origen?: OrigenDato | null
  /** Eventos SEP reales de DONKI reanclados a ese día: activan el modo tormenta. */
  eventos_sep?: EventoSep[]
  modo_tormenta?: boolean
}
export interface Historial {
  modo?: Mode
  naturaleza: string
  dias_prevuelo: number
  dias_vuelo: number
  dia_actual: number
  /** Panel gold del que sale el entorno; null si el ETL aún no lo publicó. */
  escenario_entorno?: string | null
  aviso_entorno?: string | null
  entorno_diario: EntornoHistorial[]
  lecturas: LecturaHistorial[]
}
type FuenteApi = { id: string; nombre: string; origen: string; detalle: string; alimenta: string }
export interface ReferenciaEntorno {
  dosis_previa_carrera_msv: number
  limite_carrera_msv: number
  co2_limite_mmhg: number
  umbral_protones_pfu: number
  fuentes: FuenteApi[]
}
type MensajeApi = { id: string; de: "astronaut" | "surgeon"; autor: string; dia: number; hora: string; texto: string }

export interface Catalogo {
  perfiles: MissionProfile[]
  indicadores: Record<IndicatorId, IndicatorInfo>
  comoMedir: Record<IndicatorId, FichaJson["como_se_mide_en_vuelo"]>
  radiacion: IndicatorInfo
  historial: Historial
  recordatorios: string[]
  mensajes: ThreadMessage[]
  entorno: ReferenciaEntorno
  fuentes: { id: string; label: string; provenance: Provenance; feeds: string }[]
  /** true si se abrió con la copia local porque la API no respondió. */
  sinEnlace: boolean
}

// Claves de la API por perfil de la interfaz (la UI traduce en su borde).
const PERFIL_API: Record<ProfileId, string> = {
  station: "estacion", transit: "transito", "transit-docked": "transito_acoplado",
  lunar: "superficie_lunar", mars: "superficie_marciana",
}
const HRR = "https://www.nasa.gov/hrp/risks/"

// Presentación de cada indicador: ficha de origen, zona del cuerpo y límites de seguridad que dibujan las
// gráficas. La prevención por defecto (si la ficha no la trae) es un texto de la interfaz (strings.ts).
const PRESENTACION: Record<IndicatorId, { ficha: string; zona: ZoneId; safetyLow?: number; safetyHigh?: number }> = {
  restingHr: { ficha: "frecuencia_cardiaca_reposo", zona: "heart", safetyHigh: 100, safetyLow: 40 },
  systolic: { ficha: "presion_arterial_sistolica", zona: "heart", safetyHigh: 160, safetyLow: 85 },
  spo2: { ficha: "spo2", zona: "heart", safetyLow: 92 },
  tempC: { ficha: "temperatura_central", zona: "blood", safetyHigh: 38, safetyLow: 35.5 },
  sleepH: { ficha: "sueno", zona: "mind", safetyLow: 4 },
  mood: { ficha: "estado_animo", zona: "mind", safetyLow: 3 },
  glucose: { ficha: "glucosa", zona: "blood", safetyHigh: 126, safetyLow: 70 },
  massKg: { ficha: "masa_corporal", zona: "bone" },
}

function desdeFicha(id: IndicatorId, f: FichaJson, zona: ZoneId, prevencion: string, limites: { safetyLow?: number; safetyHigh?: number } = {}): IndicatorInfo {
  const fuente = f.fuentes.find((x) => x.url) ?? f.fuentes[0]
  return {
    id, label: f.nombre, unit: f.unidad ?? "", zone: zona, whatItIs: f.que_es,
    howToMeasure: f.como_se_mide_en_vuelo.transito,
    whyNeeded: f.referencia_en_vuelo ? `${f.por_que} ${f.referencia_en_vuelo}` : f.por_que,
    hazard: f.peligro.map((p) => S.catalog.hazards[p] ?? p).join(" · "),
    whenToNotify: f.cuando_avisar, prevention: f.prevencion ?? prevencion,
    sourceLabel: fuente?.titulo ?? "NASA HRP", sourceUrl: fuente?.url ?? HRR, ...limites,
  }
}

export function perfilesUi(api: Record<string, PerfilApi>): MissionProfile[] {
  return (Object.keys(PERFIL_API) as ProfileId[]).map((id) => {
    const p = api[PERFIL_API[id]]
    return {
      id, label: S.profiles[id] ?? p.nombre, cabinPressureMmHg: p.presion_cabina_mmHg as MissionProfile["cabinPressureMmHg"],
      delayMinutes: p.retardo_demo_min, gravity: S.gravity[p.gravedad_etiqueta] ?? p.gravedad_etiqueta,
    }
  })
}

export function indicadoresUi(fichas: FichaJson[]) {
  const porId = new Map(fichas.map((f) => [f.id, f]))
  const indicadores = {} as Record<IndicatorId, IndicatorInfo>
  const comoMedir = {} as Catalogo["comoMedir"]
  for (const [id, p] of Object.entries(PRESENTACION) as [IndicatorId, (typeof PRESENTACION)[IndicatorId]][]) {
    const f = porId.get(p.ficha)
    if (!f) throw new Error(`la API no trae la ficha ${p.ficha}`)
    indicadores[id] = desdeFicha(id, f, p.zona, S.catalog.prevention[id], { safetyLow: p.safetyLow, safetyHigh: p.safetyHigh })
    comoMedir[id] = f.como_se_mide_en_vuelo
  }
  const rad = porId.get("dosis_radiacion")
  if (!rad) throw new Error("la API no trae la ficha dosis_radiacion")
  const radiacion = desdeFicha("restingHr", rad, "blood", S.catalog.radiationPrevention)
  return { indicadores, comoMedir, radiacion: { ...radiacion, hazard: S.catalog.radiationHazard, howToMeasure: rad.como_se_mide_en_vuelo.transito } }
}

export function comoMedirEnPerfil(c: Catalogo, id: IndicatorId, perfil: ProfileId): string {
  const m = c.comoMedir[id]
  return perfil === "station" ? m.estacion : perfil === "transit" || perfil === "transit-docked" ? m.transito : m.superficie
}

export const mensajesUi = (api: MensajeApi[]): ThreadMessage[] =>
  api.map((m) => ({ id: m.id, from: m.de, author: m.autor, day: m.dia, time: m.hora, body: m.texto }))

export const fuentesUi = (api: FuenteApi[]): Catalogo["fuentes"] =>
  api.map((f) => ({ id: f.id, label: f.nombre, provenance: { kind: "real", source: f.origen, date: f.detalle }, feeds: f.alimenta }))

async function pedir<T>(ruta: string, tripulante?: number): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${ruta}`, {
    cache: "no-store", headers: tripulante ? { "X-Tripulante": String(tripulante) } : undefined,
  })
  if (!res.ok) throw new Error(`${ruta}: ${res.status}`)
  return (await res.json()) as T
}

type CatalogoCrudo = {
  perfiles: Record<string, PerfilApi>; fichas: FichaJson[]; entorno: ReferenciaEntorno; historial: Historial
  recordatorios: string[]; mensajes: MensajeApi[]
}

const armar = (c: CatalogoCrudo, sinEnlace: boolean): Catalogo => ({
  perfiles: perfilesUi(c.perfiles), ...indicadoresUi(c.fichas), historial: c.historial, recordatorios: c.recordatorios,
  mensajes: mensajesUi(c.mensajes), entorno: c.entorno, fuentes: fuentesUi(c.entorno.fuentes), sinEnlace,
})

/**
 * Pide todo el catálogo del modo y guarda una copia local. Si la API no responde, abre con la última copia
 * (`sinEnlace: true`): a bordo la red solo sincroniza. Null solo si nunca hubo enlace o falta algo.
 */
export async function cargarCatalogo(tripulante: number, modo: Mode = "real"): Promise<Catalogo | null> {
  const clave = `catalogo:${modo}:${tripulante}:${IDIOMA}`
  try {
    const [perfiles, fichas, entorno, historial, recordatorios, mensajes] = await Promise.all([
      pedir<Record<string, PerfilApi>>("/perfiles"),
      pedir<FichaJson[]>(`/fichas?lang=${IDIOMA}`),
      pedir<ReferenciaEntorno>(`/entorno/referencia?lang=${IDIOMA}`),
      pedir<Historial>(`/tripulantes/${tripulante}/historial?modo=${modo}&lang=${IDIOMA}`, tripulante),
      pedir<string[]>(`/tripulantes/${tripulante}/recordatorios?lang=${IDIOMA}`, tripulante),
      pedir<MensajeApi[]>(`/tripulantes/${tripulante}/mensajes?modo=${modo}&lang=${IDIOMA}`, tripulante),
    ])
    const crudo: CatalogoCrudo = { perfiles, fichas, entorno, historial, recordatorios, mensajes }
    const catalogo = armar(crudo, false)
    guardarCache(clave, crudo)
    return catalogo
  } catch {
    try {
      const copia = leerCache<CatalogoCrudo>(clave)
      return copia ? armar(copia, true) : null
    } catch {
      return null
    }
  }
}

/** Historial de otro tripulante de la misión: solo lo concede el servidor al oficial médico (queda auditado). */
/** Puntos de un día con su hora UTC (`/tripulantes/{id}/intradia`): lo que mide un sensor varias veces al día. */
export type PuntoIntradia = { hora: string; valor: number }
export type Intradia = {
  dia: number
  naturaleza: "Real" | "Simulado"
  series: Record<"fc_reposo_lpm" | "spo2_pct" | "temp_central_c" | "pas_mmHg", PuntoIntradia[]>
}
export const cargarIntradia = (tripulante: number, actor: number, modo: Mode): Promise<Intradia | null> =>
  pedir<Intradia>(`/tripulantes/${tripulante}/intradia?modo=${modo}`, actor).catch(() => null)

export const cargarHistorialAjeno = (tripulante: number, actor: number, modo: Mode): Promise<Historial | null> =>
  pedir<Historial>(`/tripulantes/${tripulante}/historial?modo=${modo}&lang=${IDIOMA}`, actor).catch(() => null)
