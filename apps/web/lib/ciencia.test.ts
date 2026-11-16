import assert from "node:assert/strict"
import test from "node:test"
import catalogo from "../../../packages/schemas/evidencia-cientifica.json" with { type: "json" }
import { leerEvidencia } from "./ciencia.ts"

test("ausencia de auditoría conserva revisión pendiente sin métricas inventadas", () => {
  assert.equal(leerEvidencia({ estado: "no_publicado", catalogo, informe: null })?.informe, null)
  assert.equal(leerEvidencia({ estado: "vigente", catalogo, informe: null }), null)
  assert.equal(leerEvidencia({ estado: "no_publicado", catalogo: { ...catalogo, validacion_clinica: true }, informe: null }), null)
})
test("denominadores nulos, intervalos y omitidos se validan antes de dibujar", () => {
  const fila = { escenario: "control", metodo: "ABC", eventos: 0, detectados: 0, no_detectados: 0, ic95_deteccion: null,
    retraso_mediana_solo_detectados_dias: null, falsos_episodios: 0, dias_observados_fuera_evento: 0, falsos_por_persona_semana: null }
  const respuesta = { estado: "desactualizado", catalogo, informe: { version: "evidencia-v1", t_real: "2026-11-16T00:00:00Z",
    congelacion: { archivos: { "packages/engine/engine.ts": "a".repeat(64) } }, resultados: [fila] } }
  assert.equal(leerEvidencia(respuesta)?.estado, "desactualizado")
  assert.equal(leerEvidencia({ ...respuesta, informe: { ...respuesta.informe, resultados: [{ ...fila, detectados: 1 }] } }), null)
  assert.equal(leerEvidencia({ ...respuesta, informe: { ...respuesta.informe, resultados: [{ ...fila, ic95_deteccion: [0, 0] }] } }), null)
})
