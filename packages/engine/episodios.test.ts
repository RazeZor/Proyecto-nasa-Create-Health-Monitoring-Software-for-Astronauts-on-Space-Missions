import assert from "node:assert/strict"
import { test } from "node:test"
import { aplicarEvento, siguienteEstado, type Episodio, type EventoEpisodio } from "./episodios.ts"

const episodio: Episodio = { id: "e1", clave: "fc", indicador: "fc", estado: "abierto", version: 1, eventos: [] }
const evento: EventoEpisodio = { id: "ev1", episodio_id: "e1", tipo: "remedicion", nota: "Medida repetida", t_real: "2026-11-14T08:00:00Z", observaciones: ["o2"], version_previa: 1 }
test("una medida nueva sigue abierta a seguimiento y el cierre requiere revisión", () => {
  const nuevo = aplicarEvento(episodio, evento)
  assert.equal(nuevo.estado, "en_seguimiento")
  assert.equal(nuevo.version, 2)
  assert.deepEqual(aplicarEvento(nuevo, evento), nuevo)
  assert.throws(() => aplicarEvento(nuevo, { ...evento, id: "otro" }))
  assert.throws(() => siguienteEstado("en_revision", "cerrar"))
  assert.equal(siguienteEstado("en_revision", "cerrar", true), "cerrado")
  assert.equal(siguienteEstado("cerrado", "reabrir"), "abierto")
  assert.throws(() => siguienteEstado("cerrado", "accion"))
})
test("una remedición sin toma enlazada o sin motivo no se admite", () => {
  assert.throws(() => aplicarEvento(episodio, { ...evento, observaciones: [] }))
  assert.throws(() => aplicarEvento(episodio, { ...evento, nota: " " }))
})
