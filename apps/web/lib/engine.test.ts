// Pruebas del análisis de la app: node --test apps/web/lib/engine.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { test } from "node:test"
import caso from "../../../packages/engine/fixtures/caso-referencia.json" with { type: "json" }
import type { Historial } from "./catalogo.ts"
import { analizar as analizarCon, evaluateCheckIn as evaluar } from "./engine.ts"
import type { CheckInEntry } from "./types.ts"

// Lo que devuelve GET /tripulantes/1/historial: el tripulante 1 del caso de referencia.
const HISTORIAL = { ...caso, dia_actual: 24, lecturas: caso.tripulantes[0].lecturas } as unknown as Historial
const analizar = (c: CheckInEntry[]) => analizarCon(c, HISTORIAL)
const evaluateCheckIn = (e: CheckInEntry, p: CheckInEntry[]) => evaluar(e, p, HISTORIAL)

const entrada = (day: number, o: Partial<CheckInEntry> = {}): CheckInEntry => ({
  id: `c${day}`, day, createdAt: "2026-11-14T08:00:00Z", durationSec: 60, restingHr: 60, hrFromWatch: false,
  systolic: 118, diastolic: 76, spo2: 98, spo2Site: "dedo", tempC: 36.7, tempMethod: "", sleepH: 7.3, mood: 8,
  symptoms: [], glucose: null, glucoseEnzyme: "", massKg: null, massMethod: "", status: "ok", ...o,
})

test("sin registros, el escenario de partida da la deriva cardiaca (capa C) del día 24", () => {
  const a = analizar([])
  const c = a.alerts(24).filter((x) => x.day === 24)
  assert.equal(c.length, 1)
  assert.equal(c[0].layer, "C")
  assert.equal(c[0].zone, "heart")
  assert.equal(c[0].status, "watch")
  assert.equal(a.alerts(23).length, 0) // lo de después del día no se ve
})

test("un registro con SpO2 de 89 % el día 10 dispara la capa A y pone el corazón en acción", () => {
  const a = analizar([entrada(10, { spo2: 89 })])
  const hit = a.alerts(10).find((x) => x.layer === "A")
  assert.ok(hit)
  assert.equal(hit.status, "act")
  assert.equal(a.zones(10).find((z) => z.zone === "heart")?.status, "act")
  assert.equal(a.overall(10), "act")
})

test("el registro del usuario reemplaza la lectura del escenario ese día", () => {
  const a = analizar([entrada(5, { restingHr: 77 })])
  assert.equal(a.vitals(5).find((v) => v.day === 5)?.restingHr, 77)
  assert.equal(a.vitals(5).length, 5)
})

test("un campo vacío conserva el valor del escenario", () => {
  const base = analizar([]).vitals(5).find((v) => v.day === 5)
  const a = analizar([entrada(5, { restingHr: null })])
  assert.equal(a.vitals(5).find((v) => v.day === 5)?.restingHr, base?.restingHr)
})

test("un síntoma sin CO2 alto en el escenario no dispara la regla de contexto", () => {
  // el CO2 sale de entorno_diario del escenario, no del registro
  const a = analizar([entrada(10, { symptoms: ["headache"] })])
  assert.equal(a.alerts(10).filter((x) => x.layer === "context").length, 0)
})

test("evaluateCheckIn: lectura normal ok, límite clínico act, síntoma watch", () => {
  assert.equal(evaluateCheckIn(entrada(10), []), "ok")
  assert.equal(evaluateCheckIn(entrada(10, { spo2: 90 }), []), "act")
  assert.equal(evaluateCheckIn(entrada(10, { symptoms: ["rash"] }), []), "watch")
})

test("tormenta tomada del entorno del escenario", () => {
  const a = analizar([])
  assert.equal(a.storm(22), true)
  assert.equal(a.storm(21), false)
})

test("líneas base: dos tramos con la personal de vuelo desplazada", () => {
  const [pre, vuelo] = analizar([]).baselines("restingHr")
  assert.equal(pre.phase, "pre-flight")
  assert.equal(vuelo.phase, "in-flight")
  assert.ok(vuelo.low > pre.low && vuelo.high < pre.high + 4)
  assert.ok(vuelo.low < vuelo.high)
})

test("cambios de instrumento de la FC: manual -> reloj -> otro reloj, en orden de día", async () => {
  const { cambiosDeInstrumento } = await import("./engine.ts")
  const e = (day: number, hrInstrument?: string, restingHr: number | null = 70) => ({ day, hrInstrument, restingHr }) as CheckInEntry
  assert.deepEqual(cambiosDeInstrumento([e(3), e(5, "galaxy_watch4:gw-a"), e(4, "manual"), e(6, "galaxy_watch4:gw-a"),
    e(8, "galaxy_watch4:gw-b"), e(9, "manual", null), e(-2, "galaxy_watch4:gw-a")]),
    [{ dia_mision: 5, indicador: "fc" }, { dia_mision: 8, indicador: "fc" }])
  assert.deepEqual(cambiosDeInstrumento([e(2), e(3, "manual")]), [])
})
