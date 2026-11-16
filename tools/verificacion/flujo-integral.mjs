/** Aceptación en Chrome con cuentas y datos de ensayo en una base temporal. */
import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { setTimeout as pausa } from "node:timers/promises"

export async function ensayarIntegral({ cliente, hasta, web, destino, errores }) {
  const catalogo = JSON.parse(await readFile("packages/i18n/locales/es.json", "utf8")).web
  const s = catalogo.sistema
  const ir = async (ruta) => { await cliente.enviar("Page.navigate", { url: `${web}${ruta}` }) }
  const escribir = async (selector, valor) => cliente.evaluar(`(() => {
    const e = document.querySelector(${JSON.stringify(selector)});
    const tipo = e instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement;
    Object.getOwnPropertyDescriptor(tipo.prototype, 'value').set.call(e, ${JSON.stringify(valor)});
    e.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  const boton = (texto, prefijo = false) => `[...document.querySelectorAll('button')].find(b => !b.disabled && b.textContent.trim().${prefijo ? "startsWith" : "includes"}(${JSON.stringify(texto)}))`
  const pulsar = async (texto, prefijo = false) => { const b = boton(texto, prefijo); await hasta(`Boolean(${b})`); await cliente.evaluar(`${b}.click()`) }
  const api = (ruta) => cliente.evaluar(`fetch('/vigia-api${ruta}',{cache:'no-store'}).then(async r => ({estado:r.status,datos:await r.json()}))`)
  const acceder = async (usuario) => {
    await hasta("Boolean(document.querySelector('input[autocomplete=username]'))")
    await escribir("input[autocomplete=username]", usuario)
    await escribir("input[autocomplete=current-password]", process.env.VIGIA_E2E_CLAVE)
    await cliente.evaluar("document.querySelector('form').requestSubmit()")
    await hasta(`document.body.textContent.includes(${JSON.stringify(s.acceso.verificada)})`)
  }
  await ir("/astronauta/check-in?modo=real&lang=es")
  await acceder("ensayo-ana")
  const confirmar = catalogo.S.checkin.confirm.split("{")[0]
  const registrar = async (cantidad) => {
    await hasta("Boolean(document.querySelector('[role=progressbar]'))")
    for (let i = 0; i < 9; i++) {
      await pulsar(i === 6 ? catalogo.S.checkin.next : confirmar, true)
      await hasta(i === 8 ? `document.body.textContent.includes(${JSON.stringify(catalogo.S.checkin.review)})` : `document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow') === '${i + 1}'`)
    }
    await pulsar(catalogo.S.checkin.submit)
    await hasta(`document.body.textContent.includes(${JSON.stringify(catalogo.S.checkin.result)})`)
    await hasta(`fetch('/vigia-api/tripulantes/1/observaciones').then(r=>r.json()).then(a=>a.length===${cantidad})`)
  }
  await registrar(9)
  const medidas = (await api("/tripulantes/1/observaciones")).datos
  assert.ok(medidas.every((o) => o.t_real && o.recibido_t_real && o.id && o.unidad))
  await ir("/astronauta/alerts?modo=real&lang=es")
  await hasta("Boolean(document.querySelector('#seguimiento-titulo'))")
  await escribir("textarea", "Abrir caso de aceptación de software")
  await pulsar(s.seguimiento.abrir)
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.seguimiento.abierto)})`)
  for (const [texto, nota] of [[s.seguimiento.accion, "Acción registrada"], [s.seguimiento.remedir, "Nueva toma enlazada"], [s.seguimiento.revision, "Solicitar revisión humana"]]) {
    if (texto === s.seguimiento.remedir) {
      await pausa(1100)
      await ir("/astronauta/check-in?modo=real&lang=es"); await registrar(18)
      await ir("/astronauta/alerts?modo=real&lang=es"); await hasta("Boolean(document.querySelector('#seguimiento-titulo'))")
    }
    await escribir("textarea", nota); await pulsar(texto)
    await hasta(`document.querySelector('textarea').value === ''`)
  }
  await hasta("fetch('/vigia-api/tripulantes/1/episodios').then(r=>r.json()).then(a=>a[0]?.eventos.length===4)")
  await cliente.enviar("Page.reload")
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.seguimiento.en_revision)})`)
  const episodios = (await api("/tripulantes/1/episodios")).datos
  assert.equal(episodios[0].estado, "en_revision")
  assert.ok(episodios[0].eventos.find((e) => e.tipo === "remedicion").observaciones.length > 0)
  await ir("/astronauta/trends?modo=real&lang=es")
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.ciencia.titulo)})`)
  await cliente.evaluar("document.querySelectorAll('details').forEach(e=>e.open=true)")
  await escribir("form input[type=number]", "7.2")
  await escribir("form input:not([type])", "Turno de ensayo")
  await cliente.evaluar("document.querySelector('form').requestSubmit()")
  await hasta("fetch('/vigia-api/tripulantes/1/estudios').then(r=>r.json()).then(a=>a.some(e=>e.tipo==='sueno_contexto'))")
  await pulsar(s.ciencia.iniciar)
  await hasta(`Boolean(${boton(s.ciencia.esperar)})`)
  await cliente.evaluar(`${boton(s.ciencia.esperar)}.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))`)
  await hasta("fetch('/vigia-api/tripulantes/1/estudios').then(r=>r.json()).then(a=>a.some(e=>e.tipo==='reaccion'&&e.datos.interrumpida&&e.datos.comparable===false))")
  const captura = await cliente.enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.join(destino, "modulos-integrados.png"), Buffer.from(captura.data, "base64"))
  await cliente.evaluar("navigator.serviceWorker.register('/sw.js')")
  await hasta("Boolean(navigator.serviceWorker.controller)", 600)
  await cliente.enviar("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
  await cliente.enviar("Page.reload")
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.ciencia.titulo)})`)
  await cliente.enviar("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 })
  await pulsar(s.acceso.salir)
  await acceder("ensayo-bea")
  await ir("/astronauta/alerts?modo=real&lang=es")
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.seguimiento.vacio)})`)
  assert.equal((await api("/tripulantes/4/observaciones")).datos.length, 0)
  assert.equal((await api("/tripulantes/1/observaciones")).estado, 403)
  assert.deepEqual(errores, [])
  const resultado = { t_real: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), base_temporal: true, sesiones_reales: true,
    observaciones_trazables: 18, episodio_accion_remedicion_revision: true, recuperacion_indexeddb: true,
    diario_sueno: true, reaccion_interrumpida_no_comparable: true, continuidad_offline_pestana: true,
    cambio_usuario_aislado: true, sin_duplicados: true, excepciones_navegador: errores.length }
  await writeFile(path.join(destino, "resultado.json"), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado))
}
