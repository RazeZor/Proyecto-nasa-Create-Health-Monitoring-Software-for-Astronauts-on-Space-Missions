"use client"

import { useEffect, useState } from "react"
import { Database, Sun } from "lucide-react"
import { useApp } from "@/components/app-context"
import { IndicatorCard } from "@/components/shared/indicator-card"
import { LineChart } from "@/components/shared/line-chart"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { ProvenanceTag, StatusBadge } from "@/components/shared/status"
import { cargarPanelGold, listarPanelesGold, type PanelEntornoEtl } from "@/lib/etl-client"
import { MISSION_DAYS } from "@/lib/mock/crew"
import { CAREER_LIMIT_MSV, CO2_LIMIT_MMHG, ENV, ENV_SOURCES, PFU_THRESHOLD, ppmToMmHg, RADIATION_INDICATOR, SOLAR_EVENTS } from "@/lib/mock/environment"
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

export function EnvironmentView() {
  const { day, profile } = useApp()
  const [paneles, setPaneles] = useState<string[]>([])
  const [panelActivo, setPanelActivo] = useState<string>("")
  const [gold, setGold] = useState<PanelEntornoEtl | null>(null)
  const [enVivo, setEnVivo] = useState<boolean>(false)

  useEffect(() => {
    let cancelado = false
    listarPanelesGold().then(({ lista, enVivo: vivo }) => {
      if (cancelado || lista.length === 0) return
      setPaneles(lista)
      setEnVivo(vivo)
      const inicial = lista.includes("panel-demo") ? "panel-demo" : lista[0]
      setPanelActivo(inicial)
    })
    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    if (!panelActivo) return
    let cancelado = false
    cargarPanelGold(panelActivo).then(({ panel, enVivo: vivo }) => {
      if (!cancelado) {
        setGold(panel)
        setEnVivo(vivo)
      }
    })
    return () => {
      cancelado = true
    }
  }, [panelActivo])

  const env = ENV.filter((e) => e.day <= day)
  const today = env.at(-1)!
  const co2 = ppmToMmHg(today.co2Ppm, profile.cabinPressureMmHg)
  const co2Status = co2 >= CO2_LIMIT_MMHG ? "act" : co2 >= CO2_LIMIT_MMHG * 0.8 ? "watch" : "ok"
  const events = SOLAR_EVENTS.filter((e) => e.day <= day)
  const pct = Math.round((today.cumulativeMSv / CAREER_LIMIT_MSV) * 100)
  const perfilClave = profile.id === "station" ? "estacion" : profile.id === "lunar" || profile.id === "mars" ? "superficie" : "transito"
  const cabinaGold = gold?.cabina?.[0]
  const dosisGold = gold?.dosis?.por_dia?.[0]
  const protonGold = gold?.protones?.find((p) => p.serie.endsWith(">=10 MeV")) ?? gold?.protones?.[0]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={S.env.title} subtitle={S.env.subtitle}>
        {paneles.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs">
            <Database aria-hidden className="size-4 text-status-ok" />
            <span className="font-medium text-status-ok">
              {enVivo ? "API Gold ETL (en vivo)" : "Gold ETL (respaldo local)"}
            </span>
            <label htmlFor="select-panel-gold" className="sr-only">Escenario Gold</label>
            <select
              id="select-panel-gold"
              value={panelActivo}
              onChange={(e) => setPanelActivo(e.target.value)}
              className="rounded border border-input bg-background px-2 py-1 font-mono text-xs text-foreground"
            >
              {paneles.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </PageHeader>

      {gold && (
        <section className="mb-6 rounded-xl border border-primary/35 bg-primary/5 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              Panel Gold reanclado · <span className="font-mono text-primary">{gold.escenario}</span>
            </h2>
            <ProvenanceTag provenance={REAL("API ETL · SHA-256 verificado", `D${dosisGold?.dia_mision ?? cabinaGold?.dia_mision ?? 22}`)} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{gold.aviso}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                Dosis ({gold.dosis ? `${gold.dosis.tipo} · ${gold.dosis.series.join(", ")}` : "sin datos"})
              </p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {dosisGold ? `${dosisGold.dosis} ${gold.dosis?.unidad}` : "—"}
              </p>
              {gold.dosis && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Cobertura {Math.round((dosisGold?.cobertura ?? 0) * 100)}% · {gold.dosis.orientativa ? "Orientativa (1 µGy ≈ 1 µSv)" : "Equivalente directa"}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                Protones GOES ({protonGold?.serie ?? "sin datos"})
              </p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {protonGold ? `${protonGold.max_pfu} pfu` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Modo tormenta: {protonGold?.modo_tormenta ? "Activo (≥10 pfu)" : "Inactivo"}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-xs text-muted-foreground">
                Cabina EDA ({cabinaGold?.mision ?? "sin datos"} · perfil {perfilClave})
              </p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {cabinaGold?.co2_mmhg_por_perfil ? `${cabinaGold.co2_mmhg_por_perfil[perfilClave]} mmHg CO2` : "—"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {cabinaGold ? `${cabinaGold.co2_ppm_promedio_horario_max ?? "—"} ppm · ${cabinaGold.temperature_iss_max ?? "—"} °C · ${cabinaGold.humidity_iss_max ?? "—"}% hum.` : "Sin telemetría en este escenario"}
              </p>
            </div>
          </div>
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
          [S.env.dose, `${today.cumulativeMSv} mSv`, `${pct}% · ${S.env.careerLimit}`],
          [S.env.co2, `${co2} mmHg`, `${today.co2Ppm} ppm @ ${profile.cabinPressureMmHg} mmHg`],
          [S.env.temp, `${today.cabinTempC} °C`, `${S.env.humidity} ${today.humidityPct}%`],
          [S.env.cabinPressure, `${profile.cabinPressureMmHg} mmHg`, profile.label],
        ].map(([k, v, sub], i) => (
          <div key={k} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{k}</p>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">{v}</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {i === 1 && <StatusBadge status={co2Status} size="sm" />} {sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title={`${S.env.dose} (${S.env.doseNote})`} footer={<ProvenanceTag provenance={REAL("RadLab · NASA OSDR", "2016-2022")} />}>
          <LineChart label={S.env.dose} unit="mSv" days={MISSION_DAYS} currentDay={day}
            points={env.map((e) => ({ day: e.day, value: e.cumulativeMSv }))} />
          <div className="mt-2" aria-label={`${pct}% of ${S.env.careerLimit}`}>
            <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">{today.cumulativeMSv} / {CAREER_LIMIT_MSV} mSv</p>
          </div>
        </Panel>

        <Panel title={S.env.flux} footer={<ProvenanceTag provenance={REAL("GOES · NOAA SWPC", "2024-05-10/14")} />}>
          <LineChart label={S.env.flux} unit="pfu" log days={MISSION_DAYS} currentDay={day}
            points={env.map((e) => ({ day: e.day, value: e.protonPfu }))}
            threshold={{ value: PFU_THRESHOLD, label: S.env.eventThreshold }} />
        </Panel>

        <Panel title={`${S.env.co2} (mmHg @ ${profile.cabinPressureMmHg} mmHg)`} footer={<ProvenanceTag provenance={REAL("EDA · NASA OSDR", "2021")} />}>
          <LineChart label={S.env.co2} unit="mmHg" days={MISSION_DAYS} currentDay={day}
            points={env.map((e) => ({ day: e.day, value: ppmToMmHg(e.co2Ppm, profile.cabinPressureMmHg) }))}
            threshold={{ value: CO2_LIMIT_MMHG, label: S.env.co2Limit }} />
        </Panel>

        <Panel title={S.env.spe}>
          {events.length === 0 ? <EmptyState message={S.env.noEvents} /> : (
            <ul className="flex flex-col gap-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 rounded-lg border border-border p-3">
                  <Sun aria-hidden className="mt-0.5 size-5 shrink-0 text-status-watch" />
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">{S.common.day} {e.day} · {e.classLabel} · {e.peakPfu} pfu</p>
                    <p className="text-sm text-muted-foreground">{e.note}</p>
                    <ProvenanceTag provenance={e.provenance} className="self-start" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mb-2 mt-5 text-sm font-semibold text-muted-foreground">{S.env.sources}</h3>
          <ul className="flex flex-col gap-2 text-sm">
            {ENV_SOURCES.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2">
                <span><span className="font-medium">{s.label}</span> <span className="text-muted-foreground">· {s.feeds}</span></span>
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
