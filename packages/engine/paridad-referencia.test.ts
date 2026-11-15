// Paridad 1:1 con el motor de referencia de Python (pipelines/reanclaje/simulacion.py).
// Correr: node --test packages/engine/*.test.ts
import assert from "node:assert/strict"
import test from "node:test"
import caso from "./fixtures/caso-referencia.json" with { type: "json" }
import { analizarTripulante, evaluarTripulante, madBruto, pesoVuelo, puntosNews2, type Lectura } from "./engine.ts"

const entornoPorDia = Object.fromEntries(caso.entorno_diario.map((e) => [e.dia_mision, e]))
const clave = (a: { dia_mision: number; tripulante_id: string; capa: string; indicador: string }) =>
  `${String(a.dia_mision).padStart(3, "0")}|${a.tripulante_id}|${a.capa}|${a.indicador}`

test("las alertas de los 4 tripulantes coinciden con alertas_esperadas", () => {
  const obtenidas = caso.tripulantes
    .flatMap((t) => evaluarTripulante(t, entornoPorDia))
    .sort((a, b) => (clave(a) < clave(b) ? -1 : clave(a) > clave(b) ? 1 : 0))
  assert.equal(obtenidas.length, caso.alertas_esperadas.length)
  assert.ok(obtenidas.some((a) => a.capa === "C"), "el caso de referencia ejercita la capa C")
  obtenidas.forEach((a, i) => {
    const e = caso.alertas_esperadas[i]
    const { valor: va, ...ra } = a
    const { valor: ve, ...re } = e
    assert.deepEqual(ra, re)
    assert.ok(Math.abs((va as number) - (ve as number)) < 0.011, `valor ${va} vs ${ve}`)
  })
})

test("w(d) de §5.2: 0 en adaptación o con pocas lecturas, y sube a 1 en 7 días", () => {
  assert.equal(pesoVuelo(14, 14), 0)
  assert.equal(pesoVuelo(15, 4), 0)
  assert.ok(Math.abs(pesoVuelo(15, 5) - 1 / 7) < 1e-12)
  assert.equal(pesoVuelo(21, 14), 1)
  assert.equal(pesoVuelo(30, 14), 1)
})

test("MAD con piso MAD_MIN y mediana par", () => {
  assert.deepEqual(madBruto([1, 2, 3, 4], 0.1), [2.5, 1])
  assert.deepEqual(madBruto([5, 5, 5], 2.5), [5, 2.5])
})

test("NEWS2: SpO2 <= 91 es un 3 individual y un valor ausente no puntúa", () => {
  assert.deepEqual(puntosNews2(60, 120, 91, 36.8), { pts: 3, maxIndividual: 3 })
  assert.deepEqual(puntosNews2(60, 120, 98, 36.8), { pts: 0, maxIndividual: 0 })
  assert.deepEqual(puntosNews2(null, null, null, null), { pts: 0, maxIndividual: 0 })
})

// Reglas de §5.1, §5.2 y §5.4 sobre una serie estable de 44 días con cambios puntuales.
const lectura = (dia: number, cambios: Partial<Lectura> = {}): Lectura => ({
  dia_mision: dia, fc_reposo_lpm: 60, pas_mmHg: 118, spo2_pct: 98, temp_central_c: 36.7,
  sueno_h: 7, animo_1_10: 8, sintomas: [], durante_tormenta: false, ...cambios,
})
const serie = (cambios: Record<number, Partial<Lectura>> = {}, desde = -13) =>
  Array.from({ length: 30 - desde + 1 }, (_, i) => lectura(desde + i, cambios[desde + i]))
const alertas = (cambios: Record<number, Partial<Lectura>> = {}, entorno = {}, desde = -13) =>
  evaluarTripulante({ id: "t", lecturas: serie(cambios, desde) }, entorno)

test("capa A: ámbar con suma 3 o 4; rojo escala siempre, sin tormenta", () => {
  assert.deepEqual(alertas({ 24: { spo2_pct: 93, pas_mmHg: 105 } }).map((a) => [a.capa, a.nivel, a.valor, a.escalada_auto]), [["A", "ambar", 3, false]])
  assert.deepEqual(alertas({ 24: { spo2_pct: 90 } }).map((a) => [a.capa, a.nivel, a.escalada_auto]), [["A", "rojo", true]])
})

test("capa B: informativa en adaptación; ámbar y sin escalar después", () => {
  assert.deepEqual(alertas({ 9: { fc_reposo_lpm: 85 }, 10: { fc_reposo_lpm: 85 } }).map((a) => [a.dia_mision, a.capa, a.informativa]), [[10, "B", true]])
  const b = alertas({ 24: { fc_reposo_lpm: 110 }, 25: { fc_reposo_lpm: 110 } }).filter((a) => a.capa === "B")
  assert.deepEqual(b.map((a) => [a.dia_mision, a.nivel, a.informativa, a.escalada_auto]), [[25, "ambar", false, false]])
})

test("contexto: CO2 sobre el límite con cefalea y tormenta son alertas de entorno, no médicas", () => {
  const co2 = alertas({ 12: { sintomas: ["cefalea"] } }, { 12: { co2_mmhg_max_horario: 4.6 } })
  assert.deepEqual(co2.map((a) => [a.capa, a.nivel, a.ambito, a.escalada_auto]), [["contexto", "ambar", "tripulacion", false]])
  assert.deepEqual(alertas({ 12: { sintomas: ["cefalea"] } }, { 12: { co2_mmhg_max_horario: 3.0 } }), [])
  for (const entorno of [{ 22: { flujo_protones_10mev_pfu: 10 } }, { 22: { modo_tormenta: true } }]) {
    assert.deepEqual(alertas({}, entorno).map((a) => [a.dia_mision, a.indicador, a.ambito]), [[22, "protones", "tripulacion"]])
  }
})

test("valores ausentes: no puntúan, no alertan y rompen los dos días seguidos", () => {
  const vacio: Partial<Lectura> = { fc_reposo_lpm: null, pas_mmHg: null, spo2_pct: null, temp_central_c: null, sueno_h: null, animo_1_10: null }
  assert.deepEqual(alertas({ 24: vacio }), [])
  assert.deepEqual(alertas({ 24: { fc_reposo_lpm: 110 }, 25: { fc_reposo_lpm: null }, 26: { fc_reposo_lpm: 110 } }).filter((a) => a.capa === "B"), [])
})

test("sin línea base de tierra: capa A desde el día 1; B y C esperan a la ventana en vuelo", () => {
  // tripulante real que empieza a registrar el día 1: no hay prevuelo
  assert.deepEqual(alertas({ 3: { spo2_pct: 90 } }, {}, 1).map((a) => [a.dia_mision, a.capa]), [[3, "A"]])
  const { referencias } = analizarTripulante({ id: "t", lecturas: serie({}, 1) }, {})
  assert.equal(referencias.fc[0].dia_mision, 15) // días 8 a 12: cinco lecturas con rezago de 3
  const b = alertas({ 24: { fc_reposo_lpm: 110 }, 25: { fc_reposo_lpm: 110 } }, {}, 1).filter((a) => a.capa === "B")
  assert.deepEqual(b.map((a) => a.dia_mision), [25])
})
