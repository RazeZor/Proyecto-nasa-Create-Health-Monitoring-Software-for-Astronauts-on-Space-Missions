import { enviarCheckIn } from "./api-registro"
import { sincronizar } from "./sincronizar"
import { store } from "./storage"

/** Identidad provisional (atajo): id de tripulante de la API en `NEXT_PUBLIC_VIGIA_TRIPULANTE`.
 *  Sin ella la interfaz funciona solo con el almacén local. Reemplazar por autenticación real. */
export const TRIPULANTE = Number(process.env.NEXT_PUBLIC_VIGIA_TRIPULANTE) || null

let enCurso: Promise<number> | null = null

/** Sube a la API los registros diarios pendientes; una sola ejecución a la vez. No lanza: devuelve cuántos subió. */
export function sincronizarRegistros(): Promise<number> {
  if (!TRIPULANTE) return Promise.resolve(0)
  const tripulante = TRIPULANTE
  enCurso ??= (async () => {
    try {
      return await sincronizar({
        registros: await store.listCheckIns(),
        sincronizados: await store.listSyncedCheckInIds(),
        enviar: (e) => enviarCheckIn(e, tripulante),
        marcar: (id) => store.markCheckInSynced(id),
      })
    } catch {
      return 0
    } finally {
      enCurso = null
    }
  })()
  return enCurso
}
