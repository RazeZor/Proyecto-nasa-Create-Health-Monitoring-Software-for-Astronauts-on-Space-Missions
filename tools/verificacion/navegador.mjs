/** Ensayo de recuperación de informes con Chrome DevTools Protocol, sin dependencias npm. */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import http from "node:http"
import os from "node:os"
import path from "node:path"
import { setTimeout as pausa } from "node:timers/promises"
import { ensayarIntegral } from "./flujo-integral.mjs"
import { ensayarDemoPublica } from "./flujo-demo-publica.mjs"

const [chrome, destino] = process.argv.slice(2)
const web = `http://127.0.0.1:${process.env.VIGIA_E2E_PROXY}`
const api = `http://127.0.0.1:${process.env.VIGIA_E2E_API}/tripulantes/1/reportes`
// El rewrite de producción apunta a la API del despliegue. Este proxy del ensayo lo aísla sin modificar el build.
const proxy = http.createServer((entrada, salida) => {
  const esApi = entrada.url.startsWith("/vigia-api/")
  const solicitud = http.request({ hostname: "127.0.0.1", port: esApi ? process.env.VIGIA_E2E_API : process.env.VIGIA_E2E_WEB,
    path: esApi ? entrada.url.slice("/vigia-api".length) : entrada.url, method: entrada.method, headers: entrada.headers }, (respuesta) => {
    salida.writeHead(respuesta.statusCode, respuesta.headers)
    respuesta.pipe(salida)
  })
  solicitud.on("error", () => { salida.writeHead(503); salida.end() })
  entrada.pipe(solicitud)
})
proxy.listen(Number(process.env.VIGIA_E2E_PROXY), "127.0.0.1")
await once(proxy, "listening")
const catalogo = JSON.parse(await readFile("packages/i18n/locales/es.json", "utf8")).web.S
const ciencia = JSON.parse(await readFile("packages/i18n/locales/es.json", "utf8")).web.ciencia
const cienciaEn = JSON.parse(await readFile("packages/i18n/locales/en.json", "utf8")).web.ciencia
const exigirDatasets = process.env.VIGIA_E2E_DATASETS === "1"
// Los nombres internos de CacheStorage superan MAX_PATH con la ruta larga del repositorio en Windows.
const perfil = await mkdtemp(path.join(os.tmpdir(), "vigia-e2e-"))
const errores = []
let proceso, cliente

async function iniciar() {
  proceso = spawn(chrome, ["--headless=new", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${perfil}`, "about:blank"], { windowsHide: true, stdio: "ignore" })
  let paginas
  for (let i = 0; i < 150; i++) {
    if (proceso.exitCode !== null) throw new Error("Chrome terminó al arrancar")
    try {
      const puerto = (await readFile(path.join(perfil, "DevToolsActivePort"), "utf8")).split("\n")[0]
      paginas = await (await fetch(`http://127.0.0.1:${puerto}/json`, { signal: AbortSignal.timeout(1500) })).json()
      if (paginas.some((p) => p.type === "page")) break
    } catch { /* esperar el puerto del proceso nuevo */ }
    await pausa(200)
  }
  const socket = new WebSocket(paginas.find((p) => p.type === "page").webSocketDebuggerUrl)
  await Promise.race([once(socket, "open"), pausa(10000).then(() => { throw new Error("Chrome no abrió el WebSocket de depuración") })])
  let siguiente = 0
  const pendientes = new Map()
  socket.addEventListener("message", ({ data }) => {
    const mensaje = JSON.parse(data)
    if (mensaje.method === "Runtime.exceptionThrown") errores.push(mensaje.params.exceptionDetails.text)
    const espera = pendientes.get(mensaje.id)
    if (espera) {
      pendientes.delete(mensaje.id)
      if (mensaje.error) espera.reject(new Error(mensaje.error.message))
      else espera.resolve(mensaje.result)
    }
  })
  socket.addEventListener("close", () => {
    for (const espera of pendientes.values()) espera.reject(new Error("Chrome cerró la conexión"))
    pendientes.clear()
  })
  const enviar = (method, params = {}) => new Promise((resolve, reject) => {
    if (socket.readyState !== WebSocket.OPEN) { reject(new Error("Chrome cerró la conexión")); return }
    const id = ++siguiente
    const limite = setTimeout(() => { pendientes.delete(id); reject(new Error(`Chrome no respondió a ${method}`)) }, 15000)
    limite.unref()
    pendientes.set(id, { resolve: (r) => { clearTimeout(limite); resolve(r) }, reject: (e) => { clearTimeout(limite); reject(e) } })
    socket.send(JSON.stringify({ id, method, params }))
  })
  cliente = { enviar, evaluar: async (expression) => {
    const r = await enviar("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text)
    return r.result.value
  } }
  await enviar("Page.enable")
  await enviar("Runtime.enable")
  await enviar("Network.enable")
  await enviar("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  return cliente
}

async function hasta(expresion, intentos = 200) {
  const limite = Date.now() + intentos * 100
  while (Date.now() < limite) {
    if (proceso.exitCode !== null) throw new Error(`Chrome terminó durante el ensayo: ${proceso.exitCode}`)
    try { if (await cliente.evaluar(expresion)) return } catch (error) {
      if (proceso.exitCode !== null) throw error
      // Un contexto destruido por navegación se puede reintentar dentro del tiempo total.
    }
    await pausa(100)
  }
  throw new Error(`No se cumplió la condición: ${expresion}`)
}

async function cerrar() {
  if (!proceso || proceso.exitCode !== null) return
  const objetivo = proceso
  const salida = once(objetivo, "exit")
  // Capturar el proceso concreto y cancelar el temporizador: nunca matar el siguiente Chrome.
  const limite = setTimeout(() => { if (objetivo.exitCode === null) objetivo.kill() }, 10000)
  try {
    try { await cliente.enviar("Browser.close") } catch { /* el cierre corta el socket */ }
    await salida
  } finally { clearTimeout(limite) }
}

const locales = `Object.keys(localStorage).filter(k => k.startsWith('vigia:informes:v1:')).map(k => JSON.parse(localStorage.getItem(k)))`
try {
  console.log("Abrir Chrome sobre la base temporal")
  await iniciar()
  if (process.env.VIGIA_E2E_DEMO_PUBLICA === "1") {
    await ensayarDemoPublica({ cliente, hasta, web, destino, errores })
  } else if (process.env.VIGIA_E2E_INTEGRAL === "1") {
    await ensayarIntegral({ cliente, hasta, web, destino, errores })
  } else {
  console.log("Cargar la app y guardar sin API")
  await cliente.enviar("Page.navigate", { url: `${web}/astronauta/reports?modo=demo&lang=es` })
  const boton = `[...document.querySelectorAll('button')].find(b => b.textContent.trim() === ${JSON.stringify(catalogo.reports.send)} && !b.disabled)`
  await hasta(`Boolean(${boton})`)
  const registroSW = await cliente.evaluar("navigator.serviceWorker.register('/sw.js').then(() => 'registrado').catch(e => e.message)")
  assert.equal(registroSW, "registrado", `No se pudo instalar la carcasa: ${registroSW}`)
  try {
    await hasta("Boolean(navigator.serviceWorker.controller)", 600)
  } catch (error) {
    console.error(await cliente.evaluar("navigator.serviceWorker.getRegistration().then(r => ({ installing: r?.installing?.state, waiting: r?.waiting?.state, active: r?.active?.state }))"))
    throw error
  }
  await cliente.enviar("Network.setBlockedURLs", { urls: ["*vigia-api*"] })
  await cliente.evaluar(`${boton}.click()`)
  await hasta(`(${locales}).length === 1`)
  const [informe] = await cliente.evaluar(locales)
  assert.equal(informe.contenido.demo, true)
  // Cerrar Chrome completo y volver a abrir con el mismo perfil: no basta con mantener React montado.
  await cerrar()
  console.log("Reabrir Chrome y recuperar el informe")
  await iniciar()
  // Tras cerrar el navegador se verifica de nuevo la identidad; solo el registro y catálogo simulan caída.
  await cliente.enviar("Network.setBlockedURLs", { urls: ["*vigia-api/tripulantes*", "*vigia-api/perfiles*", "*vigia-api/fichas*", "*vigia-api/entorno*"] })
  await cliente.enviar("Page.navigate", { url: `${web}/astronauta/reports?modo=demo&lang=es` })
  await hasta(`document.body.innerText.includes(${JSON.stringify(catalogo.reports.localPending)})`)
  assert.equal((await cliente.evaluar(locales))[0].id, informe.id)
  const captura = await cliente.enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.join(destino, "bandeja-recuperada.png"), Buffer.from(captura.data, "base64"))
  // Corte de red del navegador, separado de la caída de API: la carcasa debe abrir desde el service worker.
  await cliente.enviar("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  console.log("Recargar la carcasa sin red")
  await cliente.enviar("Page.reload")
  await hasta(`document.body.innerText.includes(${JSON.stringify(catalogo.reports.localPending)})`)
  await cliente.enviar("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await cliente.enviar("Network.setBlockedURLs", { urls: [] })
  await hasta(`(${locales}).length === 0`)
  const cabeceras = { "X-Tripulante": "1", "Content-Type": "application/json" }
  const listar = async () => (await (await fetch(api, { headers: cabeceras, signal: AbortSignal.timeout(10000) })).json()).filter((r) => r.operacion_id === informe.id)
  const [recibido] = await listar()
  assert.ok(recibido?.id)
  // Reenviar el mismo contenido como si se hubiera perdido el acuse: el servidor devuelve la misma fila.
  const repetido = await fetch(api, { method: "POST", headers: cabeceras, signal: AbortSignal.timeout(10000), body: JSON.stringify({
    creado_t_real: informe.creado.replace(/\.\d{3}Z$/, "Z"), retardo_min: informe.retardo,
    contenido: informe.contenido, operacion_id: informe.id,
  }) })
  assert.equal(repetido.status, 201)
  assert.equal((await repetido.json()).id, recibido.id)
  assert.equal((await listar()).length, 1)

  console.log("Comprobar evidencia científica, copia offline y vista móvil")
  await cliente.enviar("Page.navigate", { url: `${web}/astronauta/about?modo=demo&lang=es` })
  await hasta(`document.body.innerText.includes(${JSON.stringify(ciencia.vigente)})`)
  const panel = `document.getElementById('evidencia-cientifica').closest('section')`
  assert.equal(await cliente.evaluar(`${panel}.querySelectorAll('tbody tr').length`), 7)
  assert.equal(await cliente.evaluar("JSON.parse(localStorage.getItem('vigia:cache:ciencia-v1')).catalogo.validacion_clinica"), false)
  if (exigirDatasets) {
    await hasta("document.querySelectorAll('[data-dataset]').length === 2")
    assert.deepEqual(await cliente.evaluar("[...document.querySelectorAll('[data-dataset]')].map(e => e.dataset.dataset).sort()"), ["mmash", "orion"])
  }
  await cliente.evaluar(`[...document.querySelectorAll('button')].filter(b => b.getAttribute('aria-label') === ${JSON.stringify(catalogo.toast.close)}).forEach(b => b.click())`)
  await cliente.evaluar(`${panel}.scrollIntoView({block:'start'})`)
  const evidencia = await cliente.enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.join(destino, "evidencia-cientifica.png"), Buffer.from(evidencia.data, "base64"))
  if (exigirDatasets) {
    await cliente.evaluar("document.getElementById('datasets-cientificos').closest('section').scrollIntoView({block:'start'})")
    const capturaDatasets = await cliente.enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
    await writeFile(path.join(destino, "datasets-adquiridos.png"), Buffer.from(capturaDatasets.data, "base64"))
  }
  await cliente.enviar("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await cliente.enviar("Page.reload")
  await hasta(`document.body.innerText.includes(${JSON.stringify(ciencia.cache)})`)
  if (exigirDatasets) await hasta("document.querySelectorAll('[data-dataset]').length === 2")
  await cliente.enviar("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await cliente.enviar("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await cliente.enviar("Page.reload")
  await hasta(`document.body.innerText.includes(${JSON.stringify(ciencia.vigente)})`)
  assert.equal(await cliente.evaluar("document.documentElement.scrollWidth <= window.innerWidth + 1"), true, "la tabla debe desplazarse dentro del panel, sin desbordar la página móvil")
  await cliente.evaluar(`[...document.querySelectorAll('button')].filter(b => b.getAttribute('aria-label') === ${JSON.stringify(catalogo.toast.close)}).forEach(b => b.click())`)
  await cliente.evaluar(`${panel}.scrollIntoView({block:'start'})`)
  const movil = await cliente.enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.join(destino, "evidencia-movil.png"), Buffer.from(movil.data, "base64"))
  await cliente.enviar("Page.navigate", { url: `${web}/astronauta/about?modo=demo&lang=en` })
  await hasta(`document.body.innerText.includes(${JSON.stringify(cienciaEn.vigente)})`)
  assert.deepEqual(errores, [])
  const resultado = { t_real: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    base_temporal: true, api_interrumpida: true, navegador_reiniciado: true, carcasa_sin_red: true,
    informe_recuperado: true, reintento_sin_duplicados: true, evidencia_vigente: true,
    evidencia_copia_offline: true, evidencia_movil: true, evidencia_ingles: true,
    datasets_mmash_orion: exigirDatasets ? true : null, datasets_copia_offline: exigirDatasets ? true : null,
    excepciones_navegador: errores.length }
  await writeFile(path.join(destino, "resultado.json"), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado))
  }
} catch (error) {
  try {
    const texto = await cliente.evaluar("document.body.innerText")
    await writeFile(path.join(destino, "fallo-ui.txt"), texto)
    const captura = await cliente.enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
    await writeFile(path.join(destino, "fallo-ui.png"), Buffer.from(captura.data, "base64"))
  } catch { /* conservar siempre el error original */ }
  throw error
} finally {
  await cerrar()
  proxy.closeAllConnections()
  proxy.close()
  const temporal = path.resolve(os.tmpdir())
  if (path.dirname(path.resolve(perfil)) !== temporal || !path.basename(perfil).startsWith("vigia-e2e-")) throw new Error("perfil fuera del directorio temporal esperado")
  await rm(perfil, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
