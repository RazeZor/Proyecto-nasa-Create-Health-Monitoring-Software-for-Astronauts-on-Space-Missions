"use client"

/**
 * Registro diario como flujo guiado: una medida por paso, con el valor enorme y controles de un dedo (sin teclado).
 * Cada dial arranca en el último valor conocido (o en el que da el reloj) para que baste con ajustarlo, pero ese
 * punto de partida NO es una medida: solo se guarda lo que se confirma o se toca. Lo demás va como `null`.
 */
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ChevronDown, ChevronRight } from "lucide-react"
import { useApp } from "@/components/app-context"
import { Dial, Opciones } from "@/components/checkin/controles"
import { ICONO_SINTOMA, IconoCrono, IconoHecho, IconoMolestias, IconoPendiente, IconoSinMedir } from "@/components/checkin/iconos"
import { ICONO_INDICADOR, IconoAcerca, IconoDispositivo, IconoRegistro } from "@/components/shared/iconos"
import { ErrorState } from "@/components/shared/states"
import { ProvenanceTag, StatusBadge, STATUS_ICON, statusSurface, statusText } from "@/components/shared/status"
import { evaluateCheckIn } from "@/lib/engine"
import { comoMedirEnPerfil } from "@/lib/catalogo"
import { fcReposoSugerida, spo2Sugerida, suenoSugerido, ultimoCambioInstrumento } from "@/lib/reloj"
import { rutaDe } from "@/lib/roles"
import { S, textoSistema } from "@/lib/strings"
import { store } from "@/lib/storage"
import type { CheckInEntry, IndicatorId, Status, Symptom } from "@/lib/types"
import { cn, nuevoId } from "@/lib/utils"

/** Sitio de la SpO2 del reloj; se compara con la línea base del mismo sitio (§2.4). */
const WRIST = "Muñeca"
const META_S = 90

type MedidaId = IndicatorId | "symptoms"
/** Orden del flujo: lo diario primero, lo semanal al final. */
const MEDIDAS: MedidaId[] = ["restingHr", "systolic", "spo2", "tempC", "sleepH", "mood", "symptoms", "glucose", "massKg"]
const SEMANALES: MedidaId[] = ["glucose", "massKg"]
/** Las molestias siempre se guardan (una lista vacía es un dato). El ánimo, como el resto, solo si se confirma:
 * el 7 de partida nunca se guarda solo (en modo real nada se inventa). */
const SIN_OMITIR: MedidaId[] = ["symptoms"]
const REVISION = MEDIDAS.length
type Estado = "pendiente" | "medido" | "omitido"

type Campo = "hr" | "sys" | "dia" | "spo2" | "temp" | "sleep" | "glucose" | "mass"
type Vital = "restingHr" | "systolic" | "diastolic" | "spo2" | "tempC" | "sleepH" | "glucose" | "massKg"
/** Límites de cada dial (los mismos que tenía el formulario) y valor de partida si aún no hay historial. */
const CAMPOS: Record<Campo, { vital: Vital; medida: MedidaId; min: number; max: number; paso: number; fino?: number; dec: number; base: number }> = {
  hr: { vital: "restingHr", medida: "restingHr", min: 30, max: 200, paso: 1, dec: 0, base: 60 },
  sys: { vital: "systolic", medida: "systolic", min: 60, max: 220, paso: 1, dec: 0, base: 115 },
  dia: { vital: "diastolic", medida: "systolic", min: 30, max: 140, paso: 1, dec: 0, base: 72 },
  spo2: { vital: "spo2", medida: "spo2", min: 70, max: 100, paso: 1, dec: 0, base: 97 },
  temp: { vital: "tempC", medida: "tempC", min: 33, max: 42, paso: 0.1, dec: 1, base: 36.7 },
  sleep: { vital: "sleepH", medida: "sleepH", min: 0, max: 16, paso: 0.5, fino: 0.1, dec: 1, base: 7 },
  glucose: { vital: "glucose", medida: "glucose", min: 30, max: 400, paso: 1, dec: 0, base: 92 },
  mass: { vital: "massKg", medida: "massKg", min: 30, max: 150, paso: 0.1, dec: 1, base: 74 },
}
const LISTA_CAMPOS = Object.keys(CAMPOS) as Campo[]
const SIN_EDITAR: Record<Campo, number | null> = { hr: null, sys: null, dia: null, spo2: null, temp: null, sleep: null, glucose: null, mass: null }
const TODO_PENDIENTE = Object.fromEntries(MEDIDAS.map((m) => [m, "pendiente"])) as Record<MedidaId, Estado>

const botonSecundario =
  "inline-flex min-h-16 items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 text-lg font-semibold shadow-sm transition-transform active:scale-[0.98]"
const botonPrincipal =
  "inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-primary px-8 text-xl font-semibold text-primary-foreground shadow-md transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60"

/** Cronómetro de los 90 s: informa sin apurar (pasa a ámbar al superar la meta, nada más). */
function Crono({ segundos }: { segundos: number }) {
  const pasado = segundos > META_S
  const largo = 2 * Math.PI * 20
  return (
    <div
      role="timer"
      aria-label={`${S.checkin.elapsed} ${segundos} ${S.checkin.seconds} ${S.checkin.target}`}
      className={cn("flex items-center gap-3 rounded-2xl border px-4 py-2", pasado ? "border-status-watch/50 text-status-watch" : "border-border")}
    >
      <span className="relative flex size-12 items-center justify-center">
        <svg viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90" aria-hidden>
          <circle cx="24" cy="24" r="20" fill="none" strokeWidth={5} className="stroke-muted" />
          <circle
            cx="24" cy="24" r="20" fill="none" strokeWidth={5} strokeLinecap="round"
            className={cn("transition-[stroke-dashoffset] duration-300", pasado ? "stroke-status-watch" : "stroke-primary")}
            strokeDasharray={largo}
            strokeDashoffset={largo * (1 - Math.min(1, segundos / META_S))}
          />
        </svg>
        <IconoCrono className="size-6" />
      </span>
      <span>
        <span className="eyebrow block !text-current opacity-70">{S.checkin.elapsed}</span>
        <span className="flex items-baseline gap-1.5">
          <span className="font-mono text-3xl font-semibold leading-none tabular-nums">{segundos}</span>
          <span className="text-base font-semibold">s</span>
          <span className="text-sm text-muted-foreground">{S.checkin.target}</span>
        </span>
      </span>
    </div>
  )
}

function Reloj({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary/10 px-3 text-sm font-semibold text-primary">
      <IconoDispositivo className="size-5" /> {children}
    </span>
  )
}

function Aviso({ children, urgente }: { children: React.ReactNode; urgente?: boolean }) {
  return (
    <p role={urgente ? "alert" : "status"} className="w-full max-w-3xl rounded-2xl border border-status-watch/40 bg-status-watch/10 px-4 py-3 text-base">
      {children}
    </p>
  )
}

export function CheckInScreen() {
  const [key, setKey] = useState(0)
  return <CheckInForm key={key} onReset={() => setKey((k) => k + 1)} />
}

function CheckInForm({ onReset }: { onReset: () => void }) {
  const app = useApp()
  const { liveHr, device, simulator, reloj, checkIns, recargarRegistros, catalogo, mode, profile, analisis } = app
  // modo real: el registro es de hoy (el día de misión que da la API), no del día que se esté consultando
  const day = mode === "real" ? catalogo.historial.dia_actual : app.day
  // A.6: con el reloj real se precarga la FC en reposo del día (chequeo, sueño o día despierto), nunca el pulso
  // instantáneo; el simulador sigue dando su valor de demostración.
  const fcReloj = device === "connected" ? fcReposoSugerida(reloj) : null
  const hrSugerida = fcReloj ? fcReloj.valor : device !== "connected" && simulator && liveHr !== null ? liveHr : null
  const watchOn = hrSugerida !== null
  const suenoReloj = device === "connected" ? suenoSugerido(reloj) : null
  const cambioInstrumento = device === "connected" ? ultimoCambioInstrumento(reloj) : null
  const spo2Reloj = device === "connected" ? spo2Sugerida(reloj, Date.now()) : null

  const [paso, setPaso] = useState(0)
  const [estado, setEstado] = useState<Record<MedidaId, Estado>>(TODO_PENDIENTE)
  const [horas, setHoras] = useState<Partial<Record<MedidaId, string | null>>>({})
  const [tiemposManuales, setTiemposManuales] = useState<Partial<Record<MedidaId, string>>>({})
  /** Lo que el tripulante ajustó o confirmó a mano; null = sigue en el valor de partida o en el del reloj. */
  const [edit, setEdit] = useState<Record<Campo, number | null>>(SIN_EDITAR)
  /** FC del reloj congelada al confirmarla (el simulador cambia cada segundo y medio), con su instrumento. */
  const [hrFijo, setHrFijo] = useState<{ valor: number; instrumento: string } | null>(null)
  const [spo2Site, setSpo2Site] = useState("Dedo")
  const [tempMethod, setTempMethod] = useState("Oral")
  const [enzyme, setEnzyme] = useState("GDH")
  const [massMethod, setMassMethod] = useState("Inercial")
  const [mood, setMood] = useState(7)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [infoAbierta, setInfoAbierta] = useState(false)
  const [start] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<{ status: Status; sec: number; registradas: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) return
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [start, result])

  /** Último valor conocido de cada campo (del historial hasta hoy): punto de partida del dial y referencia visible. */
  const ultimos = useMemo(() => {
    const serie = analisis.vitals(day).filter((v) => v.day <= day)
    const r = {} as Record<Campo, { valor: number; dia: number } | null>
    for (const c of LISTA_CAMPOS) {
      const fila = serie.findLast((v) => typeof v[CAMPOS[c].vital] === "number")
      r[c] = fila ? { valor: fila[CAMPOS[c].vital] as number, dia: fila.day } : null
    }
    return r
  }, [analisis, day])

  const acotar = (c: Campo, v: number) => Number(Math.min(CAMPOS[c].max, Math.max(CAMPOS[c].min, v)).toFixed(CAMPOS[c].dec))
  const partida = (c: Campo) => acotar(c, ultimos[c]?.valor ?? CAMPOS[c].base)
  const fmt = (c: Campo, v: number) => v.toFixed(CAMPOS[c].dec)
  const unidad = (id: IndicatorId) => catalogo.indicadores[id].unit

  // ── procedencia de la FC y la SpO2: reloj mientras no se toquen ───────────────────────────────────────────
  const hrDelReloj = estado.restingHr !== "omitido" && edit.hr === null && (hrFijo !== null || watchOn)
  const spo2FromWatch = estado.spo2 !== "omitido" && edit.spo2 === null && spo2Reloj !== null
  const instrumentoHr = edit.hr !== null ? "manual" : hrFijo ? hrFijo.instrumento : fcReloj ? `galaxy_watch4:${reloj?.reloj?.dispositivos[0] ?? "?"}` : watchOn ? "simulador" : "manual"
  const instrumentoPrevio = checkIns.filter((c) => c.day >= 1 && c.day < day && c.restingHr != null).sort((a, b) => a.day - b.day).at(-1)?.hrInstrument ?? "manual"

  /** Lo que muestra cada dial ahora mismo. */
  const ver: Record<Campo, number> = {
    hr: edit.hr ?? hrFijo?.valor ?? hrSugerida ?? partida("hr"),
    sys: edit.sys ?? partida("sys"),
    dia: edit.dia ?? partida("dia"),
    spo2: edit.spo2 ?? spo2Reloj ?? partida("spo2"),
    temp: edit.temp ?? partida("temp"),
    sleep: edit.sleep ?? (suenoReloj !== null ? acotar("sleep", suenoReloj) : partida("sleep")),
    glucose: edit.glucose ?? partida("glucose"),
    mass: edit.mass ?? partida("mass"),
  }
  /** Lo que se guardaría ahora mismo: null si no se midió (nunca 0 ni el valor de partida sin confirmar). */
  const medido = (m: MedidaId) => estado[m] === "medido"
  const guardar: Record<Campo, number | null> = {
    hr: estado.restingHr === "omitido" ? null : hrDelReloj || medido("restingHr") ? ver.hr : null,
    sys: medido("systolic") ? ver.sys : null,
    dia: medido("systolic") ? ver.dia : null,
    spo2: estado.spo2 === "omitido" ? null : spo2FromWatch || medido("spo2") ? ver.spo2 : null,
    temp: medido("tempC") ? ver.temp : null,
    sleep: medido("sleepH") ? ver.sleep : null,
    glucose: medido("glucose") ? ver.glucose : null,
    mass: medido("massKg") ? ver.mass : null,
  }
  const cambiaInstrumento = guardar.hr !== null && instrumentoHr !== instrumentoPrevio

  const texto = (c: Campo) => (guardar[c] === null ? null : fmt(c, guardar[c]))
  /** Valor ya registrado de cada medida, como texto corto para el índice y la revisión. */
  const registrado: Record<MedidaId, string | null> = {
    restingHr: texto("hr"),
    systolic: guardar.sys === null ? null : `${texto("sys")}/${texto("dia")}`,
    spo2: texto("spo2"),
    tempC: texto("temp"),
    sleepH: texto("sleep"),
    mood: medido("mood") ? String(mood) : null,
    symptoms: symptoms.length ? String(symptoms.length) : medido("symptoms") ? S.checkin.symptomsNone : null,
    glucose: texto("glucose"),
    massKg: texto("mass"),
  }
  const resuelta = (m: MedidaId) => estado[m] !== "pendiente" || (m === "restingHr" && hrDelReloj) || (m === "spo2" && spo2FromWatch)
  /** Lo que se guardará con valor (ánimo y molestias van siempre) y, para la cabecera, lo ya resuelto con valor. */
  const registradas = MEDIDAS.filter((m) => m === "symptoms" || registrado[m] !== null).length
  const hechas = MEDIDAS.filter((m) => resuelta(m) && registrado[m] !== null).length

  const nombre: Record<MedidaId, string> = {
    restingHr: S.checkin.hr, systolic: S.checkin.bp, spo2: S.checkin.spo2, tempC: S.checkin.temp, sleepH: S.checkin.sleep,
    mood: S.checkin.mood, symptoms: S.checkin.symptoms, glucose: S.checkin.glucose, massKg: S.checkin.mass,
  }
  const corto = (m: MedidaId) => (m === "symptoms" ? S.checkin.symptoms : S.body.short[m])
  const icono = (m: MedidaId) => (m === "symptoms" ? IconoMolestias : ICONO_INDICADOR[m])
  const unidadDe = (m: MedidaId) => (m === "symptoms" || m === "mood" ? "" : unidad(m))

  // ── acciones ──────────────────────────────────────────────────────────────────────────────────────────────
  const marcar = (m: MedidaId, e: Estado) => {
    setEstado((cur) => ({ ...cur, [m]: e }))
    if (e === "medido") setHoras((cur) => ({ ...cur, [m]: tiemposManuales[m] === "desconocida" ? null
      : tiemposManuales[m] ? new Date(tiemposManuales[m]!).toISOString() : new Date().toISOString() }))
  }
  /** Tocar un dial ya es registrar: el valor deja de ser «de partida». */
  const ajustar = (c: Campo, v: number) => {
    setEdit((cur) => ({ ...cur, [c]: v }))
    marcar(CAMPOS[c].medida, "medido")
  }
  const ir = (i: number) => {
    setInfoAbierta(false)
    setPaso(Math.min(REVISION, Math.max(0, i)))
  }
  const confirmar = (m: MedidaId) => {
    if (m === "restingHr" && edit.hr === null && watchOn) setHrFijo({ valor: ver.hr, instrumento: instrumentoHr })
    else if (m === "spo2" && spo2FromWatch) { /* sigue siendo la del reloj */ }
    else setEdit((cur) => {
      const sig = { ...cur }
      for (const c of LISTA_CAMPOS) if (CAMPOS[c].medida === m && !(c === "hr" && hrFijo)) sig[c] = ver[c]
      return sig
    })
    marcar(m, "medido")
    ir(paso + 1)
  }
  const omitir = (m: MedidaId) => {
    marcar(m, "omitido")
    ir(paso + 1)
  }
  /** Deshace el ajuste manual y vuelve a lo que midió el reloj. */
  const volverAlReloj = (c: "hr" | "spo2") => {
    setEdit((cur) => ({ ...cur, [c]: null }))
    if (c === "hr") setHrFijo(null)
    marcar(CAMPOS[c].medida, "pendiente")
  }

  async function guardarRegistro() {
    const sec = Math.floor((Date.now() - start) / 1000)
    const base = {
      day, durationSec: sec,
      tiemposMedicion: {
        ...horas, diastolic: horas.systolic ?? null,
        restingHr: hrDelReloj ? reloj?.reloj?.resumen?.fc_reposo_dia?.t ?? null : horas.restingHr ?? null,
        spo2: spo2FromWatch ? reloj?.reloj?.resumen?.spo2?.t ?? null : horas.spo2 ?? null,
      },
      restingHr: guardar.hr, hrFromWatch: hrDelReloj,
      hrInstrument: instrumentoHr,
      systolic: guardar.sys, diastolic: guardar.dia,
      spo2: guardar.spo2, spo2Site: spo2FromWatch ? WRIST : spo2Site, spo2FromWatch,
      tempC: guardar.temp, tempMethod,
      sleepH: guardar.sleep, mood: medido("mood") ? mood : null, symptoms,
      glucose: guardar.glucose, glucoseEnzyme: enzyme,
      massKg: guardar.mass, massMethod,
    }
    const status = evaluateCheckIn(base, checkIns, catalogo.historial, profile.cabinPressureMmHg)
    const entry: CheckInEntry = { ...base, status, id: nuevoId(), createdAt: new Date().toISOString() }
    setSaving(true)
    setError(false)
    try {
      await store.saveCheckIn(entry)
      if (mode === "real") app.setDay(day)
      void recargarRegistros() // el motor recalcula cuerpo, tendencias y alertas; el contexto sube lo pendiente a la API
      setResult({ status, sec, registradas })
      requestAnimationFrame(() => resultRef.current?.focus())
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  const procedencia = <ProvenanceTag provenance={{ kind: mode === "real" ? "measured" : "simulated" }} />

  // ── cierre: estado resultante y siguiente paso ────────────────────────────────────────────────────────────
  if (result) {
    const Icono = STATUS_ICON[result.status]
    // el siguiente paso lo dicta el motor para la zona que explica el estado; solo se muestra si coincide con el registro
    const zona = result.status !== "ok" && analisis.overall(day) === result.status ? analisis.zones(day).find((z) => z.status === result.status && z.layer) : undefined
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-20rem)] max-w-3xl items-center">
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className={cn("panel-detalle flex w-full flex-col items-center gap-5 rounded-3xl border p-6 text-center shadow-sm outline-none md:p-10", statusSurface[result.status])}
        >
          <span className={cn("flex size-24 items-center justify-center rounded-full bg-card shadow-sm", statusText[result.status])}>
            <Icono aria-hidden className="size-14" />
          </span>
          <p className="eyebrow">{S.checkin.result} · {S.common.day} {day}</p>
          <h1 className={cn("text-4xl font-bold leading-tight md:text-5xl", statusText[result.status])}>{S.body.headline[result.status]}</h1>
          <StatusBadge status={result.status} size="lg" />
          <p className="max-w-xl text-xl text-pretty">{S.statusLong[result.status]}</p>
          {zona && (
            <div className="w-full rounded-2xl border border-border bg-card p-5 text-left text-foreground">
              <h2 className="eyebrow">{S.checkin.whatNow} · {S.zones[zona.zone]}</h2>
              <p className="mt-1 text-xl font-semibold leading-snug">{zona.next}</p>
            </div>
          )}
          <p className="text-base text-muted-foreground">
            {S.checkin.reviewCount(result.registradas, MEDIDAS.length)} · {S.checkin.completedIn} <span className="font-mono font-semibold text-foreground">{result.sec}</span> s
          </p>
          <div className="flex w-full flex-wrap gap-3">
            <Link href={rutaDe("astronaut")} className={cn(botonPrincipal, "flex-1 basis-64")}>
              {S.checkin.toBody} <ArrowRight aria-hidden className="size-6" />
            </Link>
            <button type="button" onClick={onReset} className={cn(botonSecundario, "flex-1 basis-48")}>
              {S.checkin.another}
            </button>
          </div>
          {procedencia}
        </div>
      </div>
    )
  }

  const actual: MedidaId | null = paso < REVISION ? MEDIDAS[paso] : null
  const avisosInstrumento = (
    <>
      {cambiaInstrumento && !cambioInstrumento && <Aviso>{S.device.instrumentChange(`${instrumentoPrevio} → ${instrumentoHr}`)}</Aviso>}
      {cambioInstrumento && <Aviso urgente>{S.device.instrumentChange(cambioInstrumento.detalle ?? "")}</Aviso>}
    </>
  )

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-4">
      {/* Dónde estoy: título, progreso y cronómetro, siempre a la vista */}
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-border bg-card px-4 py-3 shadow-sm md:px-6">
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-4">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconoRegistro className="size-9" />
          </span>
          <div className="min-w-0">
            <h1 className="text-3xl font-bold leading-tight">{S.checkin.title}</h1>
            <p className="text-base text-muted-foreground">
              {S.checkin.subtitle}
              {mode === "real" && <> {S.checkin.dayReal(day)}</>}
            </p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 basis-72 flex-col gap-2">
          <p className="flex items-baseline justify-between gap-3 text-base font-semibold">
            <span>{actual ? S.checkin.stepOf(paso + 1, MEDIDAS.length) : S.checkin.review}</span>
            <span className="text-sm font-normal text-muted-foreground">{S.checkin.reviewCount(actual ? hechas : registradas, MEDIDAS.length)}</span>
          </p>
          <div
            role="progressbar" aria-label={S.checkin.progress} aria-valuemin={0} aria-valuemax={MEDIDAS.length}
            aria-valuenow={MEDIDAS.filter(resuelta).length} className="flex gap-1.5"
          >
            {MEDIDAS.map((m, i) => (
              <span
                key={m}
                className={cn(
                  "h-3 flex-1 rounded-full transition-colors duration-300",
                  registrado[m] !== null && resuelta(m) ? "bg-primary" : estado[m] === "omitido" ? "bg-muted-foreground/40" : "bg-muted",
                  i === paso && "ring-2 ring-primary/50 ring-offset-2 ring-offset-card",
                )}
              />
            ))}
          </div>
        </div>
        <Crono segundos={elapsed} />
      </header>

      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        {/* Índice de medidas: lo que llevo, lo que falta y un toque para volver a cualquiera */}
        <nav aria-label={S.checkin.steps} className="order-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:order-none lg:flex lg:flex-col">
          {MEDIDAS.map((m, i) => {
            const Icono = icono(m)
            const valor = registrado[m]
            const hecha = resuelta(m) && valor !== null
            const Marca = hecha ? IconoHecho : estado[m] === "omitido" ? IconoSinMedir : IconoPendiente
            return (
              <button
                key={m}
                type="button"
                onClick={() => ir(i)}
                aria-current={paso === i ? "step" : undefined}
                className={cn(
                  "flex min-h-14 flex-1 items-center gap-3 rounded-2xl border bg-card px-3 text-left shadow-sm transition-all active:scale-[0.98]",
                  paso === i ? "border-primary ring-2 ring-primary/40" : "border-border",
                )}
              >
                <Icono className={cn("size-7 shrink-0", paso === i ? "text-primary" : "text-muted-foreground")} />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold leading-tight">{corto(m)}</span>
                  {SEMANALES.includes(m) && <span className="block text-xs text-muted-foreground">{S.checkin.weekly}</span>}
                </span>
                <span className={cn("shrink-0 text-right", hecha ? "font-mono text-lg font-semibold tabular-nums" : "text-sm text-muted-foreground")}>
                  {hecha ? valor : estado[m] === "omitido" ? S.checkin.skipped : <span className="sr-only">{S.checkin.pending}</span>}
                </span>
                <Marca className={cn("size-6 shrink-0", hecha ? "text-primary" : "text-muted-foreground/70")} />
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => ir(REVISION)}
            aria-current={paso === REVISION ? "step" : undefined}
            className={cn(
              "col-span-full flex min-h-14 items-center gap-3 rounded-2xl border bg-card px-3 text-left text-base font-semibold shadow-sm transition-all active:scale-[0.98] lg:mt-1.5",
              paso === REVISION ? "border-primary ring-2 ring-primary/40" : "border-border",
            )}
          >
            <IconoRegistro className={cn("size-7 shrink-0", paso === REVISION ? "text-primary" : "text-muted-foreground")} />
            <span className="flex-1">{S.checkin.review}</span>
            <ChevronRight aria-hidden className="size-5 text-muted-foreground" />
          </button>
        </nav>

        {actual ? tarjetaMedida(actual) : tarjetaRevision()}
      </div>
    </div>
  )

  // Tarjetas como funciones (no componentes): comparten el estado del flujo sin pasarlo campo a campo.

  function dial(c: Campo, etiqueta: string, u: string, grande = true) {
    const m = CAMPOS[c].medida
    const auto = (c === "hr" && hrDelReloj) || (c === "spo2" && spo2FromWatch)
    return (
      <Dial
        etiqueta={etiqueta} unidad={u} valor={ver[c]} alCambiar={(v) => ajustar(c, v)}
        min={CAMPOS[c].min} max={CAMPOS[c].max} paso={CAMPOS[c].paso} pasoFino={CAMPOS[c].fino} decimales={CAMPOS[c].dec}
        atenuado={!medido(m) && !auto} grande={grande}
      />
    )
  }

  /** De dónde sale el valor inicial del dial: tu última medida (con su día) o un valor de partida sin más. */
  function pista(valor: string | null, dia: number | undefined) {
    return <p className="max-w-2xl text-center text-base text-pretty text-muted-foreground">{valor !== null && dia !== undefined ? S.checkin.startLast(valor, dia) : S.checkin.startDefault}</p>
  }
  function pistaDe(c: Campo, u: string) {
    return pista(ultimos[c] ? `${fmt(c, acotar(c, ultimos[c].valor))} ${u}` : null, ultimos[c]?.dia)
  }

  function contenido(m: MedidaId) {
    switch (m) {
      case "restingHr":
        return (
          <>
            <div className="w-full max-w-xl">{dial("hr", S.checkin.hr, unidad("restingHr"))}</div>
            {hrDelReloj ? <p className="max-w-2xl text-center text-base text-pretty text-muted-foreground">{S.checkin.watchAuto}</p> : pistaDe("hr", unidad("restingHr"))}
            {watchOn && !hrDelReloj && (
              <button type="button" onClick={() => volverAlReloj("hr")} className={cn(botonSecundario, "min-h-14 text-base")}>
                <IconoDispositivo className="size-6" /> {S.checkin.watchBack}
              </button>
            )}
            {avisosInstrumento}
          </>
        )
      case "systolic":
        return (
          <>
            <div className="grid w-full max-w-5xl gap-x-10 gap-y-6 md:grid-cols-2">
              {(["sys", "dia"] as const).map((c) => (
                <div key={c} className="flex flex-col items-center gap-2">
                  <h3 className="text-xl font-semibold">{c === "sys" ? S.checkin.systolic : S.checkin.diastolic}</h3>
                  {dial(c, c === "sys" ? S.checkin.systolic : S.checkin.diastolic, unidad("systolic"), false)}
                </div>
              ))}
            </div>
            {pista(ultimos.sys && ultimos.dia ? `${fmt("sys", ultimos.sys.valor)}/${fmt("dia", ultimos.dia.valor)} ${unidad("systolic")}` : null, ultimos.sys?.dia)}
          </>
        )
      case "spo2":
        return (
          <>
            <div className="w-full max-w-xl">{dial("spo2", S.checkin.spo2, unidad("spo2"))}</div>
            <Opciones
              etiqueta={S.checkin.site} valor={spo2FromWatch ? WRIST : spo2Site} alCambiar={setSpo2Site} bloqueado={spo2FromWatch}
              opciones={[{ valor: "Dedo", texto: S.checkin.optFinger }, { valor: "Frente", texto: S.checkin.optForehead }, { valor: "Oreja", texto: S.checkin.optEar }, { valor: WRIST, texto: S.checkin.wrist }]}
            />
            {spo2FromWatch ? <p className="max-w-2xl text-center text-base text-pretty text-muted-foreground">{S.checkin.spo2WatchNote} {S.checkin.watchAuto}</p> : pistaDe("spo2", unidad("spo2"))}
            {spo2Reloj !== null && !spo2FromWatch && (
              <button type="button" onClick={() => volverAlReloj("spo2")} className={cn(botonSecundario, "min-h-14 text-base")}>
                <IconoDispositivo className="size-6" /> {S.checkin.watchBack}
              </button>
            )}
          </>
        )
      case "tempC":
        return (
          <>
            <div className="w-full max-w-xl">{dial("temp", S.checkin.temp, unidad("tempC"))}</div>
            <Opciones
              etiqueta={S.checkin.method} valor={tempMethod} alCambiar={setTempMethod}
              opciones={[{ valor: "Oral", texto: S.checkin.optOral }, { valor: "Temporal", texto: S.checkin.optTemporal }, { valor: "Timpánica", texto: S.checkin.optTympanic }]}
            />
            {pistaDe("temp", unidad("tempC"))}
          </>
        )
      case "sleepH":
        return (
          <>
            <div className="w-full max-w-xl">{dial("sleep", S.checkin.sleep, unidad("sleepH"))}</div>
            {suenoReloj !== null ? (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Reloj>{S.checkin.sleepFromWatch(suenoReloj)}</Reloj>
                {ver.sleep !== acotar("sleep", suenoReloj) && (
                  <button type="button" onClick={() => setEdit((cur) => ({ ...cur, sleep: null }))} className={cn(botonSecundario, "min-h-14 text-base")}>
                    {S.checkin.useValue}
                  </button>
                )}
              </div>
            ) : pistaDe("sleep", unidad("sleepH"))}
          </>
        )
      case "mood":
        return (
          <>
            <p className="font-mono text-8xl font-semibold leading-none tabular-nums" aria-hidden>{mood}</p>
            <div role="radiogroup" aria-label={S.checkin.mood} className="grid w-full max-w-4xl grid-cols-5 gap-2 md:grid-cols-10">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={mood === n}
                  onClick={() => {
                    setMood(n)
                    marcar("mood", "medido")
                  }}
                  className={cn(
                    "min-h-20 rounded-2xl border font-mono text-3xl font-semibold tabular-nums transition-all active:scale-[0.96]",
                    mood === n ? "border-primary bg-primary text-primary-foreground shadow-md" : n < mood ? "border-primary/30 bg-primary/10" : "border-border bg-card",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="flex w-full max-w-4xl justify-between text-lg text-muted-foreground">
              <span>1 · {S.checkin.moodLow}</span>
              <span>10 · {S.checkin.moodHigh}</span>
            </p>
          </>
        )
      case "symptoms":
        return (
          <>
            <p className="max-w-2xl text-center text-lg text-pretty text-muted-foreground">{S.checkin.symptomsHint}</p>
            <div className="grid w-full max-w-4xl grid-cols-2 gap-3 md:grid-cols-3">
              {(Object.keys(S.symptoms) as Symptom[]).map((s) => {
                const on = symptoms.includes(s)
                const Icono = ICONO_SINTOMA[s]
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setSymptoms((cur) => (on ? cur.filter((x) => x !== s) : [...cur, s]))
                      marcar("symptoms", "medido")
                    }}
                    className={cn(
                      "flex min-h-24 items-center gap-4 rounded-2xl border px-5 text-left text-xl font-semibold leading-tight shadow-sm transition-all active:scale-[0.98]",
                      on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
                    )}
                  >
                    <Icono className="size-11 shrink-0" /> {S.symptoms[s]}
                  </button>
                )
              })}
              <button
                type="button"
                aria-pressed={symptoms.length === 0 && medido("symptoms")}
                onClick={() => {
                  setSymptoms([])
                  marcar("symptoms", "medido")
                }}
                className={cn(
                  "flex min-h-24 items-center gap-4 rounded-2xl border px-5 text-left text-xl font-semibold leading-tight shadow-sm transition-all active:scale-[0.98]",
                  symptoms.length === 0 && medido("symptoms") ? "border-primary ring-2 ring-primary/40" : "border-dashed border-border bg-card",
                )}
              >
                <IconoHecho className="size-11 shrink-0" /> {S.checkin.noSymptoms}
              </button>
            </div>
          </>
        )
      case "glucose":
        return (
          <>
            <div className="w-full max-w-xl">{dial("glucose", S.checkin.glucose, unidad("glucose"))}</div>
            <Opciones etiqueta={S.checkin.enzyme} valor={enzyme} alCambiar={setEnzyme} opciones={[{ valor: "GDH", texto: "GDH" }, { valor: "GOx", texto: "GOx" }]} />
            {pistaDe("glucose", unidad("glucose"))}
          </>
        )
      case "massKg":
        return (
          <>
            <div className="w-full max-w-xl">{dial("mass", S.checkin.mass, unidad("massKg"))}</div>
            <Opciones
              etiqueta={S.checkin.method} valor={massMethod} alCambiar={setMassMethod}
              opciones={[{ valor: "Inercial", texto: S.checkin.optInertial }, { valor: "Gravimétrica", texto: S.checkin.optGravimetric }]}
            />
            {pistaDe("mass", unidad("massKg"))}
          </>
        )
    }
  }

  function textoConfirmar(m: MedidaId) {
    if (m === "symptoms") return S.checkin.next
    if (m === "mood") return S.checkin.confirm(mood)
    if (m === "systolic") return S.checkin.confirm(`${fmt("sys", ver.sys)}/${fmt("dia", ver.dia)} ${unidad("systolic")}`)
    const c = LISTA_CAMPOS.find((x) => CAMPOS[x].medida === m)!
    return S.checkin.confirm(`${fmt(c, ver[c])} ${unidad(m)}`)
  }

  function tarjetaMedida(m: MedidaId) {
    const Icono = icono(m)
    const info = m === "symptoms" ? null : catalogo.indicadores[m]
    return (
      <section key={m} aria-labelledby="paso-h" className="panel-detalle flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:min-h-[clamp(34rem,calc(100dvh-21.5rem),50rem)]">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-4 md:px-8">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icono className="size-10" />
          </span>
          <div className="min-w-0 flex-1 basis-64">
            <p className="eyebrow">{S.checkin.stepOf(paso + 1, MEDIDAS.length)} · {SEMANALES.includes(m) ? S.checkin.weeklyHint : S.checkin.daily}</p>
            <h2 id="paso-h" className="text-3xl font-bold leading-tight">{nombre[m]}</h2>
          </div>
          {m === "restingHr" && hrDelReloj && <Reloj>{fcReloj && !hrFijo ? S.checkin.fromWatchSource[fcReloj.fuente] ?? S.checkin.fromWatch : S.checkin.fromWatch}</Reloj>}
          {m === "spo2" && spo2FromWatch && <Reloj>{S.checkin.fromWatch}</Reloj>}
          {info && (
            <button
              type="button"
              onClick={() => setInfoAbierta((v) => !v)}
              aria-expanded={infoAbierta}
              aria-controls="paso-info"
              aria-label={`${S.checkin.info} ${nombre[m]}`}
              className={cn(botonSecundario, "min-h-14 px-5 text-base 2xl:hidden", infoAbierta && "border-primary ring-2 ring-primary/40")}
            >
              <IconoAcerca className="size-6" /> {S.checkin.howToShort}
              <ChevronDown aria-hidden className={cn("size-5 transition-transform", infoAbierta && "rotate-180")} />
            </button>
          )}
        </header>
        {m !== "symptoms" && !(m === "restingHr" && hrDelReloj) && !(m === "spo2" && spo2FromWatch) && <details className="border-b px-5 py-2">
          <summary className="cursor-pointer py-2">{textoSistema("evidencia.hora_toma")}</summary>
          <p className="py-2">{textoSistema("evidencia.hora_detalle")}</p>
          <label className="grid max-w-md gap-2">{textoSistema("evidencia.hora_toma")}<input type="datetime-local" value={tiemposManuales[m] === "desconocida" ? "" : tiemposManuales[m] ?? ""} className="min-h-12 rounded-xl border p-3" onChange={(e) => {
            const valor = e.target.value; setTiemposManuales((cur) => ({ ...cur, [m]: valor }))
            if (valor && Number.isFinite(Date.parse(valor))) setHoras((cur) => ({ ...cur, [m]: new Date(valor).toISOString() }))
          }} /></label>
          <button type="button" aria-pressed={tiemposManuales[m] === "desconocida"} className="my-2 min-h-12 rounded-xl border px-4" onClick={() => { setTiemposManuales((cur) => ({ ...cur, [m]: "desconocida" })); setHoras((cur) => ({ ...cur, [m]: null })) }}>{textoSistema("evidencia.hora_desconocida")}</button>
        </details>}

        <div className={cn("grid flex-1", info && "2xl:grid-cols-[minmax(0,1fr)_24rem]")}>
          {info && (
            // a un toque en pantallas medianas; siempre a la vista cuando hay sitio (2xl)
            <aside id="paso-info" className={cn("border-b border-border bg-muted/40 px-5 py-4 md:px-8 2xl:order-2 2xl:block 2xl:border-b-0 2xl:border-l 2xl:py-6", !infoAbierta && "hidden")}>
              <h3 className="eyebrow">{S.checkin.howTo} · {profile.label}</h3>
              <p className="mt-1.5 text-lg leading-relaxed text-pretty">{comoMedirEnPerfil(catalogo, m as IndicatorId, profile.id)}</p>
              <h3 className="eyebrow mt-4">{S.checkin.whyMatters}</h3>
              <p className="mt-1.5 text-base leading-relaxed text-pretty text-muted-foreground">{info.whyNeeded}</p>
            </aside>
          )}
          <div className="flex flex-col items-center justify-center gap-5 px-5 py-6 md:px-8">{contenido(m)}</div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-background/50 px-5 py-4 md:px-8">
          <button type="button" onClick={() => ir(paso - 1)} disabled={paso === 0} className={cn(botonSecundario, "disabled:invisible")}>
            <ArrowLeft aria-hidden className="size-6" /> {S.checkin.back}
          </button>
          {!SIN_OMITIR.includes(m) && (
            <button type="button" onClick={() => omitir(m)} className={cn(botonSecundario, estado[m] === "omitido" && "border-primary ring-2 ring-primary/40")}>
              <IconoSinMedir className="size-7" /> {S.checkin.skip}
            </button>
          )}
          <button type="button" onClick={() => confirmar(m)} className={cn(botonPrincipal, "ml-auto min-w-0 flex-1 basis-72 lg:max-w-xl")}>
            <span className="truncate">{textoConfirmar(m)}</span> <ArrowRight aria-hidden className="size-6 shrink-0" />
          </button>
        </footer>
      </section>
    )
  }

  function tarjetaRevision() {
    const detalle: Partial<Record<MedidaId, string>> = {
      restingHr: guardar.hr === null ? undefined : hrDelReloj ? S.checkin.fromWatch : undefined,
      spo2: guardar.spo2 === null ? undefined : spo2FromWatch ? S.checkin.wrist : { Dedo: S.checkin.optFinger, Frente: S.checkin.optForehead, Oreja: S.checkin.optEar, [WRIST]: S.checkin.wrist }[spo2Site],
      tempC: guardar.temp === null ? undefined : { Oral: S.checkin.optOral, Temporal: S.checkin.optTemporal, Timpánica: S.checkin.optTympanic }[tempMethod],
      glucose: guardar.glucose === null ? undefined : enzyme,
      massKg: guardar.mass === null ? undefined : { Inercial: S.checkin.optInertial, Gravimétrica: S.checkin.optGravimetric }[massMethod],
      symptoms: symptoms.map((s) => S.symptoms[s]).join(" · ") || undefined,
    }
    return (
      <section key="revision" aria-labelledby="paso-h" className="panel-detalle flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-sm lg:min-h-[clamp(34rem,calc(100dvh-21.5rem),50rem)]">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-4 md:px-8">
          <span className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <IconoRegistro className="size-10" />
          </span>
          <div className="min-w-0 flex-1 basis-64">
            <p className="eyebrow">{S.checkin.reviewCount(registradas, MEDIDAS.length)}</p>
            <h2 id="paso-h" className="text-3xl font-bold leading-tight">{S.checkin.review}</h2>
          </div>
          {procedencia}
        </header>

        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-5 md:px-8">
          <div className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {MEDIDAS.map((m, i) => {
              const Icono = icono(m)
              const valor = m === "symptoms" ? (symptoms.length ? String(symptoms.length) : S.checkin.symptomsNone) : registrado[m]
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => ir(i)}
                  className="flex min-h-24 items-center gap-3 rounded-2xl border border-border bg-background/60 px-4 py-2 text-left transition-all active:scale-[0.98]"
                >
                  <Icono className="size-9 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-muted-foreground">{corto(m)}</span>
                    {valor !== null ? (
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-mono text-3xl font-semibold leading-tight tabular-nums">{valor}</span>
                        <span className="text-sm text-muted-foreground">{unidadDe(m)}</span>
                      </span>
                    ) : (
                      <span className="block text-xl font-semibold leading-tight text-muted-foreground">{S.checkin.skipped}</span>
                    )}
                    {detalle[m] && <span className="block truncate text-sm text-muted-foreground">{detalle[m]}</span>}
                  </span>
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                </button>
              )
            })}
          </div>
          <p className="max-w-3xl text-center text-base text-pretty text-muted-foreground">{S.checkin.reviewHint}</p>
          {avisosInstrumento}
          {error && <div className="w-full max-w-3xl"><ErrorState message={S.checkin.saveError} /></div>}
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-border bg-background/50 px-5 py-4 md:px-8">
          <button type="button" onClick={() => ir(paso - 1)} className={botonSecundario}>
            <ArrowLeft aria-hidden className="size-6" /> {S.checkin.back}
          </button>
          <button type="button" onClick={guardarRegistro} disabled={saving} className={cn(botonPrincipal, "ml-auto min-w-0 flex-1 basis-72 lg:max-w-xl")}>
            <IconoRegistro className="size-7" /> {saving ? S.checkin.saving : S.checkin.submit}
          </button>
        </footer>
      </section>
    )
  }
}
