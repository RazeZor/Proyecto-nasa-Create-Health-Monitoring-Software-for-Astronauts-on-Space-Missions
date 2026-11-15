export type Status = "ok" | "watch" | "act"
export type Layer = "A" | "B" | "C" | "context"
export type Role = "astronaut" | "cmo" | "surgeon"
/** `real`: lo que el tripulante registra y el entorno medido. `demo`: escenario simulado con anomalías inyectadas. */
export type Mode = "real" | "demo"
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

/** Lecturas de un día; `null` es una medida que ese día no se tomó. */
export interface DailyVitals {
  day: number
  restingHr: number | null
  systolic: number | null
  diastolic: number | null
  spo2: number | null
  tempC: number | null
  sleepH: number | null
  mood: number | null
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
  /** Indicador del motor que la produjo (fc, pas, news2, sueno, co2, sintoma_cefalea…). */
  key?: string
  day: number
  time: string
  /** Hora del registro del tripulante que la produjo; null si viene solo del historial. */
  createdAt: string | null
  status: Status
  layer: Layer
  /** Zona del cuerpo; null en las alertas de entorno que no son un estado del cuerpo (tormenta). */
  zone: ZoneId | null
  indicator: string
  value: string
  clinicalBand: string
  cause: string
  action: string
  /** `crew`: dato ambiental compartido con toda la tripulación, sin datos personales (§5.4). */
  scope: "personal" | "crew"
  /** Calculada en modo adaptación: se muestra, no alerta ni cambia el estado. */
  informative: boolean
  /** Rojo de la capa A: sale solo hacia el oficial médico. */
  escalates: boolean
  /** Procedencia del dato ambiental (Real o Simulado, fuente y fecha real). */
  source?: string
  /** Dato mínimo del escalamiento: el parámetro clínico que más puntúa. */
  clinical?: { indicador: string; valor: number; tramo: string }
  /** Tres días seguidos en ámbar: se recomienda compartir (sin hacerlo por el astronauta). */
  recommendShare?: boolean
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

/** Banda personal de un día: centro ± umbral de la capa B con la referencia vigente. */
export interface BandPoint {
  day: number
  low: number
  high: number
  /** 0 = línea base de tierra; 1 = línea base en vuelo; entre medias, la transición (§5.2). */
  flightWeight: number
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
  mood: number | null
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
