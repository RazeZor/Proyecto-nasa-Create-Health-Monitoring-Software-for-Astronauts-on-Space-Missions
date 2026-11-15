/**
 * Análisis de la app: el historial que da la API (GET /tripulantes/{id}/historial) más los registros
 * del usuario, evaluados con el motor híbrido de packages/engine. Puro: lo llama AppProvider
 * cada vez que cambian los registros. Sin datos inventados aquí: las bandas salen de la
 * mediana y el MAD del prevuelo.
 */
import {
  type Alerta, type Lectura, factorAdaptacion, madBruto, SUPUESTOS, Z_UMBRAL_CONDUCTUAL, Z_UMBRAL_FISIOLOGICO,
  evaluarTripulante,
  type CambioInstrumento,
} from "../../../packages/engine/engine.ts"
import type { Historial } from "./catalogo.ts"
import { MOTOR } from "./strings.ts"
import vocabulario from "./vocabulario.json" with { type: "json" }
import type {
  Alert, Baseline, CheckInEntry, DailyVitals, IndicatorId, Status, Symptom, ZoneId, ZoneResult,
} from "./types.ts"

export const ADAPTATION_END_DAY = 14
export const BASELINE_SWITCH_DAY = ADAPTATION_END_DAY
export const isAdaptation = (day: number) => day <= ADAPTATION_END_DAY

const rank: Record<Status, number> = { ok: 0, watch: 1, act: 2 }
export const worst = (list: Status[]): Status =>
  list.reduce<Status>((a, b) => (rank[b] > rank[a] ? b : a), "ok")

const ZONA: Record<string, ZoneId> = {
  fc: "heart",
  pas: "heart",
  news2: "heart",
  sueno: "mind",
  animo: "mind",
  conductual: "mind",
  co2: "head",
  neuro: "head",
  temp: "blood",
  glucosa: "blood",
  inmune: "blood",
  masa: "bone",
}
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
  const valor = a.valor === null ? "" : a.capa === "C" && a.indicador !== "masa" ? `CUSUM ${a.valor}` : `${a.valor} ${unidad}`
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

/**
 * Evalúa indicadores fisiológicos, metabólicos, de masa corporal y síntomas reportados en check-ins
 * que complementan al motor base para cubrir las 5 zonas del cuerpo (head, heart, bone, blood, mind).
 */
function alertasCheckIn(
  checkIns: CheckInEntry[],
  medMasaPre: number | null,
  entorno: Record<number, { co2_mmhg_max_horario?: number }>,
  base: Alerta[],
): Alerta[] {
  const porDiaUsuario = new Map<number, CheckInEntry>()
  for (const e of checkIns) {
    if (e.day >= 1) porDiaUsuario.set(e.day, e)
  }
  const yaEmitida = (dia: number, ind: string) => base.some((a) => a.dia_mision === dia && a.indicador === ind)
  const extras: Alerta[] = []
  const mk = (dia: number, capa: Alerta["capa"], nivel: Alerta["nivel"], indicador: string, valor: number | null): Alerta => ({
    tripulante_id: "yo", dia_mision: dia, capa, nivel, indicador, valor, escalada_auto: nivel === "rojo",
  })

  for (const [dia, e] of porDiaUsuario) {
    if (e.tempC != null && !yaEmitida(dia, "temp")) {
      if (e.tempC <= 35.0 || e.tempC >= 39.1) {
        extras.push(mk(dia, "A", "rojo", "temp", e.tempC))
      } else if ((e.tempC > 35.0 && e.tempC <= 35.5) || (e.tempC >= 38.1 && e.tempC < 39.1)) {
        extras.push(mk(dia, "A", "ambar", "temp", e.tempC))
      }
    }
    if (e.glucose != null && !yaEmitida(dia, "glucosa")) {
      if (e.glucose < 54 || e.glucose >= 180) {
        extras.push(mk(dia, "A", "rojo", "glucosa", e.glucose))
      } else if ((e.glucose >= 54 && e.glucose < 70) || (e.glucose > 126 && e.glucose < 180)) {
        extras.push(mk(dia, "B", "ambar", "glucosa", e.glucose))
      }
    }
    if (e.massKg != null && medMasaPre != null && medMasaPre > 0 && !yaEmitida(dia, "masa")) {
      const perdidaPct = ((medMasaPre - e.massKg) / medMasaPre) * 100
      if (perdidaPct >= 4.4) {
        extras.push(mk(dia, "C", "rojo", "masa", Math.round(e.massKg * 10) / 10))
      } else if (perdidaPct >= 2.8) {
        extras.push(mk(dia, "C", "ambar", "masa", Math.round(e.massKg * 10) / 10))
      }
    }
    const tieneNeuro = e.symptoms.some((s) => s === "headache" || s === "dizziness" || s === "visionChange")
    if (tieneNeuro && !yaEmitida(dia, "co2") && !yaEmitida(dia, "neuro")) {
      const co2Alto = (entorno[dia]?.co2_mmhg_max_horario ?? 0) >= 3.0 && e.symptoms.includes("headache")
      if (!co2Alto) {
        extras.push(mk(dia, "B", "ambar", "neuro", null))
      }
    }
    const tieneInmune = e.symptoms.some((s) => s === "rash" || s === "nausea")
    if (tieneInmune && !yaEmitida(dia, "inmune")) {
      extras.push(mk(dia, "B", "ambar", "inmune", null))
    }
    if (e.sleepH != null && e.sleepH < 4 && !yaEmitida(dia, "sueno")) {
      extras.push(mk(dia, "B", "ambar", "sueno", e.sleepH))
    }
    if (e.mood <= 3 && !yaEmitida(dia, "animo")) {
      extras.push(mk(dia, "B", "ambar", "animo", e.mood))
    }
  }
  return extras
}

/** Banda personal [bajo, alto] de un indicador con Capa B, desplazada por la adaptación al vuelo. */
function bandaMad(valores: number[], minimo: number, z: number, desplazamiento: number): [number, number] {
  const [med, mad] = madBruto(valores, minimo)
  const ancho = z / 0.6745 * mad
  return [med + desplazamiento - ancho, med + desplazamiento + ancho]
}

export function analizar(checkIns: CheckInEntry[], historial: Historial) {
  const TRIPULANTE = historial
  const MISSION_DAYS = historial.dias_vuelo
  const ENTORNO = Object.fromEntries(historial.entorno_diario.map((e) => [e.dia_mision, e]))
  const porDia = new Map<number, Lectura>(TRIPULANTE.lecturas.map((l) => [l.dia_mision, l as Lectura]))
  for (const e of checkIns) porDia.set(e.day, enLectura(e, porDia.get(e.day))) // el último registro del día manda
  const lecturas = [...porDia.values()].sort((a, b) => a.dia_mision - b.dia_mision)
  const cambiosInstrumento = cambiosDeInstrumento(checkIns)
  const masasPre = TRIPULANTE.lecturas.filter((l) => l.dia_mision <= 0).map((l) => l.masa_kg).filter((v): v is number => v != null)
  const medMasaPre = masasPre.length > 0 ? madBruto(masasPre, 0.1)[0] : null
  const alertasBase = evaluarTripulante({ id: "yo", lecturas }, ENTORNO, { cambiosInstrumento })
  const alertasMotor = [...alertasBase, ...alertasCheckIn(checkIns, medMasaPre, ENTORNO, alertasBase)]
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

  const lecturasZona = (day: number, zone: ZoneId): { label: string; value: string; reference: string }[] => {
    const serie = vitals(day)
    const v = serie.find((x) => x.day === day) ?? serie.at(-1)
    const rangoBanda = (id: IndicatorId, unidad: string) => {
      const lista = baselines(id)
      const b = lista.find((x) => day >= x.fromDay && day <= x.toDay) ?? lista[0]
      return b ? `${b.low.toFixed(1)}–${b.high.toFixed(1)} ${unidad}`.trim() : "—"
    }
    if (!v) return []
    switch (zone) {
      case "heart":
        return [
          { label: MOTOR.indicador.fc, value: `${v.restingHr} lpm`, reference: rangoBanda("restingHr", "lpm") },
          { label: MOTOR.indicador.pas, value: `${v.systolic}/${v.diastolic} mmHg`, reference: rangoBanda("systolic", "mmHg") },
        ]
      case "head":
        return [
          { label: "SpO₂", value: `${v.spo2} %`, reference: `≥ 96 % (${rangoBanda("spo2", "%")})` },
          { label: MOTOR.indicador.co2, value: `${(ENTORNO[day]?.co2_mmhg_max_horario ?? 0).toFixed(1)} mmHg`, reference: "< 3.0 mmHg" },
        ]
      case "bone": {
        const ultMasa = serie.filter((x) => x.massKg != null).at(-1)
        return [
          {
            label: MOTOR.indicador.masa,
            value: ultMasa?.massKg != null ? `${ultMasa.massKg.toFixed(1)} kg (D${ultMasa.day})` : "—",
            reference: medMasaPre != null ? `Base ${medMasaPre.toFixed(1)} kg (±2.8 %)` : rangoBanda("massKg", "kg"),
          },
        ]
      }
      case "blood": {
        const ultGlucosa = serie.filter((x) => x.glucose != null).at(-1)
        return [
          { label: MOTOR.indicador.temp, value: `${v.tempC.toFixed(1)} °C`, reference: `36.1–37.8 °C (${rangoBanda("tempC", "°C")})` },
          {
            label: MOTOR.indicador.glucosa,
            value: ultGlucosa?.glucose != null ? `${ultGlucosa.glucose} mg/dL (D${ultGlucosa.day})` : "—",
            reference: "70–126 mg/dL",
          },
        ]
      }
      case "mind":
        return [
          { label: MOTOR.indicador.sueno, value: `${v.sleepH} h`, reference: rangoBanda("sleepH", "h") },
          { label: MOTOR.indicador.animo, value: `${v.mood} /10`, reference: rangoBanda("mood", "/10") },
        ]
    }
  }

  const zones = (day: number): ZoneResult[] => {
    const activas = todas.filter((a) => a.day === day || (a.day === day - 1 && a.layer !== "A"))
    return ZONAS.map((zone) => {
      const hit = activas.filter((a) => a.zone === zone).sort((a, b) => rank[b.status] - rank[a.status])[0]
      if (!hit) {
        const resumen = lecturasZona(day, zone).map((r) => `${r.label}: ${r.value}`).join(" · ")
        return {
          zone,
          status: "ok",
          layer: null,
          why: MOTOR.estable,
          deviation: resumen ? `${MOTOR.dentroBanda} · ${resumen}` : MOTOR.dentroBanda,
          next: MOTOR.zona[zone],
        }
      }
      const detalle = hit.value ? `${hit.value} (${hit.clinicalBand})` : hit.clinicalBand
      return { zone, status: hit.status, layer: hit.layer, why: hit.cause, deviation: detalle, next: hit.action }
    })
  }

  const lineasBaseServidor = () => {
    const pre = lecturas.filter((l) => l.dia_mision <= 0)
    const vuelo = lecturas.filter((l) => l.dia_mision >= 1 && l.dia_mision <= ADAPTATION_END_DAY)
    const piso = SUPUESTOS.mad_min
    const r2 = (n: number) => Math.round(n * 100) / 100
    const specs: [IndicatorId, (l: Lectura) => number, number][] = [
      ["restingHr", (l) => l.fc_reposo_lpm, piso.fc],
      ["systolic", (l) => l.pas_mmHg, piso.pas],
      ["sleepH", (l) => l.sueno_h, piso.sueno],
      ["mood", (l) => l.animo_1_10, piso.animo],
    ]
    const resultado: { indicador: IndicatorId; origen: "tierra" | "vuelo"; mediana: number; mad: number; n: number; desde: string; hasta: string }[] = []
    for (const [indicador, leer, minMad] of specs) {
      if (pre.length > 0) {
        const [med, mad] = madBruto(pre.map(leer), minMad)
        resultado.push({ indicador, origen: "tierra", mediana: r2(med), mad: r2(mad), n: pre.length, desde: "2026-10-31T00:00:00Z", hasta: "2026-11-13T00:00:00Z" })
      }
      if (vuelo.length > 0) {
        const [med, mad] = madBruto(vuelo.map(leer), minMad)
        resultado.push({ indicador, origen: "vuelo", mediana: r2(med), mad: r2(mad), n: vuelo.length, desde: "2026-11-14T00:00:00Z", hasta: "2026-11-27T00:00:00Z" })
      }
    }
    return resultado
  }

  const overall = (day: number): Status => worst(zones(day).map((z) => z.status))
  const storm = (day: number) => Boolean(ENTORNO[day]?.modo_tormenta)
  return { alerts, alertasMotor, lineasBaseServidor, vitals, zones, lecturasZona, overall, baselines, storm, missionDays: MISSION_DAYS, cambiosInstrumento }
}

/**
 * Días de vuelo en que la FC en reposo cambia de instrumento respecto al día de vuelo anterior (A.6). El
 * historial de la API cuenta como entrada manual. El último registro de cada día manda, igual que en `analizar`.
 */
export function cambiosDeInstrumento(checkIns: CheckInEntry[]): CambioInstrumento[] {
  const porDia = new Map<number, string>()
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
export function evaluateCheckIn(e: Omit<CheckInEntry, "status" | "id" | "createdAt">, previos: CheckInEntry[], historial: Historial): Status {
  const nuevo: CheckInEntry = { ...e, status: "ok", id: "nuevo", createdAt: "" }
  const estado = analizar([...previos, nuevo], historial).alerts(e.day).filter((a) => a.day === e.day).map((a) => a.status)
  return worst([...estado, ...(e.symptoms.length > 0 ? (["watch"] as Status[]) : [])])
}
