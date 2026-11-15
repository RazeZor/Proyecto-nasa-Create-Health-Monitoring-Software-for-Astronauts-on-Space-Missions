/**
 * Descomposición de una serie diaria en tendencia, ciclo y residuo, para el histórico de la interfaz. No es parte del
 * motor híbrido (no hay paridad con Python): solo ayuda a leer la evolución. Puro y sin dependencias.
 *
 * - Tendencia: regresión lineal local en una ventana de ±3 días (exacta para una recta, también en los bordes y con
 *   huecos; en el centro equivale a una media móvil de 7 días).
 * - Ciclo semanal: media por día de la semana de lo que la tendencia no explica, centrada en 0. Solo si hay al menos
 *   `MIN_DIAS_CICLO` días y la autocorrelación a 7 días es al menos `UMBRAL_CICLO`: si no, `ciclo` es null.
 * - Residuo: valor − tendencia − ciclo.
 * Se repite tendencia y ciclo dos veces (como STL) para que uno no se coma al otro.
 */

export interface Punto { dia: number; valor: number }
export interface Descomposicion {
  tendencia: Punto[]
  ciclo: Punto[] | null
  residuo: Punto[]
  /** Autocorrelación a `periodo` días de la serie sin tendencia (de -1 a 1). */
  fuerzaCiclo: number
}

export const MIN_DIAS_DESCOMPOSICION = 10
export const MIN_DIAS_CICLO = 14
export const UMBRAL_CICLO = 0.3
const MEDIA_VENTANA = 3

function tendenciaLocal(puntos: Punto[]): number[] {
  return puntos.map(({ dia }) => {
    const v = puntos.filter((p) => Math.abs(p.dia - dia) <= MEDIA_VENTANA)
    const mx = v.reduce((s, p) => s + p.dia, 0) / v.length
    const my = v.reduce((s, p) => s + p.valor, 0) / v.length
    const sxx = v.reduce((s, p) => s + (p.dia - mx) ** 2, 0)
    if (sxx === 0) return my
    const pendiente = v.reduce((s, p) => s + (p.dia - mx) * (p.valor - my), 0) / sxx
    return my + pendiente * (dia - mx)
  })
}

const fase = (dia: number, periodo: number) => ((dia % periodo) + periodo) % periodo

function cicloMedio(puntos: Punto[], periodo: number): number[] {
  const suma = new Array(periodo).fill(0), n = new Array(periodo).fill(0)
  for (const p of puntos) { suma[fase(p.dia, periodo)] += p.valor; n[fase(p.dia, periodo)]++ }
  const medias = suma.map((s, i) => (n[i] ? s / n[i] : 0))
  const conDato = medias.filter((_, i) => n[i])
  const centro = conDato.reduce((s, m) => s + m, 0) / conDato.length
  return puntos.map((p) => medias[fase(p.dia, periodo)] - centro)
}

function autocorrelacion(puntos: Punto[], desfase: number): number {
  const m = puntos.reduce((s, p) => s + p.valor, 0) / puntos.length
  const por = new Map(puntos.map((p) => [p.dia, p.valor - m]))
  const den = [...por.values()].reduce((s, x) => s + x * x, 0)
  if (den < 1e-12) return 0
  let num = 0
  for (const [dia, x] of por) { const y = por.get(dia + desfase); if (y !== undefined) num += x * y }
  return num / den
}

/** `null` con menos de `MIN_DIAS_DESCOMPOSICION` días con dato. Los días sin medida simplemente no van en `puntos`. */
export function descomponer(entrada: Punto[], periodo = 7): Descomposicion | null {
  const puntos = [...entrada].sort((a, b) => a.dia - b.dia)
  if (puntos.length < MIN_DIAS_DESCOMPOSICION) return null
  const t0 = tendenciaLocal(puntos)
  const sinTendencia = puntos.map((p, i) => ({ dia: p.dia, valor: p.valor - t0[i] }))
  const fuerzaCiclo = autocorrelacion(sinTendencia, periodo)
  const hayCiclo = puntos.length >= MIN_DIAS_CICLO && fuerzaCiclo >= UMBRAL_CICLO

  let tendencia = t0
  let ciclo = puntos.map(() => 0)
  if (hayCiclo) {
    for (let vuelta = 0; vuelta < 2; vuelta++) {
      ciclo = cicloMedio(puntos.map((p, i) => ({ dia: p.dia, valor: p.valor - tendencia[i] })), periodo)
      tendencia = tendenciaLocal(puntos.map((p, i) => ({ dia: p.dia, valor: p.valor - ciclo[i] })))
    }
    ciclo = cicloMedio(puntos.map((p, i) => ({ dia: p.dia, valor: p.valor - tendencia[i] })), periodo)
  }
  const en = (valores: number[]) => puntos.map((p, i) => ({ dia: p.dia, valor: valores[i] }))
  return {
    tendencia: en(tendencia),
    ciclo: hayCiclo ? en(ciclo) : null,
    residuo: en(puntos.map((p, i) => p.valor - tendencia[i] - ciclo[i])),
    fuerzaCiclo,
  }
}
