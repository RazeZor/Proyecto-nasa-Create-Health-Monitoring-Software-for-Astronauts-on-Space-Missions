"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Undo2 } from "lucide-react"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const pos = (d: number, dias: number) => `${((d - 1) / Math.max(dias - 1, 1)) * 100}%`

/**
 * Navegador de días de misión para pantalla táctil: el día grande con saltos de 1 y 7, y debajo la línea del viaje con lo
 * recorrido, la marca de «hoy» (el día actual del viaje, al que se vuelve con un toque) y los días con alerta, en ámbar o rojo según su gravedad (todo lo demás, en verde).
 */
export function NavegadorDias({ dia, dias, hoy, fecha, alertas, onCambiar }: {
  dia: number
  fecha?: string
  dias: number
  hoy: number
  alertas: { dia: number; estado: "watch" | "act" }[]
  onCambiar: (d: number) => void
}) {
  const boton = "flex size-11 items-center justify-center hover:bg-accent active:bg-accent disabled:opacity-40"
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3" role="group" aria-label={S.top.missionDay}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center overflow-hidden rounded-xl border border-input">
          <button type="button" className={boton} onClick={() => onCambiar(dia - 7)} disabled={dia <= 1} aria-label={S.crew.back7}><ChevronsLeft aria-hidden className="size-5" /></button>
          <button type="button" className={boton} onClick={() => onCambiar(dia - 1)} disabled={dia <= 1} aria-label={S.top.prevDay}><ChevronLeft aria-hidden className="size-5" /></button>
          <p className="min-w-24 px-2 text-center font-mono tabular-nums" aria-live="polite">
            <span className="sr-only">{S.common.day} </span>
            <span className="text-2xl font-semibold">{String(dia).padStart(2, "0")}</span>
            <span className="text-sm text-muted-foreground">/{dias}</span>
            {fecha && <span className="block text-xs text-muted-foreground">{fecha}</span>}
          </p>
          <button type="button" className={boton} onClick={() => onCambiar(dia + 1)} disabled={dia >= dias} aria-label={S.top.nextDay}><ChevronRight aria-hidden className="size-5" /></button>
          <button type="button" className={boton} onClick={() => onCambiar(dia + 7)} disabled={dia >= dias} aria-label={S.crew.forward7}><ChevronsRight aria-hidden className="size-5" /></button>
        </div>
        <button
          type="button" onClick={() => onCambiar(hoy)} disabled={dia === hoy}
          className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-sm font-semibold hover:bg-accent active:scale-[0.98] disabled:opacity-40"
        >
          <Undo2 aria-hidden className="size-4" />
          {S.crew.backToToday(hoy)}
        </button>
      </div>
      <div className="relative px-3.5 pb-6">
        {/* pista: todo en verde (lo recorrido hasta hoy lleno, lo que falta apagado); solo los días con alerta cambian de color */}
        <div aria-hidden className="pointer-events-none absolute inset-x-3.5 top-[22px] h-2 -translate-y-1/2 rounded-full bg-status-ok/15">
          <div className="h-full rounded-full bg-status-ok/55" style={{ width: pos(hoy, dias) }} />
          {alertas.map((a) => (
            <span
              key={a.dia} title={S.crew.alertDay}
              className={cn("absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full", a.estado === "act" ? "bg-status-act" : "bg-status-watch")}
              style={{ left: pos(a.dia, dias) }}
            />
          ))}
          <span className="absolute top-1/2 h-6 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-status-ok" style={{ left: pos(hoy, dias) }} />
        </div>
        <input
          type="range" min={1} max={dias} step={1} value={dia} onChange={(e) => onCambiar(Number(e.target.value))}
          aria-label={S.top.missionDay} className="slider-dias relative z-10 block h-11 w-full cursor-pointer"
        />
        <div aria-hidden className="relative mt-1 h-5 font-mono text-xs text-muted-foreground">
          <span className="absolute left-0">1</span>
          <span className="absolute -translate-x-1/2 font-sans text-sm font-semibold text-status-ok" style={{ left: pos(hoy, dias) }}>{S.crew.today}</span>
          <span className="absolute right-0">{dias}</span>
        </div>
      </div>
    </div>
  )
}
