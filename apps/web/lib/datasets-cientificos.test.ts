import assert from "node:assert/strict"
import test from "node:test"
import { leerDatasets } from "./datasets-cientificos.ts"

const mmash = { id: "mmash", nombre: "MMASH", tipo: "fisiologia_terrestre", uso: "referencia", version: "1.0.0",
  fuente: "https://physionet.org/content/mmash/1.0.0/", sha256: "a".repeat(64), registros: 5,
  registros_utilizados: 3, sujetos: 1, periodos_sueno: 1, puntos_5min: 2, evaluacion_motor: false }
test("un catálogo vacío no inventa adquisición y una referencia conserva su alcance", () => {
  assert.deepEqual(leerDatasets({ version: "catalogo-datasets-v1", datasets: [] })?.datasets, [])
  assert.equal(leerDatasets({ version: "catalogo-datasets-v1", datasets: [mmash] })?.datasets[0].evaluacion_motor, false)
  assert.equal(leerDatasets({ version: "catalogo-datasets-v1", datasets: [{ ...mmash, evaluacion_motor: true }] }), null)
})
test("rechaza duplicados, cantidades imposibles y enlaces incompatibles antes de dibujar", () => {
  const catalogo = (datasets: unknown[]) => ({ version: "catalogo-datasets-v1", datasets })
  assert.equal(leerDatasets(catalogo([mmash, mmash])), null)
  assert.equal(leerDatasets(catalogo([{ ...mmash, registros_utilizados: 8 }])), null)
  assert.equal(leerDatasets(catalogo([{ ...mmash, fuente: "javascript:alert(1)" }])), null)
})
