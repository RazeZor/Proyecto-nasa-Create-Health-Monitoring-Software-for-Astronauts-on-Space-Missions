import type { CheckInEntry, Mode } from "./types"

/** Swap this implementation for IndexedDB/Dexie later; consumers only use the interface. */
export interface HealthStore {
  listCheckIns(): Promise<CheckInEntry[]>
  saveCheckIn(entry: CheckInEntry): Promise<void>
  listSharedAlertIds(): Promise<string[]>
  shareAlert(id: string): Promise<void>
  listAcknowledgedAlertIds(): Promise<string[]>
  acknowledgeAlert(id: string): Promise<void>
  listSyncedCheckInIds(): Promise<string[]>
  markCheckInSynced(id: string): Promise<void>
  /** Alertas rojas ya enviadas a la API: clave de la alerta -> id del escalamiento (null si no hubo destinatario). */
  listEscalations(): Promise<Record<string, number | null>>
  saveEscalation(clave: string, escalamientoId: number | null): Promise<void>
}

// Cada modo tiene su almacén: lo registrado en la demo (sobre el escenario simulado) nunca se mezcla con los
// registros reales del tripulante ni se sube a la API. El prefijo sin modo es el de la demo (claves históricas).
const MODO_DEFECTO: Mode = process.env.NEXT_PUBLIC_VIGIA_MODO === "demo" ? "demo" : "real"
const CLAVE_MODO = "vigia:modo"
let modo: Mode = MODO_DEFECTO
const prefijo = () => (modo === "demo" ? "vigia:" : "vigia:real:")

const hayAlmacen = () => typeof window !== "undefined" && !!window.localStorage

/** Modo de la app: `?modo=demo|real` en la dirección (enlace directo a la demo; queda guardado), si no el que
 *  eligió el usuario y, si nunca eligió, el del despliegue (NEXT_PUBLIC_VIGIA_MODO, por defecto real). */
export function leerModo(): Mode {
  if (!hayAlmacen()) return MODO_DEFECTO
  const pedido = new URLSearchParams(window.location.search).get("modo")
  if (pedido === "demo" || pedido === "real") {
    window.localStorage.setItem(CLAVE_MODO, pedido)
    return pedido
  }
  const guardado = window.localStorage.getItem(CLAVE_MODO)
  return guardado === "demo" || guardado === "real" ? guardado : MODO_DEFECTO
}

/** Fija el modo del almacén (y lo recuerda si `recordar`). Llamar antes de leer o escribir registros. */
export function usarModo(m: Mode, recordar = false) {
  modo = m
  if (recordar && hayAlmacen()) window.localStorage.setItem(CLAVE_MODO, m)
}

export const modoActual = (): Mode => modo

function read<T>(key: string, fallback: T): T {
  if (!hayAlmacen()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

async function append<T>(key: string, item: T) {
  write(prefijo() + key, [...read<T[]>(prefijo() + key, []), item])
}

export const localStore: HealthStore = {
  listCheckIns: async () => read<CheckInEntry[]>(prefijo() + "checkins", []),
  saveCheckIn: (e) => append("checkins", e),
  listSharedAlertIds: async () => read<string[]>(prefijo() + "shared", []),
  shareAlert: (id) => append("shared", id),
  listAcknowledgedAlertIds: async () => read<string[]>(prefijo() + "acked", []),
  acknowledgeAlert: (id) => append("acked", id),
  listSyncedCheckInIds: async () => read<string[]>(prefijo() + "synced", []),
  markCheckInSynced: (id) => append("synced", id),
  listEscalations: async () => read<Record<string, number | null>>(prefijo() + "escalations", {}),
  saveEscalation: async (clave, id) =>
    write(prefijo() + "escalations", { ...read<Record<string, number | null>>(prefijo() + "escalations", {}), [clave]: id }),
}

export const store: HealthStore = localStore

/** Copia local de lo último que respondió la API (catálogo, panel de entorno...): con ella la app abre sin enlace. */
export const leerCache = <T>(clave: string): T | null => read<T | null>(`vigia:cache:${clave}`, null)
export function guardarCache<T>(clave: string, valor: T) {
  if (!hayAlmacen()) return
  try {
    write(`vigia:cache:${clave}`, valor)
  } catch {
    // almacenamiento lleno: la app sigue con la red; solo se pierde el arranque sin enlace
  }
}
