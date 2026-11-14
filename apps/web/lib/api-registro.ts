/**
 * Cliente de registro hacia apps/api (lecturas, síntomas y reportes). Traduce las claves de la interfaz
 * a las de la API con el contrato vocabulario.json (copia de packages/schemas; la guarda un test de Python).
 * Offline primero: nada aquí lanza por falta de red; devuelve false y el dato sigue en el almacén local.
 */
import vocabulario from "./vocabulario.json" with { type: "json" }
import type { CheckInEntry, IndicatorId, Layer, ProfileId, Status } from "./types"

export const API_BASE_URL = process.env.NEXT_PUBLIC_VIGIA_API_URL ?? "http://localhost:8000"

type Lectura = { indicador: string; valor: number; t_real: string; origen: "manual" | "sensor"; metodo: string | null }
type Sintoma = { codigo: string; gravedad: number; t_real: string }

const IDS: Record<string, string> = Object.fromEntries(
  vocabulario.indicadores.filter((i) => i.ui).map((i) => [i.ui as string, i.id]),
)
export const indicadorApi = (id: IndicatorId): string => IDS[id]
export const nivelApi = (s: Status): string => vocabulario.niveles[s]
export const capaApi = (c: Layer): string => vocabulario.capas[c]
export const perfilApi = (p: ProfileId): string => vocabulario.perfiles[p]
export const retardoMin = (p: ProfileId): number => vocabulario.retardo_min[p]

/** `t_real` canónico de la API: UTC sin milisegundos (YYYY-MM-DDTHH:MM:SSZ). */
export const tReal = (iso: string): string => new Date(iso).toISOString().replace(/\.\d{3}Z$/, "Z")

/** Una lectura por cada medida con valor; la diastólica no es un `IndicatorId` y va aparte. */
export function lecturasDeCheckIn(e: CheckInEntry): Lectura[] {
  const t = tReal(e.createdAt)
  const medidas: [string, number | null, string | null, "manual" | "sensor"][] = [
    [IDS.restingHr, e.restingHr, null, e.hrFromWatch ? "sensor" : "manual"],
    [IDS.systolic, e.systolic, null, "manual"],
    ["presion_arterial_diastolica", e.diastolic, null, "manual"],
    [IDS.spo2, e.spo2, e.spo2Site || null, "manual"],
    [IDS.tempC, e.tempC, e.tempMethod || null, "manual"],
    [IDS.sleepH, e.sleepH, null, "manual"],
    [IDS.mood, e.mood, null, "manual"],
    [IDS.glucose, e.glucose, e.glucoseEnzyme || null, "manual"],
    [IDS.massKg, e.massKg, e.massMethod || null, "manual"],
  ]
  return medidas.flatMap(([indicador, valor, metodo, origen]) =>
    valor === null ? [] : [{ indicador, valor, t_real: t, origen, metodo }],
  )
}

/** La interfaz no pide gravedad: se envía 1 (leve). */
export const sintomasDeCheckIn = (e: CheckInEntry): Sintoma[] =>
  e.symptoms.map((s) => ({ codigo: vocabulario.sintomas[s], gravedad: 1, t_real: tReal(e.createdAt) }))

async function enviar(ruta: string, tripulante: number, cuerpo: unknown): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}${ruta}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tripulante": String(tripulante) },
      body: JSON.stringify(cuerpo),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Envía el registro del día; true solo si todo llegó. Reenviarlo es seguro: la API ignora lecturas repetidas. */
export async function enviarCheckIn(e: CheckInEntry, tripulante: number): Promise<boolean> {
  const envios = [
    ...lecturasDeCheckIn(e).map((l) => enviar(`/tripulantes/${tripulante}/lecturas`, tripulante, l)),
    ...sintomasDeCheckIn(e).map((s) => enviar(`/tripulantes/${tripulante}/sintomas`, tripulante, s)),
  ]
  return (await Promise.all(envios)).every(Boolean)
}

export const encolarReporte = (perfil: ProfileId, creado: string, tripulante: number) =>
  enviar(`/tripulantes/${tripulante}/reportes`, tripulante, { creado_t_real: tReal(creado), retardo_min: retardoMin(perfil) })
