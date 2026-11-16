/** Curvas de desarrollo y dos hipótesis de referencia. Nunca promueve un candidato al producto. */
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { mediana } from "../../packages/engine/engine.ts"
import { detectarSenales, evaluarCaso } from "./banco.ts"
import { generarCaso, type CasoAuditoria, type Protocolo } from "./generador.ts"
import { contarEpisodios, medianaOmitible, wilson } from "./metricas.ts"

export function detectarEstable(caso: CasoAuditoria): { dia: number; canales: string[] }[] {
  const campos = ["fc_reposo_lpm", "sueno_h", "animo_1_10"] as const
  const pisos = [2.5, 0.4, 1], direcciones = [1, -1, -1], canales = ["fc", "sueno", "animo"]
  const referencia = caso.tripulante.lecturas.filter((r) => r.dia_mision >= 8 && r.dia_mision <= 21)
  const bases = campos.map((c, i) => {
    const valores = referencia.map((r) => r[c]).filter((v): v is number => v !== null)
    if (valores.length < 5) return null
    const centro = mediana(valores)
    return { centro, mad: Math.max(pisos[i], mediana(valores.map((v) => Math.abs(v - centro)))) }
  })
  const sumas = [0, 0, 0], senales: { dia: number; canales: string[] }[] = []
  for (const r of caso.tripulante.lecturas.filter((r) => r.dia_mision >= 22)) campos.forEach((c, i) => {
    if (caso.cambios.some((v) => v.indicador === canales[i] && v.dia_mision <= r.dia_mision)) return
    const base = bases[i], valor = r[c]
    if (!base || valor === null) { sumas[i] = 0; return }
    const z = 0.6745 * (valor - base.centro) / base.mad
    sumas[i] = Math.max(0, sumas[i] + direcciones[i] * z - 0.5)
    if (sumas[i] > 5) { senales.push({ dia: r.dia_mision, canales: [canales[i]] }); sumas[i] = 0 }
  })
  return senales
}

export function investigar(protocolo: Protocolo) {
  const curvas = []
  for (const magnitud of [0.15, 0.3, 0.5, 0.75, 1]) for (const duracion of [5, 10, 20]) {
    const casos = Array.from({ length: protocolo.misiones_por_escenario }, (_, i) => generarCaso("deriva_sutil", i, protocolo, { magnitud, duracion }))
    for (const variante of ["adaptativa_actual", "estable", "doble"]) {
      const resultados = casos.map((c) => {
        const actual = detectarSenales(c, "ABC_contexto"), estable = detectarEstable(c)
        const senales = variante === "adaptativa_actual" ? actual : variante === "estable" ? estable : [...actual, ...estable]
        const evento = c.evento!
        const aciertos = senales.filter((s) => s.dia >= evento.inicio && s.dia <= evento.fin && s.canales.some((v) => ["fc", "sueno", "animo"].includes(v)))
        const fuera = senales.filter((s) => s.dia < evento.inicio || s.dia > evento.fin + protocolo.recuperacion_excluida_dias)
        return { detectado: aciertos.length > 0, retraso: aciertos.length ? Math.min(...aciertos.map((s) => s.dia)) - evento.inicio : null,
          falsos: contarEpisodios(fuera.map((s) => s.dia)), dias: evaluarCaso(c, "ABC_contexto", protocolo.recuperacion_excluida_dias).dias_observados_fuera_evento }
      })
      const n = resultados.length, detectados = resultados.filter((r) => r.detectado).length
      const falsos = resultados.reduce((s, r) => s + r.falsos, 0), dias = resultados.reduce((s, r) => s + r.dias, 0)
      curvas.push({ magnitud_relativa_inyeccion: magnitud, duracion_dias: duracion, variante, misiones: n, detectados,
        omitidos: n - detectados, ic95: wilson(detectados, n), retraso_mediano_solo_detectados: medianaOmitible(resultados.flatMap((r) => r.retraso === null ? [] : [r.retraso])),
        falsos_episodios: falsos, dias_observados: dias, falsos_por_persona_semana: dias ? falsos / (dias / 7) : null })
    }
  }
  const controles = []
  for (const escenario of ["control", "ruido_correlacionado", "colas_pesadas", "sensor_fijo", "cambio_instrumento", "estacionalidad", "adaptacion_prolongada"].filter((s) => protocolo.escenarios.includes(s))) {
    const casos = Array.from({ length: protocolo.misiones_por_escenario }, (_, i) => generarCaso(escenario, i, protocolo))
    for (const variante of ["adaptativa_actual", "estable", "doble"]) {
      let falsos = 0, dias = 0
      for (const c of casos) {
        const actual = detectarSenales(c, "ABC_contexto"), estable = detectarEstable(c)
        const senales = variante === "adaptativa_actual" ? actual : variante === "estable" ? estable : [...actual, ...estable]
        falsos += contarEpisodios(senales.map((s) => s.dia))
        dias += evaluarCaso(c, "ABC_contexto", protocolo.recuperacion_excluida_dias).dias_observados_fuera_evento
      }
      controles.push({ escenario, variante, misiones: casos.length, falsos_episodios: falsos, dias_observados: dias,
        falsos_por_persona_semana: dias ? falsos / (dias / 7) : null })
    }
  }
  return { version: "investigacion-deriva-v1", independiente: false, clinica: false, variante_promovida: null,
    decision: "conservar_motor_actual_hasta_criterios_y_evaluacion_independiente", carga_alertas_equiparada: false, curvas, controles }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const carpeta = path.dirname(fileURLToPath(import.meta.url)), raiz = path.resolve(carpeta, "../..")
  const destino = path.join(carpeta, "data", "investigacion-" + new Date().toISOString().replace(/[-:.]/g, ""))
  mkdirSync(destino, { recursive: true })
  const protocolo = JSON.parse(readFileSync(path.join(carpeta, "protocolo.json"), "utf8")) as Protocolo
  const archivos = ["packages/engine/engine.ts", "tools/validacion/investigar.ts", "tools/validacion/generador.ts", "tools/validacion/banco.ts", "tools/validacion/metricas.ts", "tools/validacion/protocolo.json"]
  const huellas = Object.fromEntries(archivos.map((f) => [f, createHash("sha256").update(readFileSync(path.join(raiz, f))).digest("hex")]))
  writeFileSync(path.join(destino, "congelacion.json"), JSON.stringify({ protocolo, huellas, factores: { magnitudes: [0.15, 0.3, 0.5, 0.75, 1], duraciones: [5, 10, 20] }, independiente: false }, null, 2))
  writeFileSync(path.join(destino, "resultado.json"), JSON.stringify(investigar(protocolo), null, 2))
  process.stdout.write(destino + "\n")
}
