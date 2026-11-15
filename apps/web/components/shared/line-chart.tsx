import { S } from "@/lib/strings"
import type { BandPoint } from "@/lib/types"

interface Props {
  label: string
  points: { day: number; value: number }[]
  days: number
  currentDay: number
  /** Banda personal por día (referencia vigente del motor). */
  band?: BandPoint[]
  threshold?: { value: number; label: string }
  markers?: number[]
  switchDay?: number
  log?: boolean
  unit: string
}

const W = 720
const H = 260
const P = { l: 48, r: 16, t: 16, b: 32 }

export function LineChart({ label, points, days, currentDay, band = [], threshold, markers = [], switchDay, log, unit }: Props) {
  const tf = (v: number) => (log ? Math.log10(Math.max(v, 0.1)) : v)
  const vals = [...points.map((p) => p.value), ...band.flatMap((b) => [b.low, b.high]), ...(threshold ? [threshold.value] : [])]
  let min = Math.min(...vals.map(tf))
  let max = Math.max(...vals.map(tf))
  const pad = (max - min) * 0.12 || 1
  min -= pad
  max += pad
  const x = (d: number) => P.l + ((d - 1) / (days - 1)) * (W - P.l - P.r)
  const y = (v: number) => P.t + (1 - (tf(v) - min) / (max - min)) * (H - P.t - P.b)
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ")
  const ticks = Array.from({ length: 4 }, (_, i) => min + pad + ((max - min - 2 * pad) * i) / 3)
  const fmtTick = (t: number) => {
    const v = log ? 10 ** t : t
    return v >= 100 ? Math.round(v).toString() : v.toFixed(v < 10 ? 1 : 0)
  }
  const last = points.at(-1)

  return (
    <figure className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}. ${last ? `${last.value} ${unit} · ${S.common.day} ${last.day}` : ""}`}>
        {band.length > 1 && (
          <path className="fill-primary/15"
            d={`${band.map((b, i) => `${i ? "L" : "M"}${x(b.day).toFixed(1)} ${y(b.high).toFixed(1)}`).join(" ")} ${[...band].reverse().map((b) => `L${x(b.day).toFixed(1)} ${y(b.low).toFixed(1)}`).join(" ")} Z`} />
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(log ? 10 ** t : t)} y2={y(log ? 10 ** t : t)} className="stroke-border" strokeDasharray="2 4" />
            <text x={P.l - 8} y={y(log ? 10 ** t : t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{fmtTick(t)}</text>
          </g>
        ))}
        {[1, 7, 14, 21, 28].filter((d) => d <= days).map((d) => (
          <text key={d} x={x(d)} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">D{d}</text>
        ))}
        {switchDay && (
          <line x1={x(switchDay)} x2={x(switchDay)} y1={P.t} y2={H - P.b} className="stroke-primary" strokeDasharray="5 4" />
        )}
        {threshold && (
          <g>
            <line x1={P.l} x2={W - P.r} y1={y(threshold.value)} y2={y(threshold.value)} className="stroke-status-act" strokeWidth={1.5} strokeDasharray="6 4" />
            <text x={W - P.r} y={y(threshold.value) - 6} textAnchor="end" className="fill-status-act text-[11px] font-medium">{threshold.label}</text>
          </g>
        )}
        <line x1={x(currentDay)} x2={x(currentDay)} y1={P.t} y2={H - P.b} className="stroke-foreground/30" />
        <path d={path} fill="none" className="stroke-chart-1" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p) => {
          const alert = markers.includes(p.day)
          return alert ? (
            <path key={p.day} d={`M${x(p.day)} ${y(p.value) - 8}l7 12h-14z`} className="fill-status-watch stroke-background" strokeWidth={1.5}>
              <title>{`${S.trends.alertOn} ${p.day}: ${p.value} ${unit}`}</title>
            </path>
          ) : (
            <circle key={p.day} cx={x(p.day)} cy={y(p.value)} r={2.5} className="fill-chart-1">
              <title>{`${S.common.day} ${p.day}: ${p.value} ${unit}`}</title>
            </circle>
          )
        })}
      </svg>
    </figure>
  )
}
