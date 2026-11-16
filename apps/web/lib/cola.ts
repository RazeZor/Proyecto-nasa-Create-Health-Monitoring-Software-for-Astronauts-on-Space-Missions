/** Estado confirmado por la API del simulador de enlace; sin acuse permanece en el dispositivo. */
import type { ReportState } from "./types"

export interface ReporteServidor {
  id: number
  creado_t_real: string
  retardo_min: number
  llega_t_real: string
  estado: "en_cola" | "entregado" | "respondido"
  respuesta: string | null
  contenido: ContenidoReporte | null
}

/** Lo que la app escribe en un informe; vive en el servidor (columna `contenido`). */
export interface ContenidoReporte {
  titulo: string
  /** Informe de ejemplo sembrado para la demo: no se muestra en modo real. */
  demo?: boolean
  resumen: string
  lectura: string
  /** Lectura en lenguaje llano para el tripulante (lib/lectura-humana.ts). */
  lectura_humana?: string
  linea_base: string
  entorno: string
  /** Texto completo: «Sugerido: … Hecho: …» cuando el tripulante confirmó qué hizo; si no, la acción sugerida. */
  accion: string
  accion_sugerida?: string
  accion_hecha?: AccionHecha
  accion_nota?: string
}

/** Qué hizo el tripulante con la acción que sugirió el motor. */
export type AccionHecha = "hecha" | "no_pude" | "remedi"

/** El contador estima el viaje; únicamente un estado del servidor confirma entrega en el simulador. */
export function estadoReporte(createdAt: number, delayMinutes: number, ahora: number, servidor?: ReporteServidor) {
  if (servidor) {
    const creado = Date.parse(servidor.creado_t_real)
    const llega = Date.parse(servidor.llega_t_real)
    const llego = servidor.estado !== "en_cola"
    const state: ReportState = llego ? "arrived" : "sent"
    return { state, remainingMs: Math.max(0, llega - ahora), progress: llego || llega <= creado ? 1 : Math.min(1, Math.max(0, (ahora - creado) / (llega - creado))) }
  }
  const state: ReportState = "queued"
  return { state, remainingMs: delayMinutes * 60_000, progress: 0 }
}
