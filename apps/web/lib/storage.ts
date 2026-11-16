import type { CheckInEntry, Mode } from "./types"
import { actualizarPrivado, leerPrivado } from "./almacen-local.ts"
import { validarRegistros, validarIds } from "./almacen-validar.ts"
import { espacioSesion } from "./sesion.ts"

/** Interfaz estable; IndexedDB confirma la transacción antes de resolver una escritura. */
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

const anadir = <T>(clave: string, valor: T) => actualizarPrivado<T[]>(clave, [], (lista) => lista.includes(valor) ? lista : [...lista, valor])
export const store: HealthStore = {
  listCheckIns: async () => validarRegistros(await leerPrivado<unknown>("checkins", [])),
  saveCheckIn: (e) => actualizarPrivado<CheckInEntry[]>("checkins", [], (lista) => {
    const previo = lista.find((x) => x.id === e.id)
    if (previo && JSON.stringify(previo) !== JSON.stringify(e)) throw new Error("registro inmutable reutilizado")
    return previo ? lista : [...lista, e]
  }),
  listSharedAlertIds: async () => validarIds(await leerPrivado<unknown>("shared", [])), shareAlert: (id) => anadir("shared", id),
  listAcknowledgedAlertIds: async () => validarIds(await leerPrivado<unknown>("acked", [])), acknowledgeAlert: (id) => anadir("acked", id),
  listSyncedCheckInIds: async () => validarIds(await leerPrivado<unknown>("synced", [])), markCheckInSynced: (id) => anadir("synced", id),
  listEscalations: () => leerPrivado<Record<string, number | null>>("escalations", {}),
  saveEscalation: (clave, id) => actualizarPrivado<Record<string, number | null>>("escalations", {}, (datos) => ({ ...datos, [clave]: id })),
}
export const localStore = store

/** Copia local de lo último que respondió la API (catálogo, panel de entorno...): con ella la app abre sin enlace. */
export const leerCache = <T>(clave: string): T | null => read<T | null>(`vigia:${espacioSesion()}cache:${clave}`, null)
export function guardarCache<T>(clave: string, valor: T) {
  if (!hayAlmacen()) return
  try {
    write(`vigia:${espacioSesion()}cache:${clave}`, valor)
  } catch {
    // almacenamiento lleno: la app sigue con la red; solo se pierde el arranque sin enlace
  }
}
