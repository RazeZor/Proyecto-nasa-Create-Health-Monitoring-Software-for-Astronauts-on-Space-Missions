/** Núcleo puro de la sincronización del registro diario con la API (sin red ni almacenamiento: se inyectan). */
import type { CheckInEntry } from "./types"

export interface Dependencias {
  registros: CheckInEntry[]
  sincronizados: string[]
  enviar: (e: CheckInEntry) => Promise<boolean>
  marcar: (id: string) => Promise<void>
}

/** Envía en orden los registros aún no sincronizados y devuelve cuántos llegaron. Se detiene en el primer fallo
 *  (sin red no tiene sentido seguir); lo pendiente se reintenta la próxima vez, y reenviar es seguro. */
export async function sincronizar({ registros, sincronizados, enviar, marcar }: Dependencias): Promise<number> {
  const hechos = new Set(sincronizados)
  let enviados = 0
  for (const e of registros.filter((r) => !hechos.has(r.id))) {
    if (!(await enviar(e))) break
    await marcar(e.id)
    enviados++
  }
  return enviados
}
