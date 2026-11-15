/**
 * Motor híbrido de VIGÍA (informe §5.1 y §5.2): capa A (NEWS2), capa B (desviación personal con MAD),
 * capa C (CUSUM) y reglas de contexto (CO2 con cefalea, modo tormenta). Puro: sin IO y sin dependencias.
 * Es el port 1:1 de `evaluar_tripulante` en pipelines/reanclaje/simulacion.py; el test de paridad lo compara
 * con `fixtures/caso-referencia.json`. Si cambias una regla, cámbiala en ambos.
 *
 * Solo aquí (no en Python, que siempre evalúa series completas): lecturas con valores ausentes (`null`),
 * tripulantes sin línea base de tierra y cambios de instrumento (anexo A.6).
 */

/** Pisos de dispersión del motor. Los desplazamientos son supuestos del simulador: el motor no los usa. */
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
export const PROTONES_TORMENTA_PFU = 10.0
// Línea base de tierra a vuelo (§5.2)
export const DIA_FIN_ADAPTACION = 14
export const DIAS_TRANSICION = 7
export const VENTANA_DIA_INICIO = 8
export const VENTANA_MAX_LECTURAS = 14
export const VENTANA_REZAGO_DIAS = 3
export const VENTANA_MIN_LECTURAS = 5
/** Días que tarda un indicador en volver a tener referencia tras un cambio de instrumento (anexo A.6). */
export const DIAS_VENTANA_REINICIO = VENTANA_MIN_LECTURAS + VENTANA_REZAGO_DIAS

export type IndicadorB = "fc" | "pas" | "sueno" | "animo"
type CampoB = "fc_reposo_lpm" | "pas_mmHg" | "sueno_h" | "animo_1_10"
const INDICADORES_B: [IndicadorB, CampoB, number][] = [
  ["fc", "fc_reposo_lpm", Z_UMBRAL_FISIOLOGICO],
  ["pas", "pas_mmHg", Z_UMBRAL_FISIOLOGICO],
  ["sueno", "sueno_h", Z_UMBRAL_CONDUCTUAL],
  ["animo", "animo_1_10", Z_UMBRAL_CONDUCTUAL],
]
/** Sentido que vigila la capa C: FC al alza; sueño y ánimo a la baja. */
const SENTIDO_C: Partial<Record<IndicadorB, number>> = { fc: 1, sueno: -1, animo: -1 }

/** Lectura de un día. Un valor `null` es una medida que ese día no se tomó: no puntúa ni alerta. */
export interface Lectura {
  dia_mision: number
  fc_reposo_lpm: number | null
  pas_mmHg: number | null
  spo2_pct: number | null
  temp_central_c: number | null
  sueno_h: number | null
  animo_1_10: number | null
  sintomas: string[]
  durante_tormenta: boolean
}
export interface Tripulante { id: string; lecturas: Lectura[] }
/** Entorno del día: CO2 ya en presión parcial (mmHg) y flujo de protones de >=10 MeV. */
export interface EntornoDia {
  co2_mmhg_max_horario?: number | null
  flujo_protones_10mev_pfu?: number | null
  /** Tormenta declarada por otra fuente (evento SEP de DONKI) aunque no haya flujo medido. */
  modo_tormenta?: boolean
}
export type Capa = "A" | "B" | "C" | "contexto"
/** Desde `dia_mision` el indicador se mide con otro instrumento (manual ↔ reloj, u otro reloj). */
export interface CambioInstrumento { dia_mision: number; indicador: "fc" }
export interface OpcionesMotor { cambiosInstrumento?: CambioInstrumento[] }
export interface Alerta {
  dia_mision: number
  tripulante_id: string
  capa: Capa
  nivel: "ambar" | "rojo"
  indicador: string
  valor: number | null
  /** Solo el rojo de la capa A sale solo hacia el oficial médico (§5.4). */
  escalada_auto: boolean
  /** `tripulacion`: dato ambiental que se comparte con todos, sin datos personales. */
  ambito: "personal" | "tripulacion"
  /** Calculada en modo adaptación (días 1 a 14): se muestra, no alerta. */
  informativa: boolean
}
/** Referencia vigente de un indicador en un día; `null` si aún no hay con qué comparar. */
export interface Referencia { dia_mision: number; centro: number; dispersion: number; z: number | null; peso_vuelo: number }

export function mediana(valores: number[]): number {
  const v = [...valores].sort((a, b) => a - b)
  const m = v.length >> 1
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2
}

/** [mediana, MAD] sin el factor 1,4826 y sin piso. */
function medianaMad(valores: number[]): [number, number] {
  const med = mediana(valores)
  return [med, mediana(valores.map((v) => Math.abs(v - med)))]
}

/** [mediana, MAD sin el factor 1,4826 con piso MAD_MIN]. */
export function madBruto(valores: number[], minimo: number): [number, number] {
  const [med, mad] = medianaMad(valores)
  return [med, Math.max(mad, minimo)]
}

/** w(d) de §5.2: 0 en adaptación o con menos de 5 lecturas en vuelo; luego sube hasta 1 en 7 días. */
export function pesoVuelo(dia: number, nVentana: number): number {
  if (dia <= DIA_FIN_ADAPTACION || nVentana < VENTANA_MIN_LECTURAS) return 0
  return Math.min(1, (dia - DIA_FIN_ADAPTACION) / DIAS_TRANSICION)
}

/** Puntos NEWS2 de los parámetros medidos; los `null` no puntúan. */
export function puntosNews2(fc: number | null, pas: number | null, spo2: number | null, temp: number | null) {
  let pts = 0
  let maxIndividual = 0
  const sumar = (p: number) => {
    pts += p
    maxIndividual = Math.max(maxIndividual, p)
  }
  if (fc !== null) {
    if (fc <= 40 || fc >= 131) sumar(3)
    else if (fc >= 111) sumar(2)
    else if (fc <= 50 || fc >= 91) sumar(1)
  }
  if (pas !== null) {
    if (pas <= 90 || pas >= 220) sumar(3)
    else if (pas <= 100) sumar(2)
    else if (pas <= 110) sumar(1)
  }
  if (spo2 !== null) {
    if (spo2 <= 91) sumar(3)
    else if (spo2 <= 93) sumar(2)
    else if (spo2 <= 95) sumar(1)
  }
  if (temp !== null) {
    if (temp <= 35.0) sumar(3)
    else if (temp >= 39.1) sumar(2)
    else if (temp <= 36.0 || temp >= 38.1) sumar(1)
  }
  return { pts, maxIndividual }
}

const redondear = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d

/**
 * Centro y dispersión vigentes (§5.2): mezcla de la línea base de tierra y la ventana en vuelo. La ventana
 * toma hasta 14 lecturas desde el día 8 y termina 3 días antes de `dia`, sin los días excluidos. Sin línea
 * base de tierra (tripulante sin prevuelo o tras un cambio de instrumento) vale solo la ventana, cuando llega
 * a 5 lecturas; antes no hay referencia.
 */
function referencia(
  dia: number, tierra: [number, number] | null, historia: [number, number][], excluidos: Set<number>, piso: number,
): { centro: number; dispersion: number; w: number } | null {
  const ventana = historia
    .filter(([j]) => j >= VENTANA_DIA_INICIO && j <= dia - VENTANA_REZAGO_DIAS && !excluidos.has(j))
    .map(([, v]) => v)
    .slice(-VENTANA_MAX_LECTURAS)
  if (tierra === null) {
    if (ventana.length < VENTANA_MIN_LECTURAS) return null
    const [med, mad] = medianaMad(ventana)
    return { centro: med, dispersion: Math.max(mad, piso), w: 1 }
  }
  const w = pesoVuelo(dia, ventana.length)
  const [medT, madT] = tierra
  if (w === 0) return { centro: medT, dispersion: Math.max(madT, piso), w }
  const [medV, madV] = medianaMad(ventana)
  return { centro: (1 - w) * medT + w * medV, dispersion: Math.max((1 - w) * madT + w * madV, piso), w }
}

/**
 * Alertas y referencias de un tripulante: línea base de tierra con los días <= 0 (prevuelo) y evaluación de
 * los días >= 1. Las referencias sirven para dibujar la banda personal en las tendencias.
 */
export function analizarTripulante(
  tripulante: Tripulante,
  entornoPorDia: Record<number, EntornoDia | undefined>,
  opciones: OpcionesMotor = {},
): { alertas: Alerta[]; referencias: Record<IndicadorB, Referencia[]> } {
  const lecturas = [...tripulante.lecturas].sort((a, b) => a.dia_mision - b.dia_mision)
  const prevuelo = lecturas.filter((r) => r.dia_mision <= 0)
  const vuelo = lecturas.filter((r) => r.dia_mision >= 1)
  const piso = SUPUESTOS.mad_min

  const tierra = {} as Record<IndicadorB, [number, number] | null>
  const historia = {} as Record<IndicadorB, [number, number][]>
  const excluidos = {} as Record<IndicadorB, Set<number>>
  const consecB = {} as Record<IndicadorB, number>
  const referencias = {} as Record<IndicadorB, Referencia[]>
  for (const [ind, campo] of INDICADORES_B) {
    const valores = prevuelo.map((r) => r[campo]).filter((v): v is number => v !== null)
    tierra[ind] = valores.length > 0 ? medianaMad(valores) : null
    historia[ind] = []
    excluidos[ind] = new Set()
    consecB[ind] = 0
    referencias[ind] = []
  }
  const cusum: Partial<Record<IndicadorB, number>> = { fc: 0, sueno: 0, animo: 0 }
  // A.6: tras un cambio de instrumento el indicador no es comparable con su historia. Se descartan su línea
  // base de tierra y su ventana, y sus capas B y C quedan en pausa hasta que el instrumento nuevo junta su
  // propia ventana. La capa A no cambia: los límites clínicos son absolutos.
  const cambios = new Map<number, IndicadorB[]>()
  for (const c of opciones.cambiosInstrumento ?? []) cambios.set(c.dia_mision, [...(cambios.get(c.dia_mision) ?? []), c.indicador])

  const alertas: Alerta[] = []
  const nueva = (
    d: number, capa: Capa, nivel: Alerta["nivel"], indicador: string, valor: number | null,
    extra: Partial<Pick<Alerta, "escalada_auto" | "ambito" | "informativa">> = {},
  ) => alertas.push({
    dia_mision: d, tripulante_id: tripulante.id, capa, nivel, indicador, valor,
    escalada_auto: false, ambito: "personal", informativa: false, ...extra,
  })

  for (const r of vuelo) {
    const d = r.dia_mision
    const env = entornoPorDia[d] ?? {}
    const flujo = env.flujo_protones_10mev_pfu ?? null
    const tormenta = Boolean(env.modo_tormenta) || (flujo !== null && flujo >= PROTONES_TORMENTA_PFU)

    // Capa A: clínica NEWS2
    const { pts, maxIndividual } = puntosNews2(r.fc_reposo_lpm, r.pas_mmHg, r.spo2_pct, r.temp_central_c)
    if (pts >= 5 || maxIndividual === 3) nueva(d, "A", "rojo", "news2", pts, { escalada_auto: true })
    else if (pts >= 3) nueva(d, "A", "ambar", "news2", pts)

    for (const ind of cambios.get(d) ?? []) {
      tierra[ind] = null
      historia[ind] = []
      consecB[ind] = 0
      if (ind in cusum) cusum[ind] = 0
    }

    // Capas B y C: desviación y deriva contra la referencia vigente
    const adaptacion = d <= DIA_FIN_ADAPTACION
    for (const [ind, campo, umbral] of INDICADORES_B) {
      const valor = r[campo]
      if (valor === null) {
        consecB[ind] = 0 // un día sin medida rompe los "dos días seguidos"
        continue
      }
      const ref = referencia(d, tierra[ind], historia[ind], excluidos[ind], piso[ind])
      historia[ind].push([d, valor])
      if (ref === null) continue
      const z = (0.6745 * (valor - ref.centro)) / ref.dispersion
      referencias[ind].push({ dia_mision: d, centro: ref.centro, dispersion: ref.dispersion, z, peso_vuelo: ref.w })

      if (Math.abs(z) >= umbral) {
        consecB[ind] += 1
        excluidos[ind].add(d)
      } else consecB[ind] = 0
      if (consecB[ind] >= DIAS_CONSECUTIVOS_B) nueva(d, "B", "ambar", ind, redondear(valor, 2), { informativa: adaptacion })

      const sentido = SENTIDO_C[ind]
      if (sentido !== undefined && d >= CUSUM_DIA_INICIO) {
        const s = Math.max(0, (cusum[ind] ?? 0) + sentido * z - CUSUM_K)
        cusum[ind] = s
        if (s >= CUSUM_H) {
          nueva(d, "C", "ambar", ind, redondear(s, 2))
          excluidos[ind].add(d)
          cusum[ind] = 0
        }
      }
    }

    // Contexto: el entorno explica el síntoma o pide refugio. Dato ambiental, no personal.
    const co2 = env.co2_mmhg_max_horario ?? null
    if (co2 !== null && co2 > CO2_LIMITE_MMHG && r.sintomas.includes("cefalea")) nueva(d, "contexto", "ambar", "co2", co2, { ambito: "tripulacion" })
    if (tormenta) nueva(d, "contexto", "ambar", "protones", flujo, { ambito: "tripulacion" })
  }
  return { alertas, referencias }
}

/** Solo las alertas (lo que compara el test de paridad con el motor de Python). */
export function evaluarTripulante(
  tripulante: Tripulante,
  entornoPorDia: Record<number, EntornoDia | undefined>,
  opciones: OpcionesMotor = {},
): Alerta[] {
  return analizarTripulante(tripulante, entornoPorDia, opciones).alertas
}
