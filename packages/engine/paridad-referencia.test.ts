// Paridad 1:1 con el motor de referencia de Python (pipelines/reanclaje/simulacion.py).
// Correr: node --test packages/engine/*.test.ts
import assert from "node:assert/strict"
import test from "node:test"
import caso from "./fixtures/caso-referencia.json" with { type: "json" }
import { evaluarTripulante, factorAdaptacion, madBruto, puntosNews2 } from "./engine.ts"

const entornoPorDia = Object.fromEntries(caso.entorno_diario.map((e) => [e.dia_mision, e]))

test("las alertas de los 4 tripulantes coinciden con alertas_esperadas", () => {
  const obtenidas = caso.tripulantes
    .flatMap((t) => evaluarTripulante(t, entornoPorDia))
    .sort((a, b) => a.dia_mision - b.dia_mision || (a.tripulante_id < b.tripulante_id ? -1 : a.tripulante_id > b.tripulante_id ? 1 : 0) || (a.capa < b.capa ? -1 : a.capa > b.capa ? 1 : 0))
  assert.equal(obtenidas.length, caso.alertas_esperadas.length)
  obtenidas.forEach((a, i) => {
    const e = caso.alertas_esperadas[i]
    const { valor: va, ...ra } = a
    const { valor: ve, ...re } = e
    assert.deepEqual(ra, re)
    assert.ok(Math.abs((va as number) - (ve as number)) < 0.011, `valor ${va} vs ${ve}`)
  })
})

test("w(d) = 1 - exp(-d/tau) y 0 antes del vuelo", () => {
  assert.equal(factorAdaptacion(0), 0)
  assert.ok(Math.abs(factorAdaptacion(4) - (1 - Math.exp(-1))) < 1e-12)
})

test("MAD con piso MAD_MIN y mediana par", () => {
  assert.deepEqual(madBruto([1, 2, 3, 4], 0.1), [2.5, 1])
  assert.deepEqual(madBruto([5, 5, 5], 2.5), [5, 2.5])
})

test("NEWS2: SpO2 <= 91 es un 3 individual", () => {
  assert.deepEqual(puntosNews2(60, 120, 91, 36.8), { pts: 3, maxIndividual: 3 })
  assert.deepEqual(puntosNews2(60, 120, 98, 36.8), { pts: 0, maxIndividual: 0 })
})
