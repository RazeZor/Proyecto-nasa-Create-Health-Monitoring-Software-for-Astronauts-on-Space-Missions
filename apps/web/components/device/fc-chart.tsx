"use client"

import { tramosSerie } from "@/lib/reloj"

const W = 720
const H = 230
const P = { l: 46, r: 62, t: 16, b: 32 }
/** Color del pulso: el mismo del corazón en la pantalla de inicio (identidad del indicador, no un estado). */
export const COLOR_PULSO = "#e5484d"

/** Curva de FC de los últimos minutos del reloj. Se corta en los huecos: no inventa datos entre lecturas. */
export function FcChart({ serie, label, className }: { serie: { t: string; fc_lpm: number | null }[]; label: string; className?: string }) {
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
  const base = H - P.b
  const ticks = [min, Math.round((min + max) / 2), max]
  const hora = (ms: number) => new Date(ms).toISOString().slice(11, 19)
  const ultimo = puntos.at(-1)!
  const linea = (tr: { ms: number; fc: number }[]) => tr.map((p, i) => `${i ? "L" : "M"}${x(p.ms).toFixed(1)} ${y(p.fc).toFixed(1)}`).join(" ")

  return (
    <figure className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${label}: ${ultimo.fc} bpm, ${hora(ultimo.ms)} UTC`}>
        <defs>
          <linearGradient id="fc-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={COLOR_PULSO} stopOpacity={0.22} />
            <stop offset="1" stopColor={COLOR_PULSO} stopOpacity={0} />
          </linearGradient>
        </defs>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray="2 5" />
            <text x={P.l - 8} y={y(v) + 5} textAnchor="end" className="fill-muted-foreground text-[14px] tabular-nums">{v}</text>
          </g>
        ))}
        {[t0, t1].map((ms, i) => (
          <text key={ms} x={i ? W - P.r : P.l} y={H - 8} textAnchor={i ? "end" : "start"} className="fill-muted-foreground text-[14px] tabular-nums">{hora(ms)}</text>
        ))}
        {/* cada tramo por separado: entre uno y otro queda el hueco de señal, sin unir */}
        {tramos.map((tr) => (
          <g key={tr[0].ms}>
            {tr.length > 1 && <path d={`${linea(tr)}L${x(tr.at(-1)!.ms).toFixed(1)} ${base}L${x(tr[0].ms).toFixed(1)} ${base}Z`} fill="url(#fc-area)" />}
            <path d={linea(tr)} fill="none" stroke={COLOR_PULSO} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
            {tr.length === 1 && <circle cx={x(tr[0].ms)} cy={y(tr[0].fc)} r={2.5} fill={COLOR_PULSO} />}
          </g>
        ))}
        <circle cx={x(ultimo.ms)} cy={y(ultimo.fc)} r={10} fill={COLOR_PULSO} opacity={0.18} />
        <circle cx={x(ultimo.ms)} cy={y(ultimo.fc)} r={5} fill={COLOR_PULSO} />
        <text x={x(ultimo.ms) + 14} y={y(ultimo.fc) + 6} className="fill-foreground text-[18px] font-semibold tabular-nums">{ultimo.fc}</text>
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  )
}
