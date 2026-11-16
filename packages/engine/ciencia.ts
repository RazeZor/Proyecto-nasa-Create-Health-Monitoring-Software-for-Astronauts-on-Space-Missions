/** Resúmenes exploratorios puros; no estiman diagnósticos ni equivalencia instrumental. */
export interface EnsayoReaccion { estimulo_ms: number; respuesta_ms: number; fotograma_ms: number; interrupcion: boolean }
export function resumirReaccion(ensayos: EnsayoReaccion[], practica: boolean) {
  const validos = ensayos.filter((e) => !e.interrupcion && Number.isFinite(e.estimulo_ms) && Number.isFinite(e.respuesta_ms) &&
    Number.isFinite(e.fotograma_ms) && e.fotograma_ms >= 0 && e.respuesta_ms > e.estimulo_ms)
  const tiempos = validos.map((e) => e.respuesta_ms - e.estimulo_ms).sort((a, b) => a - b)
  const m = tiempos.length >> 1
  return { ensayos: ensayos.length, validos: validos.length, comparable: false, practica,
    interrumpida: validos.length !== ensayos.length,
    mediana_ms: tiempos.length ? tiempos.length % 2 ? tiempos[m] : (tiempos[m - 1] + tiempos[m]) / 2 : null }
}

export function resumirSueno(registros: { horas: number | null; metodo: "diario" | "estimado"; turno: string }[]) {
  const validos = registros.filter((r) => r.horas !== null && Number.isFinite(r.horas) && r.horas >= 0 && r.horas <= 24)
  const metodos = [...new Set(validos.map((r) => r.metodo))]
  return { registros_validos: validos.length, metodo_homogeneo: metodos.length === 1,
    promedio_h: validos.length && metodos.length === 1 ? validos.reduce((s, r) => s + r.horas!, 0) / validos.length : null,
    diagnostico: null }
}
