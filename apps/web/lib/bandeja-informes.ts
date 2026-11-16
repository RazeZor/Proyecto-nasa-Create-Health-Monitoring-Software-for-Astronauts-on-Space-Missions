/** Informes inmutables hasta el acuse de la API. Cada operación ocupa una clave propia y conserva su ámbito. */
import type { AcuseReporte } from "./api-registro.ts"
import type { ContenidoReporte } from "./cola.ts"
import type { Mode, ProfileId } from "./types.ts"
import { espacioSesion } from "./sesion.ts"

export interface InformePendiente {
  id: string
  creado: string
  perfil: ProfileId
  retardo: number
  contenido: ContenidoReporte
  error?: "conflicto"
}

type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">

export function crearBandeja(almacen: Almacen, tripulante: number, modo: Mode, mision: string) {
  const prefijo = `vigia:${espacioSesion()}informes:v1:${encodeURIComponent(mision)}:${tripulante}:${modo}:`
  return {
    tripulante,
    listar(): InformePendiente[] {
      const informes: InformePendiente[] = []
      for (let i = 0; i < almacen.length; i++) {
        const clave = almacen.key(i)
        if (clave?.startsWith(prefijo)) {
          // Una copia corrupta detiene el envío: nunca convertirla en una bandeja vacía.
          const informe = JSON.parse(almacen.getItem(clave)!) as InformePendiente
          if (!informe?.id || clave !== prefijo + informe.id || !informe.contenido) throw new Error("informe local inválido")
          informes.push(informe)
        }
      }
      return informes.sort((a, b) => a.creado.localeCompare(b.creado) || a.id.localeCompare(b.id))
    },
    guardar(informe: InformePendiente) {
      const clave = prefijo + informe.id
      const previo = almacen.getItem(clave)
      const contenido = JSON.stringify(informe)
      if (previo !== null && previo !== contenido) throw new Error("informe local con el mismo id y contenido diferente")
      almacen.setItem(clave, contenido) // si no hay espacio, informar del fallo; no prometer que quedó guardado
    },
    confirmar(id: string) { almacen.removeItem(prefijo + id) },
    conflicto(informe: InformePendiente) { almacen.setItem(prefijo + informe.id, JSON.stringify({ ...informe, error: "conflicto" })) },
  }
}

export type BandejaInformes = ReturnType<typeof crearBandeja>
const ejecuciones = new WeakMap<BandejaInformes, Promise<number>>()

/** Elimina solo con acuse válido. Perder el acuse conserva la operación y su id para el próximo intento. */
export function sincronizarBandeja(bandeja: BandejaInformes, enviar: (informe: InformePendiente) => Promise<AcuseReporte>): Promise<number> {
  const previa = ejecuciones.get(bandeja)
  if (previa) return previa
  const tarea = (async () => {
    let recibidos = 0
    for (const informe of bandeja.listar()) {
      if (informe.error === "conflicto") continue
      const acuse = await enviar(informe)
      if ("error" in acuse) {
        if (acuse.error === "conflicto") bandeja.conflicto(informe)
        break
      }
      bandeja.confirmar(informe.id)
      recibidos++
    }
    return recibidos
  })()
  ejecuciones.set(bandeja, tarea)
  // finally queda a cargo del consumidor, con rechazo manejado también en la limpieza.
  void tarea.then(() => ejecuciones.delete(bandeja), () => ejecuciones.delete(bandeja))
  return tarea
}

const bandejas = new Map<string, BandejaInformes>()
export function bandejaInformes(tripulante: number, modo: Mode, mision: string): BandejaInformes {
  const clave = JSON.stringify([tripulante, modo, mision])
  let bandeja = bandejas.get(clave)
  if (!bandeja) {
    bandeja = crearBandeja(window.localStorage, tripulante, modo, mision)
    bandejas.set(clave, bandeja)
  }
  return bandeja
}
