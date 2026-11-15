import type { EntornoHistorial, PosicionViaje } from "./catalogo.ts"

const KM_POR_UA = 149_597_871

export interface LecturaTrayecto {
  dia: number
  distanciaSolUa: number
  distanciaTierraUa: number
  distanciaTierraMKm: number
  retardoMin: number
  dosisAcumuladaMsv: number | null
}

/** Lo que dice el viaje en un día de misión; null si ese día no trae posición (el modo real no la tiene). */
export function lecturaDeTrayecto(entorno: EntornoHistorial[], dia: number): LecturaTrayecto | null {
  const e = entorno.find((x) => x.dia_mision === dia)
  const p = e?.posicion
  if (!e || !p) return null
  return {
    dia, distanciaSolUa: p.dist_sol_ua, distanciaTierraUa: p.dist_tierra_ua,
    distanciaTierraMKm: (p.dist_tierra_ua * KM_POR_UA) / 1e6, retardoMin: p.retardo_min,
    dosisAcumuladaMsv: e.dosis_acumulada_msv ?? null,
  }
}

/** La trayectoria completa, en orden de día, para dibujarla. */
export const posicionesDelViaje = (entorno: EntornoHistorial[]): PosicionViaje[] =>
  entorno.flatMap((e) => (e.posicion ? [e.posicion] : [])).sort((a, b) => a.dia - b.dia)

/** Retardo medio de comunicación con la Tierra a lo largo de todo el tránsito (min); null sin posiciones. */
export function retardoMedioMin(entorno: EntornoHistorial[]): number | null {
  const ps = posicionesDelViaje(entorno)
  return ps.length ? ps.reduce((s, p) => s + p.retardo_min, 0) / ps.length : null
}
