"use client"

/**
 * Controles táctiles del registro diario: nada pide teclado. `Dial` = valor enorme con −/+ (mantener pulsado
 * repite) y un deslizador para los saltos grandes; `Opciones` = elección única con botones del tamaño de un dedo.
 */
import { useEffect, useRef } from "react"
import { IconoMas, IconoMenos } from "@/components/checkin/iconos"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const ESPERA_REPETIR_MS = 400
const CADA_MS = 75

function BotonPaso({ etiqueta, alPulsar, tope, children }: { etiqueta: string; alPulsar: () => void; tope: boolean; children: React.ReactNode }) {
  const accion = useRef(alPulsar)
  const espera = useRef<number | undefined>(undefined)
  const repeticion = useRef<number | undefined>(undefined)
  useEffect(() => {
    accion.current = alPulsar
  })
  const parar = () => {
    window.clearTimeout(espera.current)
    window.clearInterval(repeticion.current)
  }
  useEffect(() => parar, [])
  return (
    <button
      type="button"
      aria-label={etiqueta}
      aria-disabled={tope}
      // el puntero actúa al tocar (y repite si se mantiene); `onClick` queda para teclado y lectores de pantalla
      onPointerDown={() => {
        parar()
        accion.current()
        espera.current = window.setTimeout(() => {
          repeticion.current = window.setInterval(() => accion.current(), CADA_MS)
        }, ESPERA_REPETIR_MS)
      }}
      onPointerUp={parar}
      onPointerLeave={parar}
      onPointerCancel={parar}
      onClick={(e) => {
        if (e.detail === 0) accion.current()
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "flex size-20 shrink-0 touch-none select-none items-center justify-center rounded-full border border-border bg-card shadow-sm transition-transform active:scale-[0.94] active:bg-accent",
        tope && "opacity-35",
      )}
    >
      {children}
    </button>
  )
}

export function Dial({
  etiqueta, valor, alCambiar, min, max, paso, pasoFino = paso, decimales, unidad, atenuado, grande = true,
}: {
  etiqueta: string
  valor: number
  alCambiar: (v: number) => void
  min: number
  max: number
  /** salto de los botones −/+ */
  paso: number
  /** salto del deslizador */
  pasoFino?: number
  decimales: number
  unidad: string
  /** el valor aún es solo un punto de partida, no una medida confirmada */
  atenuado?: boolean
  grande?: boolean
}) {
  const acotar = (v: number) => Number(Math.min(max, Math.max(min, v)).toFixed(decimales))
  const fraccion = (valor - min) / (max - min)
  return (
    <div role="group" aria-label={etiqueta} className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <BotonPaso etiqueta={S.checkin.decrease(etiqueta)} tope={valor <= min} alPulsar={() => alCambiar(acotar(valor - paso))}>
          <IconoMenos className="size-9" />
        </BotonPaso>
        <p className="flex min-w-0 flex-col items-center" aria-live="polite">
          <span className={cn("font-mono font-semibold leading-none tabular-nums transition-colors", grande ? "text-8xl" : "text-7xl", atenuado && "text-muted-foreground/70")}>
            {valor.toFixed(decimales)}
          </span>
          <span className="mt-1 text-lg text-muted-foreground">{unidad}</span>
        </p>
        <BotonPaso etiqueta={S.checkin.increase(etiqueta)} tope={valor >= max} alPulsar={() => alCambiar(acotar(valor + paso))}>
          <IconoMas className="size-9" />
        </BotonPaso>
      </div>
      <div className="relative h-14">
        <div aria-hidden className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-muted" />
        <div aria-hidden className="absolute left-0 top-1/2 h-3 -translate-y-1/2 rounded-full bg-primary/70" style={{ width: `calc(${fraccion} * (100% - 3rem) + 1.5rem)` }} />
        <input
          type="range"
          aria-label={etiqueta}
          min={min}
          max={max}
          step={pasoFino}
          value={valor}
          onChange={(e) => alCambiar(acotar(Number(e.target.value)))}
          className="absolute inset-0 size-full cursor-pointer touch-none appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:size-12 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-card [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:size-12 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-solid [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md focus-visible:[&::-webkit-slider-thumb]:ring-4 focus-visible:[&::-webkit-slider-thumb]:ring-primary/40"
        />
      </div>
      <div aria-hidden className="-mt-2 flex justify-between font-mono text-sm tabular-nums text-muted-foreground">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

export function Opciones<T extends string>({ etiqueta, valor, alCambiar, opciones, bloqueado }: {
  etiqueta: string; valor: T; alCambiar: (v: T) => void; opciones: { valor: T; texto: string }[]; bloqueado?: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="eyebrow">{etiqueta}</span>
      <div role="radiogroup" aria-label={etiqueta} className="flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={valor === o.valor}
            disabled={bloqueado}
            onClick={() => alCambiar(o.valor)}
            className={cn(
              "min-h-14 rounded-full border px-6 text-base font-semibold transition-colors active:scale-[0.98] disabled:opacity-50",
              valor === o.valor ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-foreground",
            )}
          >
            {o.texto}
          </button>
        ))}
      </div>
    </div>
  )
}
