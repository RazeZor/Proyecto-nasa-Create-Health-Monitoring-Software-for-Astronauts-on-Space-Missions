import { DelayCountdown } from "@/components/shared/delay-countdown"
import { type Icono, IconoEspera, IconoNave, IconoSobre, IconoTierra, IconoVisto } from "@/components/reports/iconos"
import { S } from "@/lib/strings"
import type { ReportState } from "@/lib/types"

function Extremo({ Ico, nombre }: { Ico: Icono; nombre: string }) {
  return (
    <div className="flex w-16 shrink-0 flex-col items-center gap-1">
      <span className="flex size-14 items-center justify-center rounded-full border border-border bg-muted text-foreground">
        <Ico className="size-8" />
      </span>
      <span className="eyebrow">{nombre}</span>
    </div>
  )
}

const PISTA: Record<ReportState, string> = { queued: S.reports.queuedHint, sent: S.reports.sentHint, arrived: S.reports.arrivedHint }

/**
 * El retardo de comunicación, dibujado: el informe (el sobre) sale de la nave y avanza hacia Tierra a medida que
 * pasa el tiempo; debajo, el estado en palabras y la cuenta atrás de lo que falta.
 */
export function Trayecto({ state, progress, remainingMs }: { state: ReportState; progress: number; remainingMs: number }) {
  const llego = state === "arrived"
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100)
  // ya entregado: una sola línea (no hay nada que esperar); el dibujo grande se reserva para lo que aún viaja
  if (llego)
    return (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100} aria-label={S.reports.journey}>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-status-ok/12 text-status-ok"><IconoVisto className="size-6" /></span>
        <p className="min-w-0 flex-1 basis-40">
          <span className="block text-xl font-semibold leading-tight text-status-ok">{S.reports.arrived}</span>
          <span className="block text-base text-muted-foreground">{S.reports.arrivedHint}</span>
        </p>
        <span aria-hidden className="flex shrink-0 items-center gap-2 text-muted-foreground">
          <IconoNave className="size-7" />
          <span className="h-1.5 w-24 rounded-full bg-status-ok" />
          <IconoTierra className="size-7 text-status-ok" />
        </span>
      </div>
    )
  return (
    <div>
      <div className="flex items-start gap-2">
        <Extremo Ico={IconoNave} nombre={S.reports.ship} />
        <div className="relative mx-5 h-14 flex-1" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={S.reports.journey}>
          <span aria-hidden className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-muted-foreground/40" />
          <span aria-hidden className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${pct}%` }} />
          <span aria-hidden className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-[left] duration-1000 ease-linear" style={{ left: `${pct}%` }}>
            <IconoSobre className="size-6" />
          </span>
        </div>
        <Extremo Ico={IconoTierra} nombre={S.reports.earth} />
      </div>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <p className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
            {state === "sent" ? <IconoSobre className="size-6" /> : <IconoEspera className="size-6" />}
          </span>
          <span>
            <span className="block text-xl font-semibold leading-tight">{S.reports[state]}</span>
            <span className="block text-base text-muted-foreground">{PISTA[state]}</span>
          </span>
        </p>
        {state === "sent" && (
          <p className="text-right">
            <span aria-hidden className="eyebrow block">{S.reports.arrivesIn}</span>
            <DelayCountdown remainingMs={remainingMs} label={S.reports.arrivesIn} className="text-5xl font-semibold leading-none" />
          </p>
        )}
      </div>
    </div>
  )
}
