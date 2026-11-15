import { notFound } from "next/navigation"
import { permitida, rolDeRuta, type Seccion } from "./roles.ts"

/** Las páginas de /[rol]/<sección>: 404 si ese rol no tiene esa pantalla (p. ej. /medico/check-in). */
export async function seccionDe(params: Promise<{ rol: string }>, seccion: Seccion): Promise<void> {
  const rol = rolDeRuta(`/${(await params).rol}`)
  if (!rol || !permitida(rol, seccion)) notFound()
}
