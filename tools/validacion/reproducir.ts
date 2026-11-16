/** Reproduce una traza de producto únicamente cuando coincide el código del motor. */
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { isDeepStrictEqual } from "node:util"
import { analizarTripulante, type Tripulante, type EntornoDia, type OpcionesMotor } from "../../packages/engine/engine.ts"

export function reproducirTraza(traza: { motor_sha256: string; entrada: { tripulante: Tripulante; entorno: Record<number, EntornoDia>; opciones: OpcionesMotor }; salida: unknown }, codigo: Uint8Array) {
  if (createHash("sha256").update(codigo).digest("hex") !== traza.motor_sha256) throw new Error("no coincide la versión del motor; recuperar el código archivado")
  const salida = analizarTripulante(traza.entrada.tripulante, traza.entrada.entorno, traza.entrada.opciones)
  if (!isDeepStrictEqual(salida, traza.salida)) throw new Error("el resultado no se reproduce")
  return { reproducida: true, revision_independiente: false, validacion_clinica: false }
}

if (process.argv[1]?.endsWith("reproducir.ts") && process.argv[2]) {
  const artefacto = JSON.parse(readFileSync(process.argv[2], "utf8"))
  const traza = artefacto.datos ?? artefacto
  const codigo = readFileSync(new URL("../../packages/engine/engine.ts", import.meta.url))
  process.stdout.write(JSON.stringify(reproducirTraza(traza, codigo)) + "\n")
}
