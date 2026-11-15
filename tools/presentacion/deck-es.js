// Genera dos presentaciones de VIGÍA en español: la demo oficial (7 diapositivas, límite de NASA Space Apps) y el pitch de 4 min.
// Es la versión en español de deck.js: misma estructura, posiciones y lógica; solo cambian los textos y las capturas preferidas.
// Uso: node deck-es.js <carpeta_capturas> <carpeta_marca> <salida> [equipo] [integrantes] [evento]
const path = require("path")
const fs = require("fs")
const pptxgen = require("pptxgenjs")
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js")

const [CAPTURAS, MARCA, SALIDA, EQUIPO = "[NOMBRE DEL EQUIPO]", INTEGRANTES = "[Integrantes]", EVENTO = "[Evento local]"] = process.argv.slice(2)
const img = (nombre, alternativas = []) => {
  for (const n of [nombre, ...alternativas]) {
    const p = path.join(CAPTURAS, n)
    if (fs.existsSync(p)) return p
  }
  return null
}
// Prefiere las capturas en español (sufijo -es) y cae en las inglesas si no existen
const SHOT = {
  home: img("home-es.png", ["t5-deck-home-es.png", "home-en.png"]),
  homeZona: img("home-es.png", ["t5-deck-home-es.png", "home-en.png"]),
  checkin: img("check-in-es.png", ["check-in-en.png"]),
  environment: img("environment-es.png", ["environment-en.png"]),
  alerts: img("alerts-es.png", ["alerts-en.png"]),
  reports: img("reports-es.png", ["reports-en.png"]),
  device: img("device-es.png", ["device-en.png"]),
  trends: img("trends-es.png", ["trends-en.png"]),
}
const LOGO_OSCURO = path.join(MARCA, "logo-horizontal-oscuro.png") // para fondo oscuro
const LOGO_CLARO = path.join(MARCA, "logo-horizontal-claro.png") // para fondo claro
const SIMBOLO = path.join(MARCA, "simbolo-oscuro.png")

// Marca VIGÍA: Noche, Casco y los tres estados (docs/brand/README.md, apps/web/app/globals.css)
const THEME = {
  name: "VIGIA",
  headFontFace: "Calibri",
  bodyFontFace: "Calibri",
  colors: {
    dk1: "0B1020", lt1: "FFFFFF", dk2: "525D75", lt2: "F2F5FA",
    accent1: "0C8F5B", accent2: "B06F00", accent3: "D2343A", accent4: "3DDC97", accent5: "F5A623", accent6: "A3AEC4",
    hlink: "0C8F5B", folHlink: "525D75",
  },
}
let SH = null
const HEX = THEME.colors
const PIE = "VIGÍA · Prototipo de apoyo a la decisión, no un dispositivo médico · NASA Space Apps Challenge 2026"

function nuevaPres(titulo) {
  const pres = new pptxgen()
  pres.layout = "LAYOUT_16x9"
  pres.theme = { headFontFace: THEME.headFontFace, bodyFontFace: THEME.bodyFontFace }
  pres.title = titulo
  pres.author = EQUIPO
  pres.subject = "NASA Space Apps Challenge 2026 - Create Health Monitoring Software for Astronauts on Space Missions"
  const C = pres.SchemeColor
  SH = pres.ShapeType
  pres.defineSlideMaster({
    title: "OSCURA", background: { color: HEX.dk1 },
    objects: [
      { image: { x: 0.5, y: 0.4, w: 2.4, h: 0.81, path: LOGO_OSCURO } },
      { text: { text: PIE, options: { x: 0.5, y: 5.2, w: 9, h: 0.3, fontSize: 10, color: HEX.accent6, isTextBox: true, margin: 0 } } },
    ],
  })
  pres.defineSlideMaster({
    title: "CLARA", background: { color: HEX.lt2 },
    objects: [
      { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9, h: 0.75, fontSize: 27, bold: true, color: HEX.dk1, margin: 0, valign: "middle" }, text: "" } },
      { image: { x: 8.55, y: 5.12, w: 1.0, h: 0.34, path: LOGO_CLARO } },
      { text: { text: PIE, options: { x: 0.5, y: 5.2, w: 7.8, h: 0.3, fontSize: 9, color: HEX.dk2, isTextBox: true, margin: 0 } } },
    ],
    slideNumber: { x: 9.6, y: 5.2, w: 0.4, h: 0.3, fontSize: 9, color: HEX.dk2 },
  })
  return { pres, C }
}

// ── piezas ─────────────────────────────────────────────────────────────────────────────────────────────────────
function captura(slide, ruta, x, y, w, alt) {
  const h = w / 1.6 // las capturas son de 1280×800
  slide.addShape(SH.roundRect, { x: x - 0.06, y: y - 0.06, w: w + 0.12, h: h + 0.12, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08, shadow: { type: "outer", color: "0B1020", blur: 6, offset: 2, angle: 90, opacity: 0.18 } })
  if (ruta) slide.addImage({ path: ruta, x, y, w, h, altText: alt, objectName: alt })
  else slide.addText(alt, { x, y, w, h, fontSize: 12, color: HEX.dk2, align: "center", valign: "middle", isTextBox: true })
  return h
}
function numero(slide, n, x, y, color) {
  slide.addShape(SH.ellipse, { x, y, w: 0.46, h: 0.46, fill: { color }, line: { color, width: 0 } })
  slide.addText(String(n), { x, y, w: 0.46, h: 0.46, fontSize: 16, bold: true, color: HEX.lt1, align: "center", valign: "middle", margin: 0, isTextBox: true })
}
function tarjetaStat(slide, x, y, w, valor, etiqueta, color, fontSize = 36) {
  slide.addShape(SH.roundRect, { x, y, w, h: 1.55, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.1 })
  slide.addText(valor, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: 0.8, fontSize, bold: true, color, align: "center", valign: "middle", margin: 0, isTextBox: true })
  slide.addText(etiqueta, { x: x + 0.15, y: y + 0.9, w: w - 0.3, h: 0.6, fontSize: 11, color: HEX.dk2, align: "center", valign: "top", margin: 0, isTextBox: true })
}
function vinetas(slide, items, x, y, w, h, fontSize = 14, color = HEX.dk1) {
  slide.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1, paraSpaceAfter: 6 } })), { x, y, w, h, fontSize, color, valign: "top", isTextBox: true, margin: 0 })
}
function titulo(slide, texto) { slide.addText(texto, { placeholder: "title" }) }

// ── diapositivas compartidas ───────────────────────────────────────────────────────────────────────────────────
function portada(pres, C, seccion, subtitulo) {
  pres.addSection({ title: seccion })
  const s = pres.addSlide({ masterName: "OSCURA", sectionTitle: seccion })
  s.addText("VIGÍA", { x: 0.5, y: 1.55, w: 9, h: 1.0, fontSize: 60, bold: true, color: HEX.lt2, isTextBox: true, margin: 0 })
  s.addText("Cuando la Tierra no puede responder, no vuelas a ciegas.", { x: 0.5, y: 2.5, w: 9, h: 0.6, fontSize: 24, italic: true, color: HEX.accent4, isTextBox: true, margin: 0 })
  s.addText(subtitulo, { x: 0.5, y: 3.2, w: 9, h: 0.5, fontSize: 16, color: HEX.lt2, isTextBox: true, margin: 0 })
  s.addText([
    { text: `Equipo ${EQUIPO}`, options: { bold: true, breakLine: true } },
    { text: INTEGRANTES, options: { breakLine: true } },
    { text: `${EVENTO} · NASA Space Apps Challenge 2026`, options: { breakLine: true } },
    { text: "Reto: Create Health Monitoring Software for Astronauts on Space Missions" },
  ], { x: 0.5, y: 3.8, w: 9, h: 1.3, fontSize: 13, color: HEX.accent6, isTextBox: true, margin: 0, valign: "top" })
  s.addNotes("Presenta al equipo y el reto. Una línea: VIGÍA permite a los astronautas evaluar su propia salud a bordo, sin esperar a la Tierra.")
  return s
}
function problema(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "Camino a Marte, tu médico está a 22 minutos")
  vinetas(s, [
    "Un mensaje al cirujano de vuelo tarda hasta 22 minutos por tramo. La evacuación no es posible.",
    "Los cinco peligros del HRP de la NASA se refuerzan entre sí: radiación, aislamiento, distancia, gravedad, ambiente cerrado.",
    "El software de salud actual envía los datos a la Tierra. La tripulación necesita decidir a bordo.",
    "La NASA lo llama Operaciones Médicas Independientes de la Tierra (Earth-Independent Medical Operations).",
  ], 0.5, 1.3, 3.9, 3.6, 14)
  tarjetaStat(s, 4.7, 1.35, 1.5, "< 1 s", "ISS\nretardo de ida", HEX.accent1)
  tarjetaStat(s, 6.35, 1.35, 1.5, "1,3 s", "Luna\nretardo de ida", HEX.accent2)
  tarjetaStat(s, 8.0, 1.35, 1.5, "3–22 min", "Marte\nretardo de ida", HEX.accent3, 24)
  s.addShape(SH.roundRect, { x: 4.7, y: 3.15, w: 4.8, h: 1.7, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.1 })
  s.addText([
    { text: "Cinco peligros del vuelo espacial humano (NASA HRP)", options: { bold: true, breakLine: true, color: HEX.dk1 } },
    { text: "Radiación espacial · Aislamiento y confinamiento · Distancia de la Tierra · Campos gravitatorios · Ambiente cerrado hostil", options: { color: HEX.dk2, breakLine: true } },
    { text: "Pueden provocar cambios inmunitarios, pérdida ósea, eventos cardiovasculares y problemas de salud conductual; en misiones largas la tripulación debe detectar estos cambios por sí misma.", options: { color: HEX.dk2 } },
  ], { x: 4.85, y: 3.25, w: 4.5, h: 1.5, fontSize: 11.5, valign: "top", isTextBox: true, margin: 0, paraSpaceAfter: 4 })
  s.addNotes("Te duele la cabeza y estás mareada. Le escribes a tu médico. La respuesta llega en 44 minutos, si llega. Estás a mitad de camino a Marte.")
  return s
}
function solucion(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "Registrar, evaluar, actuar: a bordo, en 90 segundos")
  const pasos = [
    ["Registrar", "Registro diario: frecuencia cardíaca, presión arterial, SpO2, temperatura, sueño, ánimo, síntomas, glucosa semanal. Cada indicador dice cómo medirlo en este perfil de misión y por qué importa. Un Galaxy Watch4 puede precargar la FC en reposo y la SpO2.", HEX.accent1],
    ["Evaluar", "Motor de tres capas: bandas de seguridad NEWS2 con cortes propios, desviación respecto a tu propia línea base (de prevuelo a vuelo), deriva lenta (CUSUM). Datos reales de entorno de la NASA y la NOAA entran en el razonamiento.", HEX.accent2],
    ["Actuar", "Verde, ámbar o rojo por sistema corporal, con el motivo y el siguiente paso. Solo una alerta roja de seguridad llega al oficial médico de la tripulación, con el dato mínimo. Los informes se encolan hacia la Tierra con el retardo real.", HEX.accent3],
  ]
  pasos.forEach(([t, d, color], i) => {
    const y = 1.3 + i * 1.25
    numero(s, i + 1, 0.5, y, color)
    s.addText(t, { x: 1.1, y: y - 0.02, w: 3.6, h: 0.45, fontSize: 17, bold: true, color, isTextBox: true, margin: 0 })
    s.addText(d, { x: 1.1, y: y + 0.4, w: 3.7, h: 0.85, fontSize: 10.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  captura(s, SHOT.homeZona, 5.2, 1.3, 4.3, "Pantalla del cuerpo con una zona ámbar abierta: por qué y qué hacer a continuación")
  s.addText("Cuerpo anatómico 3D (BodyParts3D, CC BY 4.0): cada sistema muestra su estado, el motivo y el siguiente paso.", { x: 5.2, y: 4.05, w: 4.3, h: 0.6, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addNotes("Demo en vivo: completa un registro con el wifi apagado. El cuerpo se pone ámbar: tu sueño y tu pulso en reposo llevan una semana derivando respecto a tu propia línea base; ningún límite clínico lo habría marcado.")
  return s
}
function ejemplo(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "El entorno es parte del razonamiento")
  captura(s, SHOT.alerts, 0.5, 1.3, 4.4, "Pantalla de alertas: alerta de entorno con fuente y fecha real")
  const bloques = [
    ["Día 12 · CO2 + dolor de cabeza", "El CO2 de cabina de NASA OSDR (EDA) es de 4,6 mmHg, por encima del límite de 3 mmHg (NASA-STD-3001). El dolor de cabeza se convierte en una alerta de entorno para toda la tripulación, no en una alerta médica para una persona.", HEX.accent2],
    ["Día 22 · Modo tormenta", "Un evento de partículas energéticas solares de NASA DONKI, con flujo de protones GOES igual o superior a 10 pfu (NOAA S1), activa el modo tormenta: refugio recomendado para todos.", HEX.accent3],
    ["Días 18–27 · Deriva lenta", "El sueño, la FC en reposo y el ánimo derivan un poco cada día. Un umbral terrestre fijo nunca se dispara; la línea base personal y el CUSUM sí.", HEX.accent1],
  ]
  bloques.forEach(([t, d, color], i) => {
    const y = 1.3 + i * 1.22
    s.addShape(SH.roundRect, { x: 5.2, y, w: 4.3, h: 1.1, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    s.addText(t, { x: 5.35, y: y + 0.06, w: 4.0, h: 0.32, fontSize: 12.5, bold: true, color, isTextBox: true, margin: 0 })
    s.addText(d, { x: 5.35, y: y + 0.38, w: 4.0, h: 0.7, fontSize: 9.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  s.addText("Cada valor está etiquetado como Real o Simulado, con su fuente y fecha real. Series de distintos años se ubican en una sola línea de tiempo de misión mediante un escenario explícito.", { x: 0.5, y: 4.15, w: 4.4, h: 0.7, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addNotes("Abre Entorno: dosis real de un detector de la ISS (RadLab), CO2 real de cabina (EDA). Un evento solar real de DONKI activa el modo tormenta para la tripulación. Cada valor dice si es real o simulado, con su fuente y fecha.")
  return s
}
function datos(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "Datos abiertos de la NASA y sus socios")
  const cab = (t) => ({ text: t, options: { bold: true, color: HEX.lt1, fill: { color: HEX.dk1 }, fontSize: 10 } })
  const filas = [
    [cab("Dato"), cab("Fuente"), cab("Papel en VIGÍA")],
    ["Dosis de radiación (ALTEA-Survey, ISS, 2011)", "NASA OSDR · RadLab", "Dosis ambiental en la pantalla de Entorno"],
    ["CO2, temperatura y humedad de cabina (Rodent Research-1, ISS, 2014)", "NASA OSDR · EDA", "Regla dolor de cabeza + CO2, convertida con la presión de cabina del perfil"],
    ["Eventos de partículas energéticas solares (mayo de 2024)", "NASA CCMC · DONKI", "Modo tormenta para toda la tripulación"],
    ["Flujo de protones ≥10 MeV", "NOAA SWPC · GOES", "Severidad de la tormenta (S1 = 10 pfu)"],
    ["Peligros, riesgos, investigación en curso", "NASA HRP", "Estructura de la figura del cuerpo, fichas de los indicadores"],
    ["Monitoreo de radiación, ciencia en el espacio", "CSA", "Módulo de dosis y sus límites declarados"],
  ]
  s.addTable(filas, { x: 0.5, y: 1.3, w: 5.6, colW: [2.3, 1.4, 1.9], fontSize: 9.5, color: HEX.dk1, border: { type: "solid", pt: 0.5, color: "D5DBE7" }, fill: { color: HEX.lt1 }, valign: "middle", rowH: 0.42 })
  captura(s, SHOT.environment, 6.4, 1.3, 3.1, "Pantalla de Entorno con etiquetas Real y Simulado")
  s.addText("Pipelines: raw → curated → gold, con manifiesto y SHA-256 por archivo. La API rechaza un archivo gold cuyo checksum no coincide.", { x: 6.4, y: 3.35, w: 3.1, h: 0.9, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addText("Entorno real, fisiología de la tripulación simulada en modo demo (etiquetada). No existe telemetría pública en vivo de astronautas; en modo real VIGÍA muestra solo lo que la tripulación ingresa o lo que mide el reloj.", { x: 0.5, y: 4.35, w: 5.6, h: 0.6, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addNotes("Cada conjunto de datos entra por su API pública, se reancla a la línea de tiempo de la misión mediante un escenario explícito y se muestra con su fuente y fecha real.")
  return s
}
function resultados(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "Qué medimos y qué significa")
  tarjetaStat(s, 0.5, 1.3, 2.1, "99,8 %", "deriva lenta detectada,\nmediana 8 días tras el inicio", HEX.accent1)
  tarjetaStat(s, 2.75, 1.3, 2.1, "nunca", "se disparó un umbral terrestre fijo\n(FC ≥ 91 lpm)", HEX.accent2)
  tarjetaStat(s, 5.0, 1.3, 2.1, "< 0,001", "falsas alarmas por tripulante\npor semana", HEX.accent3)
  tarjetaStat(s, 7.25, 1.3, 2.25, "100 %", "reglas CO2 + dolor de cabeza\ny tormenta (deterministas)", HEX.dk1)
  s.addText("500 misiones simuladas con anomalías + 500 controles, semilla 2026; replicado con semilla 2027. Simulación, no rendimiento clínico: ruido gaussiano, generador escrito por el mismo equipo. Salidas versionadas como fixtures; el motor en TypeScript reproduce la referencia en Python alerta por alerta.", { x: 0.5, y: 3.0, w: 9, h: 0.65, fontSize: 10.5, italic: true, color: HEX.dk2, isTextBox: true, margin: 0 })
  const cols = [
    ["Privado por defecto", "Verde y ámbar nunca salen del dispositivo. Solo un rojo de la capa A se escala, con el dato mínimo; la astronauta ve exactamente qué se envió y cada acceso queda auditado."],
    ["Funciona sin conexión", "Service worker, copia local del catálogo, cola local de registros y escalamientos que sincroniza cuando vuelve el enlace."],
    ["Honesto por diseño", "Real o Simulado en cada valor. Sin datos inventados en modo real: un valor no medido es «sin dato», nunca 0 ni «todo bien»."],
  ]
  cols.forEach(([t, d], i) => {
    const x = 0.5 + i * 3.05
    s.addShape(SH.roundRect, { x, y: 3.75, w: 2.9, h: 1.3, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    s.addText(t, { x: x + 0.15, y: 3.82, w: 2.6, h: 0.3, fontSize: 12.5, bold: true, color: HEX.dk1, isTextBox: true, margin: 0 })
    s.addText(d, { x: x + 0.15, y: 4.12, w: 2.6, h: 0.9, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0, valign: "top" })
  })
  s.addNotes("En 500 misiones simuladas el motor detectó la deriva en el 99,8 % de los casos, 8 días tras el inicio; el umbral terrestre fijo nunca se disparó; menos de 0,001 falsas alarmas por tripulante por semana. Es simulación, no rendimiento clínico, y lo decimos.")
  return s
}
function cierre(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "OSCURA", sectionTitle: seccion })
  s.addText("Qué es, qué no es y qué viene después", { x: 0.5, y: 1.3, w: 9, h: 0.6, fontSize: 28, bold: true, color: HEX.lt2, isTextBox: true, margin: 0 })
  s.addText([
    { text: "Límites declarados", options: { bold: true, color: HEX.accent5, breakLine: true } },
    { text: "Sin fisiología real de astronautas: el modo real muestra lo que ingresas; el modo demo es simulado y está etiquetado.", options: { bullet: true, breakLine: true } },
    { text: "Las bandas NEWS2 son terrestres y nuestros cortes son reglas de prototipo: un cirujano de vuelo debe revisarlos.", options: { bullet: true, breakLine: true } },
    { text: "Dosis ambiental de un detector de área, no dosis personal.", options: { bullet: true } },
  ], { x: 0.5, y: 2.0, w: 4.4, h: 2.3, fontSize: 12, color: HEX.lt2, isTextBox: true, margin: 0, valign: "top" })
  s.addText([
    { text: "Próximos tres meses", options: { bold: true, color: HEX.accent4, breakLine: true } },
    { text: "Revisión de cada regla por un cirujano de vuelo", options: { bullet: true, breakLine: true } },
    { text: "Prueba de vigilancia PVT-B e ingreso de dosimetría personal", options: { bullet: true, breakLine: true } },
    { text: "Cifrado, autenticación de la tripulación, piloto en misión análoga", options: { bullet: true, breakLine: true } },
    { text: "Misma arquitectura para bases antárticas, barcos y salud rural", options: { bullet: true } },
  ], { x: 5.2, y: 2.0, w: 4.3, h: 2.3, fontSize: 12, color: HEX.lt2, isTextBox: true, margin: 0, valign: "top" })
  s.addText([
    { text: "App en vivo: https://vigia.smoraleslo.dev   ·   Demo en español: https://vigia.smoraleslo.dev/?modo=demo&lang=es", options: { breakLine: true } },
    { text: "Código (MIT): github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions", options: { breakLine: true } },
    { text: "Créditos: BodyParts3D © DBCLS, CC BY 4.0 · Next.js, three.js, FastAPI, Python · Asistentes de IA (Claude Code, OpenAI Codex) para investigación, documentación y revisión de código; sin medios generados por IA." },
  ], { x: 0.5, y: 4.35, w: 9, h: 0.8, fontSize: 9.5, color: HEX.accent6, isTextBox: true, margin: 0, valign: "top" })
  s.addNotes("Cuando la Tierra tarda 22 minutos en responder, el primer médico eres tú. VIGÍA se asegura de que no vueles a ciegas.")
  return s
}

// ── demo oficial: 7 diapositivas ───────────────────────────────────────────────────────────────────────────────
async function demo() {
  const { pres, C } = nuevaPres("VIGÍA · Demo del proyecto (7 diapositivas)")
  portada(pres, C, "Demo", "Monitor de autoevaluación de salud de la tripulación para misiones largas con retardo de comunicación")
  problema(pres, C, "Demo")
  solucion(pres, C, "Demo")
  ejemplo(pres, C, "Demo")
  datos(pres, C, "Demo")
  resultados(pres, C, "Demo")
  cierre(pres, C, "Demo")
  const archivo = path.join(SALIDA, "VIGIA-demo-7-diapositivas-es.pptx")
  await pres.writeFile({ fileName: archivo })
  if (!process.env.SIN_TEMA) await applyTheme(archivo, THEME)
  console.log("escrito", archivo)
}

// ── pitch de 4 minutos para el jurado local ────────────────────────────────────────────────────────────────────
async function pitch() {
  const { pres, C } = nuevaPres("VIGÍA · Pitch")
  // gancho
  pres.addSection({ title: "Gancho" })
  const g = pres.addSlide({ masterName: "OSCURA", sectionTitle: "Gancho" })
  g.addText("22:00", { x: 0.5, y: 1.3, w: 9, h: 1.6, fontSize: 96, bold: true, color: HEX.accent5, align: "center", isTextBox: true, margin: 0, fontFace: "Courier New" })
  g.addText("minutos para que tu mensaje llegue a la Tierra. Y 22 más para la respuesta.", { x: 0.5, y: 3.0, w: 9, h: 0.6, fontSize: 20, color: HEX.lt2, align: "center", isTextBox: true, margin: 0 })
  g.addText("Te duele la cabeza y estás mareada. Estás a mitad de camino a Marte.", { x: 0.5, y: 3.7, w: 9, h: 0.6, fontSize: 18, italic: true, color: HEX.accent6, align: "center", isTextBox: true, margin: 0 })
  g.addNotes("0:00–0:25. Pantalla negra con el contador. «Te duele la cabeza y estás mareada. Le escribes a tu médico. La respuesta llegará en 44 minutos, si llega.»")
  portada(pres, C, "Pitch", "Monitor de autoevaluación de salud de la tripulación para misiones largas con retardo de comunicación")
  problema(pres, C, "Pitch")
  solucion(pres, C, "Pitch")
  // demo en dos pantallas
  const d1 = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(d1, "Demo en vivo: registrar y evaluar")
  captura(d1, SHOT.checkin, 0.5, 1.3, 4.4, "Paso del registro con dial y temporizador")
  captura(d1, SHOT.trends, 5.1, 1.3, 4.4, "Tendencias con la banda personal")
  d1.addText("Registro en menos de 90 s: una medida por paso, sin teclado, «cómo medir en este perfil» y «por qué importa». Una medición no tomada es «sin dato», nunca 0.", { x: 0.5, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d1.addText("Tendencias contra tu propia banda: línea base de prevuelo en adaptación (días 1–14), ventana de vuelo desde el día 21. Las derivas lentas aparecen antes que cualquier límite fijo.", { x: 5.1, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d1.addNotes("1:00–2:30. Registro en vivo con el wifi apagado. Ámbar: sueño y pulso derivan respecto a la propia línea base.")
  ejemplo(pres, C, "Pitch")
  const d2 = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(d2, "Demo en vivo: actuar, escalar, informar")
  captura(d2, SHOT.reports, 0.5, 1.3, 4.4, "Cola de informes hacia la Tierra con el retardo")
  captura(d2, SHOT.device, 5.1, 1.3, 4.4, "Pantalla de dispositivo: conexión del Galaxy Watch4 en cuatro pasos")
  d2.addText("Solo una alerta roja de seguridad sale del dispositivo, hacia el oficial médico de la tripulación, con el dato mínimo. Los informes viajan a la Tierra con el retardo de la misión; el cirujano de vuelo responde desde la vista de tierra.", { x: 0.5, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d2.addText("Galaxy Watch4 a través del servidor smart-monitor del equipo: la FC en reposo y la SpO2 precargan el registro; el flujo a 1 Hz nunca sale de la memoria. Conexión guiada en cuatro pasos.", { x: 5.1, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d2.addNotes("Una SpO2 roja avisa sola al oficial médico con el dato mínimo; la astronauta ve qué salió. El informe llega a tierra tras el retardo.")
  // motor
  const m = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(m, "Tres preguntas por registro, y luego el entorno")
  const capas = [
    ["A · Seguridad clínica", "Bandas NEWS2 por parámetro (RCP 2017) sobre FC, PA, SpO2 y temperatura; cortes de agregación propios: rojo con una banda extrema o total ≥ 5, ámbar con 3–4. El rojo se escala automáticamente.", HEX.accent3],
    ["B · Desviación personal", "Z-score modificado (mediana y MAD) contra tu propia línea base, dos días seguidos. Días 1–14 solo informativos; 15–20 mezcla; desde el día 21 ventana de vuelo con 3 días de rezago.", HEX.accent2],
    ["C · Deriva lenta", "CUSUM unilateral (k = 0,75; h = 5) sobre FC en reposo al alza, sueño y ánimo a la baja, desde el día 21; se reinicia tras cada alerta.", HEX.accent1],
    ["Contexto", "CO2 > 3 mmHg con dolor de cabeza → alerta de entorno para la tripulación. Flujo ≥ 10 pfu o evento SEP → modo tormenta. Cambio de instrumento → reinicio de la línea base, B y C en pausa 8 días.", HEX.dk1],
  ]
  capas.forEach(([t, d, color], i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.3 + Math.floor(i / 2) * 1.85
    m.addShape(SH.roundRect, { x, y, w: 4.4, h: 1.7, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    m.addText(t, { x: x + 0.15, y: y + 0.08, w: 4.1, h: 0.35, fontSize: 14, bold: true, color, isTextBox: true, margin: 0 })
    m.addText(d, { x: x + 0.15, y: y + 0.45, w: 4.1, h: 1.2, fontSize: 10.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  m.addNotes("Reglas de prototipo con fuente citada, no límites clínicos validados para vuelo. Escrito dos veces (Python y TypeScript) con test de paridad.")
  datos(pres, C, "Pitch")
  resultados(pres, C, "Pitch")
  // usuarios e impacto
  const u = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(u, "Tres personas, cinco entornos, una Tierra")
  const roles = [
    ["Astronauta", "Registro diario, estado por sistema, siguiente paso. Decide a bordo.", HEX.accent1],
    ["Oficial médico de la tripulación", "Recibe solo alertas rojas de seguridad con el dato mínimo. Ve el estado del reloj de la tripulación, nunca sus valores.", HEX.accent2],
    ["Cirujano de vuelo (Tierra)", "Recibe los informes tras el retardo y responde por la cola.", HEX.accent3],
  ]
  roles.forEach(([t, d, color], i) => {
    const x = 0.5 + i * 3.05
    numero(u, i + 1, x, 1.3, color)
    u.addText(t, { x: x + 0.55, y: 1.28, w: 2.4, h: 0.5, fontSize: 14, bold: true, color, isTextBox: true, margin: 0, valign: "middle" })
    u.addText(d, { x, y: 1.85, w: 2.9, h: 1.0, fontSize: 10.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  u.addShape(SH.roundRect, { x: 0.5, y: 3.05, w: 9, h: 1.95, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.1 })
  u.addText([
    { text: "Perfiles de misión: ", options: { bold: true } }, { text: "estación (760 mmHg), tránsito (760), tránsito acoplado / tipo Gateway (527), superficie lunar (424), superficie de Marte (424). La misma lectura de CO2 es una presión parcial distinta en cada uno; el retardo y las instrucciones de medición también cambian.", options: { breakLine: true } },
    { text: "En la Tierra: ", options: { bold: true } }, { text: "bases antárticas, barcos, minería remota y salud rural comparten el patrón: autoevaluación contra tu propia línea base cuando el médico está lejos." },
  ], { x: 0.7, y: 3.2, w: 8.6, h: 1.7, fontSize: 12, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 8 })
  u.addNotes("2:30–3:20. Lo usan tres personas. En la Tierra: bases antárticas, barcos, salud rural.")
  cierre(pres, C, "Pitch")
  const archivo = path.join(SALIDA, "VIGIA-pitch-es.pptx")
  await pres.writeFile({ fileName: archivo })
  if (!process.env.SIN_TEMA) await applyTheme(archivo, THEME)
  console.log("escrito", archivo)
}

;(async () => { await demo(); await pitch() })().catch((e) => { console.error(e); process.exit(1) })
