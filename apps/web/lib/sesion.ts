/** La identidad la verifica el servidor. El perfil local solo permite continuidad offline limitada. */
import type { Role } from "./types.ts"

const BASE = process.env.NEXT_PUBLIC_VIGIA_API_URL || "/vigia-api"
const CLAVE = "vigia:sesion-local-v1"
export interface SesionVerificada {
  tripulante_id: number; mision_id: number; rol: Role; vence_t_real: string; csrf: string; ensayo?: boolean; sinEnlace?: boolean
}
let actual: SesionVerificada | null = null
export const sesionActual = () => actual

function aceptar(valor: unknown): SesionVerificada | null {
  if (!valor || typeof valor !== "object") return null
  const s = valor as SesionVerificada
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

export async function acceder(usuario: string, clave: string): Promise<SesionVerificada | null> {
  const res = await fetch(`${BASE}/sesion`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuario, clave }) })
  return res.ok ? recordar(aceptar(await res.json())) : null
}

export async function peticion(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const cabeceras = new Headers(init.headers)
  if (actual?.csrf) cabeceras.set("X-Vigia-CSRF", actual.csrf)
  const res = await fetch(input, { ...init, headers: cabeceras, credentials: "same-origin" })
  if (res.status === 401 && typeof window !== "undefined") {
    recordar(null)
    window.dispatchEvent(new Event("vigia:sesion-revocada"))
  }
  return res
}

export async function salir(): Promise<boolean> {
  const res = await peticion(`${BASE}/sesion`, { method: "DELETE" })
  if (!res.ok) return false // No afirmar revocación si el servidor no la confirmó.
  recordar(null)
  window.location.assign("/")
  return true
}
