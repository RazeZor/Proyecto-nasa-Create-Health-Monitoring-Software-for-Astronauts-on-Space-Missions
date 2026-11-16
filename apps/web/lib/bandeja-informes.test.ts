import assert from "node:assert/strict"
import { test } from "node:test"
import { crearBandeja, sincronizarBandeja, type InformePendiente } from "./bandeja-informes.ts"

function almacenamiento() {
  const datos = new Map<string, string>()
  return {
    get length() { return datos.size },
    key: (i: number) => [...datos.keys()][i] ?? null,
    getItem: (clave: string) => datos.get(clave) ?? null,
    setItem: (clave: string, valor: string) => { datos.set(clave, valor) },
    removeItem: (clave: string) => { datos.delete(clave) },
  }
}

const informe: InformePendiente = {
  id: "operacion-1", creado: "2026-11-14T08:00:00Z", perfil: "transit", retardo: 12,
  contenido: { titulo: "Día 1", resumen: "Medidas", lectura: "62 lpm", linea_base: "60–65", entorno: "", accion: "Repetir", accion_hecha: "remedi" },
}

test("cerrar, reabrir y perder un acuse conserva la instantánea y el id; solo un acuse elimina", async () => {
  const almacen = almacenamiento()
  crearBandeja(almacen, 1, "real", "m1").guardar(informe)
  const reabierta = crearBandeja(almacen, 1, "real", "m1")
  assert.deepEqual(reabierta.listar(), [informe])
  assert.equal(await sincronizarBandeja(reabierta, async () => ({ error: "reintentar" })), 0)
  assert.deepEqual(reabierta.listar(), [informe])
  const enviados: string[] = []
  await sincronizarBandeja(reabierta, async (p) => { enviados.push(p.id); return { id: 9 } })
  assert.deepEqual(enviados, [informe.id])
  assert.deepEqual(reabierta.listar(), [])
})

test("misión, propietario y modo aíslan los informes incluso durante un envío", async () => {
  const almacen = almacenamiento()
  const original = crearBandeja(almacen, 1, "real", "m1")
  original.guardar(informe)
  for (const bandeja of [crearBandeja(almacen, 2, "real", "m1"), crearBandeja(almacen, 1, "demo", "m1"), crearBandeja(almacen, 1, "real", "m2")]) {
    assert.deepEqual(bandeja.listar(), [])
    bandeja.guardar({ ...informe, contenido: { ...informe.contenido, titulo: "Otro ámbito" } })
  }
  await sincronizarBandeja(original, async () => ({ id: 1 }))
  assert.equal(almacen.length, 3)
})

test("dos disparadores comparten el mismo envío y un conflicto queda visible sin reintentos", async () => {
  const bandeja = crearBandeja(almacenamiento(), 1, "real", "m1")
  bandeja.guardar(informe)
  let llamadas = 0
  const enviar = async () => { llamadas++; return { error: "conflicto" as const } }
  await Promise.all([sincronizarBandeja(bandeja, enviar), sincronizarBandeja(bandeja, enviar)])
  assert.equal(llamadas, 1)
  assert.equal(bandeja.listar()[0].error, "conflicto")
  await sincronizarBandeja(bandeja, enviar)
  assert.equal(llamadas, 1)
})

test("almacenamiento lleno o contenido corrupto no se presentan como guardado o bandeja vacía", () => {
  const almacen = almacenamiento()
  const bandeja = crearBandeja(almacen, 1, "real", "m1")
  almacen.setItem = () => { throw new Error("lleno") }
  assert.throws(() => bandeja.guardar(informe), /lleno/)
  const corrupto = almacenamiento()
  corrupto.setItem("vigia:informes:v1:m1:1:real:operacion-1", "{")
  assert.throws(() => crearBandeja(corrupto, 1, "real", "m1").listar())
})
