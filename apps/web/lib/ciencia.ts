/** Contrato de lectura: una respuesta incompleta no se convierte en ceros ni en validación clínica. */
export interface ResultadoCientifico {
  escenario: string; metodo: string; eventos: number; detectados: number; no_detectados: number
  ic95_deteccion: [number, number] | null; retraso_mediana_solo_detectados_dias: number | null
  falsos_episodios: number; dias_observados_fuera_evento: number; falsos_por_persona_semana: number | null
}
export interface Afirmacion {
  id: string; estado: string; fuentes: string[]; artefactos: string[]
}
export interface EvidenciaCientifica {
  estado: "vigente" | "desactualizado" | "no_publicado"
  catalogo: { version: "afirmaciones-v1"; validacion_clinica: false; revision_profesional: "pendiente"; revisiones: []; afirmaciones: Afirmacion[] }
  informe: null | { version: "evidencia-v1"; t_real: string; congelacion: { archivos: Record<string, string> }; resultados: ResultadoCientifico[] }
}
const objeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v)
const entero = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0
const numero = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0
const listaTextos = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string")
const fuenteHttps = (u: string): boolean => { try { return new URL(u).protocol === "https:" } catch { return false } }
const IDs = ["capa_a", "capa_c", "auditoria", "operacion", "beneficio"]
const ESTADOS = ["fundamento_publicado", "verificado_software", "evaluado_sintetico", "hipotesis"]

export function leerEvidencia(valor: unknown): EvidenciaCientifica | null {
  if (!objeto(valor) || !["vigente", "desactualizado", "no_publicado"].includes(String(valor.estado))) return null
  const c = valor.catalogo
  if (!objeto(c) || c.version !== "afirmaciones-v1" || c.validacion_clinica !== false || c.revision_profesional !== "pendiente" ||
      !Array.isArray(c.revisiones) || c.revisiones.length || !Array.isArray(c.afirmaciones) || c.afirmaciones.length !== IDs.length) return null
  const ids = new Set<string>()
  for (const a of c.afirmaciones) {
    if (!objeto(a) || typeof a.id !== "string" || !IDs.includes(a.id) || ids.has(a.id) || !ESTADOS.includes(String(a.estado)) ||
        !listaTextos(a.fuentes) || !a.fuentes.every(fuenteHttps) || !listaTextos(a.artefactos)) return null
    ids.add(a.id)
  }
  if (valor.estado === "no_publicado") return valor.informe === null ? valor as unknown as EvidenciaCientifica : null
  const i = valor.informe
  if (!objeto(i) || i.version !== "evidencia-v1" || typeof i.t_real !== "string" || !Number.isFinite(Date.parse(i.t_real)) ||
      !objeto(i.congelacion) || !objeto(i.congelacion.archivos) || typeof i.congelacion.archivos["packages/engine/engine.ts"] !== "string" ||
      !Array.isArray(i.resultados) || !i.resultados.length) return null
  for (const r of i.resultados) {
    if (!objeto(r) || typeof r.escenario !== "string" || typeof r.metodo !== "string" || !entero(r.eventos) || !entero(r.detectados) ||
        !entero(r.no_detectados) || r.detectados + r.no_detectados !== r.eventos || !entero(r.falsos_episodios) || !entero(r.dias_observados_fuera_evento)) return null
    if (r.eventos === 0 ? r.ic95_deteccion !== null : !Array.isArray(r.ic95_deteccion) || r.ic95_deteccion.length !== 2 ||
        !r.ic95_deteccion.every(numero) || r.ic95_deteccion[0] > r.ic95_deteccion[1] || r.ic95_deteccion[1] > 1) return null
    if (r.detectados === 0 ? r.retraso_mediana_solo_detectados_dias !== null : !numero(r.retraso_mediana_solo_detectados_dias)) return null
    if (r.dias_observados_fuera_evento === 0 ? r.falsos_por_persona_semana !== null : !numero(r.falsos_por_persona_semana)) return null
  }
  return valor as unknown as EvidenciaCientifica
}
