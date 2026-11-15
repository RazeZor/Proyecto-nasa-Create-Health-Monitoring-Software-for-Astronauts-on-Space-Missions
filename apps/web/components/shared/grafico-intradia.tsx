"use client"

import type { PuntoIntradia } from "@/lib/catalogo"
import { S } from "@/lib/strings"

const minutos = (hora: string) => Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5))
const HORAS = [0, 6, 12, 18, 24]
const [W, H, IZQ, DER, ARR, ABA] = [320, 150, 34, 8, 10, 22]

/**
 * El día de hoy por hora (00–24 UTC) para el tiempo real: la evolución por días es del histórico. Dibuja la banda
 * personal del día si la hay y marca la última lectura como «ahora».
 */
export function GraficoIntradia({ puntos, unidad, color, banda, formato = String }: {
  puntos: PuntoIntradia[]
  unidad: string
  color: string
  banda?: { low: number; high: number } | null
  formato?: (v: number) => string
}) {
  if (puntos.length === 0) return <p className="px-2 py-6 text-center text-sm text-muted-foreground">{S.body.intradayEmpty}</p>
  const valores = puntos.map((p) => p.valor).concat(banda ? [banda.low, banda.high] : [])
  let min = Math.min(...valores), max = Math.max(...valores)
  const margen = (max - min || Math.abs(max) * 0.02 || 1) * 0.15
  min -= margen
  max += margen
  const x = (hora: string) => IZQ + (minutos(hora) / 1440) * (W - IZQ - DER)
  const y = (v: number) => ARR + (1 - (v - min) / (max - min)) * (H - ARR - ABA)
  const ultimo = puntos.at(-1)!
  const linea = puntos.map((p) => `${x(p.hora).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ")

  return (
    <figure className="flex flex-col gap-1">
      <figcaption className="eyebrow px-1">{S.body.intradayTitle}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={S.body.intradayLabel(puntos.length, `${formato(ultimo.valor)} ${unidad}`, ultimo.hora)} className="w-full">
        {banda && (
          <rect x={IZQ} width={W - IZQ - DER} y={y(banda.high)} height={Math.max(0, y(banda.low) - y(banda.high))} className="fill-status-ok/10" />
        )}
        {[min + margen, max - margen].map((v) => (
          <g key={v}>
            <line x1={IZQ} x2={W - DER} y1={y(v)} y2={y(v)} className="stroke-border" strokeDasharray="2 3" />
            <text x={IZQ - 4} y={y(v) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[9px]">{formato(v)}</text>
          </g>
        ))}
        {HORAS.map((h) => (
          <text key={h} x={IZQ + (h / 24) * (W - IZQ - DER)} y={H - 6} textAnchor="middle" className="fill-muted-foreground font-mono text-[9px]">
            {String(h).padStart(2, "0")}h
          </text>
        ))}
        <polyline points={linea} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
        <line x1={x(ultimo.hora)} x2={x(ultimo.hora)} y1={ARR} y2={H - ABA} className="stroke-foreground/40" />
        <circle cx={x(ultimo.hora)} cy={y(ultimo.valor)} r={4} fill={color} className="stroke-card" strokeWidth={2} />
        <text x={Math.min(x(ultimo.hora), W - DER - 2)} y={ARR - 1} textAnchor="end" className="fill-foreground text-[9px] font-semibold">
          {S.body.intradayNow} · {ultimo.hora} · {formato(ultimo.valor)} {unidad}
        </text>
      </svg>
    </figure>
  )
}
