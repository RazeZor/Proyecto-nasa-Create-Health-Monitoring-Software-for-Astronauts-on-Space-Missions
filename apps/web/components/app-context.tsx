"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { cargarCatalogo, type Catalogo } from "@/lib/catalogo"
import { type Analisis, analizar } from "@/lib/engine"
import { enviarOrdenReloj, INTERVALO_SONDEO_MS, leerReloj, type OrdenReloj, type RespuestaReloj, siguienteEstado } from "@/lib/reloj"
import { cargarRegistrosCombinados, sincronizarMotorConServidor, sincronizarRegistros, TRIPULANTE } from "@/lib/sincronizacion"
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
  /** lo que la API sabe del Galaxy Watch del tripulante (null sin sondeo o sin API) */
  reloj: RespuestaReloj | null
  ordenReloj: (tipo: OrdenReloj) => Promise<boolean>
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
  const [device, setDeviceRaw] = useState<DeviceState>("disconnected")
  const [reloj, setReloj] = useState<RespuestaReloj | null>(null)
  const conectandoDesde = useRef(0)
  const setDevice = useCallback((s: DeviceState) => {
    if (s === "connecting") conectandoDesde.current = Date.now()
    setDeviceRaw(s)
  }, [])
  const [simulator, setSimulator] = useState(false)
  const [liveHr, setLiveHr] = useState<number | null>(null)
  const [sex, setSex] = useState<Sex>("female")
  const [voice, setVoice] = useState(false)
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([])
  const recargarRegistros = useCallback(
    async () => setCheckIns(await cargarRegistrosCombinados(catalogo.historial.dia_actual)),
    [catalogo.historial.dia_actual],
  )
  const analisis = useMemo(() => analizar(checkIns, catalogo.historial), [checkIns, catalogo])

  const dias = catalogo.historial.dias_vuelo
  const setDay = useCallback((d: number) => setDayRaw(Math.min(dias, Math.max(1, d))), [dias])
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [])

  useEffect(() => {
    void sincronizarRegistros().then(() => recargarRegistros())
  }, [recargarRegistros])

  useEffect(() => {
    void sincronizarMotorConServidor(analisis)
  }, [analisis])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark")
  }, [theme])

  // Reloj real: mientras el usuario no lo desconecte, se sondea la API (que a su vez escucha a smart-monitor).
  const sondeando = device !== "disconnected" && TRIPULANTE !== null
  useEffect(() => {
    if (!sondeando || TRIPULANTE === null) {
      setReloj(null)
      return
    }
    const id_tripulante = TRIPULANTE
    let vivo = true
    const sondear = async () => {
      const r = await leerReloj(id_tripulante)
      if (!vivo) return
      setReloj(r)
      setDeviceRaw((d) => siguienteEstado(d, r, Date.now(), conectandoDesde.current))
    }
    void sondear()
    const id = window.setInterval(sondear, INTERVALO_SONDEO_MS)
    return () => {
      vivo = false
      window.clearInterval(id)
    }
  }, [sondeando])
  const ordenReloj = useCallback(
    (tipo: OrdenReloj) => (TRIPULANTE === null ? Promise.resolve(false) : enviarOrdenReloj(TRIPULANTE, tipo)),
    [],
  )

  // Simulador: solo cuando no hay reloj real transmitiendo.
  const simulando = simulator && device !== "connected"
  useEffect(() => {
    if (!simulando) {
      setLiveHr(null)
      return
    }
    setLiveHr(69)
    const id = window.setInterval(() => setLiveHr(66 + Math.round(Math.random() * 6)), 1500)
    return () => window.clearInterval(id)
  }, [simulando])
  const hrEnVivo = device === "connected" ? (reloj?.reloj?.fc_lpm ?? null) : liveHr

  const profile = catalogo.perfiles.find((p) => p.id === profileId) ?? catalogo.perfiles[1]

  const value = useMemo(
    () => ({ day, setDay, profile, setProfileId, role, setRole, theme, toggleTheme, device, setDevice, simulator, setSimulator, liveHr: hrEnVivo, reloj, ordenReloj, sex, setSex, voice, setVoice, checkIns, analisis, recargarRegistros, catalogo }),
    [day, setDay, profile, role, theme, toggleTheme, device, setDevice, simulator, hrEnVivo, reloj, ordenReloj, sex, voice, checkIns, analisis, recargarRegistros, catalogo],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp must be used inside AppProvider")
  return v
}
