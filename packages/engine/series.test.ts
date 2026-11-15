// Descomposición de series del histórico: node --test packages/engine/series.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { test } from "node:test"
import { descomponer, MIN_DIAS_CICLO, MIN_DIAS_DESCOMPOSICION } from "./series.ts"

const serie = (n: number, f: (dia: number) => number) => Array.from({ length: n }, (_, i) => ({ dia: i + 1, valor: f(i + 1) }))
// ciclo semanal claro: días 6 y 7 (fin de semana) 4 unidades por encima, sobre una subida lenta
const SEMANAL = [-1, -1, -1, -1, -1, 2.5, 2.5]
const conCiclo = (d: number) => 60 + 0.1 * d + SEMANAL[(d - 1) % 7]

test("una serie con ciclo semanal claro da tendencia, ciclo y residuo pequeño", () => {
  const r = descomponer(serie(28, conCiclo))!
  assert.ok(r.ciclo, "debe detectar el ciclo")
  assert.ok(r.fuerzaCiclo >= 0.3, `autocorrelación ${r.fuerzaCiclo}`)
  const fin = r.ciclo.find((p) => p.dia === 13)!.valor // día 13 = sexto de su semana
  assert.ok(Math.abs(fin - 2.5) < 0.5, `ciclo del fin de semana ${fin}`)
  for (const p of r.residuo) assert.ok(Math.abs(p.valor) < 0.5, `residuo ${p.dia}: ${p.valor}`)
})

test("una subida sin ciclo no inventa ciclicidad: la tendencia sigue a la serie", () => {
  const r = descomponer(serie(28, (d) => 60 + 0.5 * d))!
  assert.equal(r.ciclo, null)
  for (const p of r.tendencia) assert.ok(Math.abs(p.valor - (60 + 0.5 * p.dia)) < 1e-9, `tendencia ${p.dia}`)
})

test("valor = tendencia + ciclo + residuo en cada día con dato", () => {
  const r = descomponer(serie(28, (d) => conCiclo(d) + (d % 5 === 0 ? 1.5 : 0)))!
  for (const t of r.tendencia) {
    const c = r.ciclo?.find((p) => p.dia === t.dia)?.valor ?? 0
    const e = r.residuo.find((p) => p.dia === t.dia)!.valor
    assert.ok(Math.abs(t.valor + c + e - (conCiclo(t.dia) + (t.dia % 5 === 0 ? 1.5 : 0))) < 1e-9, `día ${t.dia}`)
  }
})

test("con pocos días no hay descomposición, y el ciclo pide al menos dos semanas", () => {
  assert.equal(descomponer(serie(MIN_DIAS_DESCOMPOSICION - 1, conCiclo)), null)
  assert.equal(descomponer(serie(MIN_DIAS_CICLO - 1, conCiclo))!.ciclo, null)
})

test("los días sin medida no cuentan ni rompen la tendencia", () => {
  const huecos = serie(28, (d) => 60 + 0.5 * d).filter((p) => p.dia % 4 !== 0)
  const r = descomponer(huecos)!
  assert.deepEqual(r.tendencia.map((p) => p.dia), huecos.map((p) => p.dia))
  for (const p of r.tendencia) assert.ok(Math.abs(p.valor - (60 + 0.5 * p.dia)) < 1e-9, `tendencia ${p.dia}`)
})
