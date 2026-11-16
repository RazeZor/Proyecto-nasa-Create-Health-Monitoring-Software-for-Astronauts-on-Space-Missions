import { actualizarPrivado, claveAmbito, leerPrivado } from "./almacen-local.ts"
import { API_BASE_URL } from "./api-registro.ts"
import { peticion } from "./sesion.ts"

export interface ArtefactoCientifico { id: string; t_real: string; tipo: "sueno_contexto" | "reaccion" | "evaluacion_motor"; protocolo: string; datos: Record<string, unknown> }
interface Archivo { registros: ArtefactoCientifico[]; confirmados: string[]; conflictos: string[] }
const VACIO: Archivo = { registros: [], confirmados: [], conflictos: [] }
export const leerEstudios = () => leerPrivado<Archivo>("estudios-v1", VACIO)
export const guardarEstudio = (r: ArtefactoCientifico) => actualizarPrivado<Archivo>("estudios-v1", VACIO, (a) => {
  if (a.registros.some((p) => p.id === r.id)) throw new Error("identificador de estudio reutilizado")
  return { ...a, registros: [...a.registros, r] }
})
export async function sincronizarEstudios(tripulante: number) {
  const ambitoInicial = claveAmbito()
  const archivo = await leerEstudios()
  for (const r of archivo.registros.filter((e) => !archivo.confirmados.includes(e.id) && !archivo.conflictos.includes(e.id))) {
    if (claveAmbito() !== ambitoInicial) throw new Error("cambio de ámbito durante sincronización")
    const res = await peticion(`${API_BASE_URL}/tripulantes/${tripulante}/estudios`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(r) })
    if (claveAmbito() !== ambitoInicial) throw new Error("cambio de ámbito durante sincronización")
    if (res.status === 409) await actualizarPrivado<Archivo>("estudios-v1", VACIO, (a) => ({ ...a, conflictos: [...new Set([...a.conflictos, r.id])] }))
    else if (res.ok && (await res.json() as { id?: unknown }).id === r.id) await actualizarPrivado<Archivo>("estudios-v1", VACIO, (a) => ({ ...a, confirmados: [...new Set([...a.confirmados, r.id])] }))
  }
}

export async function archivarEvaluacion(datos: Record<string, unknown>, identificador: () => string) {
  if (typeof datos.motor_sha256 !== "string") return // Solo el build con huella permite esta traza.
  const contenido = JSON.stringify(datos)
  await actualizarPrivado<Archivo>("estudios-v1", VACIO, (a) => a.registros.some((r) => r.tipo === "evaluacion_motor" && JSON.stringify(r.datos) === contenido)
    ? a : { ...a, registros: [...a.registros, { id: identificador(), t_real: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"), tipo: "evaluacion_motor", protocolo: "motor-ts-v1.2", datos }] })
}
