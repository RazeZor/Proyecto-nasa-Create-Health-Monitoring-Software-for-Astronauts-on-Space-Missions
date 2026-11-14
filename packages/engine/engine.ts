/**
 * Motor híbrido de VIGÍA (informe §5.1): capa A (NEWS2), capa B (desviación personal con MAD),
 * capa C (CUSUM) y regla de contexto (CO2 + síntomas). Puro: sin IO y sin dependencias.
 * Es el port 1:1 de `evaluar_tripulante` en pipelines/reanclaje/simulacion.py; el test de
 * paridad lo compara con `fixtures/caso-referencia.json`. Si cambias una regla, cámbiala en ambos.
 */

export const SUPUESTOS = {
  fc_desplazamiento_lpm: 3.0,
  sueno_desplazamiento_h: -0.7,
  pas_desplazamiento_mmHg: -4.0,
  tau_adaptacion_dias: 4.0,
  mad_min: { fc: 2.5, pas: 4.0, glucosa: 6.0, sueno: 0.4, animo: 1.0 },
}
export const Z_UMBRAL_FISIOLOGICO = 3.5
export const Z_UMBRAL_CONDUCTUAL = 3.0
export const DIAS_CONSECUTIVOS_B = 2
export const CUSUM_K = 0.75
export const CUSUM_H = 5.0
export const CUSUM_DIA_INICIO = 21
export const CO2_LIMITE_MMHG = 3.0

export interface Lectura {
  dia_mision: number
  fc_reposo_lpm: number
  pas_mmHg: number
  spo2_pct: number
  temp_central_c: number
  sueno_h: number
  animo_1_10: number
  sintomas: string[]
  durante_tormenta: boolean
}
export interface Tripulante { id: string; lecturas: Lectura[] }
export interface EntornoDia { co2_mmhg_max_horario?: number; modo_tormenta?: boolean }
export type Capa = "A" | "B" | "C" | "contexto"
export interface Alerta {
  dia_mision: number
  tripulante_id: string
  capa: Capa
  nivel: "ambar" | "rojo"
  indicador: string
  valor: number | null
  escalada_auto: boolean
}

/** w(d) = 1 - exp(-d / tau) para días de vuelo (d >= 1); 0 antes. */
export const factorAdaptacion = (dia: number, tau = SUPUESTOS.tau_adaptacion_dias) =>
  dia <= 0 ? 0 : 1 - Math.exp(-dia / tau)

export function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b)
  const m = v.length >> 1
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

/** [mediana, MAD sin el factor 1,4826 con piso MAD_MIN]. */
export function madBruto(valores: number[], minimo: number): [number, number] {
  const med = mediana(valores)
  return [med, Math.max(mediana(valores.map((v) => Math.abs(v - med))), minimo)]
}

export function puntosNews2(fc: number, pas: number, spo2: number, temp: number) {
  let pts = 0
  let maxIndividual = 0
  const sumar = (p: number) => {
    pts += p
    maxIndividual = Math.max(maxIndividual, p)
  }
  if (fc <= 40 || fc >= 131) sumar(3)
  else if (fc >= 111) sumar(2)
  else if ((fc >= 41 && fc <= 50) || (fc >= 91 && fc <= 110)) sumar(1)

  if (pas <= 90 || pas >= 220) sumar(3)
  else if (pas >= 91 && pas <= 100) sumar(2)
  else if (pas >= 101 && pas <= 110) sumar(1)

  if (spo2 <= 91) sumar(3)
  else if (spo2 >= 92 && spo2 <= 93) sumar(2)
  else if (spo2 >= 94 && spo2 <= 95) sumar(1)

  if (temp <= 35.0) sumar(3)
  else if (temp >= 39.1) sumar(2)
  else if ((temp >= 35.1 && temp <= 36.0) || (temp >= 38.1 && temp <= 39.0)) sumar(1)

  return { pts, maxIndividual }
}

const redondear = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d

/** Alertas de un tripulante: línea base con los días <= 0 (prevuelo) y evaluación de los días >= 1. */
export function evaluarTripulante(
  tripulante: Tripulante,
  entornoPorDia: Record<number, EntornoDia | undefined>,
): Alerta[] {
  const lecturas = [...tripulante.lecturas].sort((a, b) => a.dia_mision - b.dia_mision)
  const prevuelo = lecturas.filter((r) => r.dia_mision <= 0)
  const vuelo = lecturas.filter((r) => r.dia_mision >= 1)
  const piso = SUPUESTOS.mad_min
  const [medFc, madFc] = madBruto(prevuelo.map((r) => r.fc_reposo_lpm), piso.fc)
  const [medPas, madPas] = madBruto(prevuelo.map((r) => r.pas_mmHg), piso.pas)
  const [medSueno, madSueno] = madBruto(prevuelo.map((r) => r.sueno_h), piso.sueno)
  const [medAnimo, madAnimo] = madBruto(prevuelo.map((r) => r.animo_1_10), piso.animo)

  const alertas: Alerta[] = []
  const consecB: Record<string, number> = { fc: 0, pas: 0, sueno: 0, animo: 0 }
  const cusum: Record<string, number> = { fc: 0, pas: 0, sueno: 0, animo: 0, conductual: 0 }
  const yaEmitidaC = new Set<string>()
  const nueva = (d: number, capa: Capa, nivel: Alerta["nivel"], indicador: string, valor: number | null, escalada: boolean): Alerta => ({
    dia_mision: d, tripulante_id: tripulante.id, capa, nivel, indicador, valor, escalada_auto: escalada,
  })

  for (const r of vuelo) {
    const d = r.dia_mision
    const w = factorAdaptacion(d)
    const env = entornoPorDia[d] ?? {}
    const tormenta = Boolean(env.modo_tormenta) || r.durante_tormenta

    // Capa A: clínica
    const { pts, maxIndividual } = puntosNews2(r.fc_reposo_lpm, r.pas_mmHg, r.spo2_pct, r.temp_central_c)
    if (pts >= 5 || maxIndividual === 3) alertas.push(nueva(d, "A", "rojo", "news2", pts, tormenta))

    // Capa B: desviación personal respecto a la referencia ajustada por w(d)
    const zFc = (0.6745 * (r.fc_reposo_lpm - (medFc + SUPUESTOS.fc_desplazamiento_lpm * w))) / madFc
    const zPas = (0.6745 * (r.pas_mmHg - (medPas + SUPUESTOS.pas_desplazamiento_mmHg * w))) / madPas
    const zSueno = (0.6745 * (r.sueno_h - (medSueno + SUPUESTOS.sueno_desplazamiento_h * w))) / madSueno
    const zAnimo = (0.6745 * (r.animo_1_10 - medAnimo)) / madAnimo
    const margen = d <= 14 ? 1.15 : 1.0 // transición residual de los primeros 14 días
    const paresB: [string, number, number, number][] = [
      ["fc", zFc, Z_UMBRAL_FISIOLOGICO * margen, r.fc_reposo_lpm],
      ["pas", zPas, Z_UMBRAL_FISIOLOGICO * margen, r.pas_mmHg],
      ["sueno", zSueno, Z_UMBRAL_CONDUCTUAL * margen, r.sueno_h],
      ["animo", zAnimo, Z_UMBRAL_CONDUCTUAL * margen, r.animo_1_10],
    ]
    for (const [ind, z, umbral, valor] of paresB) {
      consecB[ind] = Math.abs(z) >= umbral ? consecB[ind] + 1 : 0
      if (consecB[ind] >= DIAS_CONSECUTIVOS_B) {
        const rojo = Math.abs(z) >= umbral + 1.5 || tormenta
        alertas.push(nueva(d, "B", rojo ? "rojo" : "ambar", ind, redondear(valor, 2), tormenta && rojo))
      }
    }

    // Capa C: CUSUM desde el día 21 (deriva sostenida)
    if (d >= CUSUM_DIA_INICIO) {
      cusum.fc = Math.max(0, cusum.fc + zFc - CUSUM_K)
      cusum.pas = Math.max(0, cusum.pas - zPas - CUSUM_K)
      cusum.sueno = Math.max(0, cusum.sueno - zSueno - CUSUM_K)
      cusum.animo = Math.max(0, cusum.animo - zAnimo - CUSUM_K)
      cusum.conductual = Math.max(0, cusum.conductual + (-zSueno - zAnimo) / Math.SQRT2 - CUSUM_K)
      for (const ind of ["fc", "pas", "sueno", "animo", "conductual"]) {
        const s = cusum[ind]
        if (s >= CUSUM_H && !yaEmitidaC.has(ind)) {
          yaEmitidaC.add(ind)
          alertas.push(nueva(d, "C", s >= CUSUM_H * 1.5 ? "rojo" : "ambar", ind, redondear(s, 2), tormenta))
        }
      }
    }

    // Contexto ambiental: CO2 alto con síntomas compatibles
    if ((env.co2_mmhg_max_horario ?? 0) >= CO2_LIMITE_MMHG && r.sintomas.some((s) => ["cefalea", "nausea", "mareo"].includes(s))) {
      alertas.push(nueva(d, "contexto", "rojo", "co2", env.co2_mmhg_max_horario ?? null, true))
    }
  }
  return alertas
}
