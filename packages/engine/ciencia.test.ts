import assert from "node:assert/strict"
import { test } from "node:test"
import { resumirReaccion, resumirSueno } from "./ciencia.ts"
test("la reacción conserva interrupciones y no declara comparabilidad ni equivalencia clínica", () => {
  const resumen = resumirReaccion([
    { estimulo_ms: 1000, respuesta_ms: 1250, fotograma_ms: 16, interrupcion: false },
    { estimulo_ms: 2000, respuesta_ms: 1900, fotograma_ms: 16, interrupcion: false },
  ], true)
  assert.equal(resumen.validos, 1)
  assert.equal(resumen.mediana_ms, 250)
  assert.equal(resumen.interrumpida, true)
  assert.equal(resumen.comparable, false)
})
test("sueño informado y estimado no se promedian como un método homogéneo", () => {
  const diario = { horas: 7, metodo: "diario" as const, turno: "A" }
  assert.equal(resumirSueno([diario]).promedio_h, 7)
  assert.equal(resumirSueno([diario, { ...diario, metodo: "estimado" }]).promedio_h, null)
  assert.equal(resumirSueno([{ ...diario, horas: null }]).promedio_h, null)
})
