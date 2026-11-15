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

test("lineasBaseServidor expone mediana y MAD de tierra y vuelo para SQLite", () => {
  const a = analizar([])
  const lb = a.lineasBaseServidor()
  assert.equal(lb.length, 8)
  const fcTierra = lb.find((x) => x.indicador === "restingHr" && x.origen === "tierra")
  const fcVuelo = lb.find((x) => x.indicador === "restingHr" && x.origen === "vuelo")
  assert.ok(fcTierra && fcVuelo)
  assert.equal(fcTierra.n, 14)
  assert.equal(fcVuelo.n, 14)
  assert.ok(a.alertasMotor.length > 0)
})

test("las 5 zonas del cuerpo responden a lecturas reales (blood, bone, head, mind, heart) y exponen lecturasZona", () => {
  // blood: fiebre >= 39.1 °C (act, capa A) y glucosa en vigilancia (watch, capa B)
  const aBlood = analizar([entrada(10, { tempC: 39.2, glucose: 145 })])
  const zBlood = aBlood.zones(10).find((z) => z.zone === "blood")
  assert.equal(zBlood?.status, "act")
  assert.equal(zBlood?.layer, "A")

  // bone: pérdida de masa corporal >= 2.8 % respecto a mediana prevuelo (~73.1 kg -> 70.5 kg = -3.5 %)
  const aBone = analizar([entrada(12, { massKg: 70.5 })])
  const zBone = aBone.zones(12).find((z) => z.zone === "bone")
  assert.equal(zBone?.status, "watch")
  assert.equal(zBone?.layer, "C")

  // head: mareo / cambio visual en día sin CO2 alto -> vigilancia neurovestibular
  const aHead = analizar([entrada(10, { symptoms: ["dizziness"] })])
  const zHead = aHead.zones(10).find((z) => z.zone === "head")
  assert.equal(zHead?.status, "watch")
  assert.equal(zHead?.layer, "B")

  // mind: sueño < 4 h en un día -> vigilancia conductual inmediata
  const aMind = analizar([entrada(10, { sleepH: 3.5 })])
  const zMind = aMind.zones(10).find((z) => z.zone === "mind")
  assert.equal(zMind?.status, "watch")
  assert.equal(zMind?.layer, "B")

  // lecturasZona devuelve los valores reales y rangos de referencia de las 5 zonas
  for (const zone of ["head", "heart", "bone", "blood", "mind"] as const) {
    const filas = aBone.lecturasZona(12, zone)
    assert.ok(filas.length >= 1)
    assert.ok(filas[0].value.length > 0)
    assert.ok(filas[0].reference.length > 0)
  }
})
