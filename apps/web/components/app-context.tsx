"use client"

import { usePathname } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { cargarCatalogo, type Catalogo, type Historial } from "@/lib/catalogo"
import { type Analisis, analizar } from "@/lib/engine"
import { enviarOrdenReloj, INTERVALO_SONDEO_MS, leerReloj, type OrdenReloj, type RespuestaReloj, siguienteEstado } from "@/lib/reloj"
import { rolDeRuta } from "@/lib/roles"
import { leerModo, store, usarModo } from "@/lib/storage"
import { sincronizarAlertasRojas, sincronizarRegistros, TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import type { CheckInEntry, DeviceState, MissionProfile, Mode, ProfileId, Role } from "@/lib/types"

interface AppState {
  day: number
  setDay: (d: number) => void
  profile: MissionProfile
  setProfileId: (id: ProfileId) => void
  role: Role
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
  /** `real`: lo que el tripulante registra y el entorno medido; `demo`: escenario simulado */
  mode: Mode
  setMode: (m: Mode) => void
  /** false si la API no responde: la app sigue con la copia local y encola lo pendiente */
  online: boolean
  /** registros reales guardados en el dispositivo que aún no llegaron a la API */
  pending: number
  /** escalamientos ya creados en la API: clave de la alerta -> id (null = guardada sin escalar) */
  escalations: Record<string, number | null>
}

export type Sex = "female" | "male"

const Ctx = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [catalogo, setCatalogo] = useState<Catalogo | null | "error">(null)
  const [mode, setModeRaw] = useState<Mode | null>(null) // null hasta leer la preferencia en el navegador
  const cargar = useCallback((m: Mode, silencioso = false) => {
    if (!silencioso) setCatalogo(null)
    usarModo(m)
    cargarCatalogo(TRIPULANTE ?? 1, m).then((c) => setCatalogo((previo) => c ?? (silencioso && previo ? previo : "error")))
  }, [])
  useEffect(() => {
    const m = leerModo()
    setModeRaw(m)
    cargar(m)
  }, [cargar])
  const setMode = useCallback((m: Mode) => {
    usarModo(m, true)
    setModeRaw(m)
    cargar(m)
  }, [cargar])
  // al volver el enlace se recarga el catálogo sin tapar la pantalla
  useEffect(() => {
    if (!mode) return
    const alVolver = () => cargar(mode, true)
    window.addEventListener("online", alVolver)
    return () => window.removeEventListener("online", alVolver)
  }, [mode, cargar])
  if (catalogo === null || mode === null) return <Estado mensaje="" />
  if (catalogo === "error") return <Estado mensaje={S.common.apiOffline} detalle={S.common.apiOfflineDetail} reintentar={() => cargar(mode)} />
  return <Sesion key={mode} catalogo={catalogo} mode={mode} setMode={setMode} recargar={() => cargar(mode, true)}>{children}</Sesion>
}

function Estado({ mensaje, detalle, reintentar }: { mensaje: string; detalle?: string; reintentar?: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center" role={reintentar ? "alert" : "status"} aria-busy={!reintentar}>
      {!reintentar && (
        <span className="flex items-center gap-3 font-semibold tracking-wide" aria-hidden>
          <span className="size-3 animate-pulse rounded-full bg-primary" />
          VIGÍA
        </span>
      )}
      <p className="text-lg font-semibold">{mensaje}</p>
      {detalle && <p className="max-w-md text-sm text-muted-foreground">{detalle}</p>}
      {reintentar && <p className="max-w-md text-xs text-muted-foreground">{S.app.disclaimer}</p>}
      {reintentar && (
        <button type="button" onClick={reintentar} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground">
          {S.common.retry}
        </button>
      )}
    </main>
  )
}

const CLAVE_RELOJ = "vigia:reloj"

function Sesion({ catalogo, mode, setMode, recargar, children }: { catalogo: Catalogo; mode: Mode; setMode: (m: Mode) => void; recargar: () => void; children: React.ReactNode }) {
  const [day, setDayRaw] = useState(catalogo.historial.dia_actual)
  const [profileId, setProfileId] = useState<ProfileId>("transit")
  // el rol sale de la ruta (/astronauta, /oficial, /medico); en el inicio, sin rol, rige el del astronauta
  const role: Role = rolDeRuta(usePathname() ?? "") ?? "astronaut"
  const [theme, setTheme] = useState<"dark" | "light">("light")
  const [device, setDeviceRaw] = useState<DeviceState>("disconnected")
  const [reloj, setReloj] = useState<RespuestaReloj | null>(null)
  const conectandoDesde = useRef(0)
  const setDevice = useCallback((s: DeviceState) => {
    if (s === "connecting") conectandoDesde.current = Date.now()
    // se recuerda si el usuario dejó el reloj conectado, para no pedir «Conectar» en cada apertura
    try {
      window.localStorage.setItem(CLAVE_RELOJ, s === "disconnected" ? "off" : "on")
    } catch {
      // sin almacenamiento (ventana privada): se pide conectar cada vez
    }
    setDeviceRaw(s)
  }, [])
  useEffect(() => {
    try {
      if (window.localStorage.getItem(CLAVE_RELOJ) === "on") setDevice("connecting")
    } catch {
      // ídem
    }
  }, [setDevice])
  const [simulator, setSimulator] = useState(false)
  const [liveHr, setLiveHr] = useState<number | null>(null)
  const [sex, setSex] = useState<Sex>("female")
  const [voice, setVoice] = useState(false)
  const [checkIns, setCheckIns] = useState<CheckInEntry[]>([])
  const [pending, setPending] = useState(0)
  const [escalations, setEscalations] = useState<Record<string, number | null>>({})
  const [navegadorEnLinea, setNavegadorEnLinea] = useState(true)
  const recargarRegistros = useCallback(async () => setCheckIns(await store.listCheckIns()), [])
  const profile = catalogo.perfiles.find((p) => p.id === profileId) ?? catalogo.perfiles[1]
  const analisis = useMemo(() => analizar(checkIns, catalogo.historial, profile.cabinPressureMmHg), [checkIns, catalogo, profile.cabinPressureMmHg])
  const online = navegadorEnLinea && !catalogo.sinEnlace

  // Cola local -> API: registros del día y rojos de capa A (§5.4). Sin enlace quedan pendientes y se reintenta.
  const sincronizarTodo = useCallback(async () => {
    await sincronizarRegistros()
    await sincronizarAlertasRojas(analisis.alerts(analisis.missionDays))
    const [todos, subidos] = await Promise.all([store.listCheckIns(), store.listSyncedCheckInIds()])
    setPending(mode === "real" ? todos.filter((c) => !subidos.includes(c.id)).length : 0)
    setEscalations(await store.listEscalations())
  }, [analisis, mode])
  useEffect(() => {
    void sincronizarTodo()
  }, [sincronizarTodo])
  useEffect(() => {
    setNavegadorEnLinea(navigator.onLine)
    const conectar = () => {
      setNavegadorEnLinea(true)
      void sincronizarTodo()
    }
    const cortar = () => setNavegadorEnLinea(false)
    window.addEventListener("online", conectar)
    window.addEventListener("offline", cortar)
    // sin evento del navegador (la API cayó pero hay red): reintenta cada 30 s mientras haya algo pendiente o no haya enlace
    const id = window.setInterval(() => {
      if (catalogo.sinEnlace) recargar()
      else if (pending > 0) void sincronizarTodo()
    }, 30000)
    return () => {
      window.removeEventListener("online", conectar)
      window.removeEventListener("offline", cortar)
      window.clearInterval(id)
    }
  }, [sincronizarTodo, catalogo.sinEnlace, pending, recargar])

  const dias = catalogo.historial.dias_vuelo
  const setDay = useCallback((d: number) => setDayRaw(Math.min(dias, Math.max(1, d))), [dias])
  const toggleTheme = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), [])

  useEffect(() => {
    void recargarRegistros()
  }, [recargarRegistros])

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

  // Simulador: solo en modo demo y cuando no hay reloj real transmitiendo. En modo real nunca se inventa un pulso
  // («nothing is simulated», readme): el interruptor de /device no tiene efecto ahí.
  const simulando = mode === "demo" && simulator && device !== "connected"
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

  const value = useMemo(
    () => ({ day, setDay, profile, setProfileId, role, theme, toggleTheme, device, setDevice, simulator, setSimulator, liveHr: hrEnVivo, reloj, ordenReloj, sex, setSex, voice, setVoice, checkIns, analisis, recargarRegistros, catalogo, mode, setMode, online, pending, escalations }),
    [mode, setMode, online, pending, escalations, day, setDay, profile, role, theme, toggleTheme, device, setDevice, simulator, hrEnVivo, reloj, ordenReloj, sex, voice, checkIns, analisis, recargarRegistros, catalogo],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/**
 * Muestra `children` con los datos de otro tripulante, en solo lectura: su historial analizado por el motor, sin los
 * registros locales ni el pulso del reloj del que mira. Lo usan el oficial médico y el cirujano de vuelo.
 */
export function VerComo({ historial, children }: { historial: Historial; children: React.ReactNode }) {
  const app = useApp()
  const analisis = useMemo(() => analizar([], historial, app.profile.cabinPressureMmHg), [historial, app.profile.cabinPressureMmHg])
  const valor = useMemo(
    () => ({ ...app, analisis, catalogo: { ...app.catalogo, historial }, checkIns: [], liveHr: null, reloj: null, pending: 0, escalations: {} }),
    [app, analisis, historial],
  )
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useApp must be used inside AppProvider")
  return v
}
