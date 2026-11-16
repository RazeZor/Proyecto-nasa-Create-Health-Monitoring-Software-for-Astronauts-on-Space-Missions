import { analizarTripulante, mediana, type Alerta, type Capa } from "../../packages/engine/engine.ts"
import { esEntornoAplicable, evaluarEvidencia } from "../../packages/engine/evidencia.ts"
import { aleatorio, generarCaso, type CasoAuditoria, type Protocolo } from "./generador.ts"
import { contarEpisodios, diferenciaPareada, medianaOmitible, wilson } from "./metricas.ts"

export const CAPAS: Record<string, Capa[]> = { A: ["A"], AB: ["A", "B"], AC: ["A", "C"], ABC: ["A", "B", "C"], ABC_contexto: ["A", "B", "C", "contexto"] }

export function detectar(caso: CasoAuditoria, metodo: string): number[] {
  if (CAPAS[metodo]) {
    const entorno = esEntornoAplicable(caso.uso === "referencia" ? "real" : "demo", caso.uso) ? caso.entorno : {}
    return analizarTripulante(caso.tripulante, entorno, { cambiosInstrumento: caso.cambios, capas: CAPAS[metodo] }).alertas
      .filter((a: Alerta) => !a.informativa && (caso.escenario.startsWith("entorno_") ? a.indicador === "co2" : a.capa !== "contexto"))
      .map((a) => a.dia_mision)
  }
  if (metodo === "umbrales") return caso.tripulante.lecturas.filter((r) => r.dia_mision > 0 && (
    (r.fc_reposo_lpm !== null && (r.fc_reposo_lpm <= 50 || r.fc_reposo_lpm > 90)) ||
    (r.pas_mmHg !== null && (r.pas_mmHg <= 110 || r.pas_mmHg >= 220)) ||
    (r.spo2_pct !== null && r.spo2_pct < 96) || (r.temp_central_c !== null && (r.temp_central_c <= 36 || r.temp_central_c > 38))
  )).map((r) => r.dia_mision)
  if (metodo !== "personal_simple") throw new Error("comparador no registrado")
  const campos = ["fc_reposo_lpm", "sueno_h", "animo_1_10"] as const
  const prevuelo = caso.tripulante.lecturas.filter((r) => r.dia_mision <= 0)
  const referencias = campos.map((c, i) => {
    const valores = prevuelo.map((r) => r[c]).filter((v): v is number => v !== null)
    if (!valores.length) return null
    const centro = mediana(valores), mad = mediana(valores.map((v) => Math.abs(v - centro)))
    return { centro, dispersion: Math.max(mad, [2.5, 0.4, 1][i]), umbral: i === 0 ? 3.5 : 3 }
  })
  const dias: number[] = [], anteriores: boolean[] = [false, false, false]
  for (const r of caso.tripulante.lecturas.filter((l) => l.dia_mision > 0)) {
    campos.forEach((c, i) => {
      const ref = referencias[i], valor = r[c]
      const supera = !!ref && valor !== null && Math.abs(0.6745 * (valor - ref.centro) / ref.dispersion) >= ref.umbral
      if (supera && anteriores[i]) dias.push(r.dia_mision)
      anteriores[i] = supera
    })
  }
  return dias
}

export function evaluarCaso(caso: CasoAuditoria, metodo: string, recuperacion: number) {
  const dias = [...new Set(detectar(caso, metodo))].sort((a, b) => a - b)
  const evento = caso.evento
  const aciertos = evento ? dias.filter((d) => d >= evento.inicio && d <= evento.fin) : []
  const fuera = (d: number) => !evento || d < evento.inicio || d > evento.fin + recuperacion
  const diasObservados = caso.tripulante.lecturas.filter((r) => r.dia_mision > 0 && fuera(r.dia_mision) &&
    [r.fc_reposo_lpm, r.sueno_h, r.animo_1_10].every((v) => v !== null)).length
  return { detectado: !!aciertos.length, retraso: aciertos.length ? aciertos[0] - evento!.inicio : null,
    falsos_episodios: contarEpisodios(dias.filter(fuera)), dias_observados_fuera_evento: diasObservados }
}

export function ejecutarBanco(protocolo: Protocolo, casos?: CasoAuditoria[]) {
  const entradas = casos ?? protocolo.escenarios.flatMap((s) => Array.from({ length: protocolo.misiones_por_escenario }, (_, i) => generarCaso(s, i, protocolo)))
  const resultados = [], pares = [], reglasAmbientales = []
  for (const escenario of protocolo.escenarios) {
    const grupo = entradas.filter((c) => c.escenario === escenario)
    if (escenario.startsWith("entorno_")) {
      // Regla determinista, separada de comparadores fisiológicos y de sensibilidad a deriva.
      // También contar la señal en el negativo: excluirla por no tener evento ocultaría un fallo del filtro.
      const conSenal = grupo.filter((c) => detectar(c, "ABC_contexto").length > 0).length
      const esperado = escenario === "entorno_escenario" ? grupo.length : 0
      reglasAmbientales.push({ escenario, repeticiones_sinteticas: grupo.length, misiones_con_senal_ambiental: conSenal,
        esperado, coincide_con_regla: conSenal === esperado, naturaleza: "comprobacion_determinista" })
      continue
    }
    const porMetodo = new Map<string, ReturnType<typeof evaluarCaso>[]>()
    for (const metodo of protocolo.comparadores) {
      const muestras = grupo.map((c) => evaluarCaso(c, metodo, protocolo.recuperacion_excluida_dias))
      porMetodo.set(metodo, muestras)
      const nEventos = grupo.filter((c) => c.evento !== null).length
      const detectados = muestras.filter((m) => m.detectado).length
      const observados = muestras.reduce((s, m) => s + m.dias_observados_fuera_evento, 0)
      const falsos = muestras.reduce((s, m) => s + m.falsos_episodios, 0)
      const retrasos = muestras.flatMap((m) => m.retraso === null ? [] : [m.retraso])
      resultados.push({ escenario, metodo, misiones: grupo.length, eventos: nEventos, detectados,
        no_detectados: nEventos - detectados, deteccion: nEventos ? detectados / nEventos : null, ic95_deteccion: wilson(detectados, nEventos),
        retraso_mediana_solo_detectados_dias: medianaOmitible(retrasos), falsos_episodios: falsos,
        dias_observados_fuera_evento: observados, falsos_por_persona_semana: observados ? falsos / (observados / 7) : null })
    }
    if (grupo[0]?.evento?.tipo === "deriva") for (const comparador of ["umbrales", "personal_simple"]) {
      pares.push({ escenario, comparador, ...diferenciaPareada(porMetodo.get("ABC_contexto")!.map((m) => m.detectado),
        porMetodo.get(comparador)!.map((m) => m.detectado), protocolo.bootstrap_repeticiones, aleatorio(protocolo.semilla + pares.length)) })
    }
  }
  const politica = { ahora: "2026-11-16T00:00:00Z", antiguedad_max_s: 3600, desfase_futuro_max_s: 60, modo: "real" as const }
  const base = { valor: 89, t_real: "2026-11-15T23:59:00Z", uso: "operativo" as const, comparable: true, extremo: true }
  const calidad = [
    { caso: "vigente", ...evaluarEvidencia(base, politica) },
    { caso: "antiguo_extremo", ...evaluarEvidencia({ ...base, t_real: "2026-11-15T20:00:00Z" }, politica) },
    { caso: "referencia", ...evaluarEvidencia({ ...base, uso: "referencia" }, politica) },
    { caso: "ausente", ...evaluarEvidencia({ ...base, valor: null }, politica) },
    { caso: "cambio_sensor", ...evaluarEvidencia({ ...base, comparable: false }, politica) },
  ]
  return { resultados, diferencias_pareadas: pares, calidad, reglas_ambientales: reglasAmbientales, conclusion: "exploratoria_sin_validacion_clinica",
    sintesis: { misiones_sinteticas: entradas.length, comparadores: protocolo.comparadores.length, escenarios: protocolo.escenarios.length } }
}
