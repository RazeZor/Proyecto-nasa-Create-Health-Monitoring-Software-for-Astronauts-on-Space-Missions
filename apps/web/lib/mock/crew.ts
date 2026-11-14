import type { Baseline, DailyVitals, IndicatorId, MissionProfile } from "../types"

export const MISSION_DAYS = 30
export const CURRENT_DAY = 24
export const BASELINE_SWITCH_DAY = 18

export const PROFILES: MissionProfile[] = [
  { id: "station", label: "Estación", cabinPressureMmHg: 760, delayMinutes: 0, gravity: "Microgravedad" },
  { id: "transit", label: "Tránsito", cabinPressureMmHg: 527, delayMinutes: 12, gravity: "Microgravedad" },
  { id: "transit-docked", label: "Tránsito acoplado", cabinPressureMmHg: 760, delayMinutes: 12, gravity: "Microgravedad" },
  { id: "lunar", label: "Superficie lunar", cabinPressureMmHg: 424, delayMinutes: 0.02, gravity: "1/6 g" },
  { id: "mars", label: "Superficie de Marte", cabinPressureMmHg: 527, delayMinutes: 22, gravity: "3/8 g" },
]

function noise(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x) - 0.5
}

const round = (n: number, d = 0) => Math.round(n * 10 ** d) / 10 ** d

/** 30 simulated mission days. Story: HR drifts up and sleep shortens from day 19; day 9 SpO2 drop; day 12 headache. */
export const VITALS: DailyVitals[] = Array.from({ length: MISSION_DAYS }, (_, i) => {
  const day = i + 1
  const drift = day >= 19 ? (day - 18) * 1.6 : 0
  const sleepLoss = day >= 19 ? (day - 18) * 0.25 : 0
  const v: DailyVitals = {
    day,
    restingHr: round(day < BASELINE_SWITCH_DAY ? 58 + noise(day) * 3 : 60 + noise(day) * 2 + drift),
    systolic: round(114 + noise(day + 40) * 6 + (day < 4 ? 4 : 0)),
    diastolic: round(72 + noise(day + 80) * 4),
    spo2: day === 9 ? 89 : round(97.5 + noise(day + 120) * 1.4),
    tempC: round(36.7 + noise(day + 160) * 0.3, 1),
    sleepH: round(Math.max(4.8, 7.1 + noise(day + 200) * 0.6 - sleepLoss), 1),
    mood: Math.round(Math.max(4, 7.5 + noise(day + 240) * 1.5 - (day >= 21 ? 1.5 : 0))),
    symptoms: day === 12 ? ["headache"] : day === 2 ? ["nausea"] : day === 9 ? ["dizziness"] : [],
  }
  if (day % 7 === 0 || day === 1) {
    v.glucose = round(92 + noise(day + 280) * 8)
    v.massKg = round(74.2 - day * 0.04 + noise(day + 320) * 0.2, 1)
  }
  return v
})

const BANDS: Record<IndicatorId, { pre: [number, number]; inf: [number, number] }> = {
  restingHr: { pre: [54, 62], inf: [56, 64] },
  systolic: { pre: [106, 122], inf: [104, 120] },
  spo2: { pre: [96, 99], inf: [95.5, 99] },
  tempC: { pre: [36.4, 37.0], inf: [36.4, 37.1] },
  sleepH: { pre: [6.5, 7.8], inf: [6.2, 7.6] },
  mood: { pre: [6, 9], inf: [6, 9] },
  glucose: { pre: [80, 100], inf: [80, 104] },
  massKg: { pre: [73.6, 74.6], inf: [73.0, 74.4] },
}

export function getBaselines(id: IndicatorId): Baseline[] {
  const b = BANDS[id]
  return [
    { phase: "pre-flight", fromDay: 1, toDay: BASELINE_SWITCH_DAY, low: b.pre[0], high: b.pre[1] },
    { phase: "in-flight", fromDay: BASELINE_SWITCH_DAY, toDay: MISSION_DAYS, low: b.inf[0], high: b.inf[1] },
  ]
}
