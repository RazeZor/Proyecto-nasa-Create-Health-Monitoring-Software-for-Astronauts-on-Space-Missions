import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { investigar } from "./investigar.ts"
import type { Protocolo } from "./generador.ts"
test("la investigación conserva negativos, carga y omitidos sin promover una variante", () => {
  const protocolo = { ...JSON.parse(readFileSync(new URL("./protocolo.json", import.meta.url), "utf8")), misiones_por_escenario: 2 } as Protocolo
  const resultado = investigar(protocolo)
  assert.equal(resultado.curvas.length, 45)
  assert.equal(resultado.variante_promovida, null)
  assert.equal(resultado.independiente, false)
  assert.ok(resultado.controles.length >= 9)
  assert.ok(resultado.curvas.every((r) => r.detectados + r.omitidos === 2 && r.dias_observados > 0))
})
