/** La identidad la verifica el servidor. El perfil local solo permite continuidad offline limitada. */
import type { Role } from "./types.ts"

const BASE = process.env.NEXT_PUBLIC_VIGIA_API_URL || "/vigia-api"
const CLAVE = "vigia:sesion-local-v1"
export interface SesionVerificada {
  tripulante_id: number; mision_id: number; rol: Role; vence_t_real: string; csrf: string; ensayo?: boolean; sinEnlace?: boolean
  demo_publica?: boolean; espacio_demo?: string
}
let actual: SesionVerificada | null = null
export const sesionActual = () => actual
export const esDemoPublica = () => actual?.demo_publica === true
export const espacioSesion = () => actual?.demo_publica ? `demo:${actual.espacio_demo}:` : ""

function aceptar(valor: unknown): SesionVerificada | null {
  if (!valor || typeof valor !== "object") return null
  const s = valor as SesionVerificada
  if (s.demo_publica && (typeof s.espacio_demo !== "string" || !/^[a-f0-9]{32}$/.test(s.espacio_demo))) return null
  if (!Number.isSafeInteger(s.tripulante_id) || s.tripulante_id <= 0 || !Number.isSafeInteger(s.mision_id) || s.mision_id <= 0 ||
      !["astronaut", "cmo", "surgeon"].includes(s.rol) || typeof s.csrf !== "string" || !Number.isFinite(Date.parse(s.vence_t_real)) ||
      Date.parse(s.vence_t_real) <= Date.now()) return null
  return s
}

function recordar(s: SesionVerificada | null): SesionVerificada | null {
  actual = s
  if (s) window.sessionStorage.setItem(CLAVE, JSON.stringify(s))
  else window.sessionStorage.removeItem(CLAVE)
  return s
}

export async function verificarSesion(): Promise<SesionVerificada | null> {
  try {
    let guardada: SesionVerificada | null = null
    try { guardada = aceptar(JSON.parse(window.sessionStorage.getItem(CLAVE) ?? "null")) } catch { /* Sin copia válida. */ }
    if (new URLSearchParams(window.location.search).get("demo") === "1" || guardada?.demo_publica) {
      const res = await fetch(`${BASE}/demo/sesion`, { cache: "no-store", credentials: "same-origin" })
      return res.ok ? recordar(aceptar(await res.json())) : iniciarDemo()
    }
    const res = await fetch(`${BASE}/sesion`, { cache: "no-store", credentials: "same-origin" })
    if (!res.ok) return recordar(null)
    const valor = await res.json() as Record<string, unknown>
    if (valor.ensayo === true) return recordar({ tripulante_id: Number(process.env.NEXT_PUBLIC_VIGIA_TRIPULANTE) || 1,
      mision_id: 1, rol: "astronaut", vence_t_real: new Date(Date.now() + 3600_000).toISOString(), csrf: "", ensayo: true })
    return recordar(aceptar(valor))
  } catch {
    // sessionStorage limita el desbloqueo a esta pestaña/sesión del navegador; no guarda la contraseña.
    try {
      const guardada = aceptar(JSON.parse(window.sessionStorage.getItem(CLAVE) ?? "null"))
      return recordar(guardada ? { ...guardada, sinEnlace: true } : null)
    } catch { return recordar(null) }
  }
}

export async function iniciarDemo(): Promise<SesionVerificada | null> {
  const res = await fetch(`${BASE}/demo/sesion`, { method: "POST", credentials: "same-origin" })
  return res.ok ? recordar(aceptar(await res.json())) : null
}

export function cambiarRolDemo(rol: Role): SesionVerificada | null {
  if (!actual?.demo_publica) return null
  return recordar({ ...actual, rol, tripulante_id: rol === "astronaut" ? 1 : 2 })
}

export async function acceder(usuario: string, clave: string): Promise<SesionVerificada | null> {
  const res = await fetch(`${BASE}/sesion`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, clave }) })
  return res.ok ? recordar(aceptar(await res.json())) : null
}

export async function registrarCuenta(invitacion: string, usuario: string, clave: string): Promise<boolean> {
  const res = await fetch(`${BASE}/cuentas/registro`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitacion, usuario, clave }),
  })
  return res.status === 201
}

export async function peticion(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const cabeceras = new Headers(init.headers)
  if (actual?.csrf) cabeceras.set("X-Vigia-CSRF", actual.csrf)
  if (actual?.demo_publica) {
    cabeceras.set("X-Vigia-Demo-Rol", actual.rol)
    if (typeof input !== "string") throw new Error("la demostración requiere una ruta explícita")
    if (input.startsWith(BASE + "/") && /^\/(tripulantes|tripulacion|reportes|escalamientos|reloj)(\/|\?|$)/.test(input.slice(BASE.length))) {
      input = BASE + "/demo" + input.slice(BASE.length)
    }
  }
  const res = await fetch(input, { ...init, headers: cabeceras, credentials: "same-origin" })
  if (res.status === 401 && typeof window !== "undefined") {
    recordar(null)
    window.dispatchEvent(new Event("vigia:sesion-revocada"))
  }
  return res
}

export async function salir(): Promise<boolean> {
  const demo = actual?.demo_publica
  const res = await peticion(`${BASE}${demo ? "/demo" : ""}/sesion`, { method: "DELETE" })
  if (!res.ok) return false // No afirmar revocación si el servidor no la confirmó.
  recordar(null)
  if (demo) window.localStorage.setItem("vigia:modo", "real")
  window.location.assign("/")
  return true
}
