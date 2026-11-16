import assert from "node:assert/strict"
import { test } from "node:test"
import { cambiarRolDemo, esDemoPublica, espacioSesion, iniciarDemo, peticion, salir, verificarSesion } from "./sesion.ts"
import { claveAmbito, fijarAmbito } from "./almacen-local.ts"
import { crearBandeja } from "./bandeja-informes.ts"

test("la demo separa peticiones, roles, IndexedDB y bandejas sin alterar el acceso personal", async () => {
  const previoWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  const previoFetch = globalThis.fetch
  const valores = new Map<string, string>()
  const almacen = { getItem: (k: string) => valores.get(k) ?? null, setItem: (k: string, v: string) => { valores.set(k, v) },
    removeItem: (k: string) => { valores.delete(k) }, key: (i: number) => [...valores.keys()][i] ?? null, get length() { return valores.size } }
  Object.defineProperty(globalThis, "window", { configurable: true, value: { sessionStorage: almacen, localStorage: almacen, location: { search: "", assign: () => undefined }, dispatchEvent: () => undefined } })
  const demo = { tripulante_id: 1, mision_id: 1, rol: "astronaut", vence_t_real: new Date(Date.now() + 3600000).toISOString(), csrf: "csrf-de-prueba", demo_publica: true, espacio_demo: "a".repeat(32) }
  let ultima: { url: string; init?: RequestInit } = { url: "" }
  globalThis.fetch = async (input, init) => { ultima = { url: String(input), init }; return Response.json(demo) }
  try {
    await iniciarDemo()
    assert.equal(esDemoPublica(), true)
    await peticion("/vigia-api/tripulantes/1/observaciones", { method: "POST" })
    assert.equal(ultima!.url, "/vigia-api/demo/tripulantes/1/observaciones")
    assert.equal(new Headers(ultima!.init!.headers).get("X-Vigia-Demo-Rol"), "astronaut")
    assert.equal(new Headers(ultima!.init!.headers).get("X-Vigia-CSRF"), demo.csrf)
    cambiarRolDemo("surgeon")
    await peticion("/vigia-api/reportes/recibidos")
    assert.equal(ultima!.url, "/vigia-api/demo/reportes/recibidos")
    assert.equal(new Headers(ultima!.init!.headers).get("X-Vigia-Demo-Rol"), "surgeon")
    await peticion("/vigia-api/reloj/estado")
    assert.equal(ultima!.url, "/vigia-api/demo/reloj/estado")
    assert.ok(espacioSesion().includes(demo.espacio_demo))
    fijarAmbito({ tripulante: 1, mision: 1, modo: "demo", espacioDemo: demo.espacio_demo })
    const ambitoDemo = claveAmbito()
    fijarAmbito({ tripulante: 1, mision: 1, modo: "demo" })
    assert.notEqual(claveAmbito(), ambitoDemo)
    crearBandeja(almacen, 1, "demo", "1").guardar({ id: "informe", creado: "2026-11-16T00:00:00Z", perfil: "transit", retardo: 0, contenido: { titulo: "Demo" } as never })
    assert.ok([...valores.keys()].some((k) => k.includes(`demo:${demo.espacio_demo}:informes:`)))
    await salir()
    assert.equal(esDemoPublica(), false)
    assert.deepEqual(crearBandeja(almacen, 1, "demo", "1").listar(), [])
    globalThis.fetch = async (input, init) => { ultima = { url: String(input), init }; return Response.json({ ...demo, demo_publica: false, espacio_demo: undefined }) }
    await verificarSesion()
    await peticion("/vigia-api/tripulantes/1/observaciones")
    assert.equal(ultima!.url, "/vigia-api/tripulantes/1/observaciones")
    assert.equal(new Headers(ultima!.init!.headers).get("X-Vigia-Demo-Rol"), null)
  } finally {
    globalThis.fetch = previoFetch
    fijarAmbito(null)
    if (previoWindow) Object.defineProperty(globalThis, "window", previoWindow)
    else Reflect.deleteProperty(globalThis, "window")
  }
})
