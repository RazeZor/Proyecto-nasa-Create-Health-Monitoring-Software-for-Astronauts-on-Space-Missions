// Pruebas del catálogo: node --test apps/web/lib/catalogo.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"
import { type FichaJson, indicadoresUi, mensajesUi, perfilesUi } from "./catalogo.ts"

// Lo mismo que sirve la API (GET /perfiles y GET /fichas); se lee del contrato solo en el test.
const SCHEMAS = new URL("../../../packages/schemas/", import.meta.url)
const perfiles = JSON.parse(readFileSync(new URL("perfiles.json", SCHEMAS), "utf-8"))
const fichas: FichaJson[] = readdirSync(new URL("fichas/", SCHEMAS)).filter((f) => f !== "index.json")
  .map((f) => JSON.parse(readFileSync(new URL(`fichas/${f}`, SCHEMAS), "utf-8")))

test("los 5 perfiles de la interfaz salen de /perfiles con su presión y retardo", () => {
  const p = perfilesUi(perfiles)
  assert.deepEqual(p.map((x) => x.id), ["station", "transit", "transit-docked", "lunar", "mars"])
  assert.deepEqual(p.map((x) => [x.cabinPressureMmHg, x.delayMinutes]), [[760, 0], [760, 12], [527, 0.03], [424, 0.02], [424, 22]])
})

test("los 8 indicadores y la radiación salen de /fichas", () => {
  const { indicadores, comoMedir, radiacion } = indicadoresUi(fichas)
  assert.equal(Object.keys(indicadores).length, 8)
  assert.equal(indicadores.spo2.zone, "heart")
  assert.equal(indicadores.spo2.safetyLow, 92)
  assert.ok(comoMedir.sleepH.estacion.length > 0)
  assert.ok(radiacion.label.length > 0)
})

test("una ficha que falta en la API es un error, no un indicador vacío", () => {
  assert.throws(() => indicadoresUi(fichas.filter((f) => f.id !== "spo2")), /spo2/)
})

test("mensajes: claves de la API a las de la interfaz", () => {
  const [m] = mensajesUi([{ id: "r1", de: "surgeon", autor: "CV", dia: 3, hora: "08:00", texto: "Hola" }])
  assert.deepEqual(m, { id: "r1", from: "surgeon", author: "CV", day: 3, time: "08:00", body: "Hola" })
})
