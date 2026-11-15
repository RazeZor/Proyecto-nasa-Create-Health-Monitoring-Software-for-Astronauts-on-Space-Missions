import {
  alertaInDeMotor,
  checkInsDeServidor,
  crearAlerta,
  enviarCheckIn,
  guardarLineaBase,
  listarAlertas,
  listarLecturas,
  listarSintomas,
  tReal,
} from "./api-registro"
import type { Analisis } from "./engine"
import { sincronizar } from "./sincronizar"
import { store } from "./storage"
import type { CheckInEntry, Role } from "./types"

/** Identidad provisional (atajo): id de tripulante de la API en `NEXT_PUBLIC_VIGIA_TRIPULANTE`.
 *  Sin ella se usa el 1 (astronauta de la misión demo). Reemplazar por autenticación real. */
export const TRIPULANTE: number | null = Number(process.env.NEXT_PUBLIC_VIGIA_TRIPULANTE) || 1 // 1 = astronauta de la misión demo

/** En la misión demo: 1 = astronauta, 2 = oficial médico (también firma acciones de Tierra). */
export const actorDeRol = (role: Role): number => (role === "astronaut" ? (TRIPULANTE ?? 1) : 2)

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

/** Une los registros locales con las lecturas y síntomas ya guardados en SQLite (`GET /lecturas` y `GET /sintomas`). */
export async function cargarRegistrosCombinados(diaDefecto = 24): Promise<CheckInEntry[]> {
  const locales = await store.listCheckIns()
  if (!TRIPULANTE) return locales
  try {
    const [lecturas, sintomas] = await Promise.all([listarLecturas(TRIPULANTE), listarSintomas(TRIPULANTE)])
    if (lecturas.length === 0 && sintomas.length === 0) return locales
    const marcasLocales = new Set(locales.map((e) => tReal(e.createdAt)))
    const remotos = checkInsDeServidor(lecturas, sintomas, diaDefecto).filter((r) => !marcasLocales.has(r.createdAt))
    return [...locales, ...remotos]
  } catch {
    return locales
  }
}

/** Sincroniza las líneas base (`PUT /linea-base/...`) y las alertas nuevas del motor (`GET` + `POST /alertas`) con SQLite. */
export async function sincronizarMotorConServidor(analisis: Analisis): Promise<void> {
  if (!TRIPULANTE) return
  const tripulante = TRIPULANTE
  try {
    await Promise.all(
      analisis.lineasBaseServidor().map((lb) => guardarLineaBase(tripulante, lb.indicador, lb.origen, lb)),
    )
    const existentes = await listarAlertas(tripulante, tripulante)
    const claves = new Set(existentes.map((a) => `${a.indicador}|${a.capa}|${a.nivel}|${a.t_real}`))
    for (const a of analisis.alertasMotor) {
      const cuerpo = alertaInDeMotor(a)
      const clave = `${cuerpo.indicador}|${cuerpo.capa}|${cuerpo.nivel}|${cuerpo.t_real}`
      if (!claves.has(clave)) {
        await crearAlerta(tripulante, cuerpo)
        claves.add(clave)
      }
    }
  } catch {
    // Offline-first: si la API no responde, se reintenta en el próximo ciclo.
  }
}
