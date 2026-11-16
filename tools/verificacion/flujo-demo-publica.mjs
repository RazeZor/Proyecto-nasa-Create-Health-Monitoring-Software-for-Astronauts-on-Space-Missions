/** Aceptación de la entrada para evaluadores, sin crear cuentas personales. */
import assert from "node:assert/strict"
import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

export async function ensayarDemoPublica({ cliente, hasta, web, destino, errores }) {
  const { web: textos } = JSON.parse(await readFile("packages/i18n/locales/es.json", "utf8"))
  const s = textos.sistema
  const ir = async (ruta) => cliente.enviar("Page.navigate", { url: web + ruta })
  const boton = (texto, prefijo = false) => `[...document.querySelectorAll('button')].find(b=>!b.disabled&&b.textContent.trim().${prefijo ? "startsWith" : "includes"}(${JSON.stringify(texto)}))`
  const pulsar = async (texto, prefijo = false) => { const b = boton(texto, prefijo); await hasta(`Boolean(${b})`); await cliente.evaluar(`${b}.click()`) }
  const escribir = (selector, valor) => cliente.evaluar(`(() => {const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(e instanceof HTMLTextAreaElement?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(valor)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`)
  await ir("/?lang=es")
  await hasta(`Boolean(${boton(s.acceso.explorar_demo)})`)
  assert.equal(await cliente.evaluar("document.querySelector('input[type=password]').value"), "")
  await cliente.evaluar(`localStorage.setItem('vigia:informes:v1:1:1:demo:privado',JSON.stringify({id:'privado',creado:'2026-11-16T00:00:00Z',perfil:'transit',retardo:0,contenido:{titulo:'PRIVADO-ENSAYO'}}))`)
  await pulsar(s.acceso.explorar_demo)
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.acceso.demo_activa)})`)
  await ir("/astronauta/check-in?lang=es")
  await hasta("Boolean(document.querySelector('[role=progressbar]'))")
  const confirmacion = textos.S.checkin.confirm.split("{")[0]
  for (let i = 0; i < 9; i++) {
    await pulsar(i === 6 ? textos.S.checkin.next : confirmacion, true)
    await hasta(i === 8 ? `document.body.textContent.includes(${JSON.stringify(textos.S.checkin.review)})` : `document.querySelector('[role=progressbar]')?.getAttribute('aria-valuenow')==='${i + 1}'`)
  }
  await pulsar(textos.S.checkin.submit)
  await hasta("fetch('/vigia-api/demo/tripulantes/1/observaciones').then(r=>r.json()).then(a=>a.length===9)")
  assert.equal(await cliente.evaluar("fetch('/vigia-api/tripulantes/1/observaciones').then(r=>r.status)"), 401)
  assert.equal(await cliente.evaluar("fetch('/vigia-api/sesion').then(r=>r.status)"), 401)
  assert.equal(await cliente.evaluar("fetch('/vigia-api/demo/tripulantes/1/reloj').then(r=>r.status)"), 404)
  await ir("/astronauta/alerts?lang=es")
  await hasta("Boolean(document.querySelector('#seguimiento-titulo'))")
  await escribir("textarea", "Caso ficticio para revisión de la demo")
  await pulsar(s.seguimiento.abrir)
  await hasta("fetch('/vigia-api/demo/tripulantes/1/episodios').then(r=>r.json()).then(a=>a.length===1)")
  await escribir("textarea", "Solicitar revisión del caso ficticio")
  await pulsar(s.seguimiento.revision)
  await hasta("fetch('/vigia-api/demo/tripulantes/1/episodios').then(r=>r.json()).then(a=>a[0]?.estado==='en_revision')")
  await ir("/oficial/alerts?lang=es")
  await hasta("Boolean(document.querySelector('select[aria-label] option[value=\"1\"]'))")
  await cliente.evaluar("(()=>{const e=document.querySelector('select[aria-label]');e.value='1';e.dispatchEvent(new Event('change',{bubbles:true}));})()")
  await escribir("textarea", "Revisión ficticia, sin dictamen profesional")
  await pulsar(s.seguimiento.cerrar)
  await hasta(`!Boolean(${boton(s.seguimiento.cerrar)})`)
  await ir("/medico/reports?lang=es")
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.acceso.demo_activa)})`)
  await hasta("fetch('/vigia-api/demo/reportes/recibidos',{headers:{'X-Vigia-Demo-Rol':'surgeon'}}).then(r=>r.ok)")
  assert.equal(await cliente.evaluar("document.body.textContent.includes('PRIVADO-ENSAYO')"), false)
  assert.equal(await cliente.evaluar("Boolean(localStorage.getItem('vigia:informes:v1:1:1:demo:privado'))"), true)
  await ir("/astronauta/alerts?lang=es")
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.seguimiento.cerrado)})`)
  const id = await cliente.evaluar("fetch('/vigia-api/demo/sesion').then(r=>r.json()).then(s=>s.espacio_demo)")
  await cliente.enviar("Page.reload")
  await hasta(`document.body.textContent.includes(${JSON.stringify(s.acceso.demo_activa)})`)
  assert.equal(await cliente.evaluar("fetch('/vigia-api/demo/sesion').then(r=>r.json()).then(s=>s.espacio_demo)"), id)
  const captura = await cliente.enviar("Page.captureScreenshot", { format: "png", captureBeyondViewport: false })
  await writeFile(path.join(destino, "demo-publica.png"), Buffer.from(captura.data, "base64"))
  await pulsar(s.acceso.salir_demo)
  await hasta(`Boolean(${boton(s.acceso.explorar_demo)})`)
  assert.equal(await cliente.evaluar("fetch('/vigia-api/sesion').then(r=>r.status)"), 401)
  assert.deepEqual(errores, [])
  const resultado = { t_real: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), sin_credenciales: true, tres_roles: true,
    observaciones_simuladas: 9, episodio_revisado_simulado: true, informes_simulados: true,
    api_personal_cerrada: true, reloj_real_ausente: true, bandeja_personal_conservada: true,
    sesion_demo_recuperada: true, excepciones_navegador: errores.length }
  await writeFile(path.join(destino, "resultado.json"), JSON.stringify(resultado, null, 2))
  console.log(JSON.stringify(resultado))
}
