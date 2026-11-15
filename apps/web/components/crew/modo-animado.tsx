"use client"

import { useEffect, useRef, useState } from "react"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

export type Modo = "real" | "historico"
const DURACION_MS = 220

/** Estado del conmutador Tiempo real / Histórico con su animación (sale 220 ms, entra la otra vista); `prefers-reduced-motion` la omite. */
export function useModoAnimado(inicial: Modo = "real") {
  const [modo, setModo] = useState(inicial)
  const [fase, setFase] = useState<"quieta" | "saliendo" | "entrando">("quieta")
  const plazos = useRef<number[]>([])
  useEffect(() => () => plazos.current.forEach(clearTimeout), [])
  const cambiar = (nuevo: Modo, alCambiar?: () => void) => {
    if (nuevo === modo || fase !== "quieta") return
    alCambiar?.()
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setModo(nuevo)
    setFase("saliendo")
    plazos.current.push(
      window.setTimeout(() => {
        setModo(nuevo)
        setFase("entrando")
        plazos.current.push(window.setTimeout(() => setFase("quieta"), 30))
      }, DURACION_MS),
    )
  }
  const animacion = {
    className: cn(
      "origin-top transition-[opacity,transform] ease-out motion-reduce:transition-none",
      fase === "saliendo" && "scale-95 opacity-0", // el cuerpo se aleja…
      fase === "entrando" && "scale-105 opacity-0 !duration-0", // …y la otra vista llega desde un poco más cerca
    ),
    style: { transitionDuration: `${DURACION_MS}ms` },
  }
  return { modo, cambiar, animacion }
}

export function SelectorModo({ modo, onCambiar }: { modo: Modo; onCambiar: (m: Modo) => void }) {
  return (
    <nav aria-label={S.crew.modo} className="flex w-fit rounded-full border border-border bg-card p-1">
      {([["real", S.crew.modoReal], ["historico", S.crew.modoHistorico]] as const).map(([m, etiqueta]) => (
        <button
          key={m}
          type="button"
          aria-pressed={modo === m}
          onClick={() => onCambiar(m)}
          className={cn("min-h-10 rounded-full px-4 py-2 text-sm font-semibold transition-colors", modo === m ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
        >
          {etiqueta}
        </button>
      ))}
    </nav>
  )
}
