import fichaRadiacion from "@/public/fichas/dosis_radiacion.json"
import type { IndicatorInfo, Provenance } from "../types"

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
  { id: "radlab", label: "RadLab", provenance: { kind: "real", source: "NASA OSDR", date: "ALTEA / DosTel" }, feeds: "Tasa de dosis absorbida y equivalente" },
  { id: "eda", label: "EDA", provenance: { kind: "real", source: "NASA OSDR", date: "RR-1 ISS" }, feeds: "CO2, temperatura y humedad de cabina" },
  { id: "donki", label: "DONKI", provenance: { kind: "real", source: "NASA CCMC", date: "SEP en vivo" }, feeds: "Eventos de partículas solares" },
  { id: "goes", label: "GOES", provenance: { kind: "real", source: "NOAA SWPC", date: "GOES-18 >=10 MeV" }, feeds: "Flujo integral de protones" },
]

export const ppmToMmHg = (ppm: number, cabinPressureMmHg: number) =>
  Math.round(((ppm / 1_000_000) * cabinPressureMmHg) * 100) / 100

/** Determina si un día tiene tormenta (>=10 pfu en >=10 MeV) usando mediciones reales GOES si existen. */
export const isStormDay = (
  day: number,
  protones?: { dia_mision: number; serie: string; max_pfu: number; modo_tormenta?: boolean }[],
) =>
  Boolean(
    protones?.some(
      (p) => p.dia_mision === day && (p.modo_tormenta || (p.serie.includes(">=10 MeV") && p.max_pfu >= PFU_THRESHOLD)),
    ),
  )
