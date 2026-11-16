import { analizarTripulante, mediana, puntosNews2, type Alerta, type Capa } from "../../packages/engine/engine.ts"
import { esEntornoAplicable, evaluarEvidencia } from "../../packages/engine/evidencia.ts"
import { aleatorio, generarCaso, type CasoAuditoria, type Protocolo } from "./generador.ts"
import { contarEpisodios, diferenciaPareada, medianaOmitible, wilson } from "./metricas.ts"

export const CAPAS: Record<string, Capa[]> = { A: ["A"], AB: ["A", "B"], AC: ["A", "C"], ABC: ["A", "B", "C"], ABC_contexto: ["A", "B", "C", "contexto"] }

export function detectarSenales(caso: CasoAuditoria, metodo: string): { dia: number; canales: string[] }[] {
  if (CAPAS[metodo]) {
    const entorno = esEntornoAplicable(caso.uso === "referencia" ? "real" : "demo", caso.uso) ? caso.entorno : {}
    return analizarTripulante(caso.tripulante, entorno, { cambiosInstrumento: caso.cambios, capas: CAPAS[metodo] }).alertas
      .filter((a: Alerta) => !a.informativa && (caso.escenario.startsWith("entorno_") ? a.indicador === "co2" : a.capa !== "contexto"))
      .map((a) => {
        if (a.indicador !== "news2") return { dia: a.dia_mision, canales: [a.indicador] }
        const r = caso.tripulante.lecturas.find((r) => r.dia_mision === a.dia_mision)!
        const valores = [r.fc_reposo_lpm, r.pas_mmHg, r.spo2_pct, r.temp_central_c]
        const canales = ["fc", "pas", "spo2", "temperatura"]
        const puntos = valores.map((v, i) => {
          const entrada: [number | null, number | null, number | null, number | null] = [null, null, null, null]
          entrada[i] = v
          return puntosNews2(...entrada).pts
        })
        const extremo = puntos.some((p) => p === 3)
        return { dia: a.dia_mision, canales: canales.filter((_, i) => extremo ? puntos[i] === 3 : puntos[i] > 0) }
      })
  }
  if (metodo === "umbrales") return caso.tripulante.lecturas.filter((r) => r.dia_mision > 0 && (
    (r.fc_reposo_lpm !== null && (r.fc_reposo_lpm <= 50 || r.fc_reposo_lpm > 90)) ||
    (r.pas_mmHg !== null && (r.pas_mmHg <= 110 || r.pas_mmHg >= 220)) ||
    (r.spo2_pct !== null && r.spo2_pct < 96) || (r.temp_central_c !== null && (r.temp_central_c <= 36 || r.temp_central_c > 38))
  )).map((r) => ({ dia: r.dia_mision, canales: [
    ...(r.fc_reposo_lpm !== null && (r.fc_reposo_lpm <= 50 || r.fc_reposo_lpm > 90) ? ["fc"] : []),
    ...(r.pas_mmHg !== null && (r.pas_mmHg <= 110 || r.pas_mmHg >= 220) ? ["pas"] : []),
    ...(r.spo2_pct !== null && r.spo2_pct < 96 ? ["spo2"] : []),
    ...(r.temp_central_c !== null && (r.temp_central_c <= 36 || r.temp_central_c > 38) ? ["temperatura"] : []),
  ] }))
  if (metodo !== "personal_simple") throw new Error("comparador no registrado")
  const campos = ["fc_reposo_lpm", "sueno_h", "animo_1_10"] as const
  const prevuelo = caso.tripulante.lecturas.filter((r) => r.dia_mision <= 0)
  const referencias = campos.map((c, i) => {
    const valores = prevuelo.map((r) => r[c]).filter((v): v is number => v !== null)
    if (!valores.length) return null
    const centro = mediana(valores), mad = mediana(valores.map((v) => Math.abs(v - centro)))
    return { centro, dispersion: Math.max(mad, [2.5, 0.4, 1][i]), umbral: i === 0 ? 3.5 : 3 }
  })
  const dias: { dia: number; canales: string[] }[] = [], anteriores: boolean[] = [false, false, false]
  for (const r of caso.tripulante.lecturas.filter((l) => l.dia_mision > 0)) {
    campos.forEach((c, i) => {
      const ref = referencias[i], valor = r[c]
      const supera = !!ref && valor !== null && Math.abs(0.6745 * (valor - ref.centro) / ref.dispersion) >= ref.umbral
      if (supera && anteriores[i]) dias.push({ dia: r.dia_mision, canales: [["fc", "sueno", "animo"][i]] })
      anteriores[i] = supera
    })
  }
  return dias
}

export const detectar = (caso: CasoAuditoria, metodo: string): number[] => detectarSenales(caso, metodo).map((s) => s.dia)

export function evaluarCaso(caso: CasoAuditoria, metodo: string, recuperacion: number) {
  const evento = caso.evento
  const ambiente = caso.escenario.startsWith("entorno_")
  const campos = ["fc_reposo_lpm", "pas_mmHg", "spo2_pct", "temp_central_c", "sueno_h", "animo_1_10"] as const
  const observados = new Set(caso.tripulante.lecturas.filter((r) => r.dia_mision > 0 &&
    (ambiente ? caso.entorno[r.dia_mision]?.co2_mmhg_max_horario != null : campos.every((c) => r[c] !== null))).map((r) => r.dia_mision))
  const senales = detectarSenales(caso, metodo).filter((s) => observados.has(s.dia))
  const dias = [...new Set(senales.map((s) => s.dia))].sort((a, b) => a - b)
  const canales = evento?.canales ?? (evento?.tipo === "ambiente" ? ["co2"] : evento?.tipo === "extremo" ? ["spo2"] : ["fc", "sueno", "animo"])
  const enVentana = (d: number) => !!evento && d >= evento.inicio && d <= evento.fin
  const aciertos = [...new Set(senales.filter((s) => enVentana(s.dia) && s.canales.some((c) => canales.includes(c))).map((s) => s.dia))].sort((a, b) => a - b)
  const fuera = (d: number) => !evento || d < evento.inicio || d > evento.fin + recuperacion
  const diasObservados = [...observados].filter(fuera).length
  return { detectado: !!aciertos.length, retraso: aciertos.length ? aciertos[0] - evento!.inicio : null,
    dias_evento_observados: [...observados].filter(enVentana).length,
    alertas_incidentales_en_ventana: senales.filter((s) => enVentana(s.dia) && !s.canales.some((c) => canales.includes(c))).length,
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
        eventos_sin_ventana_observable: muestras.filter((m, i) => grupo[i].evento && m.dias_evento_observados === 0).length,
        alertas_incidentales_en_ventana: muestras.reduce((s, m) => s + m.alertas_incidentales_en_ventana, 0),
        carga_alertas_equiparada: false,
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
