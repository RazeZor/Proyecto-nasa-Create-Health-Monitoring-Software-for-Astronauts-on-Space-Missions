import assert from "node:assert/strict"
import { test } from "node:test"
import { validarRegistros, validarClavePrivada } from "./almacen-validar.ts"
test("un respaldo dañado no se interpreta como una lista vacía de salud", () => {
  assert.throws(() => validarRegistros("[]"))
  assert.throws(() => validarRegistros([{ id: "r1", day: 1, createdAt: "ayer" }]))
  assert.throws(() => validarClavePrivada("checkins", [{ id: "r1" }]))
  assert.throws(() => validarClavePrivada("synced", [1]))
  assert.throws(() => validarClavePrivada("otro-almacen", []))
  assert.deepEqual(validarRegistros([]), [])
})
