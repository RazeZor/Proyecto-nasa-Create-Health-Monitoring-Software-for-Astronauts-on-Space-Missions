import { test } from "node:test"
import assert from "node:assert/strict"
import { ESPERA_CONEXION_MS, VIGENCIA_SPO2_MS, fcReposoSugerida, pasosConexion, spo2Sugerida, lecturaVigente, siguienteEstado, suenoSugerido, tramosSerie, ultimoCambioInstrumento, type RespuestaReloj } from "./reloj.ts"

const T = Date.parse("2026-11-14T18:00:00Z")
const respuesta = (segundosAtras: number, conectado = true): RespuestaReloj => ({
  puente: { configurado: true, conectado: true, ultima_vez: null, error: null },
  vinculado: true,
  reloj: {
    nombre: "Sebastián", conectado, dispositivos: ["gw-1"], modelo: null, sdk: true, fc_lpm: 70,
    ultima_lectura: { t: new Date(T - segundosAtras * 1000).toISOString(), fc_lpm: 70 },
    serie: [], resumen: null, chequeos: [], chequeo_estado: null, chequeo_progreso: null, avisos: [], notas: [],
  },
})

test("una lectura reciente con el reloj conectado está vigente", () => {
  assert.equal(lecturaVigente(respuesta(2), T), true)
  assert.equal(lecturaVigente(respuesta(30), T), false)
  assert.equal(lecturaVigente(respuesta(2, false), T), false)
  assert.equal(lecturaVigente(null, T), false)
})

test("transiciones del dispositivo", () => {
  assert.equal(siguienteEstado("disconnected", respuesta(1), T, T), "disconnected")
  assert.equal(siguienteEstado("connecting", respuesta(1), T, T), "connected")
  assert.equal(siguienteEstado("connecting", null, T, T), "connecting")
  assert.equal(siguienteEstado("connecting", null, T + ESPERA_CONEXION_MS + 1, T), "lost")
  assert.equal(siguienteEstado("connected", respuesta(30), T, T), "lost")
  assert.equal(siguienteEstado("lost", respuesta(1), T, T), "connected")
})

test("la curva se corta en huecos de más de 3 s y sin pulso", () => {
  const p = (s: number, fc: number | null) => ({ t: new Date(T + s * 1000).toISOString(), fc_lpm: fc })
  const tramos = tramosSerie([p(0, 70), p(1, 71), p(2, null), p(3, 72), p(10, 73), p(11, 74)])
  assert.deepEqual(tramos.map((t) => t.map((x) => x.fc)), [[70, 71], [72], [73, 74]])
  assert.deepEqual(tramosSerie([]), [])
})

test("sugerencias del reloj para el registro", () => {
  const r = respuesta(1)
  assert.equal(fcReposoSugerida(r), null)
  r.reloj!.resumen = { fc_reposo_dia: { valor: 63.6, fuente: "chequeo", t: "x" }, sueno: { inicio: "a", fin: "b", minutos: 412, fc_reposo: 55, experimental: true } }
  assert.deepEqual(fcReposoSugerida(r), { valor: 64, fuente: "chequeo" })
  assert.equal(suenoSugerido(r), 6.9)
  assert.equal(ultimoCambioInstrumento(r), null)
  r.reloj!.notas = [{ t: "2026-11-14T10:00:00Z", tipo: "cambio_instrumento", detalle: "gw-a -> gw-b" }]
  assert.equal(ultimoCambioInstrumento(r)?.detalle, "gw-a -> gw-b")
})

test("la SpO2 del reloj se sugiere solo si es reciente", () => {
  const r = respuesta(1)
  assert.equal(spo2Sugerida(r, T), null)
  r.reloj!.resumen = { spo2: { valor: 97.6, t: new Date(T - 3600_000).toISOString() } }
  assert.equal(spo2Sugerida(r, T), 98)
  assert.equal(spo2Sugerida(r, T + VIGENCIA_SPO2_MS), null)
})

test("la vigencia usa la antigüedad medida por la API aunque el reloj tenga la hora desfasada", () => {
  const desfasado = respuesta(600) // el t del reloj dice «hace 10 min»
  assert.equal(lecturaVigente(desfasado, T), false)
  desfasado.reloj!.recibido_hace_s = 1.2
  assert.equal(lecturaVigente(desfasado, T), true)
  desfasado.reloj!.recibido_hace_s = 11
  assert.equal(lecturaVigente(desfasado, T), false)
})

test("los cuatro pasos de la conexión marcan el primero que falla", () => {
  const ids = (r: RespuestaReloj | null) => pasosConexion(r, T).filter((p) => p.ok).map((p) => p.id)
  assert.deepEqual(ids(null), [])
  const sinServidor = respuesta(1)
  sinServidor.puente.conectado = false
  assert.deepEqual(ids(sinServidor), ["api"])
  const sinVinculo = respuesta(1)
  sinVinculo.vinculado = false
  assert.deepEqual(ids(sinVinculo), ["api", "server"])
  assert.deepEqual(ids(respuesta(1, false)), ["api", "server"])
  assert.deepEqual(ids(respuesta(30)), ["api", "server", "watch"])
  assert.deepEqual(ids(respuesta(1)), ["api", "server", "watch", "wrist"])
})
