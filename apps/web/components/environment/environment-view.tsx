"use client"

import { useEffect, useState } from "react"
import { Database, ExternalLink, Sun, WifiOff } from "lucide-react"
import { useApp } from "@/components/app-context"
import { IndicatorCard } from "@/components/shared/indicator-card"
import { LineChart } from "@/components/shared/line-chart"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { ProvenanceTag, StatusBadge } from "@/components/shared/status"
import {
  cargarEscenarioDiario,
  cargarKpiSimulacion,
  cargarPanelGold,
  listarPanelesGold,
  type KpiSimulacionEtl,
  type PanelEntornoEtl,
  type ResumenDiarioEtl,
} from "@/lib/etl-client"
import { MISSION_DAYS } from "@/lib/mock/crew"
import {
  CAREER_LIMIT_MSV,
  CO2_LIMIT_MMHG,
  ENV_SOURCES,
  PFU_THRESHOLD,
  ppmToMmHg,
  RADIATION_INDICATOR,
} from "@/lib/mock/environment"
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
  if (!v) return "Sin ventana"
  return `${v.desde.slice(0, 10)} → ${v.hasta.slice(0, 10)}`
}

export function EnvironmentView() {
  const { day, profile } = useApp()
  const [paneles, setPaneles] = useState<string[]>([])
  const [panelActivo, setPanelActivo] = useState<string>("")
  const [gold, setGold] = useState<PanelEntornoEtl | null>(null)
  const [diario, setDiario] = useState<ResumenDiarioEtl[]>([])
  const [kpi, setKpi] = useState<KpiSimulacionEtl | null>(null)
  const [cargando, setCargando] = useState<boolean>(true)
  const [enVivo, setEnVivo] = useState<boolean>(false)

  useEffect(() => {
    let cancelado = false
    Promise.all([listarPanelesGold(), cargarKpiSimulacion()]).then(([{ lista, enVivo: vivo }, simKpi]) => {
      if (cancelado) return
      setPaneles(lista)
      setEnVivo(vivo)
      setKpi(simKpi)
      if (lista.length === 0) {
        setCargando(false)
        return
      }
      const preferencia = ["mision-vigia", "tormenta-mayo-2024", "panel-demo"]
      const inicial = preferencia.find((p) => lista.includes(p)) ?? lista[0]
      setPanelActivo(inicial)
    })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!panelActivo) return
    let cancelado = false
    setCargando(true)
    Promise.all([cargarPanelGold(panelActivo), cargarEscenarioDiario(panelActivo)]).then(([pRes, dRes]) => {
      if (cancelado) return
      setGold(pRes.panel)
      setDiario(dRes.diario)
      setEnVivo(pRes.enVivo && dRes.enVivo)
      setCargando(false)
    })
    return () => {
      cancelado = true
    }
  }, [panelActivo])

  // Puntos reales para las tres gráficas desde Gold (/paneles + /escenarios/{nombre}/diario)
  const dosisPoints = (gold?.dosis?.por_dia ?? []).map((d) => ({
    day: d.dia_mision,
    value: Number((d.acumulada / 1000).toFixed(4)),
  }))

  const protonDiario = diario
    .filter((r) => r.fuente === "goes" && r.serie.includes(">=10 MeV"))
    .sort((a, b) => a.dia_mision - b.dia_mision)
    .map((r) => ({ day: r.dia_mision, value: Number(r.max.toFixed(4)) }))

  const protonPoints =
    protonDiario.length > 0
      ? protonDiario
      : (gold?.protones ?? [])
          .filter((p) => p.serie.includes(">=10 MeV"))
          .sort((a, b) => a.dia_mision - b.dia_mision)
          .map((p) => ({ day: p.dia_mision, value: p.max_pfu }))

  const co2Diario = diario
    .filter((r) => r.fuente === "eda" && r.variable === "co2_iss")
    .sort((a, b) => a.dia_mision - b.dia_mision)
    .map((r) => ({
      day: r.dia_mision,
      value: ppmToMmHg(r.max_prom_horario ?? r.max, profile.cabinPressureMmHg),
    }))

  const co2Points =
    co2Diario.length > 0
      ? co2Diario
      : (gold?.cabina ?? [])
          .sort((a, b) => a.dia_mision - b.dia_mision)
          .map((c) => ({
            day: c.dia_mision,
            value: ppmToMmHg(c.co2_ppm_promedio_horario_max ?? c.co2_ppm_max ?? 0, profile.cabinPressureMmHg),
          }))

  // KPI actuales priorizando coincidencia con `day`, o último día real del escenario
  const dosisDia = gold?.dosis?.por_dia.find((d) => d.dia_mision === day) ?? gold?.dosis?.por_dia.at(-1)
  const dosisMSv = dosisDia ? Number((dosisDia.acumulada / 1000).toFixed(3)) : null
  const pctCarrera = gold?.dosis?.porcentaje_limite_carrera ?? 0

  const cabinaDia = gold?.cabina.find((c) => c.dia_mision === day) ?? gold?.cabina.at(-1)
  const co2PpmActual = cabinaDia?.co2_ppm_promedio_horario_max ?? cabinaDia?.co2_ppm_max ?? null
  const co2MmHg = co2PpmActual !== null ? ppmToMmHg(co2PpmActual, profile.cabinPressureMmHg) : null
  const co2Status =
    co2MmHg === null ? "ok" : co2MmHg >= CO2_LIMIT_MMHG ? "act" : co2MmHg >= CO2_LIMIT_MMHG * 0.8 ? "watch" : "ok"

  const eventosDonki = gold?.eventos ?? []

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={S.env.title} subtitle={S.env.subtitle}>
        {paneles.length > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            <Database aria-hidden className="size-4 text-status-ok" />
            <span className="font-medium text-status-ok">{enVivo ? "API Gold (en vivo)" : "Gold"}</span>
            <label htmlFor="select-panel-gold" className="sr-only">
              Escenario Gold
            </label>
            <select
              id="select-panel-gold"
              value={panelActivo}
              onChange={(e) => setPanelActivo(e.target.value)}
              className="rounded border border-input bg-background px-2 py-1 font-mono text-xs text-foreground"
            >
              {paneles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-status-watch/40 bg-status-watch/10 px-3 py-1.5 text-xs text-status-watch">
            <WifiOff aria-hidden className="size-4" />
            <span>{cargando ? "Consultando apps/api..." : "apps/api desconectada (sin series sintéticas)"}</span>
          </div>
        )}
      </PageHeader>

      {!enVivo && !cargando && (
        <div className="mb-6 rounded-xl border border-status-watch/40 bg-status-watch/5 p-4 text-sm">
          <p className="font-medium text-foreground">No hay datos Gold cargados desde `apps/api`.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta vista no usa curvas sintéticas ni valores inventados. Inicia el servidor en{" "}
            <code className="font-mono text-foreground">apps/api</code> (
            <code className="font-mono text-foreground">uvicorn main:app --port 8000</code>) para visualizar las series reales de GOES, DONKI, RadLab y EDA.
          </p>
        </div>
      )}

      {gold && (
        <section className="mb-6 rounded-xl border border-primary/35 bg-primary/5 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              Escenario Gold · <span className="font-mono text-primary">{gold.escenario}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {kpi && (
                <span className="rounded border border-border bg-background px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  Simulador §5.5 · {kpi.n_misiones_anomalia}+{kpi.n_misiones_control} misiones (semilla {kpi.semilla_principal})
                </span>
              )}
              <ProvenanceTag provenance={REAL("API ETL · SHA-256 verificado", gold.ventanas[0]?.desde.slice(0, 10) ?? "")} />
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
              ? `${pctCarrera}% · ${S.env.careerLimit}${gold.dosis.orientativa ? " · orientativa" : ` · ${gold.dosis.series.join(", ")}`}`
              : "Sin dosimetría en este escenario",
          ],
          [
            S.env.co2,
            co2MmHg !== null ? `${co2MmHg} mmHg` : "—",
            co2PpmActual !== null
              ? `${Math.round(co2PpmActual)} ppm @ ${profile.cabinPressureMmHg} mmHg`
              : "Sin telemetría de cabina",
          ],
          [
            S.env.temp,
            cabinaDia?.temperature_iss_max !== undefined ? `${cabinaDia.temperature_iss_max} °C` : "—",
            cabinaDia?.humidity_iss_max !== undefined ? `${S.env.humidity} ${cabinaDia.humidity_iss_max}%` : "Sin lectura EDA",
          ],
          [S.env.cabinPressure, `${profile.cabinPressureMmHg} mmHg`, profile.label],
        ].map(([k, v, sub], i) => (
          <div key={k} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{k}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{v}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {i === 1 && co2MmHg !== null && <StatusBadge status={co2Status} size="sm" />} {sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title={`${S.env.dose} (${gold?.dosis?.tipo === "equivalente" ? "dosis equivalente real" : S.env.doseNote})`}
          footer={<ProvenanceTag provenance={REAL("RadLab · NASA OSDR", fechaVentana(gold, "radlab"))} />}
        >
          {dosisPoints.length === 0 ? (
            <EmptyState message="Sin serie diaria de dosimetría RadLab en este escenario Gold." />
          ) : (
            <>
              <LineChart label={S.env.dose} unit="mSv" days={MISSION_DAYS} currentDay={day} points={dosisPoints} />
              <div className="mt-2" aria-label={`${pctCarrera}% de ${S.env.careerLimit}`}>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(pctCarrera, 1))}%` }} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {dosisMSv} / {CAREER_LIMIT_MSV} mSv ({pctCarrera}% límite de carrera · {gold?.dosis?.series.join(", ")})
                </p>
              </div>
            </>
          )}
        </Panel>

        <Panel
          title={`${S.env.flux} (>=10 MeV)`}
          footer={<ProvenanceTag provenance={REAL("GOES-18 · NOAA SWPC", fechaVentana(gold, "goes"))} />}
        >
          {protonPoints.length === 0 ? (
            <EmptyState message="Sin serie diaria de protones GOES en este escenario Gold." />
          ) : (
            <LineChart
              label={S.env.flux}
              unit="pfu"
              log
              days={MISSION_DAYS}
              currentDay={day}
              points={protonPoints}
              threshold={{ value: PFU_THRESHOLD, label: S.env.eventThreshold }}
            />
          )}
        </Panel>

        <Panel
          title={`${S.env.co2} (mmHg @ ${profile.cabinPressureMmHg} mmHg)`}
          footer={<ProvenanceTag provenance={REAL("EDA RR-1 · NASA OSDR", fechaVentana(gold, "eda"))} />}
        >
          {co2Points.length === 0 ? (
            <EmptyState message="Sin serie diaria de CO2 EDA en este escenario Gold." />
          ) : (
            <LineChart
              label={S.env.co2}
              unit="mmHg"
              days={MISSION_DAYS}
              currentDay={day}
              points={co2Points}
              threshold={{ value: CO2_LIMIT_MMHG, label: S.env.co2Limit }}
            />
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
              {eventosDonki.map((e) => (
                <li key={e.sepID} className="flex gap-3 rounded-lg border border-border p-3">
                  <Sun aria-hidden className="mt-0.5 size-5 shrink-0 text-status-watch" />
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-sm font-medium">
                        {e.t_mision} · {e.sepID}
                      </p>
                      {e.link && (
                        <a
                          href={e.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          DONKI <ExternalLink aria-hidden className="size-3" />
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Real UTC: <span className="font-mono">{e.t_real}</span> · {e.instrumentos.join(", ") || "SEP"}
                    </p>
                    {e.actividades.length > 0 && (
                      <p className="text-xs text-muted-foreground">Actividad: {e.actividades.join(", ")}</p>
                    )}
                    <ProvenanceTag provenance={REAL("NASA CCMC DONKI", e.t_real.slice(0, 10))} className="self-start" />
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h3 className="mb-2 mt-5 text-sm font-semibold text-muted-foreground">{S.env.sources}</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {ENV_SOURCES.map((s) => (
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
        <IndicatorCard info={RADIATION_INDICATOR} />
      </div>
    </div>
  )
}
