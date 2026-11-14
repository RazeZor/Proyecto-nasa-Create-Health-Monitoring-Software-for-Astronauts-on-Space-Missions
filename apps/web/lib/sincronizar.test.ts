// node --test apps/web/lib/sincronizar.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"
import { sincronizar } from "./sincronizar.ts"
import type { CheckInEntry } from "./types.ts"

const reg = (id: string) => ({ id }) as CheckInEntry

test("envía solo los pendientes, en orden, y los marca", async () => {
  const enviados: string[] = [], marcados: string[] = []
  const n = await sincronizar({
    registros: [reg("a"), reg("b"), reg("c")], sincronizados: ["a"],
    enviar: async (e) => (enviados.push(e.id), true), marcar: async (id) => void marcados.push(id),
  })
  assert.deepEqual([n, enviados, marcados], [2, ["b", "c"], ["b", "c"]])
})

test("se detiene en el primer fallo y deja el resto pendiente", async () => {
  const marcados: string[] = []
  const n = await sincronizar({
    registros: [reg("a"), reg("b"), reg("c")], sincronizados: [],
    enviar: async (e) => e.id === "a", marcar: async (id) => void marcados.push(id),
  })
  assert.deepEqual([n, marcados], [1, ["a"]])
})

test("sin pendientes no envía nada", async () => {
  let llamadas = 0
  const n = await sincronizar({ registros: [reg("a")], sincronizados: ["a"], enviar: async () => (llamadas++, true), marcar: async () => {} })
  assert.deepEqual([n, llamadas], [0, 0])
})
