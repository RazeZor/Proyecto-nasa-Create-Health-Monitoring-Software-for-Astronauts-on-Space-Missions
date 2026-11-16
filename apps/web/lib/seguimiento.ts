/** Bitácora offline y bandeja transaccional: cada acuse confirma una operación concreta. */
import { actualizarPrivado, claveAmbito, leerPrivado } from "./almacen-local.ts"
import { API_BASE_URL } from "./api-registro.ts"
import { peticion } from "./sesion.ts"
import { aplicarEvento, type Episodio, type EventoEpisodio, type TipoEvento } from "../../../packages/engine/episodios.ts"
import catalogo from "../../../packages/schemas/acciones-seguimiento.json" with { type: "json" }

export interface OperacionSeguimiento extends EventoEpisodio { clave: string; indicador: string }
interface Bandeja { episodios: Episodio[]; operaciones: OperacionSeguimiento[]; confirmadas: string[]; conflictos: string[]; borradores?: { episodio: Episodio; operaciones: OperacionSeguimiento[] }[] }
const VACIA: Bandeja = { episodios: [], operaciones: [], confirmadas: [], conflictos: [] }
export const leerSeguimiento = () => leerPrivado<Bandeja>("seguimiento-v1", VACIA)

export async function registrarEvento(evento: OperacionSeguimiento) {
  evento = { ...evento, protocolo_version: "episodios-v1", catalogo_version: catalogo.version as "acciones-seguimiento-v1" }
  await actualizarPrivado<Bandeja>("seguimiento-v1", VACIA, (b) => {
    if (b.operaciones.some((o) => o.id === evento.id)) {
      if (JSON.stringify(b.operaciones.find((o) => o.id === evento.id)) !== JSON.stringify(evento)) throw new Error("operación reutilizada")
      return b
    }
    let episodio = b.episodios.find((e) => e.id === evento.episodio_id)
    if (!episodio) {
      if (evento.tipo !== "abrir" || evento.version_previa !== 0 || !evento.nota.trim()) throw new Error("episodio no abierto")
      if (b.episodios.some((e) => e.clave === evento.clave && e.estado !== "cerrado")) throw new Error("episodio activo duplicado")
      episodio = { id: evento.episodio_id, clave: evento.clave, indicador: evento.indicador, estado: "abierto", version: 1, eventos: [evento] }
    } else episodio = aplicarEvento(episodio, evento)
    return { ...b, episodios: [...b.episodios.filter((e) => e.id !== episodio.id), episodio], operaciones: [...b.operaciones, evento] }
  })
}

let enCurso: Promise<void> | null = null
export function sincronizarSeguimiento(tripulante: number): Promise<void> {
  enCurso ??= (async () => {
    const ambitoInicial = claveAmbito()
    const b = await leerSeguimiento()
    const bloqueados = new Set(b.conflictos)
    for (const op of b.operaciones) {
      if (claveAmbito() !== ambitoInicial) throw new Error("cambio de ámbito durante sincronización")
      if (b.confirmadas.includes(op.id) || bloqueados.has(op.episodio_id)) continue
      try {
        const res = await peticion(`${API_BASE_URL}/tripulantes/${tripulante}/episodios/eventos`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(op),
        })
        if (claveAmbito() !== ambitoInicial) throw new Error("cambio de ámbito durante sincronización")
        if (res.status === 409) {
          b.conflictos.push(op.episodio_id)
          bloqueados.add(op.episodio_id)
          await actualizarPrivado<Bandeja>("seguimiento-v1", VACIA, (actual) => ({ ...actual, conflictos: [...new Set([...actual.conflictos, op.episodio_id])] }))
          continue
        }
        if (!res.ok) { bloqueados.add(op.episodio_id); continue }
        const acuse = await res.json() as { id?: unknown; episodio_id?: unknown; version?: unknown }
        if (acuse.id !== op.id || acuse.episodio_id !== op.episodio_id || acuse.version !== op.version_previa + 1) { bloqueados.add(op.episodio_id); continue }
        await actualizarPrivado<Bandeja>("seguimiento-v1", VACIA, (actual) => ({ ...actual, confirmadas: [...new Set([...actual.confirmadas, op.id])] }))
      } catch { break }
    }
  })().finally(() => { enCurso = null })
  return enCurso
}
export type { Episodio, TipoEvento }

export async function resolverConflicto(tripulante: number, episodioId: string) {
  const ambito = claveAmbito()
  const res = await peticion(`${API_BASE_URL}/tripulantes/${tripulante}/episodios`, { cache: "no-store" })
  if (!res.ok) throw new Error("no se pudo leer la versión del servidor")
  const lista = await res.json() as Episodio[]
  if (!Array.isArray(lista)) throw new Error("respuesta inválida")
  const remoto = lista.find((e) => e.id === episodioId)
  if (!remoto || !Array.isArray(remoto.eventos) || !Number.isSafeInteger(remoto.version) || claveAmbito() !== ambito) throw new Error("episodio ausente o ámbito cambiado")
  await actualizarPrivado<Bandeja>("seguimiento-v1", VACIA, (b) => {
    const local = b.episodios.find((e) => e.id === episodioId)
    if (!local) throw new Error("borrador ausente")
    return { ...b, borradores: [...(b.borradores ?? []), { episodio: local, operaciones: b.operaciones.filter((o) => o.episodio_id === episodioId && !b.confirmadas.includes(o.id)) }],
      episodios: b.episodios.map((e) => e.id === episodioId ? remoto : e), operaciones: b.operaciones.filter((o) => o.episodio_id !== episodioId || b.confirmadas.includes(o.id)),
      conflictos: b.conflictos.filter((id) => id !== episodioId) }
  })
}
