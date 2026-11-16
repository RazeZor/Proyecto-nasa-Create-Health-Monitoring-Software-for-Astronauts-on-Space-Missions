import assert from "node:assert/strict"
import { test } from "node:test"
import { evaluarEvidencia, esEntornoAplicable, type ObservacionEvidencia } from "./evidencia.ts"

const politica = { ahora: "2026-11-16T00:00:00Z", antiguedad_max_s: 3600, desfase_futuro_max_s: 60, modo: "real" as const }
const observacion: ObservacionEvidencia = { valor: 89, t_real: "2026-11-15T23:59:00Z", uso: "operativo", comparable: true, extremo: true }

test("la antigüedad y la comparabilidad no borran un extremo observado", () => {
  const antigua = evaluarEvidencia({ ...observacion, t_real: "2026-11-15T20:00:00Z" }, politica)
  assert.deepEqual(antigua, { estado: "requiere_confirmacion", motivos: ["dato_antiguo"], conservar_extremo: true })
  assert.equal(evaluarEvidencia({ ...observacion, comparable: false }, politica).estado, "no_comparable")
})

test("ausencia, fecha imposible y reloj futuro se explican sin porcentajes de confianza", () => {
  assert.equal(evaluarEvidencia({ ...observacion, valor: null }, politica).estado, "insuficiente")
  assert.ok(evaluarEvidencia({ ...observacion, t_real: "2026-02-30T00:00:00Z" }, politica).motivos.includes("hora_desconocida"))
  assert.ok(evaluarEvidencia({ ...observacion, t_real: "2026-11-16T01:00:00Z" }, politica).motivos.includes("reloj_futuro"))
  assert.throws(() => evaluarEvidencia(observacion, { ...politica, antiguedad_max_s: -1 }))
})

test("una referencia se puede explorar en demo y se abstiene en modo real", () => {
  assert.equal(esEntornoAplicable("real", "referencia"), false)
  assert.equal(esEntornoAplicable("real"), false)
  assert.equal(esEntornoAplicable("demo", "escenario"), true)
  assert.equal(evaluarEvidencia({ ...observacion, uso: "referencia" }, politica).estado, "no_comparable")
})
