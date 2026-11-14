import fichaAnimo from "@/public/fichas/estado_animo.json"
import fichaFc from "@/public/fichas/frecuencia_cardiaca_reposo.json"
import fichaGlucosa from "@/public/fichas/glucosa.json"
import fichaMasa from "@/public/fichas/masa_corporal.json"
import fichaPa from "@/public/fichas/presion_arterial_sistolica.json"
import fichaSpo2 from "@/public/fichas/spo2.json"
import fichaSueno from "@/public/fichas/sueno.json"
import fichaTemp from "@/public/fichas/temperatura_central.json"
import type { IndicatorId, IndicatorInfo, ProfileId, ZoneId } from "../types"

const HRR = "https://www.nasa.gov/hrp/risks/"

const PELIGROS: Record<string, string> = {
  radiacion: "Radiación espacial",
  aislamiento: "Aislamiento y confinamiento",
  distancia: "Distancia a la Tierra",
  gravedad_alterada: "Gravedad alterada",
  entorno_cerrado: "Entorno cerrado y hostil",
}

type FichaJson = {
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

const FICHAS: Record<IndicatorId, FichaJson> = {
  restingHr: fichaFc,
  systolic: fichaPa,
  spo2: fichaSpo2,
  tempC: fichaTemp,
  sleepH: fichaSueno,
  mood: fichaAnimo,
  glucose: fichaGlucosa,
  massKg: fichaMasa,
}

function desdeFicha(
  id: IndicatorId,
  ficha: FichaJson,
  zone: ZoneId,
  fallbackPrevention: string,
  limits?: { safetyLow?: number; safetyHigh?: number },
): IndicatorInfo {
  const fuenteConUrl = ficha.fuentes.find((f) => f.url) ?? ficha.fuentes[0]
  return {
    id,
    label: ficha.nombre,
    unit: ficha.unidad ?? "",
    zone,
    whatItIs: ficha.que_es,
    howToMeasure: ficha.como_se_mide_en_vuelo.transito,
    whyNeeded: ficha.referencia_en_vuelo ? `${ficha.por_que} ${ficha.referencia_en_vuelo}` : ficha.por_que,
    hazard: ficha.peligro.map((p) => PELIGROS[p] ?? p).join(" · "),
    whenToNotify: ficha.cuando_avisar,
    prevention: ficha.prevencion ?? fallbackPrevention,
    sourceLabel: fuenteConUrl?.titulo ?? "NASA HRP",
    sourceUrl: fuenteConUrl?.url ?? HRR,
    ...limits,
  }
}

export const INDICATORS: Record<IndicatorId, IndicatorInfo> = {
  restingHr: desdeFicha(
    "restingHr",
    fichaFc,
    "heart",
    "Mantén el protocolo de ejercicio, hidrátate y protege la ventana de sueño.",
    { safetyHigh: 100, safetyLow: 40 },
  ),
  systolic: desdeFicha(
    "systolic",
    fichaPa,
    "heart",
    "Carga de líquidos antes de cambios de gravedad, contramedidas de ejercicio.",
    { safetyHigh: 160, safetyLow: 85 },
  ),
  spo2: desdeFicha(
    "spo2",
    fichaSpo2,
    "heart",
    "Vigila la presión parcial de O2 en cabina y el sitio del sensor.",
    { safetyLow: 92 },
  ),
  tempC: desdeFicha(
    "tempC",
    fichaTemp,
    "blood",
    "Medir siempre en reposo al menos 30 min después del ejercicio; higiene de manos.",
    { safetyHigh: 38, safetyLow: 35.5 },
  ),
  sleepH: desdeFicha(
    "sleepH",
    fichaSueno,
    "mind",
    "Horario fijo, protocolo de luz y control de ruido en cabina.",
    { safetyLow: 4 },
  ),
  mood: desdeFicha(
    "mood",
    fichaAnimo,
    "mind",
    "Actividades con sentido, conferencias familiares privadas y cohesión con la tripulación.",
    { safetyLow: 3 },
  ),
  glucose: desdeFicha(
    "glucose",
    fichaGlucosa,
    "blood",
    "Contención de residuos biológicos en 0 g y adherencia a la dieta y al protocolo de ejercicio.",
    { safetyHigh: 126, safetyLow: 70 },
  ),
  massKg: desdeFicha(
    "massKg",
    fichaMasa,
    "bone",
    "Ejercicio de resistencia y seguimiento de la ingesta calórica con el mismo instrumento.",
  ),
}

export function howToForProfile(id: IndicatorId, profile: ProfileId): string {
  const ficha = FICHAS[id]
  if (profile === "station") return ficha.como_se_mide_en_vuelo.estacion
  if (profile === "transit" || profile === "transit-docked") return ficha.como_se_mide_en_vuelo.transito
  return ficha.como_se_mide_en_vuelo.superficie
}
