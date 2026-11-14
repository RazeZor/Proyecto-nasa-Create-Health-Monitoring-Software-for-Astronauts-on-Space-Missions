/** Estado de un reporte de la cola hacia Tierra: de la API si la hay y, si no, calculado con el reloj local. */
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
  resumen: string
  lectura: string
  linea_base: string
  entorno: string
  accion: string
}

const ESPERA_ENVIO_MS = 3000 // el reporte sale tras 3 s en la demo local

/** Con datos del servidor, manda su `estado`; también se da por llegado si ya pasó `llega_t_real`
 *  (el reloj del servidor lo confirmará en unos segundos). Sin ellos, el cálculo local de la demo. */
export function estadoReporte(createdAt: number, delayMinutes: number, ahora: number, servidor?: ReporteServidor) {
  if (servidor) {
    const creado = Date.parse(servidor.creado_t_real)
    const llega = Date.parse(servidor.llega_t_real)
    const llego = servidor.estado !== "en_cola" || ahora >= llega
    const state: ReportState = llego ? "arrived" : "sent"
    return { state, remainingMs: llega - ahora, progress: llego || llega <= creado ? 1 : Math.min(1, Math.max(0, (ahora - creado) / (llega - creado))) }
  }
  const llega = createdAt + ESPERA_ENVIO_MS + delayMinutes * 60_000
  const state: ReportState = ahora < createdAt + ESPERA_ENVIO_MS ? "queued" : ahora < llega ? "sent" : "arrived"
  return { state, remainingMs: llega - ahora, progress: Math.min(1, (ahora - createdAt) / (llega - createdAt)) }
}
