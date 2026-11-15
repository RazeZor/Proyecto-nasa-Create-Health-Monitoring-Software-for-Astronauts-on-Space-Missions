import assert from "node:assert/strict"
import test from "node:test"
import { marcasDeDia } from "./ejes.ts"

test("30 días conservan el eje de siempre", () => assert.deepEqual(marcasDeDia(30), [1, 7, 14, 21, 28]))
test("259 días rotulan unas 5 marcas, sin amontonarse", () => assert.deepEqual(marcasDeDia(259), [1, 60, 120, 180, 240]))
test("una misión corta no rotula más allá de su último día", () => assert.deepEqual(marcasDeDia(10), [1, 7]))
