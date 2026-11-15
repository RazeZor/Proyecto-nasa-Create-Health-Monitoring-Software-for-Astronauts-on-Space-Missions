// Pruebas del análisis de la app: node --test apps/web/lib/engine.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { test } from "node:test"
import caso from "../../../packages/engine/fixtures/caso-referencia.json" with { type: "json" }
import type { Historial } from "./catalogo.ts"
import { analizar as analizarCon, evaluateCheckIn as evaluar } from "./engine.ts"
import type { CheckInEntry } from "./types.ts"

// Lo que devuelve GET /tripulantes/1/historial: el tripulante 1 del caso de referencia.
const HISTORIAL = { ...caso, modo: "demo", dia_actual: 27, lecturas: caso.tripulantes[0].lecturas } as unknown as Historial
const analizar = (c: CheckInEntry[]) => analizarCon(c, HISTORIAL)
const evaluateCheckIn = (e: CheckInEntry, p: CheckInEntry[]) => evaluar(e, p, HISTORIAL)

const entrada = (day: number, o: Partial<CheckInEntry> = {}): CheckInEntry => ({
  id: `c${day}`, day, createdAt: "2026-11-14T08:00:00Z", durationSec: 60, restingHr: 60, hrFromWatch: false,
  systolic: 118, diastolic: 76, spo2: 98, spo2Site: "dedo", tempC: 36.7, tempMethod: "", sleepH: 7.3, mood: 8,
  symptoms: [], glucose: null, glucoseEnzyme: "", massKg: null, massMethod: "", status: "ok", ...o,
})

test("sin registros, el escenario de partida da la deriva A1 (capas B y C) dentro de su ventana", () => {
  const a = analizar([])
  const deriva = a.alerts(27).filter((x) => (x.layer === "B" || x.layer === "C") && !x.informative)
  assert.ok(deriva.length >= 2)
  assert.ok(deriva.every((x) => x.status === "watch" && x.day >= 18 && x.day <= 27 && !x.escalates))
  assert.ok(deriva.some((x) => x.layer === "C"))
  assert.equal(a.alerts(17).filter((x) => x.scope === "personal").length, 0) // lo de después del día no se ve
})

test("el estado por indicador señala el parámetro que puntúa en la capa A y deja en verde los demás", () => {
  const a = analizar([entrada(10, { spo2: 89 })])
  const e = a.indicatorStatus(10)
  assert.equal(e.spo2, "act")
  assert.equal(e.restingHr, "ok")
  assert.equal(e.tempC, "ok")
  assert.equal(e.massKg, "ok") // sin capa en el motor: nunca alerta
  assert.ok(Object.values(analizar([]).indicatorStatus(5)).every((s) => s === "ok")) // adaptación: lo informativo no cuenta
})

test("el estado por indicador coincide con el de su zona cuando la deriva es de un solo indicador", () => {
  const a = analizar([])
  for (const dia of [20, 24, 27]) {
    const zonas = a.zones(dia)
    const e = a.indicatorStatus(dia)
    // ninguna zona de indicadores queda peor que el peor de sus indicadores (salvo por síntomas o entorno, que no son indicadores)
    const peorMente = [e.sleepH, e.mood].includes("act") ? "act" : [e.sleepH, e.mood].includes("watch") ? "watch" : "ok"
    assert.equal(zonas.find((z) => z.zone === "mind")?.status, peorMente)
  }
})

test("un registro con SpO2 de 89 % el día 10 dispara la capa A, escala y pone el corazón en acción", () => {
  const a = analizar([entrada(10, { spo2: 89 })])
  const hit = a.alerts(10).find((x) => x.layer === "A")
  assert.ok(hit)
  assert.equal(hit.status, "act")
  assert.equal(hit.escalates, true)
  assert.deepEqual(hit.clinical, { indicador: "spo2", valor: 89, tramo: "Tramo extremo (3 puntos)" }) // dato mínimo del escalamiento
  assert.equal(hit.createdAt, "2026-11-14T08:00:00Z")
  assert.equal(a.zones(10).find((z) => z.zone === "heart")?.status, "act")
  assert.equal(a.overall(10), "act")
})

test("capa A ámbar (suma 3) no escala; la capa B en adaptación es informativa y no cambia el estado", () => {
  const a = analizar([entrada(10, { spo2: 93, systolic: 105 })])
  const hit = a.alerts(10).find((x) => x.layer === "A")
  assert.deepEqual([hit?.status, hit?.escalates, hit?.clinical], ["watch", false, undefined])
  const b = analizar([entrada(9, { restingHr: 95 }), entrada(10, { restingHr: 95 })])
  const info = b.alerts(10).filter((x) => x.layer === "B")
  assert.equal(info.length, 1)
  assert.equal(info[0].informative, true)
  assert.equal(b.overall(10), "ok") // 95 lpm es 1 punto NEWS2 (sin alerta) y la B informativa no cambia el estado
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

test("cefalea con el pico de CO2 simulado del día 12: una alerta de entorno, no médica", () => {
  const a = analizar([entrada(12, { symptoms: ["headache"] })])
  const ctx = a.alerts(12).filter((x) => x.day === 12)
  assert.equal(ctx.length, 1)
  assert.deepEqual([ctx[0].scope, ctx[0].status, ctx[0].escalates, ctx[0].zone], ["crew", "watch", false, "head"])
  // un día sin CO2 alto, el mismo síntoma no cruza con el entorno
  // queda como síntoma personal sin causa ambiental
  assert.deepEqual(analizar([entrada(10, { symptoms: ["headache"] })]).alerts(10).filter((x) => x.day === 10).map((x) => [x.scope, x.zone]), [["personal", "head"]])
})

test("el CO2 real llega en ppm y se convierte con la presión del perfil (§3.3)", () => {
  // 4 500 ppm: 3,42 mmHg en la estación (760 mmHg) y 1,91 mmHg en superficie (424 mmHg)
  const h = { ...HISTORIAL, entorno_diario: [{ dia_mision: 10, co2_ppm_max_horario: 4500, co2_origen: { naturaleza: "Real", fuente: "EDA RR-1", fecha_real: "2014-09-21" } }] } as Historial
  const registro = [entrada(10, { symptoms: ["headache"] })]
  const estacion = analizarCon(registro, h, 760)
  assert.equal(estacion.co2(10)?.mmHg, 3.42)
  const alerta = estacion.alerts(10).find((x) => x.scope === "crew")
  assert.ok(alerta?.source?.includes("EDA RR-1") && alerta.source.includes("2014-09-21") && alerta.source.startsWith("Real"))
  const superficie = analizarCon(registro, h, 424)
  assert.equal(superficie.co2(10)?.mmHg, 1.908)
  assert.deepEqual(superficie.alerts(10).filter((x) => x.day === 10).map((x) => x.scope), ["personal"]) // ya no es de entorno
})

test("un síntoma sin causa ambiental pone su zona en ámbar sin escalar; la glucosa tiene banda y capa B", () => {
  const a = analizar([entrada(10, { symptoms: ["rash", "dizziness"] })])
  const sintomas = a.alerts(10).filter((x) => x.day === 10)
  assert.deepEqual(sintomas.map((x) => [x.zone, x.status, x.scope, x.escalates]).sort(), [["blood", "watch", "personal", false], ["head", "watch", "personal", false]])
  assert.deepEqual([a.zones(10).find((z) => z.zone === "blood")?.status, a.zones(10).find((z) => z.zone === "head")?.status], ["watch", "watch"])
  const g = analizar([entrada(21, { glucose: 150 }), entrada(28, { glucose: 152 })])
  const alerta = g.alerts(28).find((x) => x.zone === "blood" && x.layer === "B")
  assert.deepEqual([alerta?.day, alerta?.status, alerta?.escalates], [28, "watch", false])
  assert.ok(g.band("glucose").length > 0)
})

test("evaluateCheckIn: lectura normal ok, límite clínico act, síntoma watch", () => {
  assert.equal(evaluateCheckIn(entrada(10), []), "ok")
  assert.equal(evaluateCheckIn(entrada(10, { spo2: 90 }), []), "act")
  assert.equal(evaluateCheckIn(entrada(10, { symptoms: ["rash"] }), []), "watch")
})

test("tormenta: por flujo simulado del escenario o por un evento SEP real de DONKI", () => {
  const a = analizar([])
  assert.equal(a.storm(22), true)
  assert.equal(a.stormInfo(22)?.simulated, true)
  assert.equal(a.storm(21), false)
  const sep = { sepID: "2024-05-09T13:59:00-SEP-001", t_real: "2024-05-09T13:59:00Z", link: null, fuente: "DONKI (NASA CCMC)" }
  const h = { ...HISTORIAL, entorno_diario: [{ dia_mision: 18, modo_tormenta: true, eventos_sep: [sep] }] } as Historial
  const real = analizarCon([], h)
  assert.deepEqual([real.stormInfo(18)?.simulated, real.stormInfo(18)?.flux], [false, null])
  const alerta = real.alerts(18).find((x) => x.layer === "context")
  assert.ok(alerta?.source?.includes("DONKI") && alerta.zone === null && alerta.scope === "crew")
})

test("banda personal: de tierra (peso 0) a vuelo (peso 1), siguiendo la referencia del motor", () => {
  const banda = analizar([]).band("restingHr")
  assert.equal(banda[0].day, 1)
  assert.equal(banda[0].flightWeight, 0)
  assert.equal(banda.find((b) => b.day === 14)?.flightWeight, 0)
  assert.equal(banda.find((b) => b.day === 21)?.flightWeight, 1)
  assert.ok(banda.every((b) => b.low < b.high))
  assert.deepEqual(analizar([]).band("spo2"), []) // sin capa B no hay banda personal
})

test("modo real: sin lecturas no se inventa nada; una medida ausente no puntúa", () => {
  const vacio: Historial = { modo: "real", naturaleza: "Real", dias_prevuelo: 0, dias_vuelo: 30, dia_actual: 2, entorno_diario: [], lecturas: [] }
  const a = analizarCon([], vacio)
  assert.deepEqual([a.alerts(30), a.vitals(30), a.overall(2), a.hasData(2), a.real], [[], [], "ok", false, true])
  // registro solo con ánimo y SpO2 normal: lo demás queda en null y no cuenta como 0
  const parcial = analizarCon([entrada(2, { restingHr: null, systolic: null, tempC: null, sleepH: null })], vacio)
  assert.deepEqual(parcial.alerts(2), [])
  assert.deepEqual([parcial.vitals(2)[0].restingHr, parcial.vitals(2)[0].spo2], [null, 98])
  assert.equal(evaluar(entrada(2, { spo2: 91, restingHr: null, systolic: null, tempC: null, sleepH: null }), [], vacio), "act")
})

test("tres días seguidos en ámbar: se recomienda compartir", () => {
  const a = analizar([24, 25, 26, 27].map((d) => entrada(d, { systolic: 150 })))
  const pas = a.alerts(27).filter((x) => x.indicator.includes("sistólica") && !x.informative)
  assert.deepEqual(pas.map((x) => [x.day, x.recommendShare]).sort(), [[25, false], [26, false], [27, true]])
})

test("cambios de instrumento de la FC: manual -> reloj -> otro reloj, en orden de día", async () => {
  const { cambiosDeInstrumento } = await import("./engine.ts")
  const e = (day: number, hrInstrument?: string, restingHr: number | null = 70) => ({ day, hrInstrument, restingHr }) as CheckInEntry
  assert.deepEqual(cambiosDeInstrumento([e(3), e(5, "galaxy_watch4:gw-a"), e(4, "manual"), e(6, "galaxy_watch4:gw-a"),
    e(8, "galaxy_watch4:gw-b"), e(9, "manual", null), e(-2, "galaxy_watch4:gw-a")]),
    [{ dia_mision: 5, indicador: "fc" }, { dia_mision: 8, indicador: "fc" }])
  assert.deepEqual(cambiosDeInstrumento([e(2), e(3, "manual")]), [])
})
