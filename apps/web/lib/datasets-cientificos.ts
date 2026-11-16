/** Referencias públicas adquiridas; nunca son datos del tripulante ni resultados clínicos. */
export interface DatasetReferencia {
  id: "mmash" | "orion"; nombre: string; tipo: "fisiologia_terrestre" | "radiacion_ambiental"
  uso: "referencia"; version: string; fuente: string; sha256: string; registros: number; puntos_5min: number
  evaluacion_motor: false; sujetos?: number; registros_utilizados?: number; periodos_sueno?: number
  detectores?: number; desde?: string; hasta?: string; licencia?: string
}
export interface CatalogoDatasets { version: "catalogo-datasets-v1"; datasets: DatasetReferencia[] }
const objeto = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)
const conteo = (x: unknown): x is number => typeof x === "number" && Number.isSafeInteger(x) && x >= 0

export function leerDatasets(x: unknown): CatalogoDatasets | null {
  if (!objeto(x) || x.version !== "catalogo-datasets-v1" || !Array.isArray(x.datasets)) return null
  const vistos = new Set()
  for (const d of x.datasets) {
    if (!objeto(d) || !["mmash", "orion"].includes(String(d.id)) || vistos.has(d.id) || d.uso !== "referencia" ||
        d.evaluacion_motor !== false || typeof d.nombre !== "string" || typeof d.version !== "string" ||
        typeof d.fuente !== "string" || typeof d.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(d.sha256) ||
        !conteo(d.registros) || !conteo(d.puntos_5min)) return null
    try { if (new URL(d.fuente).protocol !== "https:") return null } catch { return null }
    if (d.id === "mmash" && (d.tipo !== "fisiologia_terrestre" || !conteo(d.sujetos) || d.sujetos < 1 ||
        !conteo(d.registros_utilizados) || d.registros_utilizados > d.registros || !conteo(d.periodos_sueno))) return null
    if (d.id === "orion" && (d.tipo !== "radiacion_ambiental" || !conteo(d.detectores) || d.detectores < 1 ||
        typeof d.desde !== "string" || typeof d.hasta !== "string" || !Number.isFinite(Date.parse(d.desde)) ||
        !Number.isFinite(Date.parse(d.hasta)) || Date.parse(d.desde) >= Date.parse(d.hasta))) return null
    vistos.add(d.id)
  }
  return x as unknown as CatalogoDatasets
}
