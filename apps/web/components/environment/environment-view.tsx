"use client"

import { useEffect, useState } from "react"
import { Database, ExternalLink, Sun, WifiOff } from "lucide-react"
import { useApp } from "@/components/app-context"
import { IndicatorCard } from "@/components/shared/indicator-card"
import { LineChart } from "@/components/shared/line-chart"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { ProvenanceTag, StatusBadge } from "@/components/shared/status"
import { cargarKpiSimulacion, cargarPanelGold, type KpiSimulacionEtl, type PanelEntornoEtl } from "@/lib/etl-client"
import { S } from "@/lib/strings"

const REAL = (source: string, date: string) => ({ kind: "real" as const, source, date })

function Panel({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 md:p-5">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
      {footer && <div className="mt-3 flex flex-wrap items-center gap-2">{footer}</div>}
    </section>
  )
}

function fechaVentana(gold: PanelEntornoEtl | null, fuente: "radlab" | "goes" | "eda" | "donki"): string {
  const v = gold?.ventanas.find((w) => w.fuente === fuente)
  if (!v) return S.env.noWindow
  return `${v.desde.slice(0, 10)} → ${v.hasta.slice(0, 10)}`
}

/** Días cuyo dato es una anomalía simulada del escenario de demostración: se rotulan aparte de lo real. */
function Simulados({ dias }: { dias: number[] }) {
  if (dias.length === 0) return null
  return <span className="inline-flex items-center gap-1 rounded border border-status-watch/50 px-1.5 py-0.5 text-[11px] leading-none text-status-watch">{S.env.simulatedDays(dias.join(", "))}</span>
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
  const co2Status = !co2Dia ? "ok" : co2Dia.mmHg > CO2_LIMIT_MMHG ? "act" : co2Dia.mmHg >= CO2_LIMIT_MMHG * 0.8 ? "watch" : "ok"
  const eventosDonki = gold?.eventos ?? []
  const co2Anomalias = soloAnomalias(co2Simulados, (d) => (analisis.co2(d)?.mmHg ?? 0) > CO2_LIMIT_MMHG)
  const protonAnomalias = soloAnomalias(protonSimulados, (d) => (entorno.find((e) => e.dia_mision === d)?.flujo_protones_10mev_pfu ?? 0) >= PFU_THRESHOLD)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={S.env.title} subtitle={S.env.subtitle}>
        {gold ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            <Database aria-hidden className="size-4 text-status-ok" />
            <span className="font-medium text-status-ok">{online ? S.env.goldLive : S.env.goldCached}</span>
            <span className="font-mono text-foreground">{gold.escenario}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-status-watch/40 bg-status-watch/10 px-3 py-1.5 text-xs text-status-watch">
            <WifiOff aria-hidden className="size-4" />
            <span>{cargando ? S.env.loading : S.env.noGold}</span>
          </div>
        )}
      </PageHeader>

      {!gold && !cargando && (
        <div className="mb-6 rounded-xl border border-status-watch/40 bg-status-watch/5 p-4 text-sm">
          <p className="font-medium text-foreground">{S.env.noGoldTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground">{S.env.noGoldDetail}</p>
        </div>
      )}

      {gold && (
        <section className="mb-6 rounded-xl border border-primary/35 bg-primary/5 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              {S.env.scenario} · <span className="font-mono text-primary">{gold.escenario}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {kpi && (
                <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {S.env.simulator(kpi.n_misiones_anomalia, kpi.n_misiones_control, kpi.semilla_principal)}
                </span>
              )}
              <ProvenanceTag provenance={REAL(S.env.verified, gold.ventanas[0]?.desde.slice(0, 10) ?? "")} />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{gold.aviso}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {gold.ventanas.map((v, idx) => (
              <span key={`${v.fuente}-${idx}`} className="rounded border border-border bg-background px-2 py-0.5 font-mono">
                {v.fuente}: {v.desde} → {v.hasta} (D{String(v.dia_mision).padStart(3, "0")})
              </span>
            ))}
          </div>
        </section>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            S.env.dose,
            dosisMSv !== null ? `${dosisMSv} mSv` : "—",
            gold?.dosis
              ? `${pctCarrera}% · ${S.env.careerLimit}${gold.dosis.orientativa ? ` · ${S.env.indicative}` : ` · ${gold.dosis.series.join(", ")}`}`
              : S.env.noDose,
          ],
          [
            S.env.co2,
            co2Dia ? `${co2Dia.mmHg.toFixed(2)} mmHg` : "—",
            co2Dia ? `${co2Dia.ppm !== null ? `${Math.round(co2Dia.ppm)} ppm @ ${profile.cabinPressureMmHg} mmHg · ` : ""}${co2Dia.source}` : S.env.noCabin,
          ],
          [
            S.env.temp,
            cabinaDia?.temperature_iss_max !== undefined ? `${cabinaDia.temperature_iss_max} °C` : "—",
            cabinaDia?.humidity_iss_max !== undefined ? `${S.env.humidity} ${cabinaDia.humidity_iss_max}%` : S.env.noEda,
          ],
          [S.env.cabinPressure, `${profile.cabinPressureMmHg} mmHg`, profile.label],
        ].map(([k, v, sub], i) => (
          <div key={k} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{k}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{v}</p>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {i === 1 && co2Dia && <StatusBadge status={co2Status} size="sm" />} {sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={`${S.env.dose} (${gold?.dosis?.tipo === "equivalente" ? S.env.doseEquivalent : S.env.doseNote})`}
          footer={<ProvenanceTag provenance={REAL("RadLab · NASA OSDR", fechaVentana(gold, "radlab"))} />}
        >
          {dosisPoints.length === 0 ? (
            <EmptyState message={S.env.emptyDose} />
          ) : (
            <>
              <LineChart label={S.env.dose} unit="mSv" days={MISSION_DAYS} currentDay={day} points={dosisPoints} />
              <div className="mt-2" aria-label={`${pctCarrera}% · ${S.env.careerLimit}`}>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(pctCarrera, 1))}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dosisMSv} / {CAREER_LIMIT_MSV} mSv ({pctCarrera}% · {S.env.careerLimit} · {gold?.dosis?.series.join(", ")})
                </p>
              </div>
            </>
          )}
        </Panel>

        <Panel
          title={S.env.flux}
          footer={<><ProvenanceTag provenance={REAL("GOES · NOAA SWPC", fechaVentana(gold, "goes"))} /><Simulados dias={protonAnomalias} /></>}
        >
          {protonPoints.length === 0 ? (
            <EmptyState message={S.env.emptyFlux} />
          ) : (
            <LineChart label={S.env.flux} unit="pfu" log days={MISSION_DAYS} currentDay={day} points={protonPoints} markers={protonAnomalias}
              threshold={{ value: PFU_THRESHOLD, label: S.env.eventThreshold }} />
          )}
        </Panel>

        <Panel
          title={`${S.env.co2} (mmHg @ ${profile.cabinPressureMmHg} mmHg)`}
          footer={<><ProvenanceTag provenance={REAL("EDA · NASA OSDR", fechaVentana(gold, "eda"))} /><Simulados dias={co2Anomalias} /></>}
        >
          {co2Points.length === 0 ? (
            <EmptyState message={S.env.emptyCo2} />
          ) : (
            <LineChart label={S.env.co2} unit="mmHg" days={MISSION_DAYS} currentDay={day} points={co2Points} markers={co2Anomalias}
              threshold={{ value: CO2_LIMIT_MMHG, label: S.env.co2Limit }} />
          )}
        </Panel>

        <Panel
          title={S.env.spe}
          footer={<ProvenanceTag provenance={REAL("DONKI SEP · NASA CCMC", fechaVentana(gold, "donki"))} />}
        >
          {eventosDonki.length === 0 ? (
            <EmptyState message={S.env.noEvents} />
          ) : (
            <ul className="flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
              {eventosDonki.map((e, i) => (
                <li key={`${e.sepID}-${i}`} className="flex gap-3 rounded-lg border border-border p-3">
                  <Sun aria-hidden className="mt-0.5 size-5 shrink-0 text-status-watch" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-sm font-medium">
                        {e.t_mision} · {e.sepID}
                      </p>
                      {e.link && (
                        <a href={e.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          DONKI <ExternalLink aria-hidden className="size-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {S.env.realUtc}: <span className="font-mono">{e.t_real}</span> · {e.instrumentos.join(", ") || "SEP"}
                    </p>
                    {e.actividades.length > 0 && (
                      <p className="text-xs text-muted-foreground">{S.env.activity}: {e.actividades.join(", ")}</p>
                    )}
                    <ProvenanceTag provenance={REAL("NASA CCMC DONKI", e.t_real.slice(0, 10))} className="self-start" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-2 mt-5 text-sm font-semibold text-muted-foreground">{S.env.sources}</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {catalogo.fuentes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  <span className="font-medium">{s.label}</span> <span className="text-muted-foreground">· {s.feeds}</span>
                </span>
                <ProvenanceTag provenance={s.provenance} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-6">
        <IndicatorCard info={catalogo.radiacion} />
      </div>
    </div>
  )
}
