// Pruebas del cliente de registro: node --test apps/web/lib/api-registro.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { test } from "node:test"
import { capaApi, indicadorApi, lecturasDeCheckIn, nivelApi, perfilApi, reporteDeServidor, retardoEnvio, retardoMin, sintomasDeCheckIn, tReal } from "./api-registro.ts"
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

test("el informe viaja con el retardo del perfil en modo real y se acorta a 1 min solo en demo", () => {
  assert.deepEqual([retardoEnvio("real", "mars"), retardoEnvio("real", "transit"), retardoEnvio("real", "station")], [22, 12, 0])
  assert.deepEqual([retardoEnvio("demo", "mars"), retardoEnvio("demo", "station")], [1, 0])
  // el tránsito acoplado (tipo Gateway) está a ~1,3 s de luz: su retardo en minutos es 0, no el del tránsito a Marte
  assert.equal(retardoEnvio("real", "transit-docked"), 0)
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
    contenido: {
      titulo: "Informe diario · Día 23", resumen: "Ámbar", lectura: "FC 68", lectura_humana: "Pulso en reposo 68 lpm: normal.", linea_base: "56-64", entorno: "CO2 1.4",
      accion: "Sugerido: Refugio. Hecho: La hice. Entré al refugio", accion_sugerida: "Refugio", accion_hecha: "hecha", accion_nota: "Entré al refugio",
    },
  })
  assert.deepEqual([r.id, r.serverId, r.title, r.delayMinutes, r.createdAt], ["7", 7, "Informe diario · Día 23", 12, Date.parse("2026-12-06T07:00:00Z")])
  assert.deepEqual([r.plainReading, r.actionDone, r.actionNote], ["Pulso en reposo 68 lpm: normal.", "hecha", "Entré al refugio"])
  const sinContenido = reporteDeServidor({ id: 8, creado_t_real: "2026-12-06T07:00:00Z", retardo_min: 0, llega_t_real: "2026-12-06T07:00:00Z", estado: "en_cola", respuesta: null, contenido: null })
  assert.equal(sinContenido.title, "#8")
  // los informes antiguos no llevan lectura humana ni confirmación: campos vacíos o ausentes, nunca undefined visible
  assert.equal(sinContenido.plainReading, "")
  assert.ok(!("actionDone" in sinContenido) && !("actionNote" in sinContenido))
})

test("la SpO2 del reloj sube como sensor galaxy_watch4", () => {
  const l = lecturasDeCheckIn({ ...base, spo2FromWatch: true, spo2Site: "Muñeca" }).find((x) => x.indicador === "spo2")
  assert.deepEqual([l?.origen, l?.metodo], ["sensor", "galaxy_watch4"])
})
