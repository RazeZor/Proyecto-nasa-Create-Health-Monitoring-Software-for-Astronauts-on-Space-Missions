// Capturas finales para la presentación y verificación de la banda móvil. Uso: node capturas-finales.js
const puppeteer = require("puppeteer-core")
const path = require("path")
const OUT = path.join(__dirname, "capturas")
const BASE = "http://localhost:3000"
const esperar = (ms) => new Promise((r) => setTimeout(r, ms))

async function pagina(browser, url, viewport) {
  const ctx = await browser.createBrowserContext()
  const page = await ctx.newPage()
  await page.setViewport(viewport)
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 })
  await esperar(4000)
  // capturas limpias: sin avisos emergentes ni el indicador de next dev
  await page.addStyleTag({ content: "section.fixed.bottom-3.right-3{display:none!important} nextjs-portal{display:none!important}" })
  await esperar(500)
  return { page, ctx }
}

;(async () => {
  const browser = await puppeteer.launch({
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox", "--window-size=1280,800"],
  })
  // 1. Informes en inglés, demo, día 27 (el informe de ejemplo debe salir en inglés)
  {
    const { page, ctx } = await pagina(browser, `${BASE}/reports?modo=demo&lang=en`, { width: 1280, height: 800 })
    await esperar(3000)
    await page.screenshot({ path: path.join(OUT, "t4-deck-reports.png") })
    const texto = await page.evaluate(() => document.body.innerText)
    console.log("reports en: Daily report · Day 23 =", texto.includes("Daily report · Day 23"), "| Recibido =", texto.includes("Recibido"))
    await ctx.close()
  }
  // 2. Entorno en inglés: aviso traducido
  {
    const { page, ctx } = await pagina(browser, `${BASE}/environment?modo=demo&lang=en`, { width: 1280, height: 800 })
    const texto = await page.evaluate(() => document.body.innerText)
    console.log("environment en: re-anchored =", texto.includes("re-anchored"), "| reanclada =", texto.includes("reanclada"))
    await page.screenshot({ path: path.join(OUT, "t4-deck-environment.png") })
    await ctx.close()
  }
  // 3. Móvil real: banda «sin registros» legible
  {
    const { page, ctx } = await pagina(browser, `${BASE}/?modo=real&lang=en`, { width: 390, height: 844, isMobile: true, deviceScaleFactor: 2 })
    await page.screenshot({ path: path.join(OUT, "t4-movil-real-en-home.png") })
    const medidas = await page.evaluate(() => {
      const h1 = document.querySelector("h1")
      return { h1Top: h1 ? Math.round(h1.getBoundingClientRect().top) : null }
    })
    console.log("movil real:", JSON.stringify(medidas))
    await ctx.close()
  }
  // 4. Registro en inglés sin avisos encima del dial
  {
    const { page, ctx } = await pagina(browser, `${BASE}/check-in?modo=demo&lang=en`, { width: 1280, height: 800 })
    await esperar(16000)
    const toasts = await page.evaluate(() => document.querySelectorAll("section[aria-label] ol li").length)
    console.log("check-in toasts visibles tras 20 s:", toasts)
    await page.screenshot({ path: path.join(OUT, "t4-deck-check-in.png") })
    await ctx.close()
  }
  // 5. Dispositivo en demo: pulsar Conectar y mostrar los cuatro pasos
  {
    const { page, ctx } = await pagina(browser, `${BASE}/device?modo=demo&lang=en`, { width: 1280, height: 800 })
    const botones = await page.$$("button")
    for (const b of botones) {
      const t = await page.evaluate((el) => el.textContent, b)
      if (t && t.trim() === "Connect") { await b.click(); break }
    }
    await esperar(4000)
    await page.screenshot({ path: path.join(OUT, "t4-deck-device.png") })
    await ctx.close()
  }
  await browser.close()
})().catch((e) => { console.error(e); process.exit(1) })
