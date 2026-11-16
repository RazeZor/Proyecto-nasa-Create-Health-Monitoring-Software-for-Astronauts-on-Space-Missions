/** Validación de frontera para no interpretar almacenamiento corrupto como salud normal. */
import type { CheckInEntry } from "./types.ts"
export function validarRegistros(valor: unknown): CheckInEntry[] {
  if (!Array.isArray(valor) || valor.some((e) => !e || typeof e !== "object" || typeof e.id !== "string" || !e.id ||
      !Number.isSafeInteger(e.day) || typeof e.createdAt !== "string" || !Number.isFinite(Date.parse(e.createdAt)) ||
      !["ok", "watch", "act"].includes(e.status) || !Array.isArray(e.symptoms) || e.symptoms.some((s: unknown) => typeof s !== "string") ||
      ["restingHr", "systolic", "diastolic", "spo2", "tempC", "sleepH", "mood", "glucose", "massKg"].some((k) => e[k] !== null && (typeof e[k] !== "number" || !Number.isFinite(e[k]))))) throw new Error("registros locales dañados; conservar copia y recuperar")
  if (new Set(valor.map((e) => e.id)).size !== valor.length) throw new Error("registros locales duplicados")
  return valor as CheckInEntry[]
}
export function validarIds(valor: unknown): string[] {
  if (!Array.isArray(valor) || valor.some((id) => typeof id !== "string" || !id)) throw new Error("lista de identificadores dañada")
  return valor
}
export function validarClavePrivada(clave: string, valor: unknown) {
  if (clave === "checkins") validarRegistros(valor)
  else if (["shared", "acked", "synced"].includes(clave)) validarIds(valor)
  else if (clave === "escalations") {
    if (!valor || typeof valor !== "object" || Array.isArray(valor) || Object.values(valor).some((v) => v !== null && (!Number.isSafeInteger(v) || Number(v) <= 0))) throw new Error("acuse local dañado")
  } else if (clave === "seguimiento-v1") {
    const b = valor as { episodios?: unknown; operaciones?: unknown; confirmadas?: unknown; conflictos?: unknown }
    if (!b || !Array.isArray(b.episodios) || !Array.isArray(b.operaciones)) throw new Error("seguimiento dañado")
    validarIds(b.confirmadas); validarIds(b.conflictos)
    if (b.episodios.some((e) => !e || typeof e.id !== "string" || !["abierto", "en_seguimiento", "en_revision", "cerrado"].includes(e.estado) || !Number.isSafeInteger(e.version) || !Array.isArray(e.eventos))) throw new Error("episodio dañado")
  } else if (clave === "estudios-v1") {
    const a = valor as { registros?: unknown; confirmados?: unknown; conflictos?: unknown }
    if (!a || !Array.isArray(a.registros) || a.registros.some((r) => !r || typeof r.id !== "string" || typeof r.tipo !== "string" || !r.datos)) throw new Error("archivo de estudios dañado")
    validarIds(a.confirmados); validarIds(a.conflictos)
  } else throw new Error("clave de respaldo desconocida")
}
