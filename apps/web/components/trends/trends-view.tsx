"use client"

import { useState } from "react"
import { useApp } from "@/components/app-context"
import { IndicatorCard } from "@/components/shared/indicator-card"
import { LineChart } from "@/components/shared/line-chart"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { LayerChip, ProvenanceTag } from "@/components/shared/status"
import { BASELINE_SWITCH_DAY } from "@/lib/engine"
import { S } from "@/lib/strings"
import type { IndicatorId } from "@/lib/types"
import { cn } from "@/lib/utils"


export function TrendsView() {
  const { day, analisis, catalogo } = useApp()
  const INDICATORS = catalogo.indicadores
  const IDS = Object.keys(INDICATORS) as IndicatorId[]
  const [id, setId] = useState<IndicatorId>("restingHr")
  const info = INDICATORS[id]
  const points = analisis.vitals(day)
    .map((v) => ({ day: v.day, value: v[id] as number | undefined }))
    .filter((p): p is { day: number; value: number } => typeof p.value === "number")
  const alerts = analisis.alerts(day).filter((a) => a.zone === info.zone)
  const layers = [...new Set(alerts.map((a) => a.layer))]

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={S.trends.title} subtitle={S.trends.subtitle} />
      <div role="tablist" aria-label={S.trends.indicator} className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {IDS.map((k) => (
          <button key={k} role="tab" type="button" aria-selected={k === id} onClick={() => setId(k)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium",
              k === id ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-accent",
            )}>
            {INDICATORS[k].label}
          </button>
        ))}
      </div>

      <section role="tabpanel" aria-label={info.label} className="rounded-xl border border-border bg-card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">{info.label} <span className="font-normal text-muted-foreground">({info.unit})</span></h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-sm bg-muted-foreground/25" />{S.trends.preflight}</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="size-3 rounded-sm bg-primary/25" />{S.trends.inflight}</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="h-3 border-l-2 border-dashed border-primary" />{S.trends.baselineSwitch} (D{BASELINE_SWITCH_DAY})</span>
            <span className="flex items-center gap-1.5"><span aria-hidden className="text-status-watch">▲</span>{S.trends.alertMarker}</span>
          </div>
        </div>
        {points.length === 0 ? (
          <EmptyState message={S.trends.noData} />
        ) : (
          <LineChart label={info.label} unit={info.unit} points={points} days={analisis.missionDays} currentDay={day}
            bands={analisis.baselines(id)} switchDay={BASELINE_SWITCH_DAY} markers={alerts.map((a) => a.day)}
            threshold={info.safetyHigh ? { value: info.safetyHigh, label: `Safety limit ${info.safetyHigh}` } : info.safetyLow ? { value: info.safetyLow, label: `Safety limit ${info.safetyLow}` } : undefined} />
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ProvenanceTag provenance={{ kind: "simulated" }} />
          {layers.length > 0 && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {S.trends.layersFired}: {layers.map((l) => <LayerChip key={l} layer={l} />)}
            </span>
          )}
        </div>
      </section>

      <div className="mt-6">
        <IndicatorCard info={info} />
      </div>
    </div>
  )
}
