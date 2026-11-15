"use client"

import { useEffect, useState } from "react"
import { estadoReporte, type ReporteServidor } from "@/lib/cola"
import { cn } from "@/lib/utils"

export function formatDelay(minutes: number) {
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} s`
  return `${Math.round(minutes)} min`
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

export function useReportState(createdAt: number, delayMinutes: number, servidor?: ReporteServidor) {
  const [now, setNow] = useState(() => Date.now())
  const e = estadoReporte(createdAt, delayMinutes, now, servidor)
  useEffect(() => {
    if (e.state === "arrived") return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [e.state])
  return e
}

/** Cuenta atrás mm:ss. Por defecto es pequeña; `className` la agranda donde es el dato principal. */
export function DelayCountdown({ remainingMs, label, className }: { remainingMs: number; label: string; className?: string }) {
  return (
    <span className={cn("tabular-nums", className ?? "font-mono text-sm")} aria-live="off">
      <span className="sr-only">{label} </span>
      {fmt(remainingMs)}
    </span>
  )
}
