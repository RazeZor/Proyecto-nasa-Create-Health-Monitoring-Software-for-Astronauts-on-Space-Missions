// Pruebas del cliente de registro: node --test apps/web/lib/api-registro.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { test } from "node:test"
import { capaApi, indicadorApi, lecturasDeCheckIn, nivelApi, perfilApi, retardoMin, sintomasDeCheckIn, tReal } from "./api-registro.ts"
import type { CheckInEntry } from "./types.ts"

const base = {
  id: "c1", day: 3, createdAt: "2026-11-14T08:00:00.123Z", durationSec: 60, restingHr: 62, hrFromWatch: true,
  systolic: 118, diastolic: 76, spo2: 97, spo2Site: "dedo", tempC: null, tempMethod: "", sleepH: 7, mood: 7,
  symptoms: ["headache", "visionChange"], glucose: null, glucoseEnzyme: "", massKg: 74.1, massMethod: "inercia",
  status: "ok",
} as unknown as CheckInEntry

test("traduce claves y niveles al vocabulario de la API", () => {
  assert.equal(indicadorApi("restingHr"), "frecuencia_cardiaca_reposo")
  assert.equal(nivelApi("act"), "rojo")
  assert.equal(capaApi("context"), "contexto")
  assert.equal(perfilApi("transit-docked"), "transito")
  assert.deepEqual([retardoMin("station"), retardoMin("lunar"), retardoMin("mars")], [0, 0, 22])
})

test("t_real sale canónico, sin milisegundos", () => {
  assert.equal(tReal(base.createdAt), "2026-11-14T08:00:00Z")
})

test("el registro se convierte en lecturas solo de lo medido", () => {
  const l = lecturasDeCheckIn(base)
  assert.deepEqual(l.map((x) => x.indicador), [
    "frecuencia_cardiaca_reposo", "presion_arterial_sistolica", "presion_arterial_diastolica",
    "spo2", "sueno", "estado_animo", "masa_corporal",
  ])
  assert.equal(l[0].origen, "sensor")
  assert.equal(l.find((x) => x.indicador === "spo2")?.metodo, "dedo")
  assert.ok(l.every((x) => x.t_real === "2026-11-14T08:00:00Z"))
})

test("los síntomas usan los códigos de la API con gravedad leve", () => {
  assert.deepEqual(sintomasDeCheckIn(base).map((s) => [s.codigo, s.gravedad]), [["cefalea", 1], ["vision", 1]])
})
