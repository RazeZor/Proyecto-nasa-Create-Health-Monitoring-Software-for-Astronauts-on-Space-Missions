import { test } from "node:test"
import assert from "node:assert/strict"
import { DIAS_VENTANA_REINICIO, evaluarTripulante, type Lectura } from "./engine.ts"

// FC estable de 60 con entrada manual; desde el día 15 el reloj mide 80 de forma sistemática (sesgo del
// instrumento, no un cambio fisiológico). El resto de los indicadores, estables.
const CAMBIO = 15
const lectura = (dia: number, fc: number, spo2 = 98): Lectura => ({
  dia_mision: dia, fc_reposo_lpm: fc, pas_mmHg: 115, spo2_pct: spo2, temp_central_c: 36.7,
  sueno_h: 7, animo_1_10: 7, sintomas: [], durante_tormenta: false,
})
const lecturas = (spo2Dia?: number) => [
  ...Array.from({ length: 14 }, (_, i) => lectura(-13 + i, 60 + (i % 3) - 1)),
  ...Array.from({ length: 30 }, (_, i) => {
    const d = i + 1
    return lectura(d, d >= CAMBIO ? 80 + (d % 3) - 1 : 63, d === spo2Dia ? 88 : 98)
  }),
]
const fcB = (a: ReturnType<typeof evaluarTripulante>) => a.filter((x) => x.indicador === "fc" && (x.capa === "B" || x.capa === "C"))

test("sin anotar el cambio, el sesgo del reloj parece una desviación de la FC", () => {
  assert.ok(fcB(evaluarTripulante({ id: "x", lecturas: lecturas() }, {})).length > 0)
})

test("con el cambio anotado, la FC forma su línea base en vuelo y no alerta por el sesgo", () => {
  const alertas = evaluarTripulante({ id: "x", lecturas: lecturas() }, {}, { cambiosInstrumento: [{ dia_mision: CAMBIO, indicador: "fc" }] })
  assert.deepEqual(fcB(alertas), [])
})

test("tras la ventana, una desviación real contra la línea base nueva sí alerta", () => {
  const base = lecturas()
  const desde = CAMBIO + DIAS_VENTANA_REINICIO
  const conSubida = base.map((l) => (l.dia_mision >= desde + 1 ? { ...l, fc_reposo_lpm: 100 } : l))
  const alertas = evaluarTripulante({ id: "x", lecturas: conSubida }, {}, { cambiosInstrumento: [{ dia_mision: CAMBIO, indicador: "fc" }] })
  assert.ok(fcB(alertas).some((a) => a.dia_mision > desde))
})

test("la capa A sigue activa durante la ventana de reinicio", () => {
  const alertas = evaluarTripulante({ id: "x", lecturas: lecturas(CAMBIO + 2) }, {}, { cambiosInstrumento: [{ dia_mision: CAMBIO, indicador: "fc" }] })
  assert.ok(alertas.some((a) => a.capa === "A" && a.dia_mision === CAMBIO + 2))
})
