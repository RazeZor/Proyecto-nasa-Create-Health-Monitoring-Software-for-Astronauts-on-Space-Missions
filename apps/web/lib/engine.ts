/**
 * Análisis de la app: el historial que da la API (GET /tripulantes/{id}/historial, en modo real o demo) más
 * los registros locales del usuario, evaluados con el motor híbrido de packages/engine. Puro: lo llama
 * AppProvider cada vez que cambian los registros, el historial o el perfil de misión. Sin datos inventados
 * aquí: una medida que no se tomó queda en null y la banda personal sale de la referencia que usa el motor.
 */
import {
  type Alerta, type CambioInstrumento, type EntornoDia, type IndicadorB, type Lectura,
  analizarTripulante, DIA_FIN_ADAPTACION, PROTONES_TORMENTA_PFU, puntosNews2, Z_UMBRAL_CONDUCTUAL, Z_UMBRAL_FISIOLOGICO,
} from "../../../packages/engine/engine.ts"
export { descomponer, type Descomposicion } from "../../../packages/engine/series.ts"
import type { EntornoHistorial, Historial, OrigenDato } from "./catalogo.ts"
import { MOTOR, S } from "./strings.ts"
import vocabulario from "./vocabulario.json" with { type: "json" }
import type { Alert, BandPoint, CheckInEntry, DailyVitals, IndicatorId, Status, Symptom, ZoneId, ZoneResult } from "./types.ts"

export const ADAPTATION_END_DAY = DIA_FIN_ADAPTACION
export const BASELINE_SWITCH_DAY = ADAPTATION_END_DAY
export const isAdaptation = (day: number) => day <= ADAPTATION_END_DAY
/** Días seguidos en ámbar tras los que se recomienda compartir, sin hacerlo por el astronauta (§5.4). */
export const DIAS_AMBAR_PARA_RECOMENDAR = 3
const PRESION_ESTACION_MMHG = 760

const rank: Record<Status, number> = { ok: 0, watch: 1, act: 2 }
export const worst = (list: Status[]): Status =>
  list.reduce<Status>((a, b) => (rank[b] > rank[a] ? b : a), "ok")

const ZONA: Record<string, ZoneId | null> = {
  fc: "heart", pas: "heart", news2: "heart", sueno: "mind", animo: "mind", glucosa: "blood", co2: "head", protones: null,
  // síntomas sin causa ambiental (informe §3.2): neuro-oculares y vestibulares a la cabeza; inmunes a sangre e inmunidad
  sintoma_cefalea: "head", sintoma_mareo: "head", sintoma_vision: "head", sintoma_nausea: "head", sintoma_erupcion: "blood",
}
/** Indicador del motor -> indicador de la interfaz al que señala su alerta. */
const DE_MOTOR: Record<string, IndicatorId> = { fc: "restingHr", pas: "systolic", sueno: "sleepH", animo: "mood", glucosa: "glucose" }
const PREFIJO_SINTOMA = "sintoma_"
const ZONAS: ZoneId[] = ["head", "heart", "bone", "blood", "mind"]
const SINTOMA = vocabulario.sintomas as Record<Symptom, string>
/** Indicador de la interfaz -> indicador con banda personal en el motor (capa B). */
const CON_BANDA: Partial<Record<IndicatorId, [IndicadorB, number]>> = {
  restingHr: ["fc", Z_UMBRAL_FISIOLOGICO], systolic: ["pas", Z_UMBRAL_FISIOLOGICO], glucose: ["glucosa", Z_UMBRAL_FISIOLOGICO],
  sleepH: ["sueno", Z_UMBRAL_CONDUCTUAL], mood: ["animo", Z_UMBRAL_CONDUCTUAL],
}
/** Parámetros de la capa A con el id de indicador de la API, para el dato mínimo del escalamiento (§5.4). */
const PARAMETROS_A = [
  ["frecuencia_cardiaca_reposo", "fc_reposo_lpm"], ["presion_arterial_sistolica", "pas_mmHg"],
  ["spo2", "spo2_pct"], ["temperatura_central", "temp_central_c"],
] as const

const ppmAMmHg = (ppm: number, presion: number) => Math.round(((ppm / 1_000_000) * presion) * 1000) / 1000

/** El registro del usuario sobre lo que ya había ese día; lo que no midió conserva el valor previo o queda en null. */
const enLectura = (e: CheckInEntry, base?: Lectura): Lectura => ({
  dia_mision: e.day,
  fc_reposo_lpm: e.restingHr ?? base?.fc_reposo_lpm ?? null,
  pas_mmHg: e.systolic ?? base?.pas_mmHg ?? null,
  spo2_pct: e.spo2 ?? base?.spo2_pct ?? null,
  temp_central_c: e.tempC ?? base?.temp_central_c ?? null,
  sueno_h: e.sleepH ?? base?.sueno_h ?? null,
  animo_1_10: e.mood,
  glucosa_mg_dl: e.glucose ?? (base as { glucosa_mg_dl?: number | null } | undefined)?.glucosa_mg_dl ?? null,
  sintomas: e.symptoms.map((s) => SINTOMA[s]),
  durante_tormenta: base?.durante_tormenta ?? false,
})

/** Entorno del día para el motor: el CO2 real llega en ppm y se convierte con la presión de cabina del perfil (§3.3). */
function entornoMotor(e: EntornoHistorial, presion: number): EntornoDia {
  const co2 = e.co2_ppm_max_horario != null ? ppmAMmHg(e.co2_ppm_max_horario, presion) : (e.co2_mmhg_max_horario ?? null)
  return { co2_mmhg_max_horario: co2, flujo_protones_10mev_pfu: e.flujo_protones_10mev_pfu ?? null, modo_tormenta: Boolean(e.modo_tormenta) }
}

const textoOrigen = (o?: OrigenDato | null) =>
  !o ? "" : o.naturaleza === "Real" ? `${MOTOR.real} · ${o.fuente}${o.fecha_real ? ` · ${o.fecha_real}` : ""}` : `${MOTOR.simulado} · ${MOTOR.escenarioDemo}`

/** El parámetro de la capa A que más puntúa ese día: indicador, valor y tramo (lo único que sale en un escalamiento). */
function parametroClinico(l: Lectura | undefined, suma: number) {
  if (!l) return undefined
  const puntos = PARAMETROS_A.map(([indicador, campo]) => {
    const valor = l[campo]
    const args: [number | null, number | null, number | null, number | null] = [null, null, null, null]
    args[PARAMETROS_A.findIndex((p) => p[0] === indicador)] = valor
    return { indicador, valor, pts: puntosNews2(...args).pts }
  }).filter((p): p is { indicador: (typeof PARAMETROS_A)[number][0]; valor: number; pts: number } => p.valor !== null)
  const peor = puntos.sort((a, b) => b.pts - a.pts)[0]
  if (!peor || peor.pts === 0) return undefined
  return { indicador: peor.indicador, valor: peor.valor, tramo: peor.pts === 3 ? MOTOR.tramoExtremo : MOTOR.tramoSuma(peor.pts, suma) }
}

export function analizar(checkIns: CheckInEntry[], historial: Historial, presionCabinaMmHg: number = PRESION_ESTACION_MMHG) {
  const MISSION_DAYS = historial.dias_vuelo
  const entornoApi = new Map(historial.entorno_diario.map((e) => [e.dia_mision, e]))
  const ENTORNO: Record<number, EntornoDia> = Object.fromEntries(
    historial.entorno_diario.map((e) => [e.dia_mision, entornoMotor(e, presionCabinaMmHg)]),
  )
  const porDia = new Map<number, Lectura>(historial.lecturas.map((l) => [l.dia_mision, l as Lectura]))
  for (const e of checkIns) porDia.set(e.day, enLectura(e, porDia.get(e.day))) // el último registro del día manda
  const lecturas = [...porDia.values()].sort((a, b) => a.dia_mision - b.dia_mision)
  const cambiosInstrumento = cambiosDeInstrumento(checkIns, historial)
  const { alertas: alertasMotor, referencias } = analizarTripulante({ id: "yo", lecturas }, ENTORNO, { cambiosInstrumento })
  // hora de la medida que produce cada alerta: la del registro local o, si vino por otra vía (reloj, otro
  // dispositivo), la de la última lectura del día en el historial real
  const creado = new Map<number, string>()
  for (const l of historial.lecturas) if (l.t_real) creado.set(l.dia_mision, l.t_real)
  for (const e of checkIns) if (e.createdAt) creado.set(e.day, e.createdAt)

  function textoAlerta(a: Alerta): Alert {
    const capa = a.capa === "contexto" ? "context" : a.capa
    if (a.indicador.startsWith(PREFIJO_SINTOMA)) {
      // síntoma que el entorno medido no explica: ámbar personal en su zona; nunca escala
      const codigo = a.indicador.slice(PREFIJO_SINTOMA.length)
      const ui = (Object.keys(SINTOMA) as Symptom[]).find((k) => SINTOMA[k] === codigo)
      const zona = ZONA[a.indicador] ?? "head"
      const t = creado.get(a.dia_mision)
      return {
        id: `al-${a.dia_mision}-${capa}-${a.indicador}`, key: a.indicador, day: a.dia_mision, time: t ? new Date(t).toISOString().slice(11, 16) : "",
        createdAt: t ?? null, status: "watch", layer: capa, zone: zona,
        indicator: `${MOTOR.sintoma}: ${ui ? S.symptoms[ui] : codigo}`, value: "", clinicalBand: MOTOR.bandaSintoma, cause: MOTOR.causaSintoma,
        action: MOTOR.accionSintoma[zona === "blood" ? "blood" : "head"], scope: "personal", informative: false, escalates: false,
      }
    }
    const indicador = a.indicador as keyof typeof MOTOR.indicador
    const unidad = MOTOR.unidad[indicador]
    const env = entornoApi.get(a.dia_mision)
    const sep = env?.eventos_sep?.[0]
    // una tormenta disparada por un evento SEP de DONKI con el flujo medido bajo el umbral se nombra por el evento, no por el flujo
    const porEvento = a.indicador === "protones" && sep && (a.valor === null || a.valor < PROTONES_TORMENTA_PFU)
    const valor = porEvento ? MOTOR.eventoSep(sep.sepID) : a.valor === null ? "" : a.capa === "C" ? `CUSUM ${a.valor}` : `${a.valor} ${unidad}`
    const origen = a.indicador === "co2" ? textoOrigen(env?.co2_origen)
      : a.indicador === "protones" ? (sep ? `${MOTOR.real} · ${sep.fuente} · ${sep.t_real.slice(0, 10)}` : textoOrigen(env?.flujo_origen))
      : ""
    const t = creado.get(a.dia_mision)
    return {
      id: `al-${a.dia_mision}-${capa}-${a.indicador}`,
      key: a.indicador,
      day: a.dia_mision,
      time: t ? new Date(t).toISOString().slice(11, 16) : "",
      createdAt: t ?? null,
      status: a.nivel === "rojo" ? "act" : "watch",
      layer: capa,
      zone: ZONA[a.indicador] ?? null,
      indicator: MOTOR.indicador[indicador],
      value: valor,
      clinicalBand: a.capa === "contexto" ? MOTOR.bandaContexto[a.indicador as "co2" | "protones"] : a.capa === "A" && a.nivel === "ambar" ? MOTOR.bandaAAmbar : MOTOR.banda[capa],
      cause: a.capa === "contexto" ? MOTOR.causaContexto[a.indicador as "co2" | "protones"] : MOTOR.causa[capa],
      action: MOTOR.accion[indicador],
      scope: a.ambito === "tripulacion" ? "crew" : "personal",
      informative: a.informativa,
      escalates: a.escalada_auto,
      source: origen || undefined,
      clinical: a.capa === "A" && a.escalada_auto ? parametroClinico(porDia.get(a.dia_mision), a.valor ?? 0) : undefined,
    }
  }

  const todas = alertasMotor.map(textoAlerta)
  // §5.4: tras 3 días seguidos en ámbar en la misma zona se recomienda compartir (no se comparte solo)
  const ambarPersonal = (dia: number, zona: ZoneId | null) =>
    todas.some((a) => a.day === dia && a.zone === zona && a.status === "watch" && a.scope === "personal" && !a.informative)
  for (const a of todas) {
    if (a.status !== "watch" || a.scope !== "personal" || a.informative) continue
    a.recommendShare = Array.from({ length: DIAS_AMBAR_PARA_RECOMENDAR }, (_, i) => a.day - i).every((d) => ambarPersonal(d, a.zone))
  }

  const alerts = (day: number) =>
    todas.filter((a) => a.day <= day).sort((a, b) => b.day - a.day || b.time.localeCompare(a.time))

  const vitals = (day: number): DailyVitals[] =>
    lecturas.filter((l) => l.dia_mision >= 1 && l.dia_mision <= day).map((l) => {
      const orig = historial.lecturas.find((x) => x.dia_mision === l.dia_mision)
      const usuario = checkIns.findLast((e) => e.day === l.dia_mision)
      const v: DailyVitals = {
        day: l.dia_mision, restingHr: l.fc_reposo_lpm, systolic: l.pas_mmHg,
        diastolic: usuario?.diastolic ?? orig?.pad_mmHg ?? null, spo2: l.spo2_pct, tempC: l.temp_central_c, sleepH: l.sueno_h,
        mood: l.animo_1_10,
        symptoms: l.sintomas.flatMap((s) => Object.entries(SINTOMA).filter(([, c]) => c === s).map(([k]) => k as Symptom)),
      }
      const glucosa = usuario?.glucose ?? orig?.glucosa_mg_dl
      const masa = usuario?.massKg ?? orig?.masa_kg
      if (glucosa != null) v.glucose = glucosa
      if (masa != null) v.massKg = masa
      return v
    })

  /** true si ese día hay alguna medida (del historial o del usuario). */
  const hasData = (day: number) => porDia.has(day)

  const zones = (day: number): ZoneResult[] => {
    const activas = todas.filter((a) => !a.informative && (a.day === day || (a.day === day - 1 && a.layer !== "A")))
    return ZONAS.map((zone) => {
      const hit = activas.filter((a) => a.zone === zone).sort((a, b) => rank[b.status] - rank[a.status])[0]
      if (!hit) return { zone, status: "ok", layer: null, why: hasData(day) ? MOTOR.estable : MOTOR.sinDatos, deviation: hasData(day) ? MOTOR.dentroBanda : "—", next: MOTOR.zona[zone] }
      return { zone, status: hit.status, layer: hit.layer, why: hit.cause, deviation: `${hit.value} (${hit.clinicalBand})`, next: hit.action }
    })
  }

  /** Banda personal por día: centro ± umbral de la capa B con la referencia vigente (tierra, mezcla o vuelo). */
  const band = (id: IndicatorId): BandPoint[] => {
    const con = CON_BANDA[id]
    if (!con) return []
    const [ind, umbral] = con
    return referencias[ind].map((r) => {
      const ancho = (umbral / 0.6745) * r.dispersion
      return { day: r.dia_mision, low: r.centro - ancho, high: r.centro + ancho, flightWeight: r.peso_vuelo }
    })
  }

  /**
   * Estado de cada indicador ese día, con la misma regla de vigencia que las zonas. Las capas B y C y la glucosa
   * señalan su indicador; la capa A (NEWS2) es una suma, así que señala los parámetros que puntúan en ella.
   */
  const indicatorStatus = (day: number): Record<IndicatorId, Status> => {
    const r: Record<IndicatorId, Status> = { restingHr: "ok", systolic: "ok", spo2: "ok", tempC: "ok", sleepH: "ok", mood: "ok", glucose: "ok", massKg: "ok" }
    const subir = (id: IndicatorId, s: Status) => {
      if (rank[s] > rank[r[id]]) r[id] = s
    }
    for (const a of todas) {
      if (a.informative || !(a.day === day || (a.day === day - 1 && a.layer !== "A"))) continue
      const directo = a.key ? DE_MOTOR[a.key] : undefined
      if (directo) subir(directo, a.status)
      if (a.key !== "news2") continue
      const l = porDia.get(a.day)
      if (!l) continue
      if (puntosNews2(l.fc_reposo_lpm, null, null, null).pts > 0) subir("restingHr", a.status)
      if (puntosNews2(null, l.pas_mmHg, null, null).pts > 0) subir("systolic", a.status)
      if (puntosNews2(null, null, l.spo2_pct, null).pts > 0) subir("spo2", a.status)
      if (puntosNews2(null, null, null, l.temp_central_c).pts > 0) subir("tempC", a.status)
    }
    return r
  }

  const overall = (day: number): Status => worst(zones(day).map((z) => z.status))
  /** Tormenta del día y de dónde sale: evento SEP real de DONKI, flujo medido o anomalía simulada. */
  const stormInfo = (day: number) => {
    const e = entornoApi.get(day)
    if (!e) return null
    const flujo = e.flujo_protones_10mev_pfu ?? null
    const porFlujo = flujo !== null && flujo >= PROTONES_TORMENTA_PFU
    if (!e.modo_tormenta && !porFlujo) return null
    const sep = e.eventos_sep?.[0]
    return {
      flux: porFlujo ? flujo : null,
      event: sep ?? null,
      source: sep ? `${MOTOR.real} · ${sep.fuente} · ${sep.sepID}` : textoOrigen(e.flujo_origen),
      simulated: !sep && e.flujo_origen?.naturaleza !== "Real",
    }
  }
  const storm = (day: number) => stormInfo(day) !== null
  /** CO2 del día en mmHg con el perfil activo, y su procedencia. */
  const co2 = (day: number) => {
    const e = entornoApi.get(day)
    const mmHg = ENTORNO[day]?.co2_mmhg_max_horario ?? null
    return e && mmHg !== null ? { mmHg, ppm: e.co2_ppm_max_horario ?? null, source: textoOrigen(e.co2_origen), simulated: e.co2_origen?.naturaleza !== "Real" } : null
  }
  return { alerts, vitals, zones, indicatorStatus, overall, band, storm, stormInfo, co2, hasData, missionDays: MISSION_DAYS, cambiosInstrumento, real: historial.modo === "real" }
}

/**
 * Días de vuelo en que la FC en reposo cambia de instrumento respecto al día de vuelo anterior (A.6). Cuentan
 * el historial de la API (`fc_instrumento`; ausente = manual) y los registros locales; el último del día manda.
 */
export function cambiosDeInstrumento(checkIns: CheckInEntry[], historial?: Historial): CambioInstrumento[] {
  const porDia = new Map<number, string>()
  for (const l of historial?.lecturas ?? []) if (l.dia_mision >= 1 && l.fc_reposo_lpm != null) porDia.set(l.dia_mision, l.fc_instrumento ?? "manual")
  for (const e of checkIns) if (e.day >= 1 && e.restingHr != null) porDia.set(e.day, e.hrInstrument ?? "manual")
  const cambios: CambioInstrumento[] = []
  let previo = "manual"
  for (const [dia, instrumento] of [...porDia].sort((a, b) => a[0] - b[0])) {
    if (instrumento !== previo) cambios.push({ dia_mision: dia, indicador: "fc" })
    previo = instrumento
  }
  return cambios
}

export type Analisis = ReturnType<typeof analizar>

/** Estado de un registro recién llenado: lo peor que el motor encuentra ese día, o ámbar si hay síntomas. */
export function evaluateCheckIn(
  e: Omit<CheckInEntry, "status" | "id" | "createdAt">, previos: CheckInEntry[], historial: Historial, presionCabinaMmHg?: number,
): Status {
  const nuevo: CheckInEntry = { ...e, status: "ok", id: "nuevo", createdAt: "" }
  const estado = analizar([...previos, nuevo], historial, presionCabinaMmHg).alerts(e.day)
    .filter((a) => a.day === e.day && !a.informative && a.scope === "personal").map((a) => a.status)
  return worst([...estado, ...(e.symptoms.length > 0 ? (["watch"] as Status[]) : [])])
}
