import fichaRadiacion from "@/public/fichas/dosis_radiacion.json"
import type { EnvDay, IndicatorInfo, Provenance, SolarEvent } from "../types"
import { MISSION_DAYS } from "./crew"

export const PRIOR_CAREER_MSV = 212
export const CAREER_LIMIT_MSV = 600
export const CO2_LIMIT_MMHG = 3
export const PFU_THRESHOLD = 10

export const RADIATION_INDICATOR: IndicatorInfo = {
  id: "restingHr",
  label: fichaRadiacion.nombre,
  unit: fichaRadiacion.unidad,
  zone: "blood",
  whatItIs: fichaRadiacion.que_es,
  howToMeasure: fichaRadiacion.como_se_mide_en_vuelo.transito,
  whyNeeded: `${fichaRadiacion.por_que} ${fichaRadiacion.referencia_en_vuelo}`,
  hazard: "Radiación espacial (GCR y eventos de partículas solares)",
  whenToNotify: fichaRadiacion.cuando_avisar,
  prevention: "Refugio en tormenta solar (≥10 pfu en ≥10 MeV) y seguimiento del presupuesto de carrera (600 mSv).",
  sourceLabel: fichaRadiacion.fuentes[0].titulo,
  sourceUrl: fichaRadiacion.fuentes[0].url,
}

export const ENV_SOURCES: { id: string; label: string; provenance: Provenance; feeds: string }[] = [
  { id: "radlab", label: "RadLab", provenance: { kind: "real", source: "NASA OSDR", date: "2016-2022" }, feeds: "Tasa de dosis ambiental" },
  { id: "eda", label: "EDA", provenance: { kind: "real", source: "NASA OSDR", date: "2021" }, feeds: "CO2, temperatura y humedad de cabina" },
  { id: "donki", label: "DONKI", provenance: { kind: "real", source: "NASA CCMC", date: "2024-05-11" }, feeds: "Eventos de partículas solares" },
  { id: "goes", label: "GOES", provenance: { kind: "real", source: "NOAA SWPC", date: "2024-05-10/14" }, feeds: "Flujo de protones" },
]

const FLUX: Record<number, number> = { 22: 208, 23: 64, 24: 14, 25: 4 }
const noise = (s: number) => {
  const x = Math.sin(s * 78.233) * 43758.5453
  return x - Math.floor(x) - 0.5
}

let cumulative = PRIOR_CAREER_MSV
/** Real archived records replayed onto mission days. */
export const ENV: EnvDay[] = Array.from({ length: MISSION_DAYS }, (_, i) => {
  const day = i + 1
  const protonPfu = FLUX[day] ?? Math.max(0.15, 0.4 + noise(day) * 0.3)
  const doseMSv = Math.round((1.8 + noise(day + 9) * 0.2 + (FLUX[day] ? FLUX[day] * 0.04 : 0)) * 100) / 100
  cumulative += doseMSv
  return {
    day,
    doseMSv,
    cumulativeMSv: Math.round(cumulative * 10) / 10,
    protonPfu: Math.round(protonPfu * 100) / 100,
    co2Ppm: day === 12 ? 6350 : day === 11 || day === 13 ? 4100 : Math.round(2500 + noise(day + 30) * 500),
    cabinTempC: Math.round((22.4 + noise(day + 50) * 1.2) * 10) / 10,
    humidityPct: Math.round(45 + noise(day + 70) * 10),
  }
})

export const SOLAR_EVENTS: SolarEvent[] = [
  {
    id: "spe-22",
    day: 22,
    peakPfu: 208,
    classLabel: "S2 · Moderado",
    provenance: { kind: "real", source: "DONKI", date: "2024-05-11" },
    note: "Tras una fulguración de clase X. Reproducido en el día de misión 22.",
  },
]

export const ppmToMmHg = (ppm: number, cabinPressureMmHg: number) =>
  Math.round(((ppm / 1_000_000) * cabinPressureMmHg) * 100) / 100

export const isStormDay = (day: number) => (FLUX[day] ?? 0) >= PFU_THRESHOLD
