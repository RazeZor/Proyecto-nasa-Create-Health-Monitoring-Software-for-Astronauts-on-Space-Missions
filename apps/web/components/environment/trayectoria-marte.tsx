"use client"

import { useMemo } from "react"
import { useApp } from "@/components/app-context"
import { formatDelay } from "@/components/shared/delay-countdown"
import { Ayuda } from "@/components/shared/ayuda"
import { lecturaDeTrayecto, posicionesDelViaje, retardoMedioMin } from "@/lib/trayecto"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const R_TIERRA = 1
const R_MARTE = 1.524
const LADO = 3.6 // UA visibles: de -1,8 a 1,8; el SVG es cuadrado

/**
 * El viaje a Marte, visto desde arriba: el Sol en el centro, las órbitas de la Tierra y de Marte, el arco que recorre la
 * nave (continuo lo ya recorrido, punteado lo que falta) y dónde están los tres en el día elegido. Solo en el demo del
 * viaje (el modo real no trae posición). `mini`: solo el dibujo, para acompañar al Histórico.
 */
export function TrayectoriaMarte({ dia, mini = false }: { dia: number; mini?: boolean }) {
  const { catalogo } = useApp()
  const entorno = catalogo.historial.entorno_diario
  const lectura = lecturaDeTrayecto(entorno, dia)
  const posiciones = useMemo(() => posicionesDelViaje(entorno), [entorno])
  if (!lectura || posiciones.length === 0) return null
  const hoy = posiciones.find((p) => p.dia === dia)!
  const trazo = (ps: typeof posiciones) => ps.map((p, i) => `${i ? "L" : "M"}${p.x_ua.toFixed(3)} ${-p.y_ua.toFixed(3)}`).join(" ")
  const recorrido = posiciones.filter((p) => p.dia <= dia)
  const restante = posiciones.filter((p) => p.dia >= dia)
  const total = catalogo.historial.dias_vuelo
  const medio = retardoMedioMin(entorno)
  const dist = `${lectura.distanciaTierraUa.toFixed(2)} ${S.trayecto.ua}`
  const retardo = formatDelay(Number(lectura.retardoMin.toFixed(1)))
  // la etiqueta de la nave va debajo: cerca de la llegada, Marte y la nave quedan casi juntos
  const marca = (x: number, y: number, r: number, clase: string, etiqueta?: string, abajo = false) => (
    <g>
      <circle cx={x} cy={-y} r={r} className={clase} strokeWidth={0.025} />
      {!mini && etiqueta && <text x={x} y={abajo ? -y + r + 0.15 : -y - r - 0.07} textAnchor="middle" className="fill-foreground text-[0.12px] font-semibold">{etiqueta}</text>}
    </g>
  )
  const dibujo = (
    <svg viewBox={`${-LADO / 2} ${-LADO / 2} ${LADO} ${LADO}`} role="img" aria-label={S.trayecto.label(dia, dist, retardo)} className={cn("mx-auto w-full", mini ? "max-w-44" : "max-w-md")}>
      <circle r={R_TIERRA} fill="none" className="stroke-border" strokeWidth={0.012} />
      <circle r={R_MARTE} fill="none" className="stroke-border" strokeWidth={0.012} />
      <path d={trazo(restante)} fill="none" className="stroke-muted-foreground/60" strokeWidth={0.02} strokeDasharray="0.06 0.06" />
      <path d={trazo(recorrido)} fill="none" className="stroke-primary" strokeWidth={0.035} strokeLinecap="round" />
      <circle r={0.1} className="fill-status-watch" />
      {!mini && <text y={0.24} textAnchor="middle" className="fill-muted-foreground text-[0.11px]">{S.trayecto.sun}</text>}
      {marca(hoy.tierra.x_ua, hoy.tierra.y_ua, 0.075, "fill-sky-500", S.trayecto.earth)}
      {marca(hoy.marte.x_ua, hoy.marte.y_ua, 0.065, "fill-status-act", S.trayecto.mars)}
      {marca(hoy.x_ua, hoy.y_ua, 0.055, "fill-primary stroke-card", S.trayecto.ship, true)}
    </svg>
  )
  if (mini) return dibujo
  const lecturas: [string, string][] = [
    [S.trayecto.distEarth, `${dist} · ${lectura.distanciaTierraMKm.toFixed(0)} ${S.trayecto.mkm}`],
    [S.trayecto.distSun, `${lectura.distanciaSolUa.toFixed(2)} ${S.trayecto.ua}`],
    [S.trayecto.delay, retardo],
    ...(medio !== null ? [[S.trayecto.delayMean, formatDelay(Number(medio.toFixed(1)))] as [string, string]] : []),
    ...(lectura.dosisAcumuladaMsv !== null ? [[S.trayecto.dose, `${lectura.dosisAcumuladaMsv.toFixed(0)} mSv`] as [string, string]] : []),
  ]
  return (
    <section aria-labelledby="trayecto-marte" className="rounded-3xl border border-border bg-card p-4 md:p-6">
      <div className="flex items-center gap-1">
        <h2 id="trayecto-marte" className="text-xl font-bold leading-tight">{S.trayecto.title}</h2>
        <Ayuda titulo={S.trayecto.title}><p>{S.trayecto.help}</p></Ayuda>
        <p className="ml-auto font-mono text-base font-semibold tabular-nums">{S.trayecto.day(dia, total)}</p>
      </div>
      <div className="mt-3 grid items-center gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {dibujo}
        <dl className="grid gap-3">
          {lecturas.map(([k, v]) => (
            <div key={k}>
              <dt className="eyebrow">{k}</dt>
              <dd className="text-2xl font-semibold tabular-nums leading-tight">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
