import { exportarPrivado, restaurarPrivado } from "./almacen-local.ts"
const huella = async (texto: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto))), (v) => v.toString(16).padStart(2, "0")).join("")
export async function crearRespaldo() {
  const datos = await exportarPrivado()
  return { datos, sha256: await huella(JSON.stringify(datos)) }
}
export async function restaurarRespaldo(texto: string) {
  if (texto.length > 20_000_000) throw new Error("respaldo demasiado grande")
  const sobre = JSON.parse(texto) as { datos: Parameters<typeof restaurarPrivado>[0]; sha256: string }
  if (!sobre.datos || typeof sobre.sha256 !== "string" || await huella(JSON.stringify(sobre.datos)) !== sobre.sha256) throw new Error("hash de respaldo incorrecto")
  await restaurarPrivado(sobre.datos)
}
