// Pruebas del cliente de registro: node --test apps/web/lib/api-registro.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  alertaInDeMotor,
  capaApi,
  checkInsDeServidor,
  diaDeTMision,
  indicadorApi,
  indicadorMotorApi,
  lecturasDeCheckIn,
  nivelApi,
  perfilApi,
  reporteDeServidor,
  retardoMin,
  sintomasDeCheckIn,
  tReal,
  tRealDeDia,
} from "./api-registro.ts"
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

test("reporteDeServidor: el contenido guardado en la API llega a la interfaz", () => {
  const r = reporteDeServidor({
    id: 7, creado_t_real: "2026-12-06T07:00:00Z", retardo_min: 12, llega_t_real: "2026-12-06T07:12:00Z",
    estado: "respondido", respuesta: "ok",
    contenido: { titulo: "Informe diario · Día 23", resumen: "Ámbar", lectura: "FC 68", linea_base: "56-64", entorno: "CO2 1.4", accion: "Refugio" },
  })
  assert.deepEqual([r.id, r.serverId, r.title, r.delayMinutes, r.createdAt], ["7", 7, "Informe diario · Día 23", 12, Date.parse("2026-12-06T07:00:00Z")])
  assert.equal(reporteDeServidor({ id: 8, creado_t_real: "2026-12-06T07:00:00Z", retardo_min: 0, llega_t_real: "2026-12-06T07:00:00Z", estado: "en_cola", respuesta: null, contenido: null }).title, "#8")
})

test("la SpO2 del reloj sube como sensor galaxy_watch4", () => {
  const l = lecturasDeCheckIn({ ...base, spo2FromWatch: true, spo2Site: "Muñeca" }).find((x) => x.indicador === "spo2")
  assert.deepEqual([l?.origen, l?.metodo], ["sensor", "galaxy_watch4"])
})

test("checkInsDeServidor reconstruye lecturas y síntomas por t_real", () => {
  const reconstruidos = checkInsDeServidor(
    [
      { id: 1, tripulante_id: 1, indicador: "frecuencia_cardiaca_reposo", valor: 64, t_real: "2026-11-16T08:00:00Z", t_mision: "D003T08:00:00", origen: "sensor", metodo: "galaxy_watch4:gw-1", naturaleza: "Real" },
      { id: 2, tripulante_id: 1, indicador: "spo2", valor: 96, t_real: "2026-11-16T08:00:00Z", t_mision: "D003T08:00:00", origen: "manual", metodo: "Dedo", naturaleza: "Simulado" },
    ],
    [{ id: 1, tripulante_id: 1, t_real: "2026-11-16T08:00:00Z", t_mision: "D003T08:00:00", codigo: "cefalea", gravedad: 1 }],
  )
  assert.equal(reconstruidos.length, 1)
  assert.deepEqual(
    [reconstruidos[0].day, reconstruidos[0].restingHr, reconstruidos[0].hrFromWatch, reconstruidos[0].spo2, reconstruidos[0].symptoms],
    [3, 64, true, 96, ["headache"]],
  )
  assert.equal(diaDeTMision("D022T06:30:00"), 22)
  assert.equal(tRealDeDia(1), "2026-11-14T06:30:00Z")
})

test("alertaInDeMotor traduce indicadores del motor al esquema de SQLite", () => {
  assert.equal(indicadorMotorApi("fc"), "frecuencia_cardiaca_reposo")
  assert.equal(indicadorMotorApi("conductual"), "sueno")
  const dto = alertaInDeMotor({
    dia_mision: 24,
    tripulante_id: "yo",
    capa: "C",
    nivel: "ambar",
    indicador: "fc",
    valor: 6.46,
    escalada_auto: false,
  })
  assert.deepEqual(
    [dto.indicador, dto.capa, dto.nivel, dto.valor, dto.t_real, dto.regla_version],
    ["frecuencia_cardiaca_reposo", "C", "ambar", 6.46, "2026-12-07T06:30:00Z", "1"],
  )
})
