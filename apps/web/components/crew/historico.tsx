"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { useMemo } from "react"
import { useApp } from "@/components/app-context"
import { BodyStage } from "@/components/body/body-stage"
import { TrayectoriaMarte } from "@/components/environment/trayectoria-marte"
import { TrendsView } from "@/components/trends/trends-view"
import { S } from "@/lib/strings"
import type { IndicatorId, Status } from "@/lib/types"

const HEX: Record<Status, string> = { ok: "#16a34a", watch: "#f59e0b", act: "#ef4444" }

/** Modo histórico de un tripulante: elige el día de misión, ve su cuerpo ese día en pequeño (minimapa) y sus tendencias. */
export function Historico() {
  const { day, setDay, analisis, sex, theme } = useApp()
  const dias = analisis.missionDays
  // El cuerpo de ese día: cada indicador fuera de rango tiñe su órgano (el 3D de body-view, sin marcadores ni giro a la vista)
  const estadoEscena = useMemo(() => {
    const estados = analisis.indicatorStatus(day)
    const lpm = analisis.vitals(day).find((v) => v.day === day)?.restingHr ?? null
    const calientes = (Object.keys(estados) as IndicatorId[]).filter((id) => estados[id] !== "ok")
      .map((id) => ({ ancla: id, color: HEX[estados[id]], radio: estados[id] === "act" ? 0.15 : 0.12 }))
    return { sexo: sex, oscuro: theme === "dark", lpm, vista: null, calientes, giroFijo: 0 }
  }, [analisis, day, sex, theme])
  const boton = "flex size-10 items-center justify-center hover:bg-accent disabled:opacity-40"
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2" role="group" aria-label={S.top.missionDay}>
          <span className="eyebrow">{S.top.missionDay}</span>
          <div className="flex items-center rounded-xl border border-input bg-card">
            <button type="button" className={`${boton} rounded-l-xl`} onClick={() => setDay(day - 7)} disabled={day <= 1} aria-label={S.crew.back7}>
              <ChevronsLeft aria-hidden className="size-5" />
            </button>
            <button type="button" className={boton} onClick={() => setDay(day - 1)} disabled={day <= 1} aria-label={S.top.prevDay}>
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <p className="min-w-20 px-1 text-center font-mono text-lg tabular-nums" aria-live="polite">
              <span className="sr-only">{S.common.day} </span>
              <span className="font-semibold">{String(day).padStart(2, "0")}</span>
              <span className="text-sm text-muted-foreground">/{dias}</span>
            </p>
            <button type="button" className={boton} onClick={() => setDay(day + 1)} disabled={day >= dias} aria-label={S.top.nextDay}>
              <ChevronRight aria-hidden className="size-5" />
            </button>
            <button type="button" className={`${boton} rounded-r-xl`} onClick={() => setDay(day + 7)} disabled={day >= dias} aria-label={S.crew.forward7}>
              <ChevronsRight aria-hidden className="size-5" />
            </button>
          </div>
          {/* con un tránsito de meses, arrastrar es lo cómodo en una pantalla táctil */}
          <input
            type="range" min={1} max={dias} step={1} value={day} onChange={(e) => setDay(Number(e.target.value))}
            aria-label={S.top.missionDay} className="h-11 min-w-48 flex-1 cursor-pointer accent-primary"
          />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[11rem_1fr] lg:items-start">
        <div className="mx-auto w-44 lg:sticky lg:top-4">
          <BodyStage className="h-72 w-full" estado={estadoEscena} marcadores={[]} onMarcador={() => {}} />
          <div className="mt-3"><TrayectoriaMarte dia={day} mini /></div>
        </div>
        <TrendsView />
      </div>
    </div>
  )
}
