export type Status = "ok" | "watch" | "act"
export type Layer = "A" | "B" | "C" | "context"
export type Role = "astronaut" | "cmo" | "surgeon"
export type ProfileId = "station" | "transit" | "transit-docked" | "lunar" | "mars"

export type Provenance =
  | { kind: "measured" }
  | { kind: "simulated" }
  | { kind: "scenario" }
  | { kind: "real"; source: string; date: string }

export interface MissionProfile {
  id: ProfileId
  label: string
  cabinPressureMmHg: 760 | 527 | 424
  delayMinutes: number
  gravity: string
}

export type ZoneId = "head" | "heart" | "bone" | "blood" | "mind"

export type Symptom = "headache" | "nausea" | "dizziness" | "visionChange" | "rash"

export interface DailyVitals {
  day: number
  restingHr: number
  systolic: number
  diastolic: number
  spo2: number
  tempC: number
  sleepH: number
  mood: number
  symptoms: Symptom[]
  glucose?: number
  massKg?: number
}

export interface ZoneResult {
  zone: ZoneId
  status: Status
  layer: Layer | null
  why: string
  deviation: string
  next: string
}

export interface Alert {
  id: string
  day: number
  time: string
  status: Status
  layer: Layer
  zone: ZoneId
  indicator: string
  value: string
  clinicalBand: string
  cause: string
  action: string
}

export type IndicatorId =
  | "restingHr"
  | "systolic"
  | "spo2"
  | "tempC"
  | "sleepH"
  | "mood"
  | "glucose"
  | "massKg"

export interface IndicatorInfo {
  id: IndicatorId
  label: string
  unit: string
  zone: ZoneId
  whatItIs: string
  howToMeasure: string
  whyNeeded: string
  hazard: string
  whenToNotify: string
  prevention: string
  sourceLabel: string
  sourceUrl: string
  safetyLow?: number
  safetyHigh?: number
}

export interface Baseline {
  phase: "pre-flight" | "in-flight"
  fromDay: number
  toDay: number
  low: number
  high: number
}

export interface CheckInEntry {
  id: string
  day: number
  createdAt: string
  durationSec: number
  restingHr: number | null
  hrFromWatch: boolean
  /** Instrumento de la FC en reposo: "manual", "simulador" o "galaxy_watch4:<dispositivo>" (A.6). Ausente = manual. */
  hrInstrument?: string
  systolic: number | null
  diastolic: number | null
  spo2: number | null
  spo2Site: string
  /** La SpO2 vino del reloj (muñeca, SDK de Samsung) y no de un oxímetro a mano. */
  spo2FromWatch?: boolean
  tempC: number | null
  tempMethod: string
  sleepH: number | null
  mood: number
  symptoms: Symptom[]
  glucose: number | null
  glucoseEnzyme: string
  massKg: number | null
  massMethod: string
  status: Status
}

export interface EnvDay {
  day: number
  doseMSv: number
  cumulativeMSv: number
  protonPfu: number
  co2Ppm: number
  cabinTempC: number
  humidityPct: number
}

export interface SolarEvent {
  id: string
  day: number
  peakPfu: number
  classLabel: string
  provenance: Provenance
  note: string
}

export type ReportState = "queued" | "sent" | "arrived"

export interface Report {
  id: string
  title: string
  createdAt: number
  delayMinutes: number
  summary: string
  reading: string
  baseline: string
  environment: string
  actionTaken: string
  /** id en la cola de la API; ausente si se encoló sin red o sin identidad */
  serverId?: number
}

export interface ThreadMessage {
  id: string
  from: "astronaut" | "surgeon"
  author: string
  day: number
  time: string
  body: string
}

export type DeviceState = "disconnected" | "connecting" | "connected" | "lost"
