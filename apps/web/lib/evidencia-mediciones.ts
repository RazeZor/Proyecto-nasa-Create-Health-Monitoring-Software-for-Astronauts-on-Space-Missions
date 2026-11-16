/** Trazabilidad por toma y política técnica explícita, pendiente de revisión profesional. */
import { evaluarEvidencia } from "../../../packages/engine/evidencia.ts"
import type { Lectura } from "../../../packages/engine/engine.ts"
import type { Historial } from "./catalogo.ts"
import type { CheckInEntry, IndicatorId } from "./types.ts"
import configuracion from "../../../packages/schemas/configuracion-cientifica.json" with { type: "json" }

export const CONFIGURACION_EVIDENCIA = configuracion.version
export const CAMPOS_MEDICION = {
  restingHr: "fc_reposo_lpm", systolic: "pas_mmHg", spo2: "spo2_pct", tempC: "temp_central_c",
  sleepH: "sueno_h", mood: "animo_1_10", glucose: "glucosa_mg_dl", massKg: "masa_kg",
} as const
const PERSONAL: Record<string, string> = { fc_reposo_lpm: "fc", pas_mmHg: "pas", sueno_h: "sueno", animo_1_10: "animo", glucosa_mg_dl: "glucosa" }
const API_ID: Record<string, string> = { restingHr: "frecuencia_cardiaca_reposo", systolic: "presion_arterial_sistolica", spo2: "spo2", tempC: "temperatura_central", sleepH: "sueno", mood: "estado_animo", glucose: "glucosa", massKg: "masa_corporal" }

export function evidenciasDelDia(registros: CheckInEntry[], historial: Historial, dia: number, ahora: string) {
  const medidas = new Map<string, { id: string; t_real: string | null; valor: number; comparable: boolean }>()
  const fila = historial.lecturas.find((l) => l.dia_mision === dia)
  for (const [campo, medida] of Object.entries(fila?.mediciones ?? {})) medidas.set(campo, medida)
  for (const e of registros.filter((r) => r.day === dia)) for (const [ui, campo] of Object.entries(CAMPOS_MEDICION)) {
    const valor = e[ui as IndicatorId]
    if (typeof valor !== "number") continue
    const hora = e.tiemposMedicion?.[ui as IndicatorId]
    medidas.set(campo, { id: `${e.id}:${API_ID[ui]}`, valor, t_real: hora ? new Date(hora).toISOString().replace(/\.\d{3}Z$/, "Z") : null,
      comparable: ui === "restingHr" ? !e.hrFromWatch : ui === "spo2" ? !e.spo2FromWatch : true })
  }
  return [...medidas].map(([campo, m]) => ({ campo, ...m, ...evaluarEvidencia({ ...m, uso: "operativo" }, {
    ahora, antiguedad_max_s: configuracion.antiguedad_max_s, desfase_futuro_max_s: configuracion.desfase_futuro_max_s, modo: "real",
  }) }))
}

export function aplicarPoliticaTemporal(lectura: Lectura, registros: CheckInEntry[], historial: Historial): Lectura {
  if (historial.modo !== "real") return lectura
  // Para una evaluación histórica, edad respecto al cierre de ese día; no respecto a hoy.
  const e = registros.findLast((r) => r.day === lectura.dia_mision)
  const f = historial.lecturas.find((r) => r.dia_mision === lectura.dia_mision)
  const fecha = e?.createdAt ?? f?.t_real
  if (!fecha) return { ...lectura, ventana_clinica_valida: false, excluir_personal: Object.values(PERSONAL) }
  const ahora = new Date(fecha).toISOString().replace(/\.\d{3}Z$/, "Z")
  const medidas = evidenciasDelDia(registros, historial, lectura.dia_mision, ahora)
  const clinicos = medidas.filter((m) => ["fc_reposo_lpm", "pas_mmHg", "spo2_pct", "temp_central_c"].includes(m.campo))
  const tiempos = clinicos.flatMap((m) => m.t_real ? [Date.parse(m.t_real)] : [])
  const validos = new Set(medidas.filter((m) => m.estado === "utilizable").map((m) => m.campo))
  const tomas = [...(f?.observaciones ?? [])]
  const ids: Record<string, string> = { restingHr: "frecuencia_cardiaca_reposo", systolic: "presion_arterial_sistolica", spo2: "spo2", tempC: "temperatura_central" }
  for (const r of registros.filter((r) => r.day === lectura.dia_mision)) for (const [ui, indicador] of Object.entries(ids)) {
    const valor = r[ui as IndicatorId]
    const hora = r.tiemposMedicion?.[ui as IndicatorId]
    if (typeof valor === "number" && !tomas.some((t) => t.id === `${r.id}:${indicador}`)) tomas.push({ id: `${r.id}:${indicador}`, indicador, valor,
      t_real: hora ? new Date(hora).toISOString().replace(/\.\d{3}Z$/, "Z") : null, comparable: ui === "restingHr" ? !r.hrFromWatch : ui === "spo2" ? !r.spo2FromWatch : true, uso: "operativo" })
  }
  return { ...lectura, ventana_clinica_valida: tiempos.length > 0 && tiempos.length === clinicos.length && Math.max(...tiempos) - Math.min(...tiempos) <= configuracion.ventana_simultaneidad_s * 1000,
    fuentes_por_campo: Object.fromEntries(medidas.map((m) => [m.campo, m.id])),
    tomas_clinicas: tomas.map((t) => ({ id: t.id, t_real: t.t_real, indicador: t.indicador, valor: t.valor,
      confirmacion: evaluarEvidencia({ ...t, comparable: Boolean(t.comparable) }, { ahora, antiguedad_max_s: configuracion.antiguedad_max_s, desfase_futuro_max_s: configuracion.desfase_futuro_max_s, modo: "real" }).estado !== "utilizable" })),
    excluir_personal: Object.entries(PERSONAL).filter(([campo]) => !validos.has(campo)).map(([, indicador]) => indicador) }
}
