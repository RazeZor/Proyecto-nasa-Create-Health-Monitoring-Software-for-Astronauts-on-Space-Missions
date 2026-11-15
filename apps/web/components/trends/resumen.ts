import type { BandPoint, IndicatorInfo } from "@/lib/types"

/** Dónde cae una medida respecto a sus referencias. Manda el límite de seguridad; después, la banda personal. */
export type Lugar = "aboveSafety" | "belowSafety" | "aboveBand" | "belowBand" | "inBand" | "inSafety"

export interface Resumen {
  /** Última medida hasta el día consultado. */
  ultimo: { day: number; value: number } | null
  esHoy: boolean
  /** Banda personal del día de esa medida. */
  banda: BandPoint | null
  /** null si el indicador no tiene banda ni límites: no hay con qué comparar. */
  lugar: Lugar | null
  /** Días de calendario seguidos, hasta esa medida, en el mismo lugar. */
  racha: number
}

type Limites = Pick<IndicatorInfo, "safetyLow" | "safetyHigh">

function lugarDe(valor: number, banda: BandPoint | undefined, info: Limites): Lugar | null {
  if (info.safetyHigh != null && valor > info.safetyHigh) return "aboveSafety"
  if (info.safetyLow != null && valor < info.safetyLow) return "belowSafety"
  if (banda) return valor > banda.high ? "aboveBand" : valor < banda.low ? "belowBand" : "inBand"
  return info.safetyHigh != null || info.safetyLow != null ? "inSafety" : null
}

/**
 * Describe la última medida frente a la banda personal y los límites de seguridad, sin interpretarla: solo compara
 * números que ya da el análisis. La racha cuenta días seguidos de calendario; un día sin medida la corta.
 */
export function resumir(puntos: { day: number; value: number }[], banda: BandPoint[], info: Limites, dia: number): Resumen {
  const hasta = puntos.filter((p) => p.day <= dia)
  const ultimo = hasta.at(-1) ?? null
  if (!ultimo) return { ultimo: null, esHoy: false, banda: null, lugar: null, racha: 0 }
  const bandaDe = (d: number) => banda.find((b) => b.day === d)
  const lugar = lugarDe(ultimo.value, bandaDe(ultimo.day), info)
  let racha = 1
  for (let i = hasta.length - 2; i >= 0; i--) {
    const p = hasta[i]
    if (p.day !== hasta[i + 1].day - 1 || lugarDe(p.value, bandaDe(p.day), info) !== lugar) break
    racha++
  }
  return { ultimo, esHoy: ultimo.day === dia, banda: bandaDe(ultimo.day) ?? null, lugar, racha }
}
