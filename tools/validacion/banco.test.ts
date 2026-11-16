import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { analizarTripulante } from "../../packages/engine/engine.ts"
import { detectar, evaluarCaso, ejecutarBanco } from "./banco.ts"
import { generarCaso, type Protocolo } from "./generador.ts"

const protocolo = { ...JSON.parse(readFileSync(new URL("./protocolo.json", import.meta.url), "utf8")), misiones_por_escenario: 2, bootstrap_repeticiones: 40 } as Protocolo

test("el generador conserva sus entradas y no reutiliza el simulador de desarrollo", () => {
  assert.deepEqual(generarCaso("deriva_sutil", 1, protocolo), generarCaso("deriva_sutil", 1, protocolo))
  assert.notDeepEqual(generarCaso("deriva_sutil", 1, protocolo), generarCaso("deriva_sutil", 2, protocolo))
  assert.equal(generarCaso("sin_prevuelo", 0, protocolo).tripulante.lecturas.some((r) => r.dia_mision <= 0), false)
})

test("la ablación no altera la ruta por defecto ni deja alertas de capas desactivadas", () => {
  const caso = generarCaso("deriva_intensa", 0, protocolo)
  const original = analizarTripulante(caso.tripulante, caso.entorno)
  assert.deepEqual(analizarTripulante(caso.tripulante, caso.entorno, { capas: ["A", "B", "C", "contexto"] }), original)
  assert.ok(analizarTripulante(caso.tripulante, caso.entorno, { capas: ["A"] }).alertas.every((a) => a.capa === "A"))
})

test("la métrica mantiene los no detectados y no inventa retraso", () => {
  const caso = generarCaso("entorno_escenario", 0, protocolo)
  assert.deepEqual(evaluarCaso(caso, "A", 7).retraso, null)
  assert.equal(evaluarCaso(caso, "ABC_contexto", 7).retraso, 0)
  assert.throws(() => detectar(caso, "inventado"))
  const referencia = generarCaso("entorno_referencia", 0, protocolo)
  assert.deepEqual(detectar(referencia, "ABC_contexto"), [])
  // Si se permite usar ese mismo entorno como escenario sí debe aparecer la señal: el negativo no puede
  // aprobar simplemente porque la métrica descarte todas las alertas ambientales cuando no hay evento.
  assert.deepEqual(detectar({ ...referencia, uso: "escenario" }, "ABC_contexto"), [36])
})

test("el banco informa ausencia de validación clínica y datos humanos", () => {
  const reporte = ejecutarBanco(protocolo)
  assert.equal(reporte.conclusion, "exploratoria_sin_validacion_clinica")
  assert.equal(reporte.sintesis.misiones_sinteticas, 26)
  assert.equal(reporte.reglas_ambientales.length, 2)
  assert.ok(reporte.reglas_ambientales.every((r) => r.coincide_con_regla))
  assert.ok(reporte.resultados.every((r) => !r.escenario.startsWith("entorno_")))
  assert.ok(reporte.resultados.every((r) => r.eventos === 0 ? r.deteccion === null && r.ic95_deteccion === null : r.no_detectados === r.eventos - r.detectados))
})
