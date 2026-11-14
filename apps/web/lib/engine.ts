/**
 * Analysis engine facade. Signatures are final; bodies return scripted mock results
 * matching the demo scenario. Replace with real statistics later.
 */
import { ALERTS } from "./mock/alerts"
import { VITALS } from "./mock/crew"
import { isStormDay } from "./mock/environment"
import type { Alert, CheckInEntry, DailyVitals, Status, ZoneId, ZoneResult } from "./types"

export const ADAPTATION_END_DAY = 14
export const isAdaptation = (day: number) => day <= ADAPTATION_END_DAY
export const isStorm = (day: number) => isStormDay(day)

const rank: Record<Status, number> = { ok: 0, watch: 1, act: 2 }
export const worst = (list: Status[]): Status =>
  list.reduce<Status>((a, b) => (rank[b] > rank[a] ? b : a), "ok")

export function getVitals(day: number): DailyVitals[] {
  return VITALS.filter((v) => v.day <= day)
}

export function getAlerts(day: number): Alert[] {
  return ALERTS.filter((a) => a.day <= day && (!isAdaptation(a.day) || a.layer === "A" || a.layer === "context"))
    .sort((a, b) => b.day - a.day || b.time.localeCompare(a.time))
}

const OK = (zone: ZoneId, next: string): ZoneResult => ({
  zone, status: "ok", layer: null, why: "Todas las lecturas dentro de tu banda de línea base y límites de seguridad.",
  deviation: "Dentro de la banda", next,
})

export function evaluateZones(day: number): ZoneResult[] {
  const today = ALERTS.filter((a) => a.day === day || (a.day === day - 1 && a.layer !== "A"))
  const active = today.filter((a) => !isAdaptation(a.day) || a.layer === "A" || a.layer === "context")
  const zones: ZoneId[] = ["head", "heart", "bone", "blood", "mind"]
  const defaults: Record<ZoneId, string> = {
    head: "Reporta cualquier cambio de visión o dolor de cabeza en tu registro.",
    heart: "Mantén tu protocolo de ejercicio y objetivo de hidratación.",
    bone: "Completa la sesión de ejercicio de resistencia de hoy.",
    blood: "Mantén la higiene de manos; registra la temperatura cada mañana.",
    mind: "Protege tu ventana de sueño; programa tiempo con la tripulación.",
  }
  return zones.map((zone) => {
    const hit = active.filter((a) => a.zone === zone).sort((a, b) => rank[b.status] - rank[a.status])[0]
    if (!hit) return OK(zone, defaults[zone])
    const deviation =
      hit.layer === "C" ? "+10 lpm en 6 días (banda en vuelo 56-64)" :
      hit.layer === "B" ? "-0.6 h bajo el límite inferior de la banda (6.2 h)" :
      hit.layer === "A" ? hit.clinicalBand : hit.value
    return { zone, status: hit.status, layer: hit.layer, why: hit.cause, deviation, next: hit.action }
  })
}

export function overallStatus(day: number): Status {
  return worst(evaluateZones(day).map((z) => z.status))
}

/** Mock: applies only safety limits (layer A) to a fresh entry. */
export function evaluateCheckIn(e: Omit<CheckInEntry, "status" | "id" | "createdAt">): Status {
  const act =
    (e.spo2 !== null && e.spo2 < 92) ||
    (e.restingHr !== null && (e.restingHr > 100 || e.restingHr < 40)) ||
    (e.systolic !== null && (e.systolic > 160 || e.systolic < 85)) ||
    (e.tempC !== null && (e.tempC >= 38 || e.tempC < 35.5)) ||
    e.symptoms.includes("visionChange")
  if (act) return "act"
  const watch =
    (e.restingHr !== null && e.restingHr > 64) ||
    (e.sleepH !== null && e.sleepH < 6.2) ||
    e.mood <= 4 ||
    e.symptoms.length > 0
  return watch ? "watch" : "ok"
}
