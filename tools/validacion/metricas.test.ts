import assert from "node:assert/strict"
import { test } from "node:test"
import { contarEpisodios, diferenciaPareada, medianaOmitible, wilson } from "./metricas.ts"
import { aleatorio } from "./generador.ts"

test("Wilson conserva incertidumbre con cero o todos los aciertos", () => {
  assert.equal(wilson(0, 0), null)
  const cero = wilson(0, 10)!, todos = wilson(10, 10)!
  assert.ok(cero[1] > 0.27 && cero[1] < 0.28)
  assert.ok(todos[0] > 0.72 && todos[0] < 0.73)
  assert.throws(() => wilson(11, 10))
})

test("las alertas de varios canales el mismo día cuentan como un episodio", () => {
  assert.equal(contarEpisodios([5, 2, 2, 3, 7]), 3)
  assert.equal(medianaOmitible([]), null)
  assert.equal(medianaOmitible([8, 2, 4, 6]), 5)
})

test("el bootstrap remuestrea pares por misión y es reproducible", () => {
  const a = [true, false, true, false], b = [false, false, true, false]
  assert.deepEqual(diferenciaPareada(a, b, 200, aleatorio(5)), diferenciaPareada(a, b, 200, aleatorio(5)))
  assert.equal(diferenciaPareada(a, a, 200, aleatorio(1)).diferencia, 0)
  assert.throws(() => diferenciaPareada(a, [], 20, aleatorio(1)))
})
