import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { analizarTripulante } from "../../packages/engine/engine.ts"
import { reproducirTraza } from "./reproducir.ts"
test("la reproducción exige el mismo motor y el mismo resultado", () => {
  const codigo = readFileSync(new URL("../../packages/engine/engine.ts", import.meta.url))
  const entrada = { tripulante: { id: "yo", lecturas: [] }, entorno: {}, opciones: {} }
  const traza = { motor_sha256: createHash("sha256").update(codigo).digest("hex"), entrada, salida: analizarTripulante(entrada.tripulante, {}, {}) }
  assert.equal(reproducirTraza(traza, codigo).reproducida, true)
  assert.throws(() => reproducirTraza({ ...traza, motor_sha256: "0".repeat(64) }, codigo))
  assert.throws(() => reproducirTraza({ ...traza, salida: {} }, codigo))
})
