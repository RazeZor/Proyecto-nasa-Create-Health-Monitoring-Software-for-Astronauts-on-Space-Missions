"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useApp } from "@/components/app-context"
import { BodyFigure } from "@/components/body/body-figure"
import { TrendsView } from "@/components/trends/trends-view"
import { S } from "@/lib/strings"

/** Modo histórico de un tripulante: elige el día de misión, ve su cuerpo ese día en pequeño (minimapa) y sus tendencias. */
export function Historico() {
  const { day, setDay, analisis, sex } = useApp()
  const dias = analisis.missionDays
  const boton = "flex size-10 items-center justify-center hover:bg-accent disabled:opacity-40"
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2" role="group" aria-label={S.top.missionDay}>
          <span className="eyebrow">{S.top.missionDay}</span>
          <div className="flex items-center rounded-xl border border-input bg-card">
            <button type="button" className={`${boton} rounded-l-xl`} onClick={() => setDay(day - 1)} disabled={day <= 1} aria-label={S.top.prevDay}>
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <p className="min-w-16 px-1 text-center font-mono text-lg tabular-nums" aria-live="polite">
              <span className="sr-only">{S.common.day} </span>
              <span className="font-semibold">{String(day).padStart(2, "0")}</span>
              <span className="text-sm text-muted-foreground">/{dias}</span>
            </p>
            <button type="button" className={`${boton} rounded-r-xl`} onClick={() => setDay(day + 1)} disabled={day >= dias} aria-label={S.top.nextDay}>
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[8rem_1fr] lg:items-start">
        <figure aria-label={S.crew.minicuerpo} className="mx-auto w-28 rounded-3xl border border-border bg-card p-3 lg:sticky lg:top-4">
          <BodyFigure zones={analisis.zones(day)} selected={null} onSelect={() => {}} sex={sex} side="front" />
          <figcaption className="mt-2 text-center text-xs text-muted-foreground">{S.crew.minicuerpo}</figcaption>
        </figure>
        <TrendsView />
      </div>
    </div>
  )
}
