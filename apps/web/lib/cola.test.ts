// node --test apps/web/lib/cola.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"
import { estadoReporte, type ReporteServidor } from "./cola.ts"

const T0 = Date.parse("2026-11-14T08:00:00Z")
const srv = (estado: ReporteServidor["estado"], retardo = 10): ReporteServidor => ({
  id: 1, creado_t_real: "2026-11-14T08:00:00Z", retardo_min: retardo,
  llega_t_real: new Date(T0 + retardo * 60_000).toISOString().replace(".000Z", "Z"), estado, respuesta: null, contenido: null,
})

test("sin acuse el informe permanece local aunque pase el retardo", () => {
  assert.equal(estadoReporte(T0, 1, T0 + 1000).state, "queued")
  assert.equal(estadoReporte(T0, 1, T0 + 10_000).state, "queued")
  assert.equal(estadoReporte(T0, 1, T0 + 70_000).state, "queued")
})

test("con servidor, en_cola antes de llegar es sent con cuenta atrás y progreso", () => {
  const e = estadoReporte(0, 0, T0 + 5 * 60_000, srv("en_cola"))
  assert.deepEqual([e.state, e.remainingMs, e.progress], ["sent", 5 * 60_000, 0.5])
})

test("el estado del servidor manda: entregado y respondido son arrived aunque falte tiempo", () => {
  assert.equal(estadoReporte(0, 0, T0 + 1000, srv("entregado")).state, "arrived")
  assert.equal(estadoReporte(0, 0, T0 + 1000, srv("respondido")).state, "arrived")
})

test("el contador vencido no confirma recepción", () => {
  assert.equal(estadoReporte(0, 0, T0 + 11 * 60_000, srv("en_cola")).state, "sent")
})

test("retardo 0: espera confirmación incluso con progreso completo", () => {
  const e = estadoReporte(0, 0, T0, srv("en_cola", 0))
  assert.deepEqual([e.state, e.progress], ["sent", 1])
})
