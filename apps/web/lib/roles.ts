/**
 * Quién usa la app lo dice la ruta: /astronauta, /oficial y /medico. Cada rol ve sus propias pantallas.
 * shortcut: la ruta solo cambia la vista; el servidor aún no comprueba el rol (autenticación, issue #46).
 */
import type { Role } from "./types.ts"

export const RUTA_DE_ROL: Record<Role, string> = { astronaut: "astronauta", cmo: "oficial", surgeon: "medico" }

export type Seccion = "check-in" | "trends" | "environment" | "alerts" | "reports" | "device" | "about"

// El astronauta ve lo suyo; el oficial médico, la tripulación (relojes y avisos escalados); el cirujano de
// vuelo, en Tierra, solo lo que le llega: informes y avisos rojos. Nadie más ve los registros privados.
export const SECCIONES: Record<Role, Seccion[]> = {
  astronaut: ["check-in", "trends", "environment", "alerts", "reports", "device", "about"],
  cmo: ["alerts", "environment", "device", "about"],
  surgeon: ["reports", "alerts", "environment", "about"],
}

export const permitida = (rol: Role, seccion: Seccion): boolean => SECCIONES[rol].includes(seccion)

export function rolDeRuta(path: string): Role | null {
  const tramo = path.split("/")[1]
  return (Object.keys(RUTA_DE_ROL) as Role[]).find((r) => RUTA_DE_ROL[r] === tramo) ?? null
}

export const rutaDe = (rol: Role, seccion?: Seccion): string => `/${RUTA_DE_ROL[rol]}${seccion ? `/${seccion}` : ""}`
