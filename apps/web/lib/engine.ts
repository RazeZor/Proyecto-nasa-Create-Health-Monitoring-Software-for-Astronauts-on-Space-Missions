/**
 * Análisis de la app: el escenario de partida (caso de referencia, trip-1) más los registros
 * del usuario, evaluados con el motor híbrido de packages/engine. Puro: lo llama AppProvider
 * cada vez que cambian los registros. Sin datos inventados aquí: las bandas salen de la
 * mediana y el MAD del prevuelo.
 */
import caso from "../../../packages/engine/fixtures/caso-referencia.json" with { type: "json" }
import {
  type Alerta, type Lectura, factorAdaptacion, madBruto, SUPUESTOS, Z_UMBRAL_CONDUCTUAL, Z_UMBRAL_FISIOLOGICO,
  evaluarTripulante,
} from "../../../packages/engine/engine.ts"
import { MOTOR } from "./strings.ts"
import vocabulario from "./vocabulario.json" with { type: "json" }
import type {
  Alert, Baseline, CheckInEntry, DailyVitals, IndicatorId, Status, Symptom, ZoneId, ZoneResult,
} from "./types.ts"

export const ADAPTATION_END_DAY = 14
export const BASELINE_SWITCH_DAY = ADAPTATION_END_DAY
export const MISSION_DAYS = caso.dias_vuelo
export const isAdaptation = (day: number) => day <= ADAPTATION_END_DAY

const rank: Record<Status, number> = { ok: 0, watch: 1, act: 2 }
export const worst = (list: Status[]): Status =>
  list.reduce<Status>((a, b) => (rank[b] > rank[a] ? b : a), "ok")

const TRIPULANTE = caso.tripulantes[0]
const ENTORNO = Object.fromEntries(caso.entorno_diario.map((e) => [e.dia_mision, e]))
const ZONA: Record<string, ZoneId> = { fc: "heart", pas: "heart", news2: "heart", sueno: "mind", animo: "mind", conductual: "mind", co2: "head" }
const ZONAS: ZoneId[] = ["head", "heart", "bone", "blood", "mind"]
const SINTOMA = vocabulario.sintomas as Record<Symptom, string>

const enLectura = (e: CheckInEntry, base?: Lectura): Lectura => ({
  dia_mision: e.day,
  fc_reposo_lpm: e.restingHr ?? base?.fc_reposo_lpm ?? 0,
  pas_mmHg: e.systolic ?? base?.pas_mmHg ?? 0,
  spo2_pct: e.spo2 ?? base?.spo2_pct ?? 0,
  temp_central_c: e.tempC ?? base?.temp_central_c ?? 0,
  sueno_h: e.sleepH ?? base?.sueno_h ?? 0,
  animo_1_10: e.mood,
  sintomas: e.symptoms.map((s) => SINTOMA[s]),
  durante_tormenta: base?.durante_tormenta ?? false,
})

function textoAlerta(a: Alerta): Alert {
  const capa = a.capa === "contexto" ? "context" : a.capa
  const unidad = MOTOR.unidad[(a.indicador === "conductual" ? "sueno" : a.indicador) as keyof typeof MOTOR.unidad]
  const valor = a.valor === null ? "" : a.capa === "C" ? `CUSUM ${a.valor}` : `${a.valor} ${unidad}`
  return {
    id: `al-${a.dia_mision}-${capa}-${a.indicador}`,
    day: a.dia_mision,
    time: "06:30", // shortcut: el motor trabaja por día; sin hora de lectura, usar la de createdAt del registro
    status: a.nivel === "rojo" ? "act" : "watch",
    layer: capa,
    zone: ZONA[a.indicador],
    indicator: MOTOR.indicador[a.indicador as keyof typeof MOTOR.indicador],
    value: valor,
    clinicalBand: MOTOR.banda[capa],
    cause: MOTOR.causa[capa],
    action: MOTOR.accion[a.indicador as keyof typeof MOTOR.accion],
  }
}

/** Banda personal [bajo, alto] de un indicador con Capa B, desplazada por la adaptación al vuelo. */
function bandaMad(valores: number[], minimo: number, z: number, desplazamiento: number): [number, number] {
  const [med, mad] = madBruto(valores, minimo)
  const ancho = z / 0.6745 * mad
  return [med + desplazamiento - ancho, med + desplazamiento + ancho]
}

export function analizar(checkIns: CheckInEntry[]) {
  const porDia = new Map<number, Lectura>(TRIPULANTE.lecturas.map((l) => [l.dia_mision, l as Lectura]))
  for (const e of checkIns) porDia.set(e.day, enLectura(e, porDia.get(e.day))) // el último registro del día manda
  const lecturas = [...porDia.values()].sort((a, b) => a.dia_mision - b.dia_mision)
  const alertasMotor = evaluarTripulante({ id: TRIPULANTE.id, lecturas }, ENTORNO)
  const todas = alertasMotor.map(textoAlerta)

  const alerts = (day: number) =>
    todas.filter((a) => a.day <= day).sort((a, b) => b.day - a.day || b.time.localeCompare(a.time))

  const vitals = (day: number): DailyVitals[] =>
    lecturas.filter((l) => l.dia_mision >= 1 && l.dia_mision <= day).map((l) => {
      const orig = TRIPULANTE.lecturas.find((x) => x.dia_mision === l.dia_mision)
      const v: DailyVitals = {
        day: l.dia_mision, restingHr: l.fc_reposo_lpm, systolic: l.pas_mmHg,
        diastolic: orig?.pad_mmHg ?? 0, spo2: l.spo2_pct, tempC: l.temp_central_c, sleepH: l.sueno_h,
        mood: l.animo_1_10,
        symptoms: l.sintomas.flatMap((s) => Object.entries(SINTOMA).filter(([, c]) => c === s).map(([k]) => k as Symptom)),
      }
      const usuario = checkIns.findLast((e) => e.day === l.dia_mision)
      const glucosa = usuario?.glucose ?? orig?.glucosa_mg_dl
      const masa = usuario?.massKg ?? orig?.masa_kg
      if (glucosa != null) v.glucose = glucosa
      if (masa != null) v.massKg = masa
      return v
    })

  const zones = (day: number): ZoneResult[] => {
    const activas = todas.filter((a) => a.day === day || (a.day === day - 1 && a.layer !== "A"))
    return ZONAS.map((zone) => {
      const hit = activas.filter((a) => a.zone === zone).sort((a, b) => rank[b.status] - rank[a.status])[0]
      if (!hit) return { zone, status: "ok", layer: null, why: MOTOR.estable, deviation: MOTOR.dentroBanda, next: MOTOR.zona[zone] }
      return { zone, status: hit.status, layer: hit.layer, why: hit.cause, deviation: `${hit.value} (${hit.clinicalBand})`, next: hit.action }
    })
  }

  const baselines = (id: IndicatorId): Baseline[] => {
    const pre = lecturas.filter((l) => l.dia_mision <= 0)
    const w = factorAdaptacion(ADAPTATION_END_DAY + 1)
    const piso = SUPUESTOS.mad_min
    const bandas: Partial<Record<IndicatorId, [[number, number], [number, number]]>> = {
      restingHr: [
        bandaMad(pre.map((l) => l.fc_reposo_lpm), piso.fc, Z_UMBRAL_FISIOLOGICO, 0),
        bandaMad(pre.map((l) => l.fc_reposo_lpm), piso.fc, Z_UMBRAL_FISIOLOGICO, SUPUESTOS.fc_desplazamiento_lpm * w),
      ],
      systolic: [
        bandaMad(pre.map((l) => l.pas_mmHg), piso.pas, Z_UMBRAL_FISIOLOGICO, 0),
        bandaMad(pre.map((l) => l.pas_mmHg), piso.pas, Z_UMBRAL_FISIOLOGICO, SUPUESTOS.pas_desplazamiento_mmHg * w),
      ],
      sleepH: [
        bandaMad(pre.map((l) => l.sueno_h), piso.sueno, Z_UMBRAL_CONDUCTUAL, 0),
        bandaMad(pre.map((l) => l.sueno_h), piso.sueno, Z_UMBRAL_CONDUCTUAL, SUPUESTOS.sueno_desplazamiento_h * w),
      ],
      mood: [
        bandaMad(pre.map((l) => l.animo_1_10), piso.animo, Z_UMBRAL_CONDUCTUAL, 0),
        bandaMad(pre.map((l) => l.animo_1_10), piso.animo, Z_UMBRAL_CONDUCTUAL, 0),
      ],
    }
    let par = bandas[id]
    if (!par) {
      // sin capa B para este indicador: rango observado en el prevuelo
      const valores = (id === "spo2" ? pre.map((l) => l.spo2_pct) : id === "tempC" ? pre.map((l) => l.temp_central_c)
        : TRIPULANTE.lecturas.filter((l) => l.dia_mision <= 0).map((l) => (id === "glucose" ? l.glucosa_mg_dl : l.masa_kg))
          .filter((v): v is number => v != null))
      if (valores.length === 0) return []
      par = [[Math.min(...valores), Math.max(...valores)], [Math.min(...valores), Math.max(...valores)]]
    }
    return [
      { phase: "pre-flight", fromDay: 1, toDay: BASELINE_SWITCH_DAY, low: par[0][0], high: par[0][1] },
      { phase: "in-flight", fromDay: BASELINE_SWITCH_DAY, toDay: MISSION_DAYS, low: par[1][0], high: par[1][1] },
    ]
  }

  const overall = (day: number): Status => worst(zones(day).map((z) => z.status))
  const storm = (day: number) => Boolean(ENTORNO[day]?.modo_tormenta)
  return { alerts, vitals, zones, overall, baselines, storm }
}

export type Analisis = ReturnType<typeof analizar>

/** Estado de un registro recién llenado: lo peor que el motor encuentra ese día, o ámbar si hay síntomas. */
export function evaluateCheckIn(e: Omit<CheckInEntry, "status" | "id" | "createdAt">, previos: CheckInEntry[]): Status {
  const nuevo: CheckInEntry = { ...e, status: "ok", id: "nuevo", createdAt: "" }
  const estado = analizar([...previos, nuevo]).alerts(e.day).filter((a) => a.day === e.day).map((a) => a.status)
  return worst([...estado, ...(e.symptoms.length > 0 ? (["watch"] as Status[]) : [])])
}
