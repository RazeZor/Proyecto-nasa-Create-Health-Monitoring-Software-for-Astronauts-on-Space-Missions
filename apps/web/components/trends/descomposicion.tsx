"use client"

import { useMemo } from "react"
import { descomponer } from "@/lib/engine"
import { S } from "@/lib/strings"

const [W, H, IZQ, DER, ARR, ABA] = [320, 70, 6, 6, 6, 6]
type P = { dia: number; valor: number }

/** Una de las tres partes: línea (tendencia, sobre los valores en gris) o barras desde 0 (ciclo y residuo). */
function Panel({ titulo, pista, puntos, fondo, barras, dias, color }: {
  titulo: string; pista: string; puntos: P[]; fondo?: P[]; barras?: boolean; dias: number; color: string
}) {
  const todos = [...puntos, ...(fondo ?? [])].map((p) => p.valor).concat(barras ? [0] : [])
  const min = Math.min(...todos), max = Math.max(...todos)
  const x = (d: number) => IZQ + ((d - 1) / Math.max(1, dias - 1)) * (W - IZQ - DER)
  const y = (v: number) => ARR + (1 - (v - min) / (max - min || 1)) * (H - ARR - ABA)
  return (
    <figure className="flex flex-col gap-1 rounded-2xl border border-border p-3">
      <figcaption>
        <span className="block text-sm font-semibold">{titulo}</span>
        <span className="block text-xs text-muted-foreground">{pista}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
        {barras && <line x1={IZQ} x2={W - DER} y1={y(0)} y2={y(0)} className="stroke-border" />}
        {fondo?.map((p) => <circle key={p.dia} cx={x(p.dia)} cy={y(p.valor)} r={1.8} className="fill-muted-foreground/40" />)}
        {barras
          ? puntos.map((p) => (
              <rect key={p.dia} x={x(p.dia) - 2.5} width={5} y={Math.min(y(0), y(p.valor))} height={Math.max(0.5, Math.abs(y(p.valor) - y(0)))} fill={color} opacity={0.75} />
            ))
          : <polyline points={puntos.map((p) => `${x(p.dia).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ")} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />}
      </svg>
    </figure>
  )
}

/**
 * Descomposición de la serie en vuelo (días 1 a hoy) en tendencia, ciclo semanal y residuo (`packages/engine/series.ts`).
 * El ciclo solo se dibuja si existe; con pocos días se dice en vez de dibujar algo engañoso.
 */
export function Descomposicion({ puntos, dia, dias, color }: { puntos: { day: number; value: number }[]; dia: number; dias: number; color: string }) {
  const enVuelo = useMemo(() => puntos.filter((p) => p.day >= 1 && p.day <= dia).map((p) => ({ dia: p.day, valor: p.value })), [puntos, dia])
  const r = useMemo(() => descomponer(enVuelo), [enVuelo])
  return (
    <section aria-label={S.trends.decomp.title} className="flex flex-col gap-2">
      <h3 className="eyebrow">{S.trends.decomp.title}</h3>
      {!r ? (
        <p className="text-sm text-muted-foreground">{S.trends.decomp.few}</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">{S.trends.decomp.intro}</p>
          <div className="grid gap-2 md:grid-cols-3">
            <Panel titulo={S.trends.decomp.trend} pista={S.trends.decomp.trendHint} puntos={r.tendencia} fondo={enVuelo} dias={dias} color={color} />
            {r.ciclo ? (
              <Panel titulo={S.trends.decomp.cycle} pista={S.trends.decomp.cycleHint} puntos={r.ciclo} barras dias={dias} color={color} />
            ) : (
              <p className="flex items-center rounded-2xl border border-dashed border-border p-3 text-sm text-muted-foreground">{S.trends.decomp.noCycle}</p>
            )}
            <Panel titulo={S.trends.decomp.residual} pista={S.trends.decomp.residualHint} puntos={r.residuo} barras dias={dias} color="#8b8fa3" />
          </div>
        </>
      )}
    </section>
  )
}
