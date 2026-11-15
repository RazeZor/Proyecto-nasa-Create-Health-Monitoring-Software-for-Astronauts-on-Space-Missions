import { sincronizarAlertas } from "./alertas-sync"
import { enviarAlertaRoja, enviarCheckIn } from "./api-registro"
import { sincronizar } from "./sincronizar"
import { modoActual, store } from "./storage"
import { MOTOR } from "./strings"
import type { Alert } from "./types"

/** Identidad provisional (atajo): id de tripulante de la API en `NEXT_PUBLIC_VIGIA_TRIPULANTE`.
 *  Sin ella se usa el 1 (astronauta de la misión demo). Reemplazar por autenticación real. */
export const TRIPULANTE: number | null = Number(process.env.NEXT_PUBLIC_VIGIA_TRIPULANTE) || 1 // 1 = astronauta de la misión demo

let enCurso: Promise<number> | null = null

/** Sube a la API los registros diarios pendientes; una sola ejecución a la vez. No lanza: devuelve cuántos subió.
 *  Solo en modo real: lo registrado sobre el escenario de demostración se queda en el dispositivo. */
export function sincronizarRegistros(): Promise<number> {
  if (!TRIPULANTE || modoActual() !== "real") return Promise.resolve(0)
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

let alertasEnCurso: Promise<number> | null = null

/** Escala a la API los rojos de capa A aún no enviados (§5.4). Solo en modo real; sin red quedan pendientes. */
export function sincronizarAlertasRojas(alertas: Alert[]): Promise<number> {
  if (!TRIPULANTE || modoActual() !== "real") return Promise.resolve(0)
  const tripulante = TRIPULANTE
  alertasEnCurso ??= (async () => {
    try {
      return await sincronizarAlertas({
        alertas,
        enviadas: await store.listEscalations(),
        enviar: (a) => enviarAlertaRoja(a, tripulante, MOTOR.causa.A),
        marcar: (clave, id) => store.saveEscalation(clave, id),
      })
    } catch {
      return 0
    } finally {
      alertasEnCurso = null
    }
  })()
  return alertasEnCurso
}
