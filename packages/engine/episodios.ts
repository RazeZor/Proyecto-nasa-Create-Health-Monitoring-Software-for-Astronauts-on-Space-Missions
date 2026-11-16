/** Seguimiento puro: una nueva medida nunca cierra un episodio por sí sola. */
export type EstadoEpisodio = "abierto" | "en_seguimiento" | "en_revision" | "cerrado"
export type TipoEvento = "abrir" | "accion" | "impedimento" | "remedicion" | "solicitar_revision" | "cerrar" | "reabrir"
export interface EventoEpisodio {
  protocolo_version?: "episodios-v1"
  catalogo_version?: "acciones-seguimiento-v1"
  id: string; episodio_id: string; tipo: TipoEvento; nota: string; t_real: string
  observaciones: string[]; version_previa: number
}
export interface Episodio {
  id: string; clave: string; indicador: string; estado: EstadoEpisodio; version: number; eventos: EventoEpisodio[]
}
export const VERSION_SEGUIMIENTO = "episodios-v1"

export function siguienteEstado(estado: EstadoEpisodio | null, tipo: TipoEvento, revisor = false): EstadoEpisodio {
  if (tipo === "abrir" && estado === null) return "abierto"
  if (tipo === "reabrir" && estado === "cerrado") return "abierto"
  if (estado === null || estado === "cerrado" || tipo === "abrir" || tipo === "reabrir") throw new Error("transición no permitida")
  if (tipo === "cerrar") {
    if (estado !== "en_revision" || !revisor) throw new Error("cierre requiere revisión autorizada")
    return "cerrado"
  }
  if (tipo === "solicitar_revision") return "en_revision"
  if (["accion", "impedimento", "remedicion"].includes(tipo)) return "en_seguimiento"
  throw new Error("tipo de evento desconocido")
}

export function aplicarEvento(episodio: Episodio, evento: EventoEpisodio, revisor = false): Episodio {
  if (episodio.eventos.some((e) => e.id === evento.id)) {
    if (JSON.stringify(episodio.eventos.find((e) => e.id === evento.id)) !== JSON.stringify(evento)) throw new Error("operación reutilizada")
    return episodio
  }
  if (evento.episodio_id !== episodio.id || evento.version_previa !== episodio.version) throw new Error("conflicto de versión")
  if (!evento.nota.trim() || !Number.isFinite(Date.parse(evento.t_real))) throw new Error("evento sin motivo u hora")
  if (evento.tipo === "remedicion" && evento.observaciones.length === 0) throw new Error("remedición sin observaciones")
  return { ...episodio, estado: siguienteEstado(episodio.estado, evento.tipo, revisor), version: episodio.version + 1, eventos: [...episodio.eventos, evento] }
}
