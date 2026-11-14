"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { cargarCatalogo, type Catalogo } from "@/lib/catalogo"
import { type Analisis, analizar } from "@/lib/engine"
import { store } from "@/lib/storage"
import { sincronizarRegistros, TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
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
  /** lo que da la API: perfiles, fichas, historial, recordatorios, mensajes y referencia de entorno */
  catalogo: Catalogo
}

export type Sex = "female" | "male"

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [catalogo, setCatalogo] = useState<Catalogo | null | "error">(null)
  const cargar = useCallback(() => {
    setCatalogo(null)
    cargarCatalogo(TRIPULANTE ?? 1).then((c) => setCatalogo(c ?? "error"))
  }, [])
  useEffect(cargar, [cargar])
  if (catalogo === null) return <Estado mensaje={S.common.loading} />
  if (catalogo === "error") return <Estado mensaje={S.common.apiOffline} detalle={S.common.apiOfflineDetail} reintentar={cargar} />
  return <Sesion catalogo={catalogo}>{children}</Sesion>
}

function Estado({ mensaje, detalle, reintentar }: { mensaje: string; detalle?: string; reintentar?: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center" role={reintentar ? "alert" : "status"}>
      <p className="text-lg font-semibold">{mensaje}</p>
      {detalle && <p className="max-w-md text-sm text-muted-foreground">{detalle}</p>}
      {reintentar && (
        <button type="button" onClick={reintentar} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">
          {S.common.retry}
        </button>
      )}
    </main>
  )
}

function Sesion({ catalogo, children }: { catalogo: Catalogo; children: React.ReactNode }) {
  const [day, setDayRaw] = useState(catalogo.historial.dia_actual)
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
  const analisis = useMemo(() => analizar(checkIns, catalogo.historial), [checkIns, catalogo])

  const dias = catalogo.historial.dias_vuelo
  const setDay = useCallback((d: number) => setDayRaw(Math.min(dias, Math.max(1, d))), [dias])
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

  const profile = catalogo.perfiles.find((p) => p.id === profileId) ?? catalogo.perfiles[1]

  const value = useMemo(
    () => ({ day, setDay, profile, setProfileId, role, setRole, theme, toggleTheme, device, setDevice, simulator, setSimulator, liveHr, sex, setSex, voice, setVoice, checkIns, analisis, recargarRegistros, catalogo }),
    [day, setDay, profile, role, theme, toggleTheme, device, simulator, liveHr, sex, voice, checkIns, analisis, recargarRegistros, catalogo],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp must be used inside AppProvider")
  return v
}
