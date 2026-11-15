"use client"

import { type KeyboardEvent, type PointerEvent, useRef } from "react"
import { cn } from "@/lib/utils"

const normalizar = (g: number) => ((((g + 180) % 360) + 360) % 360) - 180

/**
 * Rueda para girar algo una vuelta completa: se arrastra el pomo alrededor del aro (o con las flechas, de 5 en 5;
 * Inicio vuelve a 0). `grados` va de -180 a 180 y 0 es de frente. Es un `slider` accesible.
 */
export function RuedaGiro({ grados, onChange, etiqueta, className }: {
  grados: number
  onChange: (grados: number) => void
  etiqueta: string
  className?: string
}) {
  const caja = useRef<HTMLDivElement>(null)
  const arrastrando = useRef(false)

  const desde = (e: PointerEvent) => {
    const r = caja.current!.getBoundingClientRect()
    const g = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI
    onChange(Math.round(normalizar(g)))
  }
  const alTeclado = (e: KeyboardEvent) => {
    const paso = e.shiftKey ? 15 : 5
    if (e.key === "ArrowRight" || e.key === "ArrowUp") onChange(normalizar(grados + paso))
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") onChange(normalizar(grados - paso))
    else if (e.key === "Home") onChange(0)
    else return
    e.preventDefault()
  }
  const a = (grados * Math.PI) / 180

  return (
    <div
      ref={caja}
      role="slider"
      tabIndex={0}
      aria-label={etiqueta}
      aria-valuemin={-180}
      aria-valuemax={180}
      aria-valuenow={grados}
      aria-valuetext={`${grados}°`}
      onKeyDown={alTeclado}
      onPointerDown={(e) => {
        arrastrando.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
        desde(e)
      }}
      onPointerMove={(e) => arrastrando.current && desde(e)}
      onPointerUp={() => (arrastrando.current = false)}
      onPointerCancel={() => (arrastrando.current = false)}
      onDoubleClick={() => onChange(0)}
      title={etiqueta}
      className={cn("relative size-24 cursor-grab touch-none select-none rounded-full outline-offset-4 active:cursor-grabbing", className)}
    >
      <svg viewBox="-50 -50 100 100" aria-hidden className="size-full">
        <circle r="42" className="fill-card/90 stroke-border" strokeWidth="2" />
        {Array.from({ length: 24 }, (_, i) => (
          <line key={i} y1={-42} y2={i % 6 === 0 ? -34 : -38} transform={`rotate(${i * 15})`} className="stroke-muted-foreground/60" strokeWidth={i % 6 === 0 ? 2 : 1} />
        ))}
        <circle r="24" className="fill-muted/60" />
        <circle cx={Math.sin(a) * 42} cy={-Math.cos(a) * 42} r="7" className="fill-primary stroke-card" strokeWidth="2.5" />
        <text y="5" textAnchor="middle" className="fill-foreground font-mono text-[15px] font-semibold tabular-nums">{grados}°</text>
      </svg>
    </div>
  )
}
