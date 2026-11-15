// Capturas de la app para las presentaciones, en el idioma que se pida (modo demo, día de demo, tema claro).
// Uso: node capturas-deck.js <es|en> <carpeta_salida>   (requiere la app en http://localhost:3000)
const puppeteer = require("puppeteer-core")
const path = require("path")
const fs = require("fs")

const [LANG = "en", OUT = path.join(__dirname, "..", "..", "docs", "capturas")] = process.argv.slice(2)
const BASE = "http://localhost:3000"
const ZONA_CORAZON = { es: "Corazón y vasos", en: "Heart and vessels" }[LANG]
const CONECTAR = { es: "Conectar", en: "Connect" }[LANG]
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))
fs.mkdirSync(OUT, { recursive: true })

async function abrir(browser, ruta) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport({ width: 1280, height: 800 })
  await page.goto(`${BASE}${ruta}${ruta.includes("?") ? "&" : "?"}modo=demo&lang=${LANG}`, { waitUntil: "networkidle2", timeout: 90000 })
  await esperar(4000)
  // sin avisos emergentes ni el indicador de next dev
  await page.addStyleTag({ content: "section.fixed.bottom-3.right-3{display:none!important} nextjs-portal{display:none!important}" })
  await esperar(500)
  return { page, ctx }
}
async function pulsar(page, texto) {
  for (const b of await page.$$("button")) {
    const t = await page.evaluate((el) => el.textContent, b)
    if (t && t.trim().startsWith(texto)) { await b.click(); return true }
  }
  return false
}
const guardar = (page, nombre) => page.screenshot({ path: path.join(OUT, `${nombre}-${LANG}.png`) })

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--window-size=1280,800"],
  })
  const simples = [["/check-in", "check-in"], ["/environment", "environment"], ["/alerts", "alerts"], ["/reports", "reports"], ["/trends", "trends"]]
  for (const [ruta, nombre] of simples) {
    const { page, ctx } = await abrir(browser, ruta)
    await guardar(page, nombre)
    await ctx.close()
    console.log("ok", nombre)
  }
  {
    // cuerpo con la zona del corazón abierta (la deriva lenta la pone en ámbar el día 27)
    const { page, ctx } = await abrir(browser, "/")
    await esperar(3000)
    const abierta = await pulsar(page, ZONA_CORAZON)
    await esperar(2500)
    await guardar(page, "home")
    await ctx.close()
    console.log("ok home, zona abierta:", abierta)
  }
  {
    const { page, ctx } = await abrir(browser, "/device")
    const pulsado = await pulsar(page, CONECTAR)
    await esperar(4000)
    await guardar(page, "device")
    await ctx.close()
    console.log("ok device, conectar:", pulsado)
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
