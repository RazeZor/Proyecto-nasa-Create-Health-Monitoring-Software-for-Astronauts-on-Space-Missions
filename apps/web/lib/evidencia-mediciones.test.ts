import assert from "node:assert/strict"
import { test } from "node:test"
import { aplicarPoliticaTemporal } from "./evidencia-mediciones.ts"
import { analizarTripulante, type Lectura } from "../../../packages/engine/engine.ts"
import type { Historial } from "./catalogo.ts"
import { observacionesDeCheckIn } from "./api-registro.ts"
import type { CheckInEntry } from "./types.ts"

const fila: Lectura = { dia_mision: 1, fc_reposo_lpm: 92, pas_mmHg: 105, spo2_pct: 95, temp_central_c: 36.7, sueno_h: null, animo_1_10: null, sintomas: [], durante_tormenta: false }
const historial: Historial = { modo: "real", naturaleza: "Real", dias_prevuelo: 0, dias_vuelo: 30, dia_actual: 1, entorno_diario: [], lecturas: [] }
const registro = { id: "r1", day: 1, createdAt: "2026-11-14T18:00:00Z", restingHr: 92, systolic: 105, diastolic: null, spo2: 95, tempC: 36.7, sleepH: null, mood: null, glucose: null, massKg: null,
  hrFromWatch: false, symptoms: [], tiemposMedicion: { restingHr: "2026-11-14T08:00:00Z", systolic: "2026-11-14T13:00:00Z", spo2: "2026-11-14T18:00:00Z", tempC: "2026-11-14T18:00:00Z" } } as unknown as CheckInEntry
test("no se agregan bandas de parámetros separados por horas", () => {
  const temporal = aplicarPoliticaTemporal(fila, [registro], historial)
  assert.equal(temporal.ventana_clinica_valida, false)
  assert.equal(analizarTripulante({ id: "yo", lecturas: [temporal] }, {}).alertas.length, 0)
})
test("el extremo previo conserva su valor y hora tras una toma normal", () => {
  const previo = { ...registro, spo2: 89 }
  const normal = { ...registro, id: "r2", spo2: 98 }
  const temporal = aplicarPoliticaTemporal({ ...fila, spo2_pct: 98 }, [previo, normal], historial)
  const extremo = analizarTripulante({ id: "yo", lecturas: [temporal] }, {}).alertas.find((a) => a.observacion?.id === "r1:spo2")
  assert.equal(extremo?.observacion?.valor, 89)
  assert.equal(extremo?.observacion?.t_real, "2026-11-14T18:00:00Z")
})
test("la confirmación del registro no inventa la hora de una medida antigua", () => {
  const medidas = observacionesDeCheckIn({ ...registro, tiemposMedicion: undefined })
  assert.ok(medidas.every((m) => m.t_real === null && m.precision_tiempo === "desconocida"))
  assert.equal(new Set(medidas.map((m) => m.id)).size, medidas.length)
})
