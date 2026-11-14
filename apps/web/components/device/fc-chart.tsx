"use client"

import { tramosSerie } from "@/lib/reloj"

const W = 720
const H = 200
const P = { l: 40, r: 12, t: 12, b: 26 }

/** Curva de FC de los últimos minutos del reloj. Se corta en los huecos: no inventa datos entre lecturas. */
export function FcChart({ serie, label }: { serie: { t: string; fc_lpm: number | null }[]; label: string }) {
  const tramos = tramosSerie(serie)
  const puntos = tramos.flat()
  if (puntos.length < 2) return null
  const t0 = puntos[0].ms
  const t1 = Math.max(puntos.at(-1)!.ms, t0 + 1)
  const fcs = puntos.map((p) => p.fc)
  const min = Math.floor(Math.min(...fcs) - 5)
  const max = Math.ceil(Math.max(...fcs) + 5)
  const x = (ms: number) => P.l + ((ms - t0) / (t1 - t0)) * (W - P.l - P.r)
  const y = (fc: number) => P.t + (1 - (fc - min) / (max - min)) * (H - P.t - P.b)
  const ticks = [min, Math.round((min + max) / 2), max]
  const hora = (ms: number) => new Date(ms).toISOString().slice(11, 19)
  const ultimo = puntos.at(-1)!

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: ${ultimo.fc} bpm, ${hora(ultimo.ms)} UTC`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray="2 4" />
            <text x={P.l - 6} y={y(v) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{v}</text>
          </g>
        ))}
        {[t0, t1].map((ms, i) => (
          <text key={ms} x={x(ms)} y={H - 8} textAnchor={i ? "end" : "start"} className="fill-muted-foreground text-[11px]">{hora(ms)}</text>
        ))}
        {tramos.map((tr) => (
          <path key={tr[0].ms} d={tr.map((p, i) => `${i ? "L" : "M"}${x(p.ms).toFixed(1)} ${y(p.fc).toFixed(1)}`).join(" ")}
            className="fill-none stroke-status-act" strokeWidth={2} strokeLinejoin="round" />
        ))}
        <circle cx={x(ultimo.ms)} cy={y(ultimo.fc)} r={4} className="fill-status-act" />
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  )
}
