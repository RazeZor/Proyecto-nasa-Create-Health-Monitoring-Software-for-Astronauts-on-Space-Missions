/**
 * Cliente HTTP de solo lectura hacia apps/api (zona gold del ETL en pipelines/reanclaje).
 * Si la API local (localhost:8000) está activa, consume el gold verificado por SHA-256;
 * si está sin conexión, recurre al resumen embebido de los escenarios gold para que la
 * interfaz funcione 100 % offline.
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_VIGIA_API_URL ?? "http://localhost:8000"

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

const AVISO_ESTANDAR =
  "Cada serie es una medición real reanclada a la línea de tiempo de misión. Que series de fechas reales distintas coincidan en un día de misión es una decisión del escenario, no un hecho observado (informe §3.4)."

export const PANELES_RESPALDO: Record<string, PanelEntornoEtl> = {
  "panel-demo": {
    escenario: "panel-demo",
    ventanas: [
      { fuente: "radlab", desde: "2024-05-10T00:00:00Z", hasta: "2024-05-10T01:00:00Z", dia_mision: 22 },
      { fuente: "goes", desde: "2026-11-13T15:00:00Z", hasta: "2026-11-14T16:00:00Z", dia_mision: 22 },
      { fuente: "eda", desde: "2014-09-21T00:00:00Z", hasta: "2014-09-22T00:00:00Z", dia_mision: 22 },
    ],
    aviso: AVISO_ESTANDAR,
    limites: { carrera_msv: 600, evento_msv: 250, co2_mmhg_promedio_1h: 3, protones_tormenta_pfu: 10 },
    perfiles_presion_mmhg: { estacion: 760, transito: 760, superficie: 424 },
    dosis: {
      tipo: "absorbida",
      unidad: "µGy",
      orientativa: true,
      series: ["DosTel1", "DosTel2"],
      por_dia: [{ dia_mision: 22, dosis: 4.4774, acumulada: 4.4774, cobertura: 0.042 }],
      porcentaje_limite_carrera: 0.0007,
    },
    protones: [{ dia_mision: 22, serie: "G18 >=10 MeV", max_pfu: 0.3453, modo_tormenta: false }],
    cabina: [
      {
        dia_mision: 22,
        mision: "RR-1",
        co2_ppm_max: 2886.0,
        co2_ppm_promedio_horario_max: 2879.9,
        co2_mmhg_por_perfil: { estacion: 2.189, transito: 2.189, superficie: 1.221 },
        co2_sobre_limite_por_perfil: { estacion: false, transito: false, superficie: false },
        humidity_iss_max: 70.0,
        temperature_iss_max: 26.8,
      },
    ],
    eventos: [],
  },
  "dosis-equivalente": {
    escenario: "dosis-equivalente",
    ventanas: [
      { fuente: "radlab", desde: "2011-11-16T00:00:00Z", hasta: "2011-11-17T00:00:00Z", dia_mision: 22 },
    ],
    aviso: AVISO_ESTANDAR,
    limites: { carrera_msv: 600, evento_msv: 250, co2_mmhg_promedio_1h: 3, protones_tormenta_pfu: 10 },
    perfiles_presion_mmhg: { estacion: 760, transito: 760, superficie: 424 },
    dosis: {
      tipo: "equivalente",
      unidad: "µSv",
      orientativa: false,
      series: ["ALTEA-Survey"],
      por_dia: [{ dia_mision: 22, dosis: 912.7941, acumulada: 912.7941, cobertura: 1.0 }],
      porcentaje_limite_carrera: 0.1521,
    },
    protones: [],
    cabina: [],
    eventos: [],
  },
}

async function getJson<T>(ruta: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${ruta}`, { cache: "no-store" })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
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
  return { lista: Object.keys(PANELES_RESPALDO), enVivo: false }
}

export async function cargarPanelGold(nombre: string): Promise<{ panel: PanelEntornoEtl | null; enVivo: boolean }> {
  const remoto = await getJson<PanelEntornoEtl>(`/paneles/${encodeURIComponent(nombre)}`)
  if (remoto) {
    return { panel: remoto, enVivo: true }
  }
  return { panel: PANELES_RESPALDO[nombre] ?? null, enVivo: false }
}
