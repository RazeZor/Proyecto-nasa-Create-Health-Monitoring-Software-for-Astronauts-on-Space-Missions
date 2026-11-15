"use client"

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Undo2 } from "lucide-react"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const pos = (d: number, dias: number) => `${((d - 1) / Math.max(dias - 1, 1)) * 100}%`

/**
 * Navegador de días de misión para pantalla táctil: el día grande con saltos de 1 y 7, y debajo la línea del viaje con lo
 * recorrido, la marca de «hoy» (el día actual del viaje, al que se vuelve con un toque) y los días con alerta.
 */
export function NavegadorDias({ dia, dias, hoy, diasConAlerta, onCambiar }: {
  dia: number
  dias: number
  hoy: number
  diasConAlerta: number[]
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
      <div className="relative px-1 pb-5 pt-4">
        {/* líneas de la pista: lo recorrido hasta hoy en color, lo que falta apagado, las alertas encima */}
        <div aria-hidden className="pointer-events-none absolute inset-x-1 top-1/2 -mt-[0.6rem] h-1.5 rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary/40" style={{ width: pos(hoy, dias) }} />
          {diasConAlerta.map((d) => (
            <span key={d} title={S.crew.alertDay} className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-status-watch" style={{ left: pos(d, dias) }} />
          ))}
          <span className="absolute -top-4 -translate-x-1/2 text-xs font-semibold text-primary" style={{ left: pos(hoy, dias) }}>{S.crew.today}</span>
          <span className="absolute top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 bg-primary" style={{ left: pos(hoy, dias) }} />
        </div>
        <input
          type="range" min={1} max={dias} step={1} value={dia} onChange={(e) => onCambiar(Number(e.target.value))}
          aria-label={S.top.missionDay} className={cn("relative z-10 block h-11 w-full cursor-pointer appearance-none bg-transparent accent-primary")}
        />
        <div aria-hidden className="mt-1 flex justify-between font-mono text-xs text-muted-foreground"><span>1</span><span>{dias}</span></div>
      </div>
    </div>
  )
}
