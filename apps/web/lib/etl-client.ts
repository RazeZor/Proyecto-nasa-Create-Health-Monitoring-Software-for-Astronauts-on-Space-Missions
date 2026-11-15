/**
 * Cliente HTTP de solo lectura hacia apps/api (zona gold del ETL en pipelines/reanclaje).
 * Si la API (vía el proxy /vigia-api) está activa, consume el gold verificado por SHA-256 y
 * guarda una copia local de cada respuesta; sin conexión devuelve esa última copia (caché
 * local, rotulada en la interfaz) y, si no la hay, null. No hay datos embebidos.
 */

// Por defecto, el proxy del mismo origen (next.config.mjs); NEXT_PUBLIC_VIGIA_API_URL lo salta con una URL directa.
import { guardarCache, leerCache } from "./storage"

export const API_BASE_URL = process.env.NEXT_PUBLIC_VIGIA_API_URL || "/vigia-api"

export interface VentanaEtl {
  fuente: "goes" | "donki" | "radlab" | "eda"
  desde: string
  hasta: string
  dia_mision: number
}

export interface DosisDiaEtl {
  dia_mision: number
  dosis: number
  acumulada: number
  cobertura: number
}

export interface DosisPanelEtl {
  tipo: "equivalente" | "absorbida"
  unidad: "µSv" | "µGy"
  orientativa: boolean
  series: string[]
  por_dia: DosisDiaEtl[]
  porcentaje_limite_carrera: number
}

export interface ProtonesPanelEtl {
  dia_mision: number
  serie: string
  max_pfu: number
  modo_tormenta: boolean
}

export interface CabinaPanelEtl {
  dia_mision: number
  mision: string
  co2_ppm_max?: number
  co2_ppm_promedio_horario_max?: number
  co2_mmhg_por_perfil?: {
    estacion: number
    transito: number
    superficie: number
  }
  co2_sobre_limite_por_perfil?: {
    estacion: boolean
    transito: boolean
    superficie: boolean
  }
  humidity_iss_max?: number
  temperature_iss_max?: number
}

export interface EventoDonkiEtl {
  t_mision: string
  t_real: string
  sepID: string
  instrumentos: string[]
  actividades: string[]
  link: string | null
  naturaleza: "Real"
}

export interface PanelEntornoEtl {
  escenario: string
  ventanas: VentanaEtl[]
  aviso: string
  limites: {
    carrera_msv: number
    evento_msv: number
    co2_mmhg_promedio_1h: number
    protones_tormenta_pfu: number
  }
  perfiles_presion_mmhg: {
    estacion: number
    transito: number
    superficie: number
  }
  dosis: DosisPanelEtl | null
  protones: ProtonesPanelEtl[]
  cabina: CabinaPanelEtl[]
  eventos: EventoDonkiEtl[]
}

export interface ResumenDiarioEtl {
  dia_mision: number
  fuente: "goes" | "radlab" | "eda"
  serie: string
  variable: string
  max: number
  bins: number
  dosis?: number
  max_prom_horario?: number
}

export interface KpiSimulacionEtl {
  protocolo: string
  semilla_principal: number
  semilla_validacion: number
  n_misiones_anomalia: number
  n_misiones_control: number
  generado: string
  resultados: Record<string, unknown>
}

/** Pide a la API y guarda una copia local; si no hay enlace devuelve la última copia (a bordo la red solo sincroniza). */
async function getJson<T>(ruta: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${ruta}`, { cache: "no-store" })
    if (!res.ok) return null
    const datos = (await res.json()) as T
    guardarCache(`etl:${ruta}`, datos)
    return datos
  } catch {
    return leerCache<T>(`etl:${ruta}`)
  }
}

export async function verificarSaludApi(): Promise<boolean> {
  const res = await getJson<{ estado: string }>("/salud")
  return res?.estado === "ok"
}

export async function listarPanelesGold(): Promise<{ lista: string[]; enVivo: boolean }> {
  const remotos = await getJson<string[]>("/paneles")
  if (remotos && remotos.length > 0) {
    return { lista: remotos, enVivo: true }
  }
  return { lista: [], enVivo: false }
}

export async function cargarPanelGold(nombre: string): Promise<{ panel: PanelEntornoEtl | null; enVivo: boolean }> {
  const remoto = await getJson<PanelEntornoEtl>(`/paneles/${encodeURIComponent(nombre)}`)
  if (remoto) {
    return { panel: remoto, enVivo: true }
  }
  return { panel: null, enVivo: false }
}

export async function cargarEscenarioDiario(
  nombre: string,
  filtro?: { fuente?: string; variable?: string },
): Promise<{ diario: ResumenDiarioEtl[]; enVivo: boolean }> {
  const params = new URLSearchParams()
  if (filtro?.fuente) params.set("fuente", filtro.fuente)
  if (filtro?.variable) params.set("variable", filtro.variable)
  const qs = params.toString()
  const ruta = `/escenarios/${encodeURIComponent(nombre)}/diario${qs ? `?${qs}` : ""}`
  const remoto = await getJson<ResumenDiarioEtl[]>(ruta)
  if (remoto) {
    return { diario: remoto, enVivo: true }
  }
  return { diario: [], enVivo: false }
}

export async function cargarKpiSimulacion(): Promise<KpiSimulacionEtl | null> {
  return getJson<KpiSimulacionEtl>("/simulacion/kpi")
}
