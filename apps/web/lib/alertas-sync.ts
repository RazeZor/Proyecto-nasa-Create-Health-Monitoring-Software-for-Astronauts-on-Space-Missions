/** Núcleo puro del escalamiento de alertas rojas (§5.4): sin red ni almacenamiento, que se inyectan. */
import type { Alert } from "./types"

/** Lo único que sale del dispositivo en un escalamiento: indicador, valor, hora y tramo clínico. */
export interface AvisoRojo { indicador: string; valor: number; t_real: string; tramo: string }

export interface DependenciasAlertas {
  alertas: Alert[]
  /** clave de la alerta -> id del escalamiento ya creado (null: la API la guardó sin destinatario o sin consentimiento) */
  enviadas: Record<string, number | null>
  /** Devuelve el id del escalamiento (o null si no hubo), o `undefined` si la API no respondió. */
  enviar: (aviso: AvisoRojo) => Promise<number | null | undefined>
  marcar: (clave: string, escalamientoId: number | null) => Promise<void>
}

/** Un mismo día vuelto a registrar es otra medida: la clave incluye la hora del registro. */
export const claveAlerta = (a: Alert): string => `${a.id}@${a.createdAt ?? ""}`

/** Solo escala el rojo de la capa A sobre una medida que el tripulante registró (tiene hora y parámetro clínico). */
export const escalable = (a: Alert): a is Alert & { createdAt: string; clinical: NonNullable<Alert["clinical"]> } =>
  a.escalates && a.status === "act" && a.layer === "A" && !!a.createdAt && !!a.clinical

/** Envía en orden los rojos de capa A aún no enviados; se detiene en el primer fallo de red. Reenviar es seguro. */
export async function sincronizarAlertas({ alertas, enviadas, enviar, marcar }: DependenciasAlertas): Promise<number> {
  let nuevas = 0
  for (const a of alertas.filter(escalable).sort((x, y) => x.day - y.day)) {
    const clave = claveAlerta(a)
    if (clave in enviadas) continue
    const esc = await enviar({ indicador: a.clinical.indicador, valor: a.clinical.valor, t_real: a.createdAt, tramo: a.clinical.tramo })
    if (esc === undefined) break
    await marcar(clave, esc)
    nuevas++
  }
  return nuevas
}
