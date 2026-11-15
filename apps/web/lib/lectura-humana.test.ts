// node --test apps/web/lib/lectura-humana.test.ts (Node 22.18+, sin dependencias)
import assert from "node:assert/strict"
import { test } from "node:test"
import { balanceLectura, frasesLectura, lecturaHumana } from "./lectura-humana.ts"

const BANDA = { low: 60.4, high: 86.1 }
const dia = { restingHr: 81.5, systolic: 108.6, spo2: 98.2, tempC: 36.77, sleepH: 4.28, mood: 6 }

test("un día completo da una frase por indicador, en el orden de la lectura numérica", () => {
  const frases = frasesLectura(dia, BANDA)
  assert.equal(frases.length, 6)
  assert.match(frases[0].texto, /^Pulso en reposo 82 lpm: dentro de tu rango de los últimos días \(60 a 86\)\.$/)
  assert.equal(frases[1].texto, "Presión 109 mmHg: normal.")
  assert.equal(frases[2].texto, "Oxígeno 98 %: normal.")
  assert.equal(frases[3].texto, "Temperatura 36.8 °C: normal.")
  assert.equal(frases[4].texto, "Dormiste 4.3 h: poco, menos de 6 h.")
  assert.equal(frases[5].texto, "Ánimo 6 de 10.")
  assert.deepEqual(frases.map((f) => f.fuera), [false, false, false, false, true, false])
})

test("el pulso se juzga con la banda personal: por encima o por debajo de ella", () => {
  assert.equal(frasesLectura({ restingHr: 95 }, BANDA)[0].texto, "Pulso en reposo 95 lpm: por encima de tu rango habitual (60 a 86).")
  assert.equal(frasesLectura({ restingHr: 52 }, BANDA)[0].texto, "Pulso en reposo 52 lpm: por debajo de tu rango habitual (60 a 86).")
  assert.ok(frasesLectura({ restingHr: 95 }, BANDA)[0].fuera)
})

test("sin banda personal el pulso usa 50 a 100 lpm", () => {
  assert.equal(frasesLectura({ restingHr: 72 })[0].texto, "Pulso en reposo 72 lpm: normal (50 a 100).")
  assert.equal(frasesLectura({ restingHr: 104 }, null)[0].texto, "Pulso en reposo 104 lpm: alto, por encima de 100.")
  assert.equal(frasesLectura({ restingHr: 44 })[0].texto, "Pulso en reposo 44 lpm: bajo, por debajo de 50.")
})

test("presión, oxígeno, temperatura y sueño fuera de rango se dicen con su referencia", () => {
  assert.equal(frasesLectura({ systolic: 142 })[0].texto, "Presión 142 mmHg: alta, por encima de 139.")
  assert.equal(frasesLectura({ systolic: 85 })[0].texto, "Presión 85 mmHg: baja, por debajo de 90.")
  assert.equal(frasesLectura({ spo2: 93 })[0].texto, "Oxígeno 93 %: bajo, por debajo de 95.")
  assert.equal(frasesLectura({ tempC: 37.9 })[0].texto, "Temperatura 37.9 °C: alta, por encima de 37.5.")
  assert.equal(frasesLectura({ tempC: 35.6 })[0].texto, "Temperatura 35.6 °C: baja, por debajo de 36.0.")
  assert.equal(frasesLectura({ sleepH: 7.3 })[0].texto, "Dormiste 7.3 h: suficiente.")
})

test("los bordes del rango cuentan como dentro, comparando el valor ya redondeado", () => {
  assert.equal(frasesLectura({ restingHr: 86.4 }, BANDA)[0].fuera, false)
  assert.equal(frasesLectura({ restingHr: 86.6 }, BANDA)[0].fuera, true)
  assert.equal(frasesLectura({ systolic: 139 })[0].fuera, false)
  assert.equal(frasesLectura({ spo2: 95 })[0].fuera, false)
  assert.equal(frasesLectura({ tempC: 37.54 })[0].fuera, false)
  assert.equal(frasesLectura({ sleepH: 6 })[0].fuera, false)
})

test("una medida que falta no se nombra; sin ninguna medida la lectura es vacía", () => {
  const frases = frasesLectura({ restingHr: null, systolic: 118, spo2: null, tempC: null, sleepH: null, mood: null })
  assert.equal(frases.length, 1)
  assert.equal(frases[0].texto, "Presión 118 mmHg: normal.")
  assert.equal(lecturaHumana(null), "")
  assert.equal(lecturaHumana({}), "")
})

test("lecturaHumana junta las frases en un párrafo y balanceLectura las cuenta", () => {
  const texto = lecturaHumana({ restingHr: 95, sleepH: 4.3, mood: 6 }, BANDA)
  assert.equal(texto, "Pulso en reposo 95 lpm: por encima de tu rango habitual (60 a 86). Dormiste 4.3 h: poco, menos de 6 h. Ánimo 6 de 10.")
  assert.deepEqual(balanceLectura({ restingHr: 95, sleepH: 4.3, mood: 6 }, BANDA), { revisados: 3, fuera: 2 })
  assert.deepEqual(balanceLectura(null), { revisados: 0, fuera: 0 })
})
