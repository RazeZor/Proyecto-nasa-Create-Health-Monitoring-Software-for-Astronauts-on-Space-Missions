"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { type Analisis, analizar, MISSION_DAYS } from "@/lib/engine"
import { CURRENT_DAY, PROFILES } from "@/lib/mock/crew"
import { store } from "@/lib/storage"
import { sincronizarRegistros } from "@/lib/sincronizacion"
import type { CheckInEntry, DeviceState, MissionProfile, ProfileId, Role } from "@/lib/types"

interface AppState {
  day: number
  setDay: (d: number) => void
  profile: MissionProfile
  setProfileId: (id: ProfileId) => void
  role: Role
  setRole: (r: Role) => void
  theme: "dark" | "light"
  toggleTheme: () => void
  device: DeviceState
  setDevice: (s: DeviceState) => void
  simulator: boolean
  setSimulator: (b: boolean) => void
  liveHr: number | null
  sex: Sex
  setSex: (s: Sex) => void
  voice: boolean
  setVoice: (b: boolean) => void
  /** registros del usuario y el análisis del motor sobre ellos */
  checkIns: CheckInEntry[]
  analisis: Analisis
  recargarRegistros: () => Promise<void>
}

export type Sex = "female" | "male"

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [day, setDayRaw] = useState(CURRENT_DAY)
  const [profileId, setProfileId] = useState<ProfileId>("transit")
  const [role, setRole] = useState<Role>("astronaut")
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [device, setDevice] = useState<DeviceState>("disconnected")
  const [simulator, setSimulator] = useState(false)
  const [liveHr, setLiveHr] = useState<number | null>(null)
  const [sex, setSex] = useState<Sex>("female")
  const [voice, setVoice] = useState(false)
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([])
  const recargarRegistros = useCallback(async () => setCheckIns(await store.listCheckIns()), [])
  const analisis = useMemo(() => analizar(checkIns), [checkIns])

  const setDay = useCallback((d: number) => setDayRaw(Math.min(MISSION_DAYS, Math.max(1, d))), [])
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [])

  useEffect(() => {
    void sincronizarRegistros() // reintenta lo que quedó pendiente sin red
    void recargarRegistros()
  }, [recargarRegistros])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  const streaming = device === "connected" || simulator
  useEffect(() => {
    if (!streaming) {
      setLiveHr(null)
      return
    }
    setLiveHr(69)
    const id = window.setInterval(() => setLiveHr(66 + Math.round(Math.random() * 6)), 1500)
    return () => window.clearInterval(id)
  }, [streaming])

  const profile = PROFILES.find((p) => p.id === profileId) ?? PROFILES[1]

  const value = useMemo(
    () => ({ day, setDay, profile, setProfileId, role, setRole, theme, toggleTheme, device, setDevice, simulator, setSimulator, liveHr, sex, setSex, voice, setVoice, checkIns, analisis, recargarRegistros }),
    [day, setDay, profile, role, theme, toggleTheme, device, simulator, liveHr, sex, voice, checkIns, analisis, recargarRegistros],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp must be used inside AppProvider")
  return v
}
