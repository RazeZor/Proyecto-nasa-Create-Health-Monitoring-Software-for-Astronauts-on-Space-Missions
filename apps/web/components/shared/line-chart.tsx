"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { marcasDeDia } from "@/lib/ejes"
import { S } from "@/lib/strings"
import type { BandPoint } from "@/lib/types"
import { cn } from "@/lib/utils"

interface Limite { value: number; label: string }

interface Props {
  label: string
  points: { day: number; value: number }[]
  days: number
  currentDay: number
  /** Banda personal por día (referencia vigente del motor). */
  band?: BandPoint[]
  threshold?: Limite
  /** Más límites además de `threshold` (por ejemplo, el inferior). */
  thresholds?: Limite[]
  /** Dibuja siempre los límites dentro de la escala; si no, uno muy lejano se anota en la leyenda sin aplastar la serie. */
  includeThresholds?: boolean
  markers?: number[]
  /** Qué significa un marcador (por defecto, una alerta). */
  markerLabel?: string
  switchDay?: number
  log?: boolean
  unit: string
  /** Día explorado, si lo controla quien usa la gráfica. */
  selectedDay?: number | null
  onSelectDay?: (day: number | null) => void
  /** Clases del área de dibujo; fijan su alto (por defecto `h-60`). */
  className?: string
}

/** Como mucho tres decimales, sin ceros de relleno. */
const num = (v: number) => String(Number(v.toFixed(Math.abs(v) < 1 ? 3 : 2)))

function pasoBonito(rango: number, n: number) {
  const bruto = rango / n
  const pot = 10 ** Math.floor(Math.log10(bruto))
  const m = bruto / pot
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * pot
}

/**
 * Serie de un indicador por día de misión, pensada para leerse a un brazo de distancia y explorarse con el dedo:
 * se dibuja en píxeles reales (el texto no encoge con el contenedor), el día se elige tocando o arrastrando y su
 * valor se lee en la franja de arriba, que el dedo no tapa. La leyenda va incluida.
 */
export function LineChart({
  label, points, days, currentDay, band = [], threshold, thresholds = [], includeThresholds, markers = [], markerLabel = S.trends.alertMarker,
  switchDay, log, unit, selectedDay, onSelectDay, className,
}: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const [{ w, h }, setTam] = useState({ w: 0, h: 0 })
  const [propio, setPropio] = useState<number | null>(null)
  useEffect(() => {
    const el = caja.current
    if (!el) return
    const medir = () => setTam({ w: Math.round(el.clientWidth), h: Math.round(el.clientHeight) })
    medir()
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  if (points.length === 0) return null

  const compacta = w > 0 && w < 560
  const P = { l: compacta ? 44 : 56, r: compacta ? 14 : 24, t: 30, b: 34 }
  const tf = (v: number) => (log ? Math.log10(Math.max(v, 0.01)) : v)
  // Nada «futuro»: la banda se dibuja hasta hoy, igual que la serie.
  const banda = band.filter((b) => b.day >= 1 && b.day <= Math.min(days, currentDay))
  const limites = [...(threshold ? [threshold] : []), ...thresholds]

  // Escala: la serie y su banda mandan; un límite entra si queda cerca (o si se pide).
  const nucleo = [...points.map((p) => p.value), ...banda.flatMap((b) => [b.low, b.high])].map(tf)
  let lo = Math.min(...nucleo)
  let hi = Math.max(...nucleo)
  const amplitud = hi - lo || Math.abs(hi) * 0.1 || 1
  const cerca = (l: Limite) => includeThresholds || (tf(l.value) <= hi + amplitud * 0.5 && tf(l.value) >= lo - amplitud * 0.5)
  const dentro = limites.filter(cerca)
  const fuera = limites.filter((l) => !cerca(l))
  lo = Math.min(lo, ...dentro.map((l) => tf(l.value)))
  hi = Math.max(hi, ...dentro.map((l) => tf(l.value)))
  const margen = (hi - lo) * 0.1 || 1
  const sinNegativos = !log && lo >= 0
  lo -= margen
  hi += margen
  if (sinNegativos && lo < 0) lo = 0

  const x = (d: number) => P.l + ((d - 1) / Math.max(days - 1, 1)) * (w - P.l - P.r)
  const yT = (t: number) => P.t + (1 - (t - lo) / (hi - lo)) * (h - P.t - P.b)
  const y = (v: number) => yT(tf(v))

  // Marcas del eje Y: números redondos (potencias de diez en escala logarítmica).
  let marcas: number[] = []
  let decimales = 0
  if (log) {
    for (let k = Math.ceil(lo); k <= Math.floor(hi); k++) marcas.push(k)
    if (marcas.length < 2) {
      marcas = []
      for (let k = Math.floor(lo); k <= Math.ceil(hi); k++) for (const m of [1, 2, 5]) {
        const t = k + Math.log10(m)
        if (t >= lo && t <= hi) marcas.push(t)
      }
    }
  } else {
    const paso = pasoBonito(hi - lo, compacta ? 3 : 4)
    decimales = Number.isInteger(paso) ? 0 : Number.isInteger(paso * 10) ? 1 : 2
    for (let t = Math.ceil(lo / paso) * paso; t <= hi + paso * 1e-6; t += paso) marcas.push(t)
  }
  const rotulo = (t: number) => (log ? String(Number((10 ** t).toPrecision(2))) : t.toFixed(decimales))

  // Día explorado: el que se toca; si no, hoy (o la última medida anterior).
  const porDefecto = points.findLast((p) => p.day <= currentDay) ?? points.at(-1)!
  const elegido = selectedDay !== undefined ? selectedDay : propio
  const sel = points.find((p) => p.day === elegido) ?? porDefecto
  const idx = points.indexOf(sel)
  const elegir = (d: number | null) => {
    setPropio(d)
    onSelectDay?.(d)
  }
  const alDedo = (e: React.PointerEvent<SVGRectElement>) => {
    const dx = e.clientX - e.currentTarget.getBoundingClientRect().left + P.l
    const cercano = points.reduce((a, p) => (Math.abs(x(p.day) - dx) < Math.abs(x(a.day) - dx) ? p : a))
    if (cercano.day !== sel.day || elegido == null) elegir(cercano.day)
  }
  const bandaSel = banda.find((b) => b.day === sel.day)
  const esAlerta = markers.includes(sel.day)
  const esHoy = sel.day === currentDay

  const camino = points.map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ")
  const xHoy = x(currentDay)
  const anclaHoy = xHoy > w - P.r - 28 ? "end" : xHoy < P.l + 28 ? "start" : "middle"
  const texto = compacta ? "text-[13px]" : "text-sm"
  const halo = { paintOrder: "stroke" as const, strokeWidth: 4 }
  const paso = "flex size-12 shrink-0 items-center justify-center rounded-full border border-input bg-card hover:bg-accent active:scale-[0.96] disabled:opacity-35"

  return (
    <figure className="w-full">
      {/* Lectura del día explorado: arriba, donde el dedo no la tapa */}
      <div className="mb-2 flex items-center gap-2">
        <button type="button" className={paso} disabled={idx <= 0} onClick={() => elegir(points[idx - 1].day)} aria-label={S.trends.prevPoint}>
          <ChevronLeft aria-hidden className="size-6" />
        </button>
        <p aria-live="polite" className="flex min-w-0 flex-1 flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5 text-center">
          <span className={cn("font-semibold", compacta ? "text-sm" : "text-base", esHoy ? "text-foreground" : "text-muted-foreground")}>
            {esHoy ? `${S.trends.today} · ` : ""}{S.common.day} {sel.day}
          </span>
          <span className="whitespace-nowrap">
            <span className={cn("font-mono font-semibold tabular-nums", compacta ? "text-2xl" : "text-3xl")}>{num(sel.value)}</span>{" "}
            <span className={cn("text-muted-foreground", compacta ? "text-sm" : "text-base")}>{unit}</span>
          </span>
          {bandaSel && (
            <span className={cn("whitespace-nowrap text-muted-foreground", compacta ? "text-sm" : "text-base")}>
              {S.trends.range}: <span className="font-mono tabular-nums text-foreground">{bandaSel.low.toFixed(1)}–{bandaSel.high.toFixed(1)}</span>
            </span>
          )}
          {esAlerta && (
            <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap font-semibold text-status-watch", compacta ? "text-sm" : "text-base")}>
              <svg aria-hidden viewBox="0 0 16 14" className="h-3.5 w-4 fill-current"><path d="M8 0l8 14H0z" /></svg>
              {markerLabel}
            </span>
          )}
        </p>
        <button type="button" className={paso} disabled={idx >= points.length - 1} onClick={() => elegir(points[idx + 1].day)} aria-label={S.trends.nextPoint}>
          <ChevronRight aria-hidden className="size-6" />
        </button>
      </div>

      <div ref={caja} className={cn("relative h-60 w-full", className)}>
        {w > 0 && h > 0 && (
          <svg width={w} height={h} className="absolute inset-0 touch-pan-y select-none" role="img"
            aria-label={`${label}. ${num(sel.value)} ${unit} · ${S.common.day} ${sel.day}`}>
            {marcas.map((t) => (
              <g key={t}>
                <line x1={P.l} x2={w - P.r} y1={yT(t)} y2={yT(t)} className="stroke-border" />
                <text x={P.l - 10} y={yT(t)} dy="0.35em" textAnchor="end" className={cn("fill-muted-foreground tabular-nums", texto)}>{rotulo(t)}</text>
              </g>
            ))}
            {marcasDeDia(days).map((d) => (
              <text key={d} x={x(d)} y={h - 10} textAnchor="middle" className={cn("fill-muted-foreground tabular-nums", texto)}>D{d}</text>
            ))}
            {banda.length > 1 && (
              <path className="fill-chart-1/15"
                d={`${banda.map((b, i) => `${i ? "L" : "M"}${x(b.day).toFixed(1)} ${y(b.high).toFixed(1)}`).join(" ")} ${[...banda].reverse().map((b) => `L${x(b.day).toFixed(1)} ${y(b.low).toFixed(1)}`).join(" ")} Z`} />
            )}
            {switchDay != null && switchDay <= days && (
              <line x1={x(switchDay)} x2={x(switchDay)} y1={P.t} y2={h - P.b} className="stroke-foreground/60" strokeWidth={1.5} strokeDasharray="2 5" strokeLinecap="round" />
            )}
            {dentro.map((l) => (
              <g key={l.label}>
                <line x1={P.l} x2={w - P.r} y1={y(l.value)} y2={y(l.value)} className="stroke-status-act" strokeWidth={2} strokeDasharray="7 5" />
                <text x={P.l + 8} y={y(l.value) - 7} className={cn("fill-foreground stroke-card font-medium", texto)} style={halo}>{l.label}</text>
              </g>
            ))}
            <line x1={xHoy} x2={xHoy} y1={P.t} y2={h - P.b} className="stroke-foreground/35" strokeWidth={1.5} />
            <text x={xHoy} y={P.t - 10} textAnchor={anclaHoy} className={cn("fill-foreground font-semibold", texto)}>{S.trends.today}</text>
            <path d={camino} fill="none" className="stroke-chart-1" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p) =>
              markers.includes(p.day) ? (
                <path key={p.day} d={`M${x(p.day)} ${y(p.value) - 10}l9 15h-18z`} className="fill-status-watch stroke-card" strokeWidth={2} strokeLinejoin="round" />
              ) : (
                <circle key={p.day} cx={x(p.day)} cy={y(p.value)} r={compacta ? 3 : 3.5} className="fill-chart-1 stroke-card" strokeWidth={1.5} />
              ),
            )}
            {/* Día explorado */}
            <line x1={x(sel.day)} x2={x(sel.day)} y1={P.t} y2={h - P.b} className="stroke-foreground" strokeWidth={1.5} />
            <circle cx={x(sel.day)} cy={y(sel.value)} r={8} className={cn("stroke-card", esAlerta ? "fill-status-watch" : "fill-chart-1")} strokeWidth={3} />
            <rect x={P.l} y={0} width={Math.max(w - P.l - P.r, 0)} height={h} fill="transparent" className="cursor-pointer"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                alDedo(e)
              }}
              onPointerMove={(e) => {
                if (e.currentTarget.hasPointerCapture(e.pointerId)) alDedo(e)
              }} />
          </svg>
        )}
      </div>

      <figcaption className={cn("mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-muted-foreground", compacta ? "text-[13px]" : "text-sm")}>
        <span className="flex items-center gap-2">
          <svg aria-hidden viewBox="0 0 28 12" className="h-3 w-7"><path d="M1 6h26" className="stroke-chart-1" strokeWidth={2.5} strokeLinecap="round" /><circle cx="14" cy="6" r="3.5" className="fill-chart-1" /></svg>
          {label}
        </span>
        {banda.length > 1 && (
          <span className="flex items-center gap-2"><span aria-hidden className="h-3.5 w-7 rounded-sm bg-chart-1/20" />{S.trends.band}</span>
        )}
        {switchDay != null && switchDay <= days && (
          <span className="flex items-center gap-2">
            <svg aria-hidden viewBox="0 0 12 16" className="h-4 w-3"><path d="M6 1v14" className="stroke-foreground/60" strokeWidth={1.5} strokeDasharray="2 4" strokeLinecap="round" /></svg>
            {S.trends.baselineSwitch} (D{switchDay})
          </span>
        )}
        {limites.map((l) => (
          <span key={l.label} className="flex items-center gap-2">
            <svg aria-hidden viewBox="0 0 28 12" className="h-3 w-7"><path d="M1 6h26" className="stroke-status-act" strokeWidth={2} strokeDasharray="7 5" /></svg>
            {l.label}{fuera.includes(l) ? ` (${S.trends.offScale})` : ""}
          </span>
        ))}
        {markers.some((d) => points.some((p) => p.day === d)) && (
          <span className="flex items-center gap-2">
            <svg aria-hidden viewBox="0 0 16 14" className="h-3.5 w-4 fill-status-watch"><path d="M8 0l8 14H0z" /></svg>
            {markerLabel}
          </span>
        )}
      </figcaption>

      {/* La tabla va dentro de un bloque: una <table> con sr-only no recorta su alto y alarga la página. */}
      <div className="sr-only">
      <table>
        <caption>{label} ({unit})</caption>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}><th scope="row">{S.common.day} {p.day}</th><td>{num(p.value)}</td></tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  )
}
