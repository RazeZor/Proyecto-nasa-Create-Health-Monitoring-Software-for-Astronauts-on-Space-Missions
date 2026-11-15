"use client"

import { useMemo, useState } from "react"
import { useApp } from "@/components/app-context"
import { IndicatorCard } from "@/components/shared/indicator-card"
import { ICONO_INDICADOR } from "@/components/shared/iconos"
import { LineChart } from "@/components/shared/line-chart"
import { EmptyState } from "@/components/shared/states"
import { LayerChip, ProvenanceTag, StatusBadge, STATUS_ICON, statusText } from "@/components/shared/status"
import { Descomposicion } from "@/components/trends/descomposicion"
import { resumir, type Resumen } from "@/components/trends/resumen"
import { BASELINE_SWITCH_DAY } from "@/lib/engine"
import { S } from "@/lib/strings"
import type { IndicatorId, IndicatorInfo, Status } from "@/lib/types"
import { cn } from "@/lib/utils"

const BARRA: Record<Status, string> = { ok: "bg-status-ok", watch: "bg-status-watch", act: "bg-status-act" }
/** Como mucho un decimal: a un brazo de distancia, 36.5 dice lo mismo que 36.53. */
const num = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))
const MAX_ALERTAS = 6

/** La conclusión en una frase: solo compara la última medida con tu banda y los límites; no interpreta. */
function titular(r: Resumen): string {
  if (!r.ultimo) return S.trends.noData
  if (!r.lugar) return S.trends.headline.noReference
  const donde = S.trends.headline[r.lugar]
  if (!r.esHoy) return S.trends.headline.lastIs(r.ultimo.day, donde)
  return r.racha >= 2 ? S.trends.headline.streak(r.racha, donde) : S.trends.headline.todayIs(donde)
}

function limitesTexto(info: IndicatorInfo): string | null {
  if (info.safetyLow != null && info.safetyHigh != null) return `${info.safetyLow}–${info.safetyHigh}`
  return info.safetyLow != null ? `≥ ${info.safetyLow}` : info.safetyHigh != null ? `≤ ${info.safetyHigh}` : null
}

function Dato({ titulo, children, nota }: { titulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border bg-muted/40 px-4 py-2.5">
      <dt className="eyebrow">{titulo}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-1.5 leading-tight">{children}</dd>
      {nota && <dd className="mt-0.5 text-sm text-muted-foreground">{nota}</dd>}
    </div>
  )
}

export function TrendsView() {
  const { day, analisis, catalogo, mode } = useApp()
  const INDICATORS = catalogo.indicadores
  const IDS = Object.keys(INDICATORS) as IndicatorId[]
  const [id, setId] = useState<IndicatorId>("restingHr")
  const [explorado, setExplorado] = useState<number | null>(null)

  // Serie, banda y resumen de cada indicador: el selector enseña el valor vigente de todos.
  const { series, resumenes, estados } = useMemo(() => {
    const vitales = analisis.vitals(day)
    const series = {} as Record<IndicatorId, { day: number; value: number }[]>
    const resumenes = {} as Record<IndicatorId, Resumen>
    for (const k of Object.keys(catalogo.indicadores) as IndicatorId[]) {
      series[k] = vitales.flatMap((v) => (typeof v[k] === "number" ? [{ day: v.day, value: v[k] as number }] : []))
      resumenes[k] = resumir(series[k], analisis.band(k), catalogo.indicadores[k], day)
    }
    return { series, resumenes, estados: analisis.indicatorStatus(day) }
  }, [analisis, catalogo, day])

  const info = INDICATORS[id]
  const points = series[id]
  const resumen = resumenes[id]
  const estado = estados[id]
  const banda = analisis.band(id)
  const alerts = analisis.alerts(day).filter((a) => a.zone === info.zone && !a.informative)
  const layers = [...new Set(alerts.map((a) => a.layer))]
  const limites = limitesTexto(info)
  // Si el motor no da el indicador por bueno, la alerta vigente de su zona explica por qué (misma vigencia que el motor).
  const motivo = estado !== "ok" ? alerts.find((a) => a.day === day || (a.day === day - 1 && a.layer !== "A")) : undefined
  const Icono = ICONO_INDICADOR[id]
  const zona = S.zones[info.zone]
  const fueraDeHoy = explorado !== null && explorado !== (resumen.ultimo?.day ?? null)

  const elegirIndicador = (k: IndicatorId) => {
    setId(k)
    setExplorado(null)
  }

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      <header className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-3xl font-bold leading-tight">{S.trends.title}</h1>
        <p className="text-base text-muted-foreground">{S.trends.subtitle}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(250px,300px)_minmax(0,1fr)] lg:items-start">
        {/* Selector: una tarjeta por indicador, con su icono, su valor vigente y su estado */}
        <div role="tablist" aria-label={S.trends.indicator} aria-orientation="vertical" className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:flex lg:flex-col">
          {IDS.map((k) => {
            const I = ICONO_INDICADOR[k]
            const r = resumenes[k]
            const e = estados[k]
            const E = STATUS_ICON[e]
            const activa = k === id
            return (
              <button
                key={k}
                role="tab"
                type="button"
                id={`tab-${k}`}
                aria-selected={activa}
                aria-controls="panel-tendencia"
                onClick={() => elegirIndicador(k)}
                className={cn(
                  "relative flex min-h-[4.5rem] items-center gap-3 overflow-hidden rounded-2xl border bg-card py-2 pl-4 pr-3 text-left shadow-sm transition-all duration-200 active:scale-[0.98]",
                  activa ? "border-primary ring-2 ring-primary/40" : "border-border hover:bg-accent/50",
                )}
              >
                <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", r.ultimo ? BARRA[e] : "bg-border")} />
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors", activa ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>
                  <I className="size-7" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold leading-tight">{S.body.short[k]}</span>
                  <span className={cn("mt-0.5 flex items-center gap-1 text-sm font-medium", r.ultimo ? statusText[e] : "text-muted-foreground")}>
                    {r.ultimo ? (
                      <>
                        <E aria-hidden className="size-4 shrink-0" />
                        <span className="truncate">{S.status[e]}{!r.esHoy && <span className="font-normal text-muted-foreground"> · D{r.ultimo.day}</span>}</span>
                      </>
                    ) : S.body.notMeasured}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-mono text-2xl font-semibold leading-none tabular-nums">{r.ultimo ? num(r.ultimo.value) : "—"}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{INDICATORS[k].unit}</span>
                </span>
              </button>
            )
          })}
        </div>

        <section id="panel-tendencia" role="tabpanel" aria-labelledby={`tab-${id}`} className="min-w-0 rounded-3xl border border-border bg-card p-4 shadow-sm md:p-5">
          {/* La conclusión, antes que la gráfica */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground">
              <Icono className="size-9" />
            </span>
            <div className="min-w-0 flex-1 basis-80">
              <p className="eyebrow">{info.label}{info.unit && ` · ${info.unit}`}</p>
              {/* con una alerta vigente manda su motivo: «dentro de tu rango» junto a «Vigilar» se leería contradictorio */}
              <h2 className="mt-1 text-balance text-2xl font-bold leading-tight xl:text-3xl">{motivo ? S.layerLong[motivo.layer] : titular(resumen)}</h2>
              {motivo && <p className="mt-1 text-pretty text-lg text-muted-foreground">{titular(resumen)} <span className="whitespace-nowrap">({motivo.indicator} · D{motivo.day})</span></p>}
            </div>
            {resumen.ultimo && (
              <p className="flex flex-col items-end gap-1">
                <span className="eyebrow">{S.trends.engineStatus}</span>
                <StatusBadge status={estado} size="lg" />
              </p>
            )}
          </div>

          <dl className="mt-3 grid gap-2 sm:grid-cols-3">
            <Dato titulo={!resumen.ultimo || resumen.esHoy ? `${S.trends.today} · ${S.common.day} ${day}` : S.trends.lastReading(resumen.ultimo.day)}>
              <span className="font-mono text-4xl font-semibold leading-none tabular-nums">{resumen.ultimo ? num(resumen.ultimo.value) : "—"}</span>
              <span className="text-base text-muted-foreground">{resumen.ultimo ? info.unit : S.body.notMeasured}</span>
            </Dato>
            <Dato titulo={S.trends.personalRange}>
              {resumen.banda ? (
                <>
                  <span className="font-mono text-2xl font-semibold tabular-nums">{resumen.banda.low.toFixed(1)}–{resumen.banda.high.toFixed(1)}</span>
                  <span className="text-base text-muted-foreground">{info.unit}</span>
                </>
              ) : <span className="text-base text-muted-foreground">{banda.length ? "—" : S.trends.noPersonalRange}</span>}
            </Dato>
            <Dato titulo={S.trends.safetyLimits}>
              {limites ? (
                <>
                  <span className="font-mono text-2xl font-semibold tabular-nums">{limites}</span>
                  <span className="text-base text-muted-foreground">{info.unit}</span>
                </>
              ) : <span className="text-base text-muted-foreground">{S.trends.noSafetyLimits}</span>}
            </Dato>
          </dl>

          <div className="mt-4">
            {points.length === 0 ? (
              <EmptyState message={S.trends.noData} />
            ) : (
              <>
                <LineChart
                  label={info.label} unit={info.unit} points={points} days={analisis.missionDays} currentDay={day}
                  band={banda} switchDay={BASELINE_SWITCH_DAY} markers={alerts.map((a) => a.day)}
                  thresholds={[
                    ...(info.safetyHigh != null ? [{ value: info.safetyHigh, label: `${S.trends.safetyLimit} ${info.safetyHigh}` }] : []),
                    ...(info.safetyLow != null ? [{ value: info.safetyLow, label: `${S.trends.safetyLimit} ${info.safetyLow}` }] : []),
                  ]}
                  selectedDay={explorado} onSelectDay={setExplorado}
                  className="h-[clamp(300px,calc(100dvh-43rem),560px)]"
                />
                <div className="mt-3 flex min-h-12 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <p className="text-base text-muted-foreground">{S.trends.explore}</p>
                  {fueraDeHoy && (
                    <button type="button" onClick={() => setExplorado(null)} className="inline-flex min-h-12 items-center rounded-full border border-border px-5 text-base font-semibold hover:bg-accent active:scale-[0.98]">
                      {S.trends.backToToday}
                    </button>
                  )}
                </div>
                <div className="mt-3 border-t border-border pt-3">
                  <Descomposicion puntos={points} dia={day} dias={analisis.missionDays} color="#2f6fdb" />
                </div>
              </>
            )}
          </div>

          {/* Detalle: por qué hay marcas en la gráfica y de dónde sale el dato */}
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
            {alerts.length > 0 ? (
              <div>
                <h3 className="eyebrow mb-2">{S.trends.zoneAlerts(zona)}</h3>
                <ul className="flex flex-wrap items-center gap-2">
                  {alerts.slice(0, MAX_ALERTAS).map((a) => {
                    const A = STATUS_ICON[a.status]
                    const conPunto = points.some((p) => p.day === a.day)
                    return (
                      <li key={a.id}>
                        <button
                          type="button"
                          disabled={!conPunto}
                          onClick={() => setExplorado(a.day)}
                          aria-label={`${S.trends.seeDay(a.day)}: ${a.indicator} ${a.value}`}
                          aria-pressed={explorado === a.day}
                          className={cn(
                            "inline-flex min-h-12 items-center gap-2 rounded-full border bg-card px-4 text-left text-base enabled:active:scale-[0.98]",
                            explorado === a.day ? "border-primary ring-2 ring-primary/40" : "border-border enabled:hover:bg-accent",
                          )}
                        >
                          <A aria-hidden className={cn("size-5 shrink-0", statusText[a.status])} />
                          <span className="font-mono font-semibold tabular-nums">D{a.day}</span>
                          <span>{a.indicator}{a.value && <span className="text-muted-foreground"> · {a.value}</span>}</span>
                        </button>
                      </li>
                    )
                  })}
                  {alerts.length > MAX_ALERTAS && <li className="px-1 font-mono text-base text-muted-foreground">+{alerts.length - MAX_ALERTAS}</li>}
                </ul>
              </div>
            ) : (
              <p className="text-base text-muted-foreground">{S.trends.noZoneAlerts(zona)}</p>
            )}
            {layers.length > 0 && (
              <div>
                <h3 className="eyebrow mb-2">{S.trends.layersFired}</h3>
                <ul className="flex flex-col gap-1.5">
                  {layers.map((l) => (
                    <li key={l} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-base">
                      <LayerChip layer={l} className="px-2.5 py-1 text-sm" />
                      <span className="text-muted-foreground">{S.layerLong[l]}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <ProvenanceTag provenance={{ kind: mode === "real" ? "measured" : "simulated" }} className="gap-1.5 px-2.5 py-1.5 text-sm" />
              {banda.length > 0 && <p className="min-w-0 flex-1 basis-80 text-pretty text-sm leading-relaxed text-muted-foreground">{S.trends.bandHelp}</p>}
            </div>
          </div>
        </section>
      </div>

      <IndicatorCard info={info} />
    </div>
  )
}
