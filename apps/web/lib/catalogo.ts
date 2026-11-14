/**
 * Todo lo que la app muestra y no escribe el usuario sale de la API: perfiles, fichas, referencia de
 * entorno, historial simulado, recordatorios y mensajes. Aquí solo se piden y se traducen al modelo de
 * la interfaz; los textos de presentación (zonas, prevención por defecto, límites de las gráficas) son
 * de la interfaz. Sin API no hay catálogo: `cargarCatalogo` devuelve null.
 */
import { API_BASE_URL } from "./api-registro.ts"
import type { Lectura } from "../../../packages/engine/engine.ts"
import type { IndicatorId, IndicatorInfo, MissionProfile, ProfileId, Provenance, ThreadMessage, ZoneId } from "./types.ts"

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
  pad_mmHg?: number
  glucosa_mg_dl?: number | null
  masa_kg?: number | null
}
export interface Historial {
  naturaleza: string
  dias_prevuelo: number
  dias_vuelo: number
  dia_actual: number
  entorno_diario: { dia_mision: number; co2_mmhg_max_horario?: number; modo_tormenta?: boolean }[]
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
}

// Claves de la API por perfil de la interfaz (la UI traduce en su borde).
const PERFIL_API: Record<ProfileId, string> = {
  station: "estacion", transit: "transito", "transit-docked": "transito_acoplado",
  lunar: "superficie_lunar", mars: "superficie_marciana",
}
const PELIGROS: Record<string, string> = {
  radiacion: "Radiación espacial", aislamiento: "Aislamiento y confinamiento", distancia: "Distancia a la Tierra",
  gravedad_alterada: "Gravedad alterada", entorno_cerrado: "Entorno cerrado y hostil",
}
const HRR = "https://www.nasa.gov/hrp/risks/"

// Presentación de cada indicador: ficha de origen, zona del cuerpo, prevención si la ficha no la trae y
// límites de seguridad que dibujan las gráficas.
const PRESENTACION: Record<IndicatorId, { ficha: string; zona: ZoneId; prevencion: string; safetyLow?: number; safetyHigh?: number }> = {
  restingHr: { ficha: "frecuencia_cardiaca_reposo", zona: "heart", prevencion: "Mantén el protocolo de ejercicio, hidrátate y protege la ventana de sueño.", safetyHigh: 100, safetyLow: 40 },
  systolic: { ficha: "presion_arterial_sistolica", zona: "heart", prevencion: "Carga de líquidos antes de cambios de gravedad, contramedidas de ejercicio.", safetyHigh: 160, safetyLow: 85 },
  spo2: { ficha: "spo2", zona: "heart", prevencion: "Vigila la presión parcial de O2 en cabina y el sitio del sensor.", safetyLow: 92 },
  tempC: { ficha: "temperatura_central", zona: "blood", prevencion: "Medir siempre en reposo al menos 30 min después del ejercicio; higiene de manos.", safetyHigh: 38, safetyLow: 35.5 },
  sleepH: { ficha: "sueno", zona: "mind", prevencion: "Horario fijo, protocolo de luz y control de ruido en cabina.", safetyLow: 4 },
  mood: { ficha: "estado_animo", zona: "mind", prevencion: "Actividades con sentido, conferencias familiares privadas y cohesión con la tripulación.", safetyLow: 3 },
  glucose: { ficha: "glucosa", zona: "blood", prevencion: "Contención de residuos biológicos en 0 g y adherencia a la dieta y al protocolo de ejercicio.", safetyHigh: 126, safetyLow: 70 },
  massKg: { ficha: "masa_corporal", zona: "bone", prevencion: "Ejercicio de resistencia y seguimiento de la ingesta calórica con el mismo instrumento." },
}

function desdeFicha(id: IndicatorId, f: FichaJson, zona: ZoneId, prevencion: string, limites: { safetyLow?: number; safetyHigh?: number } = {}): IndicatorInfo {
  const fuente = f.fuentes.find((x) => x.url) ?? f.fuentes[0]
  return {
    id, label: f.nombre, unit: f.unidad ?? "", zone: zona, whatItIs: f.que_es,
    howToMeasure: f.como_se_mide_en_vuelo.transito,
    whyNeeded: f.referencia_en_vuelo ? `${f.por_que} ${f.referencia_en_vuelo}` : f.por_que,
    hazard: f.peligro.map((p) => PELIGROS[p] ?? p).join(" · "),
    whenToNotify: f.cuando_avisar, prevention: f.prevencion ?? prevencion,
    sourceLabel: fuente?.titulo ?? "NASA HRP", sourceUrl: fuente?.url ?? HRR, ...limites,
  }
}

export function perfilesUi(api: Record<string, PerfilApi>): MissionProfile[] {
  return (Object.keys(PERFIL_API) as ProfileId[]).map((id) => {
    const p = api[PERFIL_API[id]]
    return {
      id, label: p.nombre, cabinPressureMmHg: p.presion_cabina_mmHg as MissionProfile["cabinPressureMmHg"],
      delayMinutes: p.retardo_demo_min, gravity: p.gravedad_etiqueta,
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
    indicadores[id] = desdeFicha(id, f, p.zona, p.prevencion, { safetyLow: p.safetyLow, safetyHigh: p.safetyHigh })
    comoMedir[id] = f.como_se_mide_en_vuelo
  }
  const rad = porId.get("dosis_radiacion")
  if (!rad) throw new Error("la API no trae la ficha dosis_radiacion")
  const radiacion = desdeFicha("restingHr", rad, "blood", "Refugio en tormenta solar (≥10 pfu en ≥10 MeV) y seguimiento del presupuesto de carrera (600 mSv).")
  return { indicadores, comoMedir, radiacion: { ...radiacion, hazard: "Radiación espacial (GCR y eventos de partículas solares)", howToMeasure: rad.como_se_mide_en_vuelo.transito } }
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

/** Pide todo el catálogo; null si la API no responde o falta algo (la app muestra el aviso y reintenta). */
export async function cargarCatalogo(tripulante: number): Promise<Catalogo | null> {
  try {
    const [perfiles, fichas, entorno, historial, recordatorios, mensajes] = await Promise.all([
      pedir<Record<string, PerfilApi>>("/perfiles"),
      pedir<FichaJson[]>("/fichas"),
      pedir<ReferenciaEntorno>("/entorno/referencia"),
      pedir<Historial>(`/tripulantes/${tripulante}/historial`, tripulante),
      pedir<string[]>(`/tripulantes/${tripulante}/recordatorios`, tripulante),
      pedir<MensajeApi[]>(`/tripulantes/${tripulante}/mensajes`, tripulante),
    ])
    return {
      perfiles: perfilesUi(perfiles), ...indicadoresUi(fichas), historial, recordatorios,
      mensajes: mensajesUi(mensajes), entorno, fuentes: fuentesUi(entorno.fuentes),
    }
  } catch {
    return null
  }
}
