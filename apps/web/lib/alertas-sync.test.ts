// node --test apps/web/lib/alertas-sync.test.ts
import assert from "node:assert/strict"
import { test } from "node:test"
import { claveAlerta, sincronizarAlertas, type AvisoRojo } from "./alertas-sync.ts"
import type { Alert } from "./types.ts"

const alerta = (day: number, o: Partial<Alert> = {}): Alert => ({
  id: `al-${day}-A-news2`, day, time: "08:00", createdAt: `2026-11-${10 + day}T08:00:00.000Z`, status: "act", layer: "A", zone: "heart",
  indicator: "NEWS2", value: "3 pts", clinicalBand: "", cause: "", action: "", scope: "personal", informative: false, escalates: true,
  clinical: { indicador: "spo2", valor: 90, tramo: "3 puntos" }, ...o,
})

function entorno(respuestas: (number | null | undefined)[]) {
  const enviados: AvisoRojo[] = []
  const marcadas: Record<string, number | null> = {}
  return {
    enviados, marcadas,
    enviar: async (a: AvisoRojo) => { enviados.push(a); return respuestas.shift() },
    marcar: async (c: string, id: number | null) => { marcadas[c] = id },
  }
}

test("envía solo el dato mínimo de los rojos de capa A registrados por el tripulante", async () => {
  const e = entorno([7])
  const n = await sincronizarAlertas({
    alertas: [
      alerta(3),
      alerta(4, { status: "watch", escalates: false }), // ámbar: nunca sale del dispositivo
      alerta(5, { layer: "context", scope: "crew", escalates: false }),
      alerta(6, { createdAt: null }), // del historial, sin registro propio
    ],
    enviadas: {}, enviar: e.enviar, marcar: e.marcar,
  })
  assert.equal(n, 1)
  assert.deepEqual(e.enviados, [{ indicador: "spo2", valor: 90, t_real: "2026-11-13T08:00:00.000Z", tramo: "3 puntos" }])
  assert.deepEqual(e.marcadas, { [claveAlerta(alerta(3))]: 7 })
})

test("no reenvía lo ya enviado y se detiene si la API no responde", async () => {
  const e = entorno([undefined, 9])
  const alertas = [alerta(1), alerta(2), alerta(3)]
  const n = await sincronizarAlertas({ alertas, enviadas: { [claveAlerta(alertas[0])]: 5 }, enviar: e.enviar, marcar: e.marcar })
  assert.equal(n, 0)
  assert.equal(e.enviados.length, 1) // intentó la del día 2, falló y dejó la del día 3 pendiente
  assert.deepEqual(e.marcadas, {})
})

test("sin destinatario la alerta queda marcada con null y no se reintenta", async () => {
  const e = entorno([null])
  await sincronizarAlertas({ alertas: [alerta(1)], enviadas: {}, enviar: e.enviar, marcar: e.marcar })
  assert.deepEqual(Object.values(e.marcadas), [null])
})
