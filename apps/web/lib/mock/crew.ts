import type { MissionProfile } from "../types"

export const CURRENT_DAY = 24

export const PROFILES: MissionProfile[] = [
  { id: "station", label: "Estación", cabinPressureMmHg: 760, delayMinutes: 0, gravity: "Microgravedad" },
  { id: "transit", label: "Tránsito", cabinPressureMmHg: 760, delayMinutes: 12, gravity: "Microgravedad" },
  { id: "transit-docked", label: "Tránsito acoplado", cabinPressureMmHg: 527, delayMinutes: 0.03, gravity: "Microgravedad" },
  { id: "lunar", label: "Superficie lunar", cabinPressureMmHg: 424, delayMinutes: 0.02, gravity: "1/6 g" },
  { id: "mars", label: "Superficie de Marte", cabinPressureMmHg: 424, delayMinutes: 22, gravity: "3/8 g" },
]
