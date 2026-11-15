import assert from "node:assert/strict"
import test from "node:test"
import type { EntornoHistorial } from "./catalogo.ts"
import { lecturaDeTrayecto, idaYVuelta, mejorIdaYVuelta, posicionesDelViaje, retardoMedioMin } from "./trayecto.ts"

const posicion = (dia: number, dist: number) => ({
  dia, x_ua: 0, y_ua: 0, dist_sol_ua: 1, dist_tierra_ua: dist, retardo_min: dist * 8.3167,
  tierra: { x_ua: 1, y_ua: 0 }, marte: { x_ua: 1.5, y_ua: 0 },
})
const entorno: EntornoHistorial[] = [
  { dia_mision: 2, posicion: posicion(2, 0.2), dosis_acumulada_msv: 3.6 },
  { dia_mision: 1, posicion: posicion(1, 0.1), dosis_acumulada_msv: 1.8 },
  { dia_mision: 3 },
]

test("un día con posición trae la distancia, el retardo y la dosis acumulada", () => {
  const l = lecturaDeTrayecto(entorno, 2)!
  assert.equal(l.distanciaTierraUa, 0.2)
  assert.ok(Math.abs(l.retardoMin - 1.66334) < 1e-6)
  assert.ok(Math.abs(l.distanciaTierraMKm - 29.9195742) < 1e-6)
  assert.equal(l.dosisAcumuladaMsv, 3.6)
})

test("un día sin posición o fuera del rango no tiene lectura (modo real)", () => {
  assert.equal(lecturaDeTrayecto(entorno, 3), null)
  assert.equal(lecturaDeTrayecto(entorno, 99), null)
  assert.equal(lecturaDeTrayecto([], 1), null)
})

test("las posiciones salen en orden de día y sin los días vacíos", () => {
  assert.deepEqual(posicionesDelViaje(entorno).map((p) => p.dia), [1, 2])
})

test("el retardo medio es el promedio de todo el tránsito; sin posiciones no hay", () => {
  assert.ok(Math.abs(retardoMedioMin(entorno)! - (0.1 + 0.2) / 2 * 8.3167) < 1e-9)
  assert.equal(retardoMedioMin([{ dia_mision: 1 }]), null)
})

test("la ida y vuelta es el doble del retardo; el caso más optimista es el día de menor retardo", () => {
  assert.equal(idaYVuelta(3.5), 7)
  const mejor = mejorIdaYVuelta(entorno)!
  assert.equal(mejor.dia, 1)
  assert.ok(Math.abs(mejor.minutos - 2 * 0.1 * 8.3167) < 1e-9)
  assert.equal(mejorIdaYVuelta([]), null)
})
