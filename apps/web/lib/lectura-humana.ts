/**
 * Lectura en lenguaje llano de las medidas de un día, para el informe diario a Tierra (§6.1).
 * El tripulante no es médico: cada indicador sale en una frase corta con su valor y si está dentro de lo esperado.
 * Función pura: sin IO ni estado; los textos salen de i18n (`web.S.reports.plain.*`).
 *
 * Referencias de normalidad: pulso según la banda personal si existe y, si no, 50 a 100 lpm; presión sistólica
 * 90 a 139 mmHg; SpO2 ≥ 95 %; temperatura 36.0 a 37.5 °C; sueño corto por debajo de 6 h. El ánimo no tiene rango.
 */
import { S } from "./strings.ts"
import type { DailyVitals } from "./types.ts"

/** Banda personal de FC en reposo vigente ese día (`analisis.band("restingHr")`); solo hacen falta los bordes. */
export interface BandaPersonal {
  low: number
  high: number
}

/** Una frase por indicador medido; `fuera` marca que el valor está fuera del rango de referencia. */
export interface FraseLectura {
  texto: string
  fuera: boolean
}

export const PULSO_NORMAL = { bajo: 50, alto: 100 } as const
export const PRESION_NORMAL = { bajo: 90, alto: 139 } as const
export const SPO2_MINIMO = 95
export const TEMPERATURA_NORMAL = { bajo: 36.0, alto: 37.5 } as const
export const SUENO_MINIMO_H = 6

type Medidas = Partial<Pick<DailyVitals, "restingHr" | "systolic" | "spo2" | "tempC" | "sleepH" | "mood">>

/** Los números se redondean para la frase y se comparan ya redondeados: lo que se lee es lo que se juzga. */
const entero = (x: number) => Math.round(x)
const unDecimal = (x: number) => Math.round(x * 10) / 10

/** Frases del día, en el orden de la lectura numérica. Una medida ausente (`null`/`undefined`) no se nombra. */
export function frasesLectura(v: Medidas | null | undefined, banda?: BandaPersonal | null): FraseLectura[] {
  if (!v) return []
  const P = S.reports.plain
  const frases: FraseLectura[] = []

  if (v.restingHr != null) {
    const fc = entero(v.restingHr)
    if (banda) {
      const bajo = entero(banda.low)
      const alto = entero(banda.high)
      const fuera = fc < bajo || fc > alto
      const texto = fc > alto ? P.hrAboveBand(fc, bajo, alto) : fc < bajo ? P.hrBelowBand(fc, bajo, alto) : P.hrInBand(fc, bajo, alto)
      frases.push({ texto, fuera })
    } else {
      const fuera = fc < PULSO_NORMAL.bajo || fc > PULSO_NORMAL.alto
      const texto = fc > PULSO_NORMAL.alto ? P.hrHigh(fc, PULSO_NORMAL.alto) : fc < PULSO_NORMAL.bajo ? P.hrLow(fc, PULSO_NORMAL.bajo) : P.hrNormal(fc, PULSO_NORMAL.bajo, PULSO_NORMAL.alto)
      frases.push({ texto, fuera })
    }
  }

  if (v.systolic != null) {
    const pas = entero(v.systolic)
    const fuera = pas < PRESION_NORMAL.bajo || pas > PRESION_NORMAL.alto
    const texto = pas > PRESION_NORMAL.alto ? P.bpHigh(pas, PRESION_NORMAL.alto) : pas < PRESION_NORMAL.bajo ? P.bpLow(pas, PRESION_NORMAL.bajo) : P.bpNormal(pas)
    frases.push({ texto, fuera })
  }

  if (v.spo2 != null) {
    const spo2 = entero(v.spo2)
    const fuera = spo2 < SPO2_MINIMO
    frases.push({ texto: fuera ? P.spo2Low(spo2, SPO2_MINIMO) : P.spo2Normal(spo2), fuera })
  }

  if (v.tempC != null) {
    const temp = unDecimal(v.tempC)
    const fuera = temp < TEMPERATURA_NORMAL.bajo || temp > TEMPERATURA_NORMAL.alto
    const valor = temp.toFixed(1)
    const texto = temp > TEMPERATURA_NORMAL.alto ? P.tempHigh(valor, TEMPERATURA_NORMAL.alto.toFixed(1)) : temp < TEMPERATURA_NORMAL.bajo ? P.tempLow(valor, TEMPERATURA_NORMAL.bajo.toFixed(1)) : P.tempNormal(valor)
    frases.push({ texto, fuera })
  }

  if (v.sleepH != null) {
    const horas = unDecimal(v.sleepH)
    const fuera = horas < SUENO_MINIMO_H
    const valor = horas.toFixed(1)
    frases.push({ texto: fuera ? P.sleepShort(valor, SUENO_MINIMO_H) : P.sleepOk(valor), fuera })
  }

  if (v.mood != null) frases.push({ texto: P.mood(entero(v.mood)), fuera: false })

  return frases
}

/** Las frases del día en un solo párrafo; cadena vacía si no hay ninguna medida. */
export function lecturaHumana(v: Medidas | null | undefined, banda?: BandaPersonal | null): string {
  return frasesLectura(v, banda).map((f) => f.texto).join(" ")
}

/** Cuántos indicadores se revisaron y cuántos quedaron fuera de rango, para el resumen del informe. */
export function balanceLectura(v: Medidas | null | undefined, banda?: BandaPersonal | null): { revisados: number; fuera: number } {
  const frases = frasesLectura(v, banda)
  return { revisados: frases.length, fuera: frases.filter((f) => f.fuera).length }
}
