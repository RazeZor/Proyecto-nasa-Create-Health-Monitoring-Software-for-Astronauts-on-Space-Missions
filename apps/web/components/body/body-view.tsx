"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, ChevronRight, ListChecks, Rotate3d } from "lucide-react"
import { useApp } from "@/components/app-context"
import type { AnclaId } from "@/components/body/anatomia"
import { RuedaGiro } from "@/components/shared/rueda-giro"
import { BodyStage, type Marcador } from "@/components/body/body-stage"
import { Ecg } from "@/components/body/ecg"
import type { Proyeccion, Vista, ZonaCaliente } from "@/components/body/escena"
import { ICONO_INDICADOR, IconoPulso, IconoRegistro } from "@/components/shared/iconos"
import { LineChart } from "@/components/shared/line-chart"
import { LayerChip, ProvenanceTag, StatusBadge, STATUS_ICON, statusSurface, statusText } from "@/components/shared/status"
import { BASELINE_SWITCH_DAY } from "@/lib/engine"
import { rutaDe } from "@/lib/roles"
import { S } from "@/lib/strings"
import { store } from "@/lib/storage"
import type { DailyVitals, IndicatorId, Status, Symptom, ZoneId } from "@/lib/types"
import { cn } from "@/lib/utils"

type Seleccion = { tipo: "indicador"; id: IndicatorId } | { tipo: "zona"; id: ZoneId } | null

/** Identidad visual de cada indicador: icono y el color de su órgano en el modelo. */
const COLOR: Record<IndicatorId, string> = {
  sleepH: "#9b5de5", spo2: "#e0568a", tempC: "#f97316", glucose: "#d99a00", mood: "#7c6cf2", restingHr: "#e5484d", systolic: "#2f6fed", massKg: "#5b7a99",
}
/** Como mucho un decimal: en una pantalla que se lee de lejos, 36.5 dice lo mismo que 36.53. */
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
/** Pulso y presión se leen en enteros: un decimal ahí es ruido del instrumento, no información. */
const ENTEROS: IndicatorId[] = ["restingHr", "systolic"]
// A cada lado del cuerpo, de arriba abajo según la altura de su órgano: las líneas guía no se cruzan.
const IZQUIERDA: IndicatorId[] = ["sleepH", "spo2", "tempC", "glucose"]
const DERECHA: IndicatorId[] = ["mood", "restingHr", "systolic", "massKg"]
const TODOS = [...IZQUIERDA, ...DERECHA]
const ZONAS: ZoneId[] = ["head", "heart", "bone", "blood", "mind"]
const SEMANALES: IndicatorId[] = ["glucose", "massKg"]
const HEX: Record<Status, string> = { ok: "#16a34a", watch: "#f59e0b", act: "#ef4444" }
const TRAZO: Record<Status, string> = { ok: "stroke-status-ok", watch: "stroke-status-watch", act: "stroke-status-act" }
const BARRA: Record<Status, string> = { ok: "bg-status-ok", watch: "bg-status-watch", act: "bg-status-act" }
const DIAS_MINI = 14

function useSinceLastCheckIn() {
  const [label, setLabel] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const tick = () =>
      store.listCheckIns().then((list) => {
        if (!alive) return
        const last = list.at(-1)
        if (!last) return setLabel(null)
        const mins = Math.floor((Date.now() - new Date(last.createdAt).getTime()) / 60000)
        setLabel(mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`)
      })
    tick()
    const id = window.setInterval(tick, 30000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])
  return label
}

function Segmented<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-border bg-card/85 p-1 shadow-sm backdrop-blur">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-10 rounded-full px-4 text-sm font-semibold transition-colors",
            value === o.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

interface Lectura {
  id: IndicatorId
  /** Texto del valor, o null si no hay medida. */
  valor: string | null
  /** Día de la medida si no es la de hoy (indicadores semanales). */
  diaMedida: number | null
  serie: { day: number; value: number }[]
  estado: Status
}

/** Lectura vigente de cada indicador: la de hoy o, en los semanales, la última tomada. Lo no medido es null. */
function useLecturas(): Record<IndicatorId, Lectura> {
  const { day, analisis } = useApp()
  return useMemo(() => {
    const serie = analisis.vitals(day)
    const hoy = serie.find((v) => v.day === day)
    const estados = analisis.indicatorStatus(day)
    const r = {} as Record<IndicatorId, Lectura>
    for (const id of TODOS) {
      const fila: DailyVitals | undefined = SEMANALES.includes(id) ? serie.findLast((v) => v[id] != null) : hoy
      const v = fila?.[id]
      const fmt = ENTEROS.includes(id) ? (x: number) => String(Math.round(x)) : num
      r[id] = {
        id,
        valor: v == null ? null : id === "systolic" && fila?.diastolic != null ? `${fmt(v)}/${fmt(fila.diastolic)}` : fmt(v),
        diaMedida: fila && v != null && fila.day !== day ? fila.day : null,
        serie: serie.flatMap((x) => (typeof x[id] === "number" ? [{ day: x.day, value: x[id] as number }] : [])),
        estado: estados[id],
      }
    }
    return r
  }, [day, analisis])
}

function Mini({ puntos, color }: { puntos: { day: number; value: number }[]; color: string }) {
  const ult = puntos.slice(-DIAS_MINI)
  if (ult.length < 2) return null
  const min = Math.min(...ult.map((p) => p.value)), max = Math.max(...ult.map((p) => p.value))
  const x = (i: number) => 3 + (i / (ult.length - 1)) * 90
  const y = (v: number) => 30 - ((v - min) / (max - min || 1)) * 24
  return (
    <svg viewBox="0 0 96 34" className="h-9 w-24 shrink-0" aria-hidden>
      <polyline points={ult.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={0.85} />
      <circle cx={x(ult.length - 1)} cy={y(ult.at(-1)!.value)} r={3} fill={color} />
    </svg>
  )
}

function Tarjeta({ lectura, unidad, compacta, activa, onClick, refCb }: {
  lectura: Lectura; unidad: string; compacta: boolean; activa: boolean; onClick: () => void; refCb: (el: HTMLButtonElement | null) => void
}) {
  const Icono = ICONO_INDICADOR[lectura.id]
  const color = COLOR[lectura.id]
  return (
    <button
      type="button"
      ref={refCb}
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        "group relative flex w-full flex-1 overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-all duration-200 hover:shadow-md active:scale-[0.98]",
        compacta ? "min-h-16 items-center gap-3 py-2 pl-4 pr-3" : "min-h-32 flex-col justify-between gap-2 py-3 pl-5 pr-4",
        activa ? "border-primary ring-2 ring-primary/40" : "border-border",
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", BARRA[lectura.estado])} />
      <span className="flex min-w-0 items-center gap-3">
        <span className={cn("flex shrink-0 items-center justify-center rounded-xl", compacta ? "size-10" : "size-12")} style={{ background: `${color}1f`, color }}>
          <Icono className={compacta ? "size-6" : "size-8"} />
        </span>
        <span className="min-w-0">
          <span className={cn("block font-semibold leading-tight", compacta ? "text-sm" : "truncate text-base")}>{S.body.short[lectura.id]}</span>
          {!compacta && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{S.body.hint[lectura.id]}</span>}
        </span>
      </span>
      {compacta ? (
        <span className="ml-auto flex shrink-0 items-baseline gap-1">
          <span className="font-mono text-lg font-semibold tabular-nums">{lectura.valor ?? "—"}</span>
          <span className="text-xs text-muted-foreground">{lectura.valor && unidad.length <= 6 ? unidad : ""}</span>
        </span>
      ) : (
        <>
          <span className="flex items-end justify-between gap-2">
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-semibold leading-none tabular-nums">{lectura.valor ?? "—"}</span>
              <span className="text-sm text-muted-foreground">{lectura.valor ? unidad : ""}</span>
            </span>
            <Mini puntos={lectura.serie} color={color} />
          </span>
          <span className={cn("flex items-center gap-1.5 text-sm font-medium", lectura.valor ? statusText[lectura.estado] : "text-muted-foreground")}>
            {lectura.valor ? (
              <>
                <span aria-hidden className={cn("size-2 rounded-full", BARRA[lectura.estado])} />
                {S.body.indicatorStatus[lectura.estado]}
                {lectura.diaMedida != null && <span className="font-normal text-muted-foreground">· D{lectura.diaMedida}</span>}
              </>
            ) : S.body.notMeasured}
            <ChevronRight aria-hidden className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </span>
        </>
      )}
    </button>
  )
}

/** `ajeno`: el cuerpo de otro tripulante, en solo lectura (sin registro diario ni enlace a sus tendencias). */
export function BodyView({ ajeno = false }: { ajeno?: boolean }) {
  const { day, sex, setSex, analisis, catalogo, mode, theme, liveHr } = useApp()
  const lecturas = useLecturas()
  const zones = analisis.zones(day)
  const overall = analisis.overall(day)
  const [sel, setSel] = useState<Seleccion>(null)
  const [grados, setGrados] = useState(0) // giro con el deslizador (solo en la vista de otro tripulante)
  /** true cuando el lienzo ya muestra el modelo anatómico real (uno solo: no hay selector de modelo corporal). */
  const [modeloReal, setModeloReal] = useState<boolean | null>(null) // null: aún cargando
  const since = useSinceLastCheckIn()
  /** Modo real sin un solo registro: no se afirma «todo en orden» de lo que nadie midió. */
  const sinDatos = mode === "real" && (ajeno || since === null) && catalogo.historial.lecturas.length === 0
  const OverallIcon = STATUS_ICON[overall]
  const driver = zones.find((z) => z.status === overall && z.layer)
  const hoy = analisis.vitals(day).find((v) => v.day === day)
  const sintomas: Symptom[] = hoy?.symptoms ?? []
  const lpmReposo = hoy?.restingHr ?? null
  const lpm = liveHr ?? lpmReposo

  // ── escena ──────────────────────────────────────────────────────────────────
  const vista: Vista | null = sel?.id ?? null
  const estadoEscena = useMemo(() => {
    const calientes: ZonaCaliente[] = [
      ...sintomas.map((s): ZonaCaliente => ({ ancla: s, color: HEX.act, radio: s === "nausea" || s === "rash" ? 0.13 : 0.1 })),
      ...TODOS.filter((id) => lecturas[id].estado !== "ok")
        .sort((a, b) => (lecturas[a].estado === "act" ? -1 : 1) - (lecturas[b].estado === "act" ? -1 : 1))
        .map((id): ZonaCaliente => ({ ancla: id, color: HEX[lecturas[id].estado], radio: lecturas[id].estado === "act" ? 0.15 : 0.12 })),
    ]
    return { sexo: sex, oscuro: theme === "dark", lpm, vista, calientes, giroExtra: (grados * Math.PI) / 180, sinBalanceo: ajeno, sinArrastre: ajeno }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex, theme, lpm, vista, grados, ajeno, lecturas, sintomas.join()])

  const marcadores: Marcador[] = [
    ...TODOS.filter((id) => !sel || (sel.tipo === "indicador" && sel.id === id)).map((id): Marcador => ({
      id, estado: lecturas[id].estado, tipo: "indicador", activo: sel?.id === id,
      etiqueta: `${S.body.short[id]}: ${lecturas[id].valor ?? S.body.notMeasured}`,
    })),
    ...sintomas.map((s): Marcador => ({ id: s, estado: "act", tipo: "molestia", activo: false, etiqueta: S.symptoms[s] })),
  ]

  // ── líneas guía de cada tarjeta a su órgano (se actualizan en cada cuadro, sin pasar por React) ─────
  const rejilla = useRef<HTMLDivElement>(null)
  const tarjetas = useRef(new Map<IndicatorId, HTMLButtonElement>())
  const lineas = useRef(new Map<IndicatorId, SVGPathElement>())
  const general = sel === null
  const alCuadro = useCallback((p: Proyeccion, lienzo: DOMRect) => {
    const caja = rejilla.current?.getBoundingClientRect()
    if (!caja) return
    for (const [id, linea] of lineas.current) {
      const t = tarjetas.current.get(id)?.getBoundingClientRect()
      const a = p[id]
      // solo con la tarjeta al lado del lienzo (pantalla ancha) y el órgano a la vista
      if (!t || !a.frente || t.bottom < lienzo.top || t.top > lienzo.bottom || (t.right > lienzo.left && t.left < lienzo.right)) {
        linea.setAttribute("d", "")
        continue
      }
      const izquierda = t.right <= lienzo.left
      const x0 = (izquierda ? t.right : t.left) - caja.left
      const y0 = t.top + t.height / 2 - caja.top
      const x1 = x0 + (izquierda ? 28 : -28)
      linea.setAttribute("d", `M${x0.toFixed(1)} ${y0.toFixed(1)}H${x1.toFixed(1)}L${(lienzo.left + a.x - caja.left).toFixed(1)} ${(lienzo.top + a.y - caja.top).toFixed(1)}`)
    }
  }, [])

  const elegir = (s: Seleccion) => setSel((previa) => (previa && s && previa.tipo === s.tipo && previa.id === s.id ? null : s))
  const alMarcador = (id: AnclaId) => {
    if ((TODOS as string[]).includes(id)) elegir({ tipo: "indicador", id: id as IndicatorId })
    else elegir({ tipo: "zona", id: id === "rash" ? "blood" : "head" }) // la zona que el motor asigna a cada síntoma
  }
  const tarjeta = (id: IndicatorId) => (
    <Tarjeta
      key={id}
      lectura={lecturas[id]}
      unidad={catalogo.indicadores[id].unit}
      compacta={!general}
      activa={sel?.tipo === "indicador" && sel.id === id}
      onClick={() => elegir({ tipo: "indicador", id })}
      refCb={(el) => {
        if (el) tarjetas.current.set(id, el)
        else tarjetas.current.delete(id)
      }}
    />
  )
  const procedencia = sinDatos ? null : <ProvenanceTag provenance={{ kind: mode === "real" ? "measured" : "simulated" }} />

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      {/* Estado general: lo primero que se lee */}
      <section aria-labelledby="overall" className={cn("flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border px-4 py-3 md:px-6 xl:flex-nowrap", statusSurface[overall])}>
        <div className="flex min-w-0 flex-1 basis-72 items-center gap-4">
          <span className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-full bg-card shadow-sm", statusText[overall])}>
            {overall !== "ok" && <span aria-hidden className={cn("absolute inset-0 rounded-full border-2 onda-dolor", overall === "act" ? "border-status-act" : "border-status-watch")} />}
            <OverallIcon aria-hidden className="size-9" />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">{S.body.overall} · {S.common.day} {day} · <span className="normal-case">{S.body.flow}</span></p>
            <h1 id="overall" className={cn("text-3xl font-bold leading-tight md:text-4xl", sinDatos ? "text-muted-foreground" : statusText[overall])}>{sinDatos ? S.body.never : S.body.headline[overall]}</h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-pretty text-sm md:text-base">
              {sinDatos ? S.banners.realEmptyDetail : S.statusLong[overall]}
              {driver?.layer && (
                <button type="button" onClick={() => elegir({ tipo: "zona", id: driver.zone })} className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-current/30 bg-card/70 px-3 text-sm font-semibold">
                  {S.zones[driver.zone]} <ArrowRight aria-hidden className="size-4" />
                </button>
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => elegir({ tipo: "indicador", id: "restingHr" })}
          className="flex min-h-20 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-2 text-left shadow-sm active:scale-[0.98]"
        >
          <IconoPulso className={cn("size-10 shrink-0 text-[#e5484d]", lpm !== null && "latido")} style={lpm !== null ? { animationDuration: `${(60 / lpm).toFixed(2)}s` } : undefined} />
          <span>
            <span className="flex items-baseline gap-1.5">
              <span className="font-mono text-4xl font-semibold leading-none tabular-nums">{lpm !== null ? Math.round(lpm) : "—"}</span>
              <span className="text-sm text-muted-foreground">{catalogo.indicadores.restingHr.unit}</span>
            </span>
            <span className="mt-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              {liveHr !== null && <span aria-hidden className="size-2 animate-pulse rounded-full bg-status-act" />}
              {liveHr !== null ? S.body.live : lpm !== null ? S.body.restToday : S.body.noPulse}
            </span>
          </span>
          <Ecg lpm={lpm} className="hidden h-14 w-40 text-[#e5484d] sm:block xl:w-56" />
        </button>
        {!ajeno && (
          <div className="flex flex-col items-stretch gap-1">
            <Link href={rutaDe("astronaut", "check-in")} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-lg font-semibold text-primary-foreground shadow-md hover:bg-primary/90 active:scale-[0.98]">
              <IconoRegistro className="size-7" /> {S.body.startCheckIn}
            </Link>
            <p className="text-center text-xs text-muted-foreground">
              {since === undefined ? " " : since === null ? S.body.never : S.body.sinceLast(since)}
            </p>
          </div>
        )}
      </section>

      {/* Indicadores a los lados, cuerpo al centro */}
      <div
        ref={rejilla}
        className={cn(
          "relative grid gap-4 transition-[grid-template-columns] duration-500",
          general ? "lg:grid-cols-[minmax(210px,270px)_minmax(0,1fr)_minmax(210px,270px)]" : "lg:grid-cols-[minmax(190px,240px)_minmax(0,1fr)_minmax(320px,420px)]",
        )}
      >
        <div className={cn("order-2 grid grid-cols-2 gap-3 lg:order-none lg:flex lg:flex-col", !general && "lg:gap-2")}>
          {(general ? IZQUIERDA : TODOS).map(tarjeta)}
        </div>

        <BodyStage
          className="order-1 h-[clamp(560px,calc(100dvh-20.5rem),1100px)] lg:order-none"
          estado={estadoEscena}
          marcadores={marcadores}
          onMarcador={alMarcador}
          onCuadro={alCuadro}
          onModelo={setModeloReal}
        >
          {/* El cuerpo es el protagonista: sobre el lienzo solo va lo imprescindible, pequeño y en las esquinas */}
          {modeloReal === false && (
            <div className="absolute left-3 top-3">
              <Segmented label={S.body.sexLabel} value={sex} onChange={setSex} options={[{ value: "female", label: S.body.female }, { value: "male", label: S.body.male }]} />
            </div>
          )}
          <span title={S.body.drag} className="pointer-events-none absolute right-3 top-3 flex size-10 items-center justify-center rounded-full border border-border bg-card/80 text-muted-foreground shadow-sm">
            <Rotate3d aria-hidden className="size-5" />
            <span className="sr-only">{S.body.drag}</span>
          </span>
          <p className="pointer-events-none absolute bottom-2 left-3 flex items-center gap-2 text-[10px] leading-none text-muted-foreground/80">
            {procedencia}
            {modeloReal && <span>{S.body.modelCredit}</span>}
          </p>
          {sel?.tipo === "indicador" && (
            <p className="pointer-events-none absolute inset-x-0 top-4 flex justify-center px-14" aria-hidden>
              <span className="titulo-organo inline-flex items-center gap-2 rounded-full px-5 py-2 text-lg font-semibold text-white shadow-lg" style={{ background: COLOR[sel.id] }}>
                {S.body.organ[sel.id]}
              </span>
            </p>
          )}
          {ajeno && <RuedaGiro grados={grados} onChange={setGrados} etiqueta={S.crew.girar} className="absolute bottom-3 right-3" />}
          {general ? (
            <p className="pointer-events-none absolute inset-x-0 bottom-7 text-center text-sm font-medium text-muted-foreground">{S.body.tapHint}</p>
          ) : (
            <div className="absolute inset-x-0 bottom-4 flex justify-center">
              <button type="button" onClick={() => setSel(null)} className="inline-flex min-h-14 items-center gap-2 rounded-full border border-border bg-card px-6 text-lg font-semibold shadow-lg active:scale-[0.98]">
                <ArrowLeft aria-hidden className="size-5" /> {S.body.backToBody}
              </button>
            </div>
          )}
        </BodyStage>

        <div className="order-3 grid grid-cols-2 gap-3 lg:order-none lg:flex lg:flex-col">
          {!sel ? DERECHA.map(tarjeta) : sel.tipo === "indicador" ? detalleIndicador(sel.id) : detalleZona(sel.id)}
        </div>

        <svg aria-hidden className="pointer-events-none absolute inset-0 hidden size-full overflow-visible lg:block">
          {general && TODOS.map((id) => (
            <path
              key={id}
              ref={(el) => {
                if (el) lineas.current.set(id, el)
                else lineas.current.delete(id)
              }}
              fill="none"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={cn("linea-guia", TRAZO[lecturas[id].estado])}
            />
          ))}
        </svg>
      </div>

      {/* Sistemas del cuerpo: el veredicto del motor por zona */}
      <div role="group" aria-label={S.body.systems} className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {zones.map((z) => {
          const Icono = STATUS_ICON[z.status]
          const activa = sel?.tipo === "zona" && sel.id === z.zone
          return (
            <button
              key={z.zone}
              type="button"
              onClick={() => elegir({ tipo: "zona", id: z.zone })}
              aria-pressed={activa}
              className={cn(
                "flex min-h-14 items-center gap-2.5 rounded-2xl border bg-card px-4 text-left text-base font-semibold shadow-sm transition-all active:scale-[0.98]",
                activa ? "border-primary ring-2 ring-primary/40" : "border-border",
              )}
            >
              <Icono aria-hidden className={cn("size-6 shrink-0", sinDatos ? "text-muted-foreground" : statusText[z.status], !sinDatos && z.status !== "ok" && "animate-pulse")} />
              <span className="min-w-0 flex-1 leading-tight">{S.zones[z.zone]}</span>
              <span className={cn("hidden font-mono text-xs uppercase xl:inline", sinDatos ? "text-muted-foreground" : statusText[z.status])}>{sinDatos ? S.body.notMeasured : S.status[z.status]}</span>
            </button>
          )
        })}
      </div>

      <section aria-labelledby="rem-h" className="rounded-2xl border border-border bg-card p-4 md:px-6">
        <h2 id="rem-h" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <ListChecks aria-hidden className="size-4" /> {S.body.reminders}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{S.body.remindersExample}</p>
        <ul className="mt-2 grid gap-x-8 gap-y-1.5 text-sm md:grid-cols-2">
          {catalogo.recordatorios.map((r) => (
            <li key={r} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
              {r}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )

  // Paneles como funciones (no componentes): así no se desmontan en cada render y el trazo del pulso no se reinicia.
  function detalleZona(id: ZoneId) {
    const z = zones.find((x) => x.zone === id)!
    const filas = lecturasZona(id)
    return (
      <aside aria-label={S.zones[id]} className="panel-detalle col-span-2 flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-lg lg:max-h-[clamp(560px,calc(100dvh-20.5rem),1100px)] lg:overflow-y-auto">
        <div>
          <p className="eyebrow">{S.body.systems}</p>
          <h2 className="mt-1 text-2xl font-bold">{S.zones[id]}</h2>
          <StatusBadge status={z.status} size="lg" className="mt-2" />
        </div>
        <Bloque titulo={S.body.why}>
          <div className="flex flex-col items-start gap-2">
            {z.layer ? <LayerChip layer={z.layer} /> : <span className="text-sm text-muted-foreground">{S.body.noTrigger}</span>}
            <p className="leading-relaxed">{z.layer ? S.layerLong[z.layer] : ""} {z.why}</p>
          </div>
        </Bloque>
        <Bloque titulo={S.body.deviation}><p className="font-mono text-sm leading-relaxed">{z.deviation}</p></Bloque>
        {filas.length > 0 && (
          <Bloque titulo={S.body.readings}>
            <div className="flex flex-col gap-2">
              {filas.map((r) => (
                <button key={r.label} type="button" disabled={!r.id} onClick={() => r.id && setSel({ tipo: "indicador", id: r.id })} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2 text-left enabled:active:scale-[0.98]">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{S.body.reference}: {r.reference}</span>
                  </span>
                  <span className="font-mono text-base font-semibold tabular-nums">{r.value}</span>
                </button>
              ))}
            </div>
          </Bloque>
        )}
        <Siguiente estado={z.status} texto={z.next} />
        <div className="self-start">{procedencia}</div>
      </aside>
    )
  }

  /** Lecturas del día de los indicadores de una zona con su referencia: banda personal o límite de seguridad. */
  function lecturasZona(zone: ZoneId) {
    const filas: { id?: IndicatorId; label: string; value: string; reference: string }[] = []
    for (const info of Object.values(catalogo.indicadores)) {
      const l = lecturas[info.id]
      if (info.zone !== zone || l.valor === null) continue
      filas.push({ id: info.id, label: info.label, value: `${l.valor} ${info.unit}${l.diaMedida != null ? ` (D${l.diaMedida})` : ""}`, reference: referencia(info.id) ?? "—" })
    }
    const co2 = zone === "head" ? analisis.co2(day) : null
    if (co2) filas.push({ label: S.env.co2, value: `${co2.mmHg.toFixed(2)} mmHg`, reference: `≤ ${catalogo.entorno.co2_limite_mmhg} mmHg · ${co2.source}` })
    return filas
  }

  function referencia(id: IndicatorId): string | null {
    const info = catalogo.indicadores[id]
    const banda = analisis.band(id).findLast((b) => b.day <= day)
    if (banda) return `${banda.low.toFixed(1)}–${banda.high.toFixed(1)} ${info.unit}`
    const limites = [info.safetyLow != null ? `≥ ${info.safetyLow}` : null, info.safetyHigh != null ? `≤ ${info.safetyHigh}` : null].filter(Boolean).join(" · ")
    return limites ? `${limites} ${info.unit}` : null
  }

  function detalleIndicador(id: IndicatorId) {
    const lectura = lecturas[id]
    const envivo = liveHr !== null
    const info = catalogo.indicadores[id]
    const Icono = ICONO_INDICADOR[id]
    const color = COLOR[id]
    const z = zones.find((x) => x.zone === info.zone)!
    const banda = analisis.band(id)
    const ref = referencia(id)
    return (
      <aside aria-label={info.label} className="panel-detalle col-span-2 flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-lg lg:max-h-[clamp(560px,calc(100dvh-20.5rem),1100px)] lg:overflow-y-auto">
        <div className="flex items-center gap-3">
          <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${color}22`, color }}>
            <Icono className="size-9" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight">{S.body.short[id]}</h2>
            <p className="text-sm text-muted-foreground">{S.body.organLabel}: <span className="font-semibold text-foreground">{S.body.organ[id]}</span></p>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <p className="flex items-baseline gap-2">
            <span className="font-mono text-6xl font-semibold leading-none tabular-nums">{lectura.valor ?? "—"}</span>
            <span className="text-lg text-muted-foreground">{lectura.valor ? info.unit : ""}</span>
          </p>
          {lectura.valor ? <StatusBadge status={lectura.estado} size="lg" /> : <span className="text-sm font-medium text-muted-foreground">{S.body.notMeasured}</span>}
        </div>
        <p className="-mt-2 text-sm text-muted-foreground">
          {S.body.hint[id]}
          {lectura.diaMedida != null && <> · {S.body.measuredOn(lectura.diaMedida)}</>}
          {ref && <> · <span className="font-medium text-foreground">{banda.length ? S.body.yourRange : S.body.safeRange}: {ref}</span></>}
        </p>

        {id === "restingHr" && (
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-2">
            <Ecg lpm={lpm} className="h-14 min-w-0 flex-1 text-[#e5484d]" />
            <span className="shrink-0 text-right text-xs font-medium text-muted-foreground">
              <span className="block font-mono text-lg font-semibold text-foreground">{lpm !== null ? Math.round(lpm) : "—"}</span>
              {envivo ? S.body.live : S.body.restToday}
            </span>
          </div>
        )}

        {lectura.serie.length > 1 && (
          <div className="rounded-2xl border border-border p-2">
            <LineChart label={info.label} unit={info.unit} points={lectura.serie} days={analisis.missionDays} currentDay={day} band={banda} switchDay={BASELINE_SWITCH_DAY}
              threshold={info.safetyHigh ? { value: info.safetyHigh, label: `${S.trends.safetyLimit} ${info.safetyHigh}` } : info.safetyLow ? { value: info.safetyLow, label: `${S.trends.safetyLimit} ${info.safetyLow}` } : undefined} />
          </div>
        )}

        <Bloque titulo={`${S.body.now} · ${S.zones[z.zone]}`}>
          <div className="flex flex-col items-start gap-2">
            {z.layer && <LayerChip layer={z.layer} />}
            <p className="leading-relaxed">{z.why}</p>
            {z.status !== "ok" && <p className="font-mono text-sm text-muted-foreground">{z.deviation}</p>}
          </div>
        </Bloque>
        <Siguiente estado={z.status} texto={z.next} />
        <Bloque titulo={S.trends.whatItIs}><p className="text-sm leading-relaxed text-muted-foreground">{info.whatItIs}</p></Bloque>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {!ajeno && (
            <Link href={rutaDe("astronaut", "trends")} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-5 text-base font-semibold hover:bg-accent">
              {S.body.seeTrend} <ArrowRight aria-hidden className="size-5" />
            </Link>
          )}
          {procedencia}
        </div>
      </aside>
    )
  }
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow mb-1.5">{titulo}</h3>
      {children}
    </div>
  )
}

function Siguiente({ estado, texto }: { estado: Status; texto: string }) {
  return (
    <div className={cn("rounded-2xl border p-4", statusSurface[estado])}>
      <h3 className="eyebrow !text-current">{S.body.next}</h3>
      <p className="mt-1 text-lg font-semibold leading-snug">{texto}</p>
    </div>
  )
}
