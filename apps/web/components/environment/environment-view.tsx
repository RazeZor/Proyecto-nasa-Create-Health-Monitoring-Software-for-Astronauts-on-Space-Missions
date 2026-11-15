"use client"

import { useEffect, useState } from "react"
import { ArrowDown, ExternalLink } from "lucide-react"
import { useApp } from "@/components/app-context"
import { IconoCo2, IconoDatos, IconoDosis, IconoHumedad, IconoPresion, IconoTormenta } from "@/components/environment/iconos"
import { IndicatorCard } from "@/components/shared/indicator-card"
import { ICONO_INDICADOR, type Icono } from "@/components/shared/iconos"
import { LineChart } from "@/components/shared/line-chart"
import { EmptyState } from "@/components/shared/states"
import { ProvenanceTag, STATUS_ICON, statusSurface, statusText } from "@/components/shared/status"
import type { OrigenDato } from "@/lib/catalogo"
import { cargarKpiSimulacion, cargarPanelGold, type KpiSimulacionEtl, type PanelEntornoEtl } from "@/lib/etl-client"
import { MOTOR, S } from "@/lib/strings"
import type { Provenance, Status } from "@/lib/types"
import { cn } from "@/lib/utils"

const REAL = (source: string, date: string) => ({ kind: "real" as const, source, date })
/** La etiqueta de procedencia, a un tamaño que se lee a un brazo de distancia. */
const PROV = "gap-1.5 px-2.5 py-1.5 text-sm"
const BARRA: Record<Status, string> = { ok: "bg-status-ok", watch: "bg-status-watch", act: "bg-status-act" }
const IconoTemperatura = ICONO_INDICADOR.tempC
/** Como mucho tres decimales, sin ceros de relleno. */
const num = (v: number) => String(Number(v.toFixed(Math.abs(v) < 1 ? 3 : 2)))

function fechaVentana(gold: PanelEntornoEtl | null, fuente: "radlab" | "goes" | "eda" | "donki"): string {
  const v = gold?.ventanas.find((w) => w.fuente === fuente)
  if (!v) return S.env.noWindow
  return `${v.desde.slice(0, 10)} → ${v.hasta.slice(0, 10)}`
}

/**
 * Procedencia de un dato del día: medición real reanclada (fuente y fecha real) o escenario simulado. Igual que
 * el motor, un dato sin origen real declarado se rotula como simulado: nunca se presenta como medición.
 */
const procedencia = (o?: OrigenDato | null): Provenance =>
  o?.naturaleza === "Real" ? REAL(o.fuente, o.fecha_real ?? "—") : { kind: "simulated" }
const SIMULADO: Provenance = { kind: "simulated" }

/** Días cuyo dato es una anomalía simulada del escenario de demostración: se rotulan aparte de lo real. */
function Simulados({ dias }: { dias: number[] }) {
  if (dias.length === 0) return null
  return <span className="inline-flex items-center rounded border border-status-watch/50 px-2.5 py-1.5 text-sm leading-none text-status-watch">{S.env.simulatedDays(dias.join(", "))}</span>
}

/** Una de las tres respuestas de arriba: qué se mira, cómo está hoy y su cifra. */
function Respuesta({ icono: Icono, titulo, estado, veredicto, children }: {
  icono: Icono; titulo: string; estado: Status | null; veredicto: string | null; children: React.ReactNode
}) {
  const E = estado ? STATUS_ICON[estado] : null
  return (
    <section className="relative flex min-w-0 flex-col gap-3 overflow-hidden rounded-3xl border border-border bg-card p-4 pl-6 shadow-sm md:p-5 md:pl-7">
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-2", estado ? BARRA[estado] : "bg-border")} />
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground"><Icono className="size-8" /></span>
        <div className="min-w-0">
          <h3 className="text-xl font-bold leading-tight">{titulo}</h3>
          {veredicto && (
            <p className={cn("mt-0.5 flex items-center gap-1.5 text-base font-semibold", estado ? statusText[estado] : "text-muted-foreground")}>
              {E && <E aria-hidden className="size-5 shrink-0" />}
              {veredicto}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

function Cifra({ valor, unidad, rotulo }: { valor: string; unidad?: string; rotulo?: string }) {
  return (
    <div>
      {rotulo && <p className="eyebrow mb-1">{rotulo}</p>}
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-5xl font-semibold leading-none tabular-nums">{valor}</span>
        {unidad && <span className="text-xl text-muted-foreground">{unidad}</span>}
      </p>
    </div>
  )
}

/** Barra de «cuánto llevo del límite»: la marca vertical es el límite. */
function Medidor({ fraccion, limiteEn = 1, clase, etiqueta }: { fraccion: number; limiteEn?: number; clase: string; etiqueta: string }) {
  return (
    <div role="img" aria-label={etiqueta} className="relative h-4">
      <div className="absolute inset-x-0 top-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-300", clase)} style={{ width: `${Math.min(100, Math.max(fraccion * 100, 1.5))}%` }} />
      </div>
      {limiteEn < 1 && <span aria-hidden className="absolute inset-y-0 w-0.5 rounded-full bg-foreground" style={{ left: `${limiteEn * 100}%` }} />}
    </div>
  )
}

function Paso({ estado, texto }: { estado: Status; texto: string }) {
  return (
    <div className={cn("rounded-2xl border p-3", statusSurface[estado])}>
      <p className="eyebrow !text-current">{S.body.next}</p>
      <p className="mt-1 text-base font-semibold leading-snug">{texto}</p>
    </div>
  )
}

function Cabina({ icono: Icono, titulo, valor, unidad, nota }: { icono: Icono; titulo: string; valor: string; unidad?: string; nota: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground"><Icono className="size-7" /></span>
      <div className="min-w-0">
        <p className="text-base font-semibold leading-tight">{titulo}</p>
        <p className="text-sm text-muted-foreground">{nota}</p>
      </div>
      <p className="ml-auto flex shrink-0 items-baseline gap-1.5">
        <span className="font-mono text-3xl font-semibold leading-none tabular-nums">{valor}</span>
        {unidad && <span className="text-base text-muted-foreground">{unidad}</span>}
      </p>
    </div>
  )
}

function Panel({ title, note, children, footer }: { title: string; note?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5">
      <h3 className="text-xl font-bold leading-tight">{title}</h3>
      {note && <p className="mt-0.5 text-base text-muted-foreground">{note}</p>}
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-3 flex flex-wrap items-center gap-2">{footer}</div>}
    </section>
  )
}

export function EnvironmentView() {
  const { day, profile, catalogo, analisis, online } = useApp()
  const MISSION_DAYS = analisis.missionDays
  const { limite_carrera_msv: CAREER_LIMIT_MSV, co2_limite_mmhg: CO2_LIMIT_MMHG, umbral_protones_pfu: PFU_THRESHOLD } = catalogo.entorno
  const escenario = catalogo.historial.escenario_entorno ?? null
  const [gold, setGold] = useState<PanelEntornoEtl | null>(null)
  const [kpi, setKpi] = useState<KpiSimulacionEtl | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)

  // El panel es el mismo del que la API saca el entorno que evalúa el motor (historial.escenario_entorno).
  useEffect(() => {
    let cancelado = false
    if (!escenario) {
      setGold(null)
      setCargando(false)
      return
    }
    setCargando(true)
    Promise.all([cargarPanelGold(escenario), cargarKpiSimulacion()]).then(([p, k]) => {
      if (cancelado) return
      setGold(p.panel)
      setKpi(k)
      setCargando(false)
    })
    return () => {
      cancelado = true
    }
  }, [escenario])

  // Dosis: del panel gold (RadLab). CO2 y protones: lo mismo que evalúa el motor, día por día, con su procedencia.
  const dosisPoints = (gold?.dosis?.por_dia ?? []).map((d) => ({ day: d.dia_mision, value: Number((d.acumulada / 1000).toFixed(4)) }))
  const entorno = [...catalogo.historial.entorno_diario].sort((a, b) => a.dia_mision - b.dia_mision)
  const co2Points = entorno.flatMap((e) => {
    const c = analisis.co2(e.dia_mision)
    return c ? [{ day: e.dia_mision, value: Number(c.mmHg.toFixed(2)) }] : []
  })
  const co2Simulados = entorno.filter((e) => e.co2_origen?.naturaleza === "Simulado" && e.co2_mmhg_max_horario != null).map((e) => e.dia_mision)
  const protonPoints = entorno.filter((e) => e.flujo_protones_10mev_pfu != null).map((e) => ({ day: e.dia_mision, value: e.flujo_protones_10mev_pfu as number }))
  const protonSimulados = entorno.filter((e) => e.flujo_origen?.naturaleza === "Simulado" && e.flujo_protones_10mev_pfu != null).map((e) => e.dia_mision)
  const soloAnomalias = (dias: number[], limite: (d: number) => boolean) => dias.filter(limite)

  const dosisDia = gold?.dosis?.por_dia.findLast((d) => d.dia_mision <= day) ?? gold?.dosis?.por_dia[0]
  const dosisMSv = dosisDia ? Number((dosisDia.acumulada / 1000).toFixed(3)) : null
  const pctCarrera = gold?.dosis?.porcentaje_limite_carrera ?? 0
  const cabinaDia = gold?.cabina.find((c) => c.dia_mision === day)
  const co2Dia = analisis.co2(day)
  const co2Status: Status = !co2Dia ? "ok" : co2Dia.mmHg > CO2_LIMIT_MMHG ? "act" : co2Dia.mmHg >= CO2_LIMIT_MMHG * 0.8 ? "watch" : "ok"
  const eventosDonki = gold?.eventos ?? []
  const co2Anomalias = soloAnomalias(co2Simulados, (d) => (analisis.co2(d)?.mmHg ?? 0) > CO2_LIMIT_MMHG)
  const protonAnomalias = soloAnomalias(protonSimulados, (d) => (entorno.find((e) => e.dia_mision === d)?.flujo_protones_10mev_pfu ?? 0) >= PFU_THRESHOLD)

  // La respuesta de hoy: tormenta (lo que decide el motor) y CO2 frente a su límite. Sin dato no se afirma nada.
  const entornoDia = entorno.find((e) => e.dia_mision === day)
  const tormenta = analisis.stormInfo(day)
  const flujoDia = entornoDia?.flujo_protones_10mev_pfu ?? null
  const hayProtones = flujoDia !== null || tormenta !== null
  const estadoTormenta: Status | null = tormenta ? "act" : hayProtones ? "ok" : null
  const respuesta: { estado: Status | null; titulo: string; detalle: string; accion: boolean } = tormenta
    ? { estado: "act", titulo: S.banners.storm, detalle: MOTOR.accion.protones, accion: true }
    : co2Dia && co2Status === "act"
      ? { estado: "act", titulo: S.env.hero.co2Act, detalle: MOTOR.accion.co2, accion: true }
      : co2Dia && co2Status === "watch"
        ? { estado: "watch", titulo: S.env.hero.co2Watch, detalle: S.env.hero.co2WatchNext, accion: false }
        : co2Dia && hayProtones
          ? { estado: "ok", titulo: S.env.hero.calm, detalle: S.env.hero.calmDetail, accion: false }
          : co2Dia || hayProtones
            ? { estado: "ok", titulo: S.env.hero.calmPartial, detalle: S.env.hero.calmPartialDetail, accion: false }
            : { estado: null, titulo: S.env.hero.noData, detalle: S.env.hero.noDataDetail, accion: false }
  const IconoRespuesta = respuesta.estado ? STATUS_ICON[respuesta.estado] : null
  const procFlujo = tormenta?.event
    ? REAL(`${tormenta.event.fuente} · ${tormenta.event.sepID}`, tormenta.event.t_real.slice(0, 10))
    : hayProtones ? procedencia(entornoDia?.flujo_origen) : null
  const procCo2 = co2Dia ? procedencia(entornoDia?.co2_origen) : null
  // Pie de cada serie: la fuente real solo si algún punto lo es; lo que no, se rotula como simulado.
  const esReal = (o?: OrigenDato | null) => o?.naturaleza === "Real"
  const protonesReales = entorno.some((e) => e.flujo_protones_10mev_pfu != null && esReal(e.flujo_origen))
  const protonesSimulados = entorno.some((e) => e.flujo_protones_10mev_pfu != null && !esReal(e.flujo_origen))
  const co2Real = entorno.some((e) => analisis.co2(e.dia_mision) !== null && esReal(e.co2_origen))
  const co2Simulado = entorno.some((e) => analisis.co2(e.dia_mision) !== null && !esReal(e.co2_origen))
  const escalaCo2 = Math.max(CO2_LIMIT_MMHG * 1.5, (co2Dia?.mmHg ?? 0) * 1.1)
  const notaDosis = gold?.dosis?.tipo === "equivalente" ? S.env.doseEquivalent : S.env.doseNote

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="text-3xl font-bold leading-tight">{S.env.title}</h1>
          <p className="text-base text-muted-foreground">{S.env.subtitle}</p>
        </div>
        <a href="#procedencia" className={cn(
          "inline-flex min-h-12 items-center gap-2.5 rounded-full border bg-card px-4 text-base font-semibold shadow-sm active:scale-[0.98]",
          gold ? "border-border" : "border-status-watch/50 text-status-watch",
        )}>
          <IconoDatos className={cn("size-6 shrink-0", gold && "text-status-ok")} />
          {gold ? (
            <>
              <span className="text-status-ok">{online ? S.env.goldLive : S.env.goldCached}</span>
              <span className="font-mono text-sm font-medium text-muted-foreground">{gold.escenario}</span>
            </>
          ) : (
            <span>{cargando ? S.env.loading : S.env.noGold}</span>
          )}
          <ArrowDown aria-hidden className="size-5 shrink-0 text-muted-foreground" />
        </a>
      </header>

      {/* La respuesta, antes que el detalle */}
      <section aria-labelledby="respuesta-entorno" className={cn("flex flex-wrap items-center gap-x-5 gap-y-3 rounded-3xl border px-4 py-4 md:px-6", respuesta.estado ? statusSurface[respuesta.estado] : "border-border bg-muted")}>
        <span className={cn("relative flex size-14 shrink-0 items-center justify-center rounded-full bg-card shadow-sm", respuesta.estado ? statusText[respuesta.estado] : "text-muted-foreground")}>
          {respuesta.estado && respuesta.estado !== "ok" && <span aria-hidden className={cn("onda-dolor absolute inset-0 rounded-full border-2", respuesta.estado === "act" ? "border-status-act" : "border-status-watch")} />}
          {IconoRespuesta ? <IconoRespuesta aria-hidden className="size-9" /> : <IconoDatos className="size-8" />}
        </span>
        <div className="min-w-0 flex-1 basis-80">
          <p className="eyebrow">{S.env.answer} · {S.common.day} {day}</p>
          <h2 id="respuesta-entorno" className={cn("mt-0.5 text-balance text-2xl font-bold leading-tight md:text-3xl", respuesta.estado ? statusText[respuesta.estado] : "text-foreground")}>{respuesta.titulo}</h2>
          {!respuesta.accion && <p className="mt-1 text-pretty text-lg">{respuesta.detalle}</p>}
        </div>
        {respuesta.accion && (
          <div className="min-w-0 flex-1 basis-80 rounded-2xl border border-current/20 bg-card px-4 py-3 shadow-sm">
            <p className="eyebrow">{S.body.next}</p>
            <p className="mt-1 text-pretty text-xl font-semibold leading-snug">{respuesta.detalle}</p>
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Respuesta icono={IconoTormenta} titulo={S.env.stormCard} estado={estadoTormenta}
          veredicto={tormenta ? S.env.stormOn : hayProtones ? S.env.stormOff : S.env.stormUnknown}>
          <Cifra rotulo={S.env.protonsToday} valor={flujoDia !== null ? num(flujoDia) : "—"} unidad={flujoDia !== null ? "pfu" : undefined} />
          <p className="text-base text-muted-foreground">{S.env.eventThreshold}</p>
          {tormenta && <Paso estado="act" texto={MOTOR.accion.protones} />}
          <div className="mt-auto flex flex-wrap items-center gap-2">
            {procFlujo && <ProvenanceTag provenance={procFlujo} className={PROV} />}
            {tormenta && !tormenta.event && tormenta.source && <span className="font-mono text-sm text-muted-foreground">{S.banners.stormSource}: {tormenta.source}</span>}
          </div>
        </Respuesta>

        <Respuesta icono={IconoCo2} titulo={S.env.co2} estado={co2Dia ? co2Status : null}
          veredicto={!co2Dia ? S.env.noCabin : co2Status === "act" ? S.env.co2Over : co2Status === "watch" ? S.env.co2Near : S.env.co2Under}>
          <Cifra valor={co2Dia ? co2Dia.mmHg.toFixed(2) : "—"} unidad={co2Dia ? "mmHg" : undefined} />
          {co2Dia && (
            <div>
              <Medidor fraccion={co2Dia.mmHg / escalaCo2} limiteEn={CO2_LIMIT_MMHG / escalaCo2} clase={BARRA[co2Status]} etiqueta={`${co2Dia.mmHg.toFixed(2)} mmHg · ${S.env.co2Limit}`} />
              <p className="mt-1.5 text-base text-muted-foreground">
                {S.env.co2Limit}
                {co2Dia.ppm !== null && <> · <span className="font-mono tabular-nums">{Math.round(co2Dia.ppm)} ppm @ {profile.cabinPressureMmHg} mmHg</span></>}
              </p>
            </div>
          )}
          {co2Dia && co2Status === "act" && <Paso estado="act" texto={MOTOR.accion.co2} />}
          <div className="mt-auto flex flex-wrap items-center gap-2">
            {procCo2 && <ProvenanceTag provenance={procCo2} className={PROV} />}
          </div>
        </Respuesta>

        <Respuesta icono={IconoDosis} titulo={S.env.dose} estado={null} veredicto={gold?.dosis ? notaDosis : S.env.noDose}>
          <Cifra valor={dosisMSv !== null ? String(dosisMSv) : "—"} unidad={dosisMSv !== null ? "mSv" : undefined} />
          {gold?.dosis && (
            <div>
              <Medidor fraccion={pctCarrera / 100} clase="bg-primary" etiqueta={`${pctCarrera}% · ${S.env.careerLimit}`} />
              <p className="mt-1.5 text-base text-muted-foreground">
                <span className="font-mono font-semibold tabular-nums text-foreground">{pctCarrera}%</span> · {S.env.careerLimit}
                <span className="font-mono tabular-nums"> · {dosisMSv} / {CAREER_LIMIT_MSV} mSv</span>
              </p>
              <p className="text-base text-muted-foreground">{gold.dosis.orientativa ? S.env.indicative : gold.dosis.series.join(", ")}</p>
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center gap-2">
            {gold?.dosis && <ProvenanceTag provenance={REAL("RadLab · NASA OSDR", fechaVentana(gold, "radlab"))} className={PROV} />}
          </div>
        </Respuesta>
      </div>

      <section aria-labelledby="cabina-hoy">
        <h2 id="cabina-hoy" className="eyebrow mb-2">{S.env.cabinToday}</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <Cabina icono={IconoTemperatura} titulo={S.env.temp}
            valor={cabinaDia?.temperature_iss_max !== undefined ? String(cabinaDia.temperature_iss_max) : "—"} unidad={cabinaDia?.temperature_iss_max !== undefined ? "°C" : undefined}
            nota={cabinaDia?.temperature_iss_max !== undefined ? `EDA · ${fechaVentana(gold, "eda")}` : S.env.noEda} />
          <Cabina icono={IconoHumedad} titulo={S.env.humidity}
            valor={cabinaDia?.humidity_iss_max !== undefined ? String(cabinaDia.humidity_iss_max) : "—"} unidad={cabinaDia?.humidity_iss_max !== undefined ? "%" : undefined}
            nota={cabinaDia?.humidity_iss_max !== undefined ? `EDA · ${fechaVentana(gold, "eda")}` : S.env.noEda} />
          <Cabina icono={IconoPresion} titulo={S.env.cabinPressure} valor={String(profile.cabinPressureMmHg)} unidad="mmHg" nota={profile.label} />
        </div>
      </section>

      <section aria-labelledby="series-entorno">
        <h2 id="series-entorno" className="eyebrow mb-2 mt-2">{S.env.series}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title={S.env.flux}
            footer={<>
              {protonesReales && <ProvenanceTag provenance={REAL("GOES · NOAA SWPC", fechaVentana(gold, "goes"))} className={PROV} />}
              {protonesSimulados && <ProvenanceTag provenance={SIMULADO} className={PROV} />}
              <Simulados dias={protonAnomalias} />
            </>}>
            {protonPoints.length === 0 ? (
              <EmptyState message={S.env.emptyFlux} />
            ) : (
              <LineChart label={S.env.flux} unit="pfu" log days={MISSION_DAYS} currentDay={day} points={protonPoints} markers={protonAnomalias} markerLabel={S.env.simulatedMarker}
                threshold={{ value: PFU_THRESHOLD, label: S.env.eventThreshold }} includeThresholds className="h-64" />
            )}
          </Panel>

          <Panel title={`${S.env.co2} (mmHg @ ${profile.cabinPressureMmHg} mmHg)`}
            footer={<>
              {co2Real && <ProvenanceTag provenance={REAL("EDA · NASA OSDR", fechaVentana(gold, "eda"))} className={PROV} />}
              {co2Simulado && <ProvenanceTag provenance={SIMULADO} className={PROV} />}
              <Simulados dias={co2Anomalias} />
            </>}>
            {co2Points.length === 0 ? (
              <EmptyState message={S.env.emptyCo2} />
            ) : (
              <LineChart label={S.env.co2} unit="mmHg" days={MISSION_DAYS} currentDay={day} points={co2Points} markers={co2Anomalias} markerLabel={S.env.simulatedMarker}
                threshold={{ value: CO2_LIMIT_MMHG, label: S.env.co2Limit }} includeThresholds className="h-64" />
            )}
          </Panel>

          <Panel title={S.env.dose} note={notaDosis}
            footer={dosisPoints.length > 0 && <ProvenanceTag provenance={REAL("RadLab · NASA OSDR", fechaVentana(gold, "radlab"))} className={PROV} />}>
            {dosisPoints.length === 0 ? (
              <EmptyState message={S.env.emptyDose} />
            ) : (
              <LineChart label={S.env.dose} unit="mSv" days={MISSION_DAYS} currentDay={day} points={dosisPoints} className="h-64" />
            )}
          </Panel>

          <Panel title={S.env.spe}
            footer={eventosDonki.length > 0 && <ProvenanceTag provenance={REAL("DONKI SEP · NASA CCMC", fechaVentana(gold, "donki"))} className={PROV} />}>
            {eventosDonki.length === 0 ? (
              <EmptyState message={S.env.noEvents} />
            ) : (
              <ul className="flex max-h-[26rem] flex-col gap-3 overflow-y-auto pr-1">
                {eventosDonki.map((e, i) => (
                  <li key={`${e.sepID}-${i}`} className="flex gap-3 rounded-2xl border border-border bg-muted/40 p-3">
                    <IconoTormenta className="mt-0.5 size-7 shrink-0 text-status-watch" />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <p className="break-words font-mono text-base font-semibold">{e.t_mision} · {e.sepID}</p>
                      <p className="text-base text-muted-foreground">
                        {S.env.realUtc}: <span className="font-mono">{e.t_real}</span> · {e.instrumentos.join(", ") || "SEP"}
                      </p>
                      {e.actividades.length > 0 && (
                        <p className="text-base text-muted-foreground">{S.env.activity}: {e.actividades.join(", ")}</p>
                      )}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <ProvenanceTag provenance={REAL("NASA CCMC DONKI", e.t_real.slice(0, 10))} className={PROV} />
                        {e.link && (
                          <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border bg-card px-4 text-base font-semibold hover:bg-accent active:scale-[0.98]">
                            {S.env.openDonki} <ExternalLink aria-hidden className="size-5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>

      {/* Procedencia: de qué escenario, ventanas reales y fuentes sale cada cifra de esta pantalla */}
      <section id="procedencia" aria-labelledby="procedencia-h" className="scroll-mt-40 rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 id="procedencia-h" className="flex items-center gap-3 text-2xl font-bold leading-tight">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted"><IconoDatos className="size-7" /></span>
            {S.env.provenanceTitle}
          </h2>
          {gold && (
            <div className="flex flex-wrap items-center gap-2">
              {kpi && (
                <span className="rounded border border-border bg-background px-2.5 py-1.5 font-mono text-sm text-muted-foreground">
                  {S.env.simulator(kpi.n_misiones_anomalia, kpi.n_misiones_control, kpi.semilla_principal)}
                </span>
              )}
              <ProvenanceTag provenance={REAL(S.env.verified, gold.ventanas[0]?.desde.slice(0, 10) ?? "")} className={PROV} />
            </div>
          )}
        </div>

        {!gold && !cargando && (
          <div className="mt-4 rounded-2xl border border-status-watch/40 bg-status-watch/10 p-4">
            <p className="text-lg font-semibold">{S.env.noGoldTitle}</p>
            <p className="mt-1 text-pretty text-base leading-relaxed text-muted-foreground">{S.env.noGoldDetail}</p>
          </div>
        )}

        <div className="mt-4 grid gap-x-8 gap-y-5 xl:grid-cols-2">
          {gold && (
            <div className="min-w-0">
              <h3 className="text-lg font-semibold">{S.env.scenario} · <span className="font-mono">{gold.escenario}</span></h3>
              <p className="mt-1.5 text-pretty text-base leading-relaxed text-muted-foreground">{catalogo.historial.aviso_entorno ?? gold.aviso}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[30rem] text-left text-base">
                  <caption className="eyebrow pb-2 text-left">{S.env.windows}</caption>
                  <thead>
                    <tr className="border-b border-border text-sm text-muted-foreground">
                      <th scope="col" className="py-2 pr-4 font-medium">{S.env.colSource}</th>
                      <th scope="col" className="py-2 pr-4 font-medium">{S.env.colFrom}</th>
                      <th scope="col" className="py-2 pr-4 font-medium">{S.env.colTo}</th>
                      <th scope="col" className="py-2 font-medium">{S.env.colDay}</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono text-sm tabular-nums">
                    {gold.ventanas.map((v, idx) => (
                      <tr key={`${v.fuente}-${idx}`} className="border-b border-border/60 last:border-0">
                        <th scope="row" className="py-2.5 pr-4 text-base font-semibold">{v.fuente}</th>
                        <td className="py-2.5 pr-4">{v.desde}</td>
                        <td className="py-2.5 pr-4">{v.hasta}</td>
                        <td className="py-2.5">D{String(v.dia_mision).padStart(3, "0")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-lg font-semibold">{S.env.sources}</h3>
            <ul className="mt-1.5 flex flex-col divide-y divide-border/60">
              {catalogo.fuentes.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 py-2.5 text-base">
                  <span className="min-w-0">
                    <span className="font-semibold">{s.label}</span> <span className="text-muted-foreground">· {s.feeds}</span>
                  </span>
                  <ProvenanceTag provenance={s.provenance} className={cn(PROV, "h-auto whitespace-normal leading-snug")} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <IndicatorCard info={catalogo.radiacion} />
    </div>
  )
}
