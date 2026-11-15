"use client"

import { RotateCcw, RotateCw, User } from "lucide-react"
import { type KeyboardEvent, useEffect, useRef } from "react"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const GRADOS_POR_SEGUNDO = 120
const PASO_TECLADO = 15
const normalizar = (g: number) => ((((g + 180) % 360) + 360) % 360) - 180

/**
 * Giro para pantalla táctil: dos botones grandes que giran mientras se mantienen pulsados y uno para volver de frente.
 * `grados` va de -180 a 180 (0 es de frente). Con teclado, Intro o Espacio dan un paso de 15°.
 */
export function GiroBotones({ grados, onChange, className }: { grados: number; onChange: (grados: number) => void; className?: string }) {
  const actual = useRef(grados)
  actual.current = grados
  const marco = useRef(0)
  const parar = () => cancelAnimationFrame(marco.current)
  useEffect(() => parar, [])

  const girar = (sentido: 1 | -1) => {
    let antes = performance.now()
    const paso = (ahora: number) => {
      onChange(Math.round(normalizar(actual.current + sentido * GRADOS_POR_SEGUNDO * ((ahora - antes) / 1000))))
      antes = ahora
      marco.current = requestAnimationFrame(paso)
    }
    parar()
    marco.current = requestAnimationFrame(paso)
  }
  const alTeclado = (e: KeyboardEvent, sentido: 1 | -1) => {
    if (e.key !== "Enter" && e.key !== " ") return
    e.preventDefault()
    onChange(normalizar(actual.current + sentido * PASO_TECLADO))
  }
  const boton = "flex size-14 touch-none select-none items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md active:scale-95 active:bg-muted"

  return (
    <div role="group" aria-label={S.crew.girar} className={cn("flex items-center gap-2", className)}>
      {([[-1, S.crew.girarIzquierda, RotateCcw], [1, S.crew.girarDerecha, RotateCw]] as const).map(([sentido, etiqueta, Icono], i) => (
        <span key={sentido} className="contents">
          {i === 1 && (
            <button type="button" aria-label={S.crew.deFrente} title={S.crew.deFrente} onClick={() => onChange(0)} className={cn(boton, "size-11 text-muted-foreground")}>
              <User aria-hidden className="size-5" />
            </button>
          )}
          <button
            type="button"
            aria-label={etiqueta}
            title={etiqueta}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              girar(sentido)
            }}
            onPointerUp={parar}
            onPointerCancel={parar}
            onLostPointerCapture={parar}
            onContextMenu={(e) => e.preventDefault()}
            onKeyDown={(e) => alTeclado(e, sentido)}
            className={boton}
          >
            <Icono aria-hidden className="size-6" />
          </button>
        </span>
      ))}
    </div>
  )
}
