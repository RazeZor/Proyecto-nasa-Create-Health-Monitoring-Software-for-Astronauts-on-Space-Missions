// Pruebas de las rutas por rol: node --test apps/web/lib/roles.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { permitida, RUTA_DE_ROL, rolDeRuta, rutaDe, SECCIONES } from "./roles.ts"
import type { Role } from "./types.ts"

test("cada rol tiene su ruta: /astronauta, /oficial y /medico", () => {
  assert.deepEqual(RUTA_DE_ROL, { astronaut: "astronauta", cmo: "oficial", surgeon: "medico" })
})

test("el rol sale del primer tramo de la ruta, y el inicio no tiene rol", () => {
  assert.equal(rolDeRuta("/oficial/alerts"), "cmo")
  assert.equal(rolDeRuta("/medico"), "surgeon")
  assert.equal(rolDeRuta("/astronauta/check-in"), "astronaut")
  assert.equal(rolDeRuta("/"), null)
  assert.equal(rolDeRuta("/alerts"), null) // sin rol delante no es una ruta de la app
})

test("rutaDe arma el enlace dentro del rol", () => {
  assert.equal(rutaDe("cmo"), "/oficial")
  assert.equal(rutaDe("surgeon", "reports"), "/medico/reports")
})

test("no todos ven lo mismo: el registro diario es del astronauta y los informes, de él y de Tierra", () => {
  assert.equal(permitida("astronaut", "check-in"), true)
  assert.equal(permitida("cmo", "check-in"), false)
  assert.equal(permitida("surgeon", "check-in"), false)
  assert.equal(permitida("surgeon", "reports"), true)
  assert.equal(permitida("cmo", "reports"), false)
  assert.equal(permitida("cmo", "device"), true) // los relojes de la tripulación
  assert.equal(permitida("surgeon", "device"), false)
})

test("los clínicos ven el cuerpo de cada tripulante; el astronauta solo el suyo", () => {
  assert.equal(permitida("cmo", "body"), true)
  assert.equal(permitida("surgeon", "body"), true)
  assert.equal(permitida("astronaut", "body"), true) // el suyo: /astronauta/body no tiene selector de otros
})

test("el service worker guarda para uso sin conexión cada pantalla de cada rol", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf-8")
  for (const rol of Object.keys(SECCIONES) as Role[]) {
    for (const ruta of [rutaDe(rol), ...SECCIONES[rol].map((s) => rutaDe(rol, s))]) assert.ok(sw.includes(`"${ruta}"`), ruta)
  }
})
