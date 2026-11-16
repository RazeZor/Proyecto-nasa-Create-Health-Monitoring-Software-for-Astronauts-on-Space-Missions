/** Aplicabilidad y suficiencia explícitas. Reglas de ingeniería; no estiman confianza clínica. Sin IO. */
export type UsoDato = "operativo" | "referencia" | "escenario"
export type EstadoEvidencia = "utilizable" | "requiere_confirmacion" | "insuficiente" | "no_comparable"
export interface ObservacionEvidencia {
  valor: number | null
  t_real: string | null
  uso: UsoDato
  comparable: boolean
  /** Valor fuera del tramo revisado por el protocolo: nunca debe desaparecer por un filtro de calidad. */
  extremo?: boolean
}
export interface PoliticaEvidencia { ahora: string; antiguedad_max_s: number; desfase_futuro_max_s: number; modo: "real" | "demo" }

export const esEntornoAplicable = (modo: "real" | "demo" | undefined, uso?: UsoDato): boolean => modo === "demo" || uso === "operativo"

/** UTC canónico y fecha existente; Date.parse solo no rechaza todas las fechas imposibles. */
function instante(iso: string | null): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(iso)) return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) && new Date(ms).toISOString().replace(".000Z", "Z") === iso ? ms : null
}

export function evaluarEvidencia(observacion: ObservacionEvidencia, politica: PoliticaEvidencia): { estado: EstadoEvidencia; motivos: string[]; conservar_extremo: boolean } {
  const ahora = instante(politica.ahora)
  if (ahora === null || !Number.isFinite(politica.antiguedad_max_s) || politica.antiguedad_max_s < 0 ||
    !Number.isFinite(politica.desfase_futuro_max_s) || politica.desfase_futuro_max_s < 0) throw new Error("política de evidencia inválida")
  const motivos: string[] = []
  const fecha = instante(observacion.t_real)
  if (observacion.valor === null || !Number.isFinite(observacion.valor)) motivos.push("sin_valor_utilizable")
  if (fecha === null) motivos.push("hora_desconocida")
  if (!esEntornoAplicable(politica.modo, observacion.uso)) motivos.push("uso_no_operativo")
  if (!observacion.comparable) motivos.push("instrumento_no_comparable")
  if (fecha !== null) {
    if ((ahora - fecha) / 1000 > politica.antiguedad_max_s) motivos.push("dato_antiguo")
    if ((fecha - ahora) / 1000 > politica.desfase_futuro_max_s) motivos.push("reloj_futuro")
  }
  const conservar = Boolean(observacion.extremo && observacion.valor !== null && Number.isFinite(observacion.valor))
  const estado: EstadoEvidencia = motivos.includes("uso_no_operativo") || motivos.includes("instrumento_no_comparable") ? "no_comparable"
    : motivos.includes("sin_valor_utilizable") || motivos.includes("hora_desconocida") ? "insuficiente"
    : motivos.length ? "requiere_confirmacion" : "utilizable"
  return { estado, motivos, conservar_extremo: conservar }
}
