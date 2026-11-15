// Genera dos presentaciones de VIGÍA: la demo oficial (7 diapositivas, límite de NASA Space Apps) y el pitch de 4 min.
// Uso: node deck.js <carpeta_capturas> <carpeta_marca> <salida> [equipo] [integrantes] [evento]
const path = require("path")
const fs = require("fs")
const pptxgen = require("pptxgenjs")
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js")

const [CAPTURAS, MARCA, SALIDA, EQUIPO = "[TEAM NAME]", INTEGRANTES = "[Team members]", EVENTO = "[Local Event]"] = process.argv.slice(2)
const img = (nombre, alternativas = []) => {
  for (const n of [nombre, ...alternativas]) {
    const p = path.join(CAPTURAS, n)
    if (fs.existsSync(p)) return p
  }
  return null
}
const SHOT = {
  home: img("home-en.png", ["t3-deck-home-zona-ambar.png"]),
  homeZona: img("home-en.png", ["t3-deck-home-zona-ambar.png"]),
  checkin: img("check-in-en.png", ["t3-deck-check-in-paso.png"]),
  environment: img("environment-en.png", ["t4-deck-environment.png"]),
  alerts: img("alerts-en.png", ["t3-deck-alerts.png"]),
  reports: img("reports-en.png", ["t4-deck-reports.png"]),
  device: img("device-en.png", ["t4-deck-device.png"]),
  trends: img("trends-en.png", ["t3-deck-trends.png"]),
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
const PIE = "VIGÍA · Decision-support prototype, not a medical device · NASA Space Apps Challenge 2026"

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
      { placeholder: { options: { name: "title", type: "title", x: 0.5, y: 0.3, w: 9, h: 0.75, fontSize: 30, bold: true, color: HEX.dk1, margin: 0, valign: "middle" }, text: "" } },
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
  s.addText("When Earth can't answer, you're not flying blind.", { x: 0.5, y: 2.5, w: 9, h: 0.6, fontSize: 24, italic: true, color: HEX.accent4, isTextBox: true, margin: 0 })
  s.addText(subtitulo, { x: 0.5, y: 3.2, w: 9, h: 0.5, fontSize: 16, color: HEX.lt2, isTextBox: true, margin: 0 })
  s.addText([
    { text: `Team ${EQUIPO}`, options: { bold: true, breakLine: true } },
    { text: INTEGRANTES, options: { breakLine: true } },
    { text: `${EVENTO} · NASA Space Apps Challenge 2026`, options: { breakLine: true } },
    { text: "Challenge: Create Health Monitoring Software for Astronauts on Space Missions" },
  ], { x: 0.5, y: 3.8, w: 9, h: 1.3, fontSize: 13, color: HEX.accent6, isTextBox: true, margin: 0, valign: "top" })
  s.addNotes("Introduce the team and the challenge. One line: VIGÍA lets astronauts evaluate their own health on board, without waiting for Earth.")
  return s
}
function problema(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "On the way to Mars, your doctor is up to 22 minutes away")
  vinetas(s, [
    "A message to the flight surgeon takes up to 22 minutes each way. Evacuation is not possible.",
    "NASA HRP's five hazards reinforce each other: radiation, isolation, distance, gravity, closed environment.",
    "Today's health software sends data to Earth. The crew needs to decide on board.",
    "NASA calls this Earth-Independent Medical Operations.",
  ], 0.5, 1.3, 3.9, 3.6, 14)
  tarjetaStat(s, 4.7, 1.35, 1.5, "< 1 s", "ISS\none-way delay", HEX.accent1)
  tarjetaStat(s, 6.35, 1.35, 1.5, "1.3 s", "Moon\none-way delay", HEX.accent2)
  tarjetaStat(s, 8.0, 1.35, 1.5, "3–22 min", "Mars\none-way delay", HEX.accent3, 24)
  s.addShape(SH.roundRect, { x: 4.7, y: 3.15, w: 4.8, h: 1.7, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.1 })
  s.addText([
    { text: "Five hazards of human spaceflight (NASA HRP)", options: { bold: true, breakLine: true, color: HEX.dk1 } },
    { text: "Space radiation · Isolation and confinement · Distance from Earth · Gravity fields · Hostile closed environment", options: { color: HEX.dk2, breakLine: true } },
    { text: "They can bring immune changes, bone loss, cardiovascular events and behavioral health problems; on long missions the crew must spot these changes themselves.", options: { color: HEX.dk2 } },
  ], { x: 4.85, y: 3.25, w: 4.5, h: 1.5, fontSize: 11.5, valign: "top", isTextBox: true, margin: 0, paraSpaceAfter: 4 })
  s.addNotes("You have a headache and feel dizzy. You text your doctor. The answer can take 44 minutes, if it comes. You are on a mission to Mars.")
  return s
}
function solucion(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "Gather, evaluate, act: on board, in under 90 seconds")
  const pasos = [
    ["Gather", "Daily check-in: heart rate, blood pressure, SpO2, temperature, sleep, mood, symptoms, weekly glucose. Each indicator says how to measure it in this mission profile and why it matters. A Galaxy Watch4 can pre-fill resting HR and SpO2.", HEX.accent1],
    ["Evaluate", "Three-layer engine: NEWS2 safety bands with our own cut-offs, deviation from your own baseline (pre-flight to in-flight), slow drift (CUSUM). Real NASA and NOAA environment data enter the reasoning.", HEX.accent2],
    ["Act", "Green, amber or red per body system with the reason and the next step. Only a red safety alert reaches the crew medical officer, with the minimum data. Reports queue to Earth under the real delay.", HEX.accent3],
  ]
  pasos.forEach(([t, d, color], i) => {
    const y = 1.3 + i * 1.25
    numero(s, i + 1, 0.5, y, color)
    s.addText(t, { x: 1.1, y: y - 0.02, w: 3.6, h: 0.45, fontSize: 17, bold: true, color, isTextBox: true, margin: 0 })
    s.addText(d, { x: 1.1, y: y + 0.4, w: 3.7, h: 0.85, fontSize: 10.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  captura(s, SHOT.homeZona, 5.2, 1.3, 4.3, "Body screen with an amber zone open: why and what to do next")
  s.addText("3D anatomical body (BodyParts3D, CC BY 4.0): each system shows its status, the reason and the next step.", { x: 5.2, y: 4.05, w: 4.3, h: 0.6, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addNotes("Live demo: complete a check-in with the wifi off. The body turns amber: your sleep and resting pulse have been drifting from your own baseline for a week; no clinical limit would have flagged it.")
  return s
}
function ejemplo(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "The environment is part of the reasoning")
  captura(s, SHOT.alerts, 0.5, 1.3, 4.4, "Alerts screen: environment alert with source and real date")
  const bloques = [
    ["Day 60 · CO2 + headache", "A simulated cabin CO2 spike reaches 4.6 mmHg, above the 3 mmHg limit (NASA-STD-3001). The headache becomes one environment alert for the whole crew, not a medical alert for one person.", HEX.accent2],
    ["Day 131 · Storm mode", "The real solar particle event of 23 January 2012, from NASA DONKI, switches storm mode on: shelter recommended for everyone. A proton flux at or above 10 pfu (NOAA S1) does the same.", HEX.accent3],
    ["Days 100–109 · Slow drift", "Sleep, resting HR and mood drift a little every day. A fixed terrestrial threshold never fires; the personal baseline and CUSUM do.", HEX.accent1],
  ]
  bloques.forEach(([t, d, color], i) => {
    const y = 1.3 + i * 1.22
    s.addShape(SH.roundRect, { x: 5.2, y, w: 4.3, h: 1.1, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    s.addText(t, { x: 5.35, y: y + 0.06, w: 4.0, h: 0.32, fontSize: 12.5, bold: true, color, isTextBox: true, margin: 0 })
    s.addText(d, { x: 5.35, y: y + 0.38, w: 4.0, h: 0.7, fontSize: 9.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  s.addText("Every value is labelled Real or Simulated with its source and real date. Series from different years sit on one mission timeline by an explicit scenario.", { x: 0.5, y: 4.15, w: 4.4, h: 0.7, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addNotes("Open Environment: real dose from an ISS detector (RadLab), real cabin CO2 (EDA). A real solar event from DONKI switches storm mode on for the crew. Every value says whether it is real or simulated, with its source and date.")
  return s
}
function datos(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "NASA and partner open data make it possible")
  const cab = (t) => ({ text: t, options: { bold: true, color: HEX.lt1, fill: { color: HEX.dk1 }, fontSize: 10 } })
  const filas = [
    [cab("Data"), cab("Source"), cab("Role in VIGÍA")],
    ["Radiation dose (ALTEA-Survey, ISS, 2011)", "NASA OSDR · RadLab", "Ambient dose on the Environment screen (real mode)"],
    ["Cabin CO2, temperature, humidity (Rodent Research-1, ISS, 2014)", "NASA OSDR · EDA", "Headache + CO2 rule in real mode, converted with the cabin pressure of the profile"],
    ["Solar energetic particle events (2011–2012 in the demo, on their true dates)", "NASA CCMC · DONKI", "Storm mode for the whole crew"],
    ["Proton flux ≥10 MeV", "NOAA SWPC · GOES", "Storm severity (S1 = 10 pfu)"],
    ["Hazards, risks, ongoing research", "NASA HRP", "Body figure structure, indicator fact sheets"],
    ["Radiation monitoring, science in space", "CSA", "Dose module and its declared limits"],
  ]
  s.addTable(filas, { x: 0.5, y: 1.3, w: 5.6, colW: [2.3, 1.4, 1.9], fontSize: 9.5, color: HEX.dk1, border: { type: "solid", pt: 0.5, color: "D5DBE7" }, fill: { color: HEX.lt1 }, valign: "middle", rowH: 0.42 })
  captura(s, SHOT.environment, 6.4, 1.3, 3.1, "Environment screen with Real and Simulated labels")
  s.addText("Pipelines: raw → curated → gold, with a manifest and SHA-256 per file. The API refuses a gold file whose checksum does not match.", { x: 6.4, y: 3.35, w: 3.1, h: 0.9, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addText("Real environment, simulated crew physiology in demo mode (labelled). No public live astronaut telemetry exists; in real mode VIGÍA shows only what the crew enters or the watch measures.", { x: 0.5, y: 4.35, w: 5.6, h: 0.6, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addNotes("Each dataset enters through its public API, is re-anchored to the mission timeline by an explicit scenario and is shown with source and real date.")
  return s
}
function resultados(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "What we measured, and what it means")
  tarjetaStat(s, 0.5, 1.3, 2.1, "99.8 %", "slow drift detected,\nmedian 8 days after onset", HEX.accent1)
  tarjetaStat(s, 2.75, 1.3, 2.1, "never", "a fixed terrestrial threshold\n(HR ≥ 91 bpm) fired", HEX.accent2)
  tarjetaStat(s, 5.0, 1.3, 2.1, "< 0.001", "false alarms per crew\nmember per week", HEX.accent3)
  tarjetaStat(s, 7.25, 1.3, 2.25, "100 %", "CO2 + headache and\nstorm rules (deterministic)", HEX.dk1)
  s.addText("500 simulated missions with anomalies + 500 controls, seed 2026; replicated with seed 2027. Simulation, not clinical performance: Gaussian noise, generator written by the same team. Outputs committed as fixtures; the TypeScript engine reproduces the Python reference alert by alert.", { x: 0.5, y: 3.0, w: 9, h: 0.65, fontSize: 10.5, italic: true, color: HEX.dk2, isTextBox: true, margin: 0 })
  const cols = [
    ["Private by default", "Green and amber never leave the device. Only a layer-A red is escalated, with the minimum data; the astronaut sees exactly what was sent and every access is audited."],
    ["Works offline", "Service worker, local copy of the catalogue, local queue for check-ins and escalations that syncs when the link returns."],
    ["Honest by design", "Real or Simulated on every value. No data invented in real mode: an unmeasured value is 'no data', never 0 or 'all good'."],
  ]
  cols.forEach(([t, d], i) => {
    const x = 0.5 + i * 3.05
    s.addShape(SH.roundRect, { x, y: 3.75, w: 2.9, h: 1.3, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    s.addText(t, { x: x + 0.15, y: 3.82, w: 2.6, h: 0.3, fontSize: 12.5, bold: true, color: HEX.dk1, isTextBox: true, margin: 0 })
    s.addText(d, { x: x + 0.15, y: 4.12, w: 2.6, h: 0.9, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0, valign: "top" })
  })
  s.addNotes("In 500 simulated missions the engine detected the drift in 99.8 % of cases, 8 days after onset; the fixed terrestrial threshold never fired; fewer than 0.001 false alarms per crew member per week. It is simulation, not clinical performance, and we say so.")
  return s
}
function cierre(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "OSCURA", sectionTitle: seccion })
  s.addText("What it is, what it is not, what comes next", { x: 0.5, y: 1.3, w: 9, h: 0.6, fontSize: 28, bold: true, color: HEX.lt2, isTextBox: true, margin: 0 })
  s.addText([
    { text: "Declared limits", options: { bold: true, color: HEX.accent5, breakLine: true } },
    { text: "No real astronaut physiology: real mode shows what you enter; demo mode is simulated and labelled.", options: { bullet: true, breakLine: true } },
    { text: "NEWS2 bands are terrestrial and our cut-offs are prototype rules: a flight surgeon must review them.", options: { bullet: true, breakLine: true } },
    { text: "Ambient dose from an area detector, not personal dose.", options: { bullet: true } },
  ], { x: 0.5, y: 2.0, w: 4.4, h: 2.3, fontSize: 12, color: HEX.lt2, isTextBox: true, margin: 0, valign: "top" })
  s.addText([
    { text: "Next three months", options: { bold: true, color: HEX.accent4, breakLine: true } },
    { text: "Flight-surgeon review of every rule", options: { bullet: true, breakLine: true } },
    { text: "PVT-B vigilance test and personal dosimetry input", options: { bullet: true, breakLine: true } },
    { text: "Encryption, crew authentication, analog-mission pilot", options: { bullet: true, breakLine: true } },
    { text: "Same architecture for Antarctic stations, ships and rural health", options: { bullet: true } },
  ], { x: 5.2, y: 2.0, w: 4.3, h: 2.3, fontSize: 12, color: HEX.lt2, isTextBox: true, margin: 0, valign: "top" })
  s.addText([
    { text: "Live app: https://vigia.smoraleslo.dev   ·   English demo: https://vigia.smoraleslo.dev/?modo=demo&lang=en", options: { breakLine: true } },
    { text: "Code (MIT): github.com/RazeZor/Proyecto-nasa-Create-Health-Monitoring-Software-for-Astronauts-on-Space-Missions", options: { breakLine: true } },
    { text: "Credits: BodyParts3D © DBCLS, CC BY 4.0 · Next.js, three.js, FastAPI, Python · AI assistants (Claude Code, OpenAI Codex) for research, documentation and code review; no AI-generated media." },
  ], { x: 0.5, y: 4.35, w: 9, h: 0.8, fontSize: 9.5, color: HEX.accent6, isTextBox: true, margin: 0, valign: "top" })
  s.addNotes("When Earth takes 22 minutes to answer, the first doctor is you. VIGÍA makes sure you are not flying blind.")
  return s
}


// ── diferenciadores, cinco peligros y reloj (solo en el pitch) ─────────────────────────────────────────────────
function diferenciadores(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "What makes VIGÍA different")
  const tarjetas = [
    ["Your own baseline, not a textbook range", "Median and MAD of your own readings, moving from pre-flight to in-flight. A drift a fixed terrestrial threshold never sees fires here; in 500 simulated missions the fixed threshold never did.", HEX.accent1],
    ["The environment is inside the reasoning", "Real NASA and NOAA data decide: a headache with cabin CO2 above 3 mmHg is a crew environment alert; a DONKI particle event switches storm mode on. Not a dashboard next to the symptoms: part of the verdict.", HEX.accent2],
    ["Decide on board, privately, offline", "Green and amber never leave the device; only a layer-A red reaches the medical officer with the minimum data. Service worker and local queues: the link can drop and the crew keeps deciding.", HEX.accent3],
    ["Honest by design", "Every value says Real or Simulated with source and real date; an unmeasured value is 'no data', never 0 or 'all good'. Thresholds are prototype rules with cited sources, declared as such.", HEX.dk1],
  ]
  tarjetas.forEach(([t, d, color], i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.3 + Math.floor(i / 2) * 1.85
    s.addShape(SH.roundRect, { x, y, w: 4.4, h: 1.7, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    numero(s, i + 1, x + 0.15, y + 0.12, color)
    s.addText(t, { x: x + 0.72, y: y + 0.1, w: 3.55, h: 0.5, fontSize: 13.5, bold: true, color, isTextBox: true, margin: 0, valign: "middle" })
    s.addText(d, { x: x + 0.15, y: y + 0.65, w: 4.1, h: 1.0, fontSize: 10, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  s.addNotes("What makes us different: your own baseline instead of textbook ranges, the environment inside the verdict, decisions on board with privacy and offline, and honesty on every value.")
  return s
}
function peligros(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "Five hazards, five answers, five environments")
  const cab = (x) => ({ text: x, options: { bold: true, color: HEX.lt1, fill: { color: HEX.dk1 }, fontSize: 9 } })
  const filas = [
    ["Hazard (NASA HRP)", "What VIGÍA measures or reads", "Rule or layer", "What the astronaut gets"].map(cab),
    ["Space radiation", "Ambient dose (RadLab), proton flux (GOES), SEP events (DONKI)", "Storm mode at ≥ 10 pfu or SEP; career dose budget", "Shelter recommendation for the whole crew; dose context on every alert"],
    ["Isolation and confinement", "Mood (1–10) and sleep hours every day", "Layers B and C: personal deviation and slow downward drift", "An amber on mind and sleep days before a crisis, with a next step"],
    ["Distance from Earth", "Mission profile delay (0 s to 22 min)", "Delay queue; decisions on board; red escalates automatically", "A verdict now, a report that reaches Earth when it can"],
    ["Gravity fields", "Resting HR, blood pressure, SpO2, temperature", "In-flight baseline (days 1–14 adaptation, 21+ window); instrument change reset", "Adaptation is not an alarm; a real change is"],
    ["Hostile closed environment", "Cabin CO2, temperature, humidity (EDA) + reported symptoms", "CO2 > 3 mmHg with headache = crew environment alert", "One alert for the crew, not a medical alert for one person"],
  ]
  s.addTable(filas, { x: 0.5, y: 1.2, w: 9, colW: [1.6, 2.5, 2.5, 2.4], fontSize: 8.5, color: HEX.dk1, border: { type: "solid", pt: 0.5, color: "D5DBE7" }, fill: { color: HEX.lt1 }, valign: "middle", rowH: 0.36 })
  s.addText("Five mission profiles, and what changes in each", { x: 0.5, y: 3.68, w: 9, h: 0.3, fontSize: 11.5, bold: true, color: HEX.dk1, isTextBox: true, margin: 0 })
  const perfiles = [["Station", "760 mmHg · < 1 s"], ["Transit", "760 mmHg · up to 22 min"], ["Docked / Gateway-like", "527 mmHg · 1.3 s"], ["Lunar surface", "424 mmHg · 1.3 s"], ["Mars surface", "424 mmHg · 3–22 min"]]
  perfiles.forEach(([n, d], i) => {
    const x = 0.5 + i * 1.84
    s.addShape(SH.roundRect, { x, y: 4.0, w: 1.72, h: 0.62, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    s.addText([{ text: n, options: { bold: true, breakLine: true } }, { text: d, options: { color: HEX.dk2 } }], { x: x + 0.1, y: 4.04, w: 1.52, h: 0.56, fontSize: 9, color: HEX.dk1, isTextBox: true, margin: 0, valign: "middle" })
  })
  s.addText("Cabin pressure converts the same CO2 ppm into a different partial pressure; the delay sets the report queue; the fact sheet changes how each measurement is taken (restraints in 0 g, seated on a surface).", { x: 0.5, y: 4.68, w: 9, h: 0.45, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0 })
  s.addNotes("Each of NASA HRP's five hazards has a measurement, a rule and an action in VIGÍA; the five mission profiles change pressure, delay and how you measure.")
  return s
}
function reloj(pres, C, seccion) {
  const s = pres.addSlide({ masterName: "CLARA", sectionTitle: seccion })
  titulo(s, "A watch on the wrist: everything linked on board")
  captura(s, SHOT.device, 0.5, 1.3, 4.3, "Device screen: watch connection in four steps")
  s.addText("Galaxy Watch4 + smart-monitor + VIGÍA. The watch never sends data to Earth; privacy and escalation rules apply to it as to any reading.", { x: 0.5, y: 4.05, w: 4.3, h: 0.7, fontSize: 9.5, color: HEX.dk2, isTextBox: true, margin: 0 })
  const bul = [
    "We built the wearable side too: a Wear OS app for the Galaxy Watch4 and its server, smart-monitor (team repository), streaming heart rate at 1 Hz, a guided 60-second resting check with motion tolerance, SpO2 on demand and instrument-change notes.",
    "VIGÍA's API listens to that server; the app only talks to the API. Connection guided in four steps (API → server → watch → wrist) and a 'This is my watch' button to link the name on the watch to the crew member.",
    "What enters the engine: only valid checks (resting HR, SpO2), labelled galaxy_watch4:<device>. The 1 Hz stream stays in memory and never becomes a reading; the daily resting HR pre-fills the check-in, never an instant pulse.",
    "Why it matters in space: measurements with no typing, the same instrument every day, and a baseline that resets when the instrument changes. One link from the wrist to the verdict, on board, without Earth.",
  ]
  s.addText(bul.map((x, i) => ({ text: x, options: { bullet: true, breakLine: i < bul.length - 1, paraSpaceAfter: 7 } })), { x: 5.1, y: 1.3, w: 4.4, h: 3.7, fontSize: 10.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  s.addNotes("We also built the wearable side: a Wear OS app and its server. Only valid checks enter the engine; the raw stream never leaves memory.")
  return s
}

// ── demo oficial: 7 diapositivas ───────────────────────────────────────────────────────────────────────────────
async function demo() {
  const { pres, C } = nuevaPres("VIGÍA · Project Demo (7 slides)")
  portada(pres, C, "Demo", "Crew self-health monitor for long missions with communication delay")
  problema(pres, C, "Demo")
  solucion(pres, C, "Demo")
  ejemplo(pres, C, "Demo")
  datos(pres, C, "Demo")
  resultados(pres, C, "Demo")
  cierre(pres, C, "Demo")
  const archivo = path.join(SALIDA, "VIGIA-demo-7-slides.pptx")
  await pres.writeFile({ fileName: archivo })
  if (!process.env.SIN_TEMA) await applyTheme(archivo, THEME)
  console.log("escrito", archivo)
}

// ── pitch de 4 minutos para el jurado local ────────────────────────────────────────────────────────────────────
async function pitch() {
  const { pres, C } = nuevaPres("VIGÍA · Pitch")
  // gancho
  pres.addSection({ title: "Hook" })
  const g = pres.addSlide({ masterName: "OSCURA", sectionTitle: "Hook" })
  g.addText("22:00", { x: 0.5, y: 1.3, w: 9, h: 1.6, fontSize: 96, bold: true, color: HEX.accent5, align: "center", isTextBox: true, margin: 0, fontFace: "Courier New" })
  g.addText("minutes for your message to reach Earth. Then 22 more for the answer.", { x: 0.5, y: 3.0, w: 9, h: 0.6, fontSize: 20, color: HEX.lt2, align: "center", isTextBox: true, margin: 0 })
  g.addText("You have a headache and feel dizzy. You are on your way to Mars.", { x: 0.5, y: 3.7, w: 9, h: 0.6, fontSize: 18, italic: true, color: HEX.accent6, align: "center", isTextBox: true, margin: 0 })
  g.addNotes("0:00–0:25. Pantalla negra con el contador. «Te duele la cabeza y estás mareada. Le escribes a tu médico. La respuesta llegará en 44 minutos, si llega.»")
  portada(pres, C, "Pitch", "Crew self-health monitor for long missions with communication delay")
  problema(pres, C, "Pitch")
  solucion(pres, C, "Pitch")
  // demo en dos pantallas
  const d1 = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(d1, "Live demo: gather and evaluate")
  captura(d1, SHOT.checkin, 0.5, 1.3, 4.4, "Check-in step with dial and timer")
  captura(d1, SHOT.trends, 5.1, 1.3, 4.4, "Trends with the personal band")
  d1.addText("Check-in under 90 s: one measure per step, no keyboard, 'how to measure in this profile' and 'why it matters'. A measurement not taken is 'no data', never 0.", { x: 0.5, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d1.addText("Trends against your own band: pre-flight baseline in adaptation (days 1–14), in-flight window from day 21. Slow drifts show up before any fixed limit.", { x: 5.1, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d1.addNotes("1:00–2:30. Registro en vivo con el wifi apagado. Ámbar: sueño y pulso derivan respecto a la propia línea base.")
  ejemplo(pres, C, "Pitch")
  const d2 = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(d2, "Live demo: act, escalate, report")
  captura(d2, SHOT.reports, 0.5, 1.3, 4.4, "Reports queue to Earth with the delay")
  captura(d2, SHOT.device, 5.1, 1.3, 4.4, "Device screen: Galaxy Watch4 connection in four steps")
  d2.addText("Only a red safety alert leaves the device, to the crew medical officer, with the minimum data. Reports travel to Earth under the mission delay; the flight surgeon answers from the ground view.", { x: 0.5, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d2.addText("Galaxy Watch4 through the team's smart-monitor server: resting HR and SpO2 pre-fill the check-in; the 1 Hz stream never leaves memory. Connection guided in four steps.", { x: 5.1, y: 4.15, w: 4.4, h: 0.8, fontSize: 10, color: HEX.dk2, isTextBox: true, margin: 0 })
  d2.addNotes("Una SpO2 roja avisa sola al oficial médico con el dato mínimo; la astronauta ve qué salió. El informe llega a tierra tras el retardo.")
  // motor
  const m = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(m, "Three questions about every check-in, then the environment")
  const capas = [
    ["A · Clinical safety", "NEWS2 per-parameter bands (RCP 2017) on HR, BP, SpO2, temperature; our own aggregation cut-offs: red on an extreme band or total ≥ 5, amber on 3–4. Red escalates automatically.", HEX.accent3],
    ["B · Personal deviation", "Modified z-score (median and MAD) against your own baseline, two days in a row. Days 1–14 informative only; 15–20 blend; from day 21 in-flight window with 3-day lag.", HEX.accent2],
    ["C · Slow drift", "One-sided CUSUM (k = 0.75, h = 5) on resting HR up, sleep and mood down, from day 21; resets after each alert.", HEX.accent1],
    ["Context", "CO2 > 3 mmHg with headache → crew environment alert. Flux ≥ 10 pfu or SEP event → storm mode. Instrument change → baseline reset, B and C paused 8 days.", HEX.dk1],
  ]
  capas.forEach(([t, d, color], i) => {
    const x = 0.5 + (i % 2) * 4.6, y = 1.3 + Math.floor(i / 2) * 1.85
    m.addShape(SH.roundRect, { x, y, w: 4.4, h: 1.7, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.08 })
    m.addText(t, { x: x + 0.15, y: y + 0.08, w: 4.1, h: 0.35, fontSize: 14, bold: true, color, isTextBox: true, margin: 0 })
    m.addText(d, { x: x + 0.15, y: y + 0.45, w: 4.1, h: 1.2, fontSize: 10.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  m.addNotes("Reglas de prototipo con fuente citada, no límites clínicos validados para vuelo. Escrito dos veces (Python y TypeScript) con test de paridad.")
  diferenciadores(pres, C, "Pitch")
  peligros(pres, C, "Pitch")
  reloj(pres, C, "Pitch")
  datos(pres, C, "Pitch")
  resultados(pres, C, "Pitch")
  // usuarios e impacto
  const u = pres.addSlide({ masterName: "CLARA", sectionTitle: "Pitch" })
  titulo(u, "Three people, five environments, one Earth")
  const roles = [
    ["Astronaut", "Daily check-in, status per system, next step. Decides on board.", HEX.accent1],
    ["Crew medical officer", "Receives only red safety alerts with the minimum data. Sees watch status of the crew, never their values.", HEX.accent2],
    ["Flight surgeon (Earth)", "Receives reports after the delay and answers through the queue.", HEX.accent3],
  ]
  roles.forEach(([t, d, color], i) => {
    const x = 0.5 + i * 3.05
    numero(u, i + 1, x, 1.3, color)
    u.addText(t, { x: x + 0.55, y: 1.28, w: 2.4, h: 0.5, fontSize: 14, bold: true, color, isTextBox: true, margin: 0, valign: "middle" })
    u.addText(d, { x, y: 1.85, w: 2.9, h: 1.0, fontSize: 10.5, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top" })
  })
  u.addShape(SH.roundRect, { x: 0.5, y: 3.05, w: 9, h: 1.95, fill: { color: HEX.lt1 }, line: { color: "D5DBE7", width: 0.75 }, rectRadius: 0.1 })
  u.addText([
    { text: "Mission profiles: ", options: { bold: true } }, { text: "station (760 mmHg), transit (760), docked transit / Gateway-like (527), lunar surface (424), Mars surface (424). The same CO2 reading is a different partial pressure in each; the delay and the measurement instructions change too.", options: { breakLine: true } },
    { text: "On Earth: ", options: { bold: true } }, { text: "Antarctic stations, ships, remote mining and rural health share the pattern: self-assessment against your own baseline when the doctor is far away." },
  ], { x: 0.7, y: 3.2, w: 8.6, h: 1.7, fontSize: 12, color: HEX.dk1, isTextBox: true, margin: 0, valign: "top", paraSpaceAfter: 8 })
  u.addNotes("2:30–3:20. Lo usan tres personas. En la Tierra: bases antárticas, barcos, salud rural.")
  cierre(pres, C, "Pitch")
  const archivo = path.join(SALIDA, "VIGIA-pitch.pptx")
  await pres.writeFile({ fileName: archivo })
  if (!process.env.SIN_TEMA) await applyTheme(archivo, THEME)
  console.log("escrito", archivo)
}

;(async () => { await demo(); await pitch() })().catch((e) => { console.error(e); process.exit(1) })
