"use client"

import { useEffect, useState } from "react"
import type { ReportState } from "@/lib/types"

export function formatDelay(minutes: number) {
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} s`
  return `${Math.round(minutes)} min`
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
}

export function useReportState(createdAt: number, delayMinutes: number) {
  const [now, setNow] = useState(() => Date.now())
  const arrival = createdAt + 3000 + delayMinutes * 60_000
  useEffect(() => {
    if (now >= arrival) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [arrival, now])
  const state: ReportState = now < createdAt + 3000 ? "queued" : now < arrival ? "sent" : "arrived"
  return { state, remainingMs: arrival - now, progress: Math.min(1, (now - createdAt) / (arrival - createdAt)) }
}

export function DelayCountdown({ remainingMs, label }: { remainingMs: number; label: string }) {
  return (
    <span className="font-mono text-sm tabular-nums" aria-live="off">
      <span className="sr-only">{label} </span>
      {fmt(remainingMs)}
    </span>
  )
}
