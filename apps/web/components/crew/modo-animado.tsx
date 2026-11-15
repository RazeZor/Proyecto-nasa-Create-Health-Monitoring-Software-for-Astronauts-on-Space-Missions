"use client"

import { History, Radio } from "lucide-react"
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

const ICONO_MODO = { real: Radio, historico: History } as const

/** Selector segmentado: el modo activo es una pastilla clara sobre fondo hundido; el icono distingue en vivo de archivo. */
export function SelectorModo({ modo, onCambiar }: { modo: Modo; onCambiar: (m: Modo) => void }) {
  return (
    <nav aria-label={S.crew.modo} className="flex w-fit gap-1 rounded-2xl bg-muted p-1">
      {([["real", S.crew.modoReal], ["historico", S.crew.modoHistorico]] as const).map(([m, etiqueta]) => {
        const Icono = ICONO_MODO[m]
        return (
          <button
            key={m}
            type="button"
            aria-pressed={modo === m}
            onClick={() => onCambiar(m)}
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-all active:scale-[0.98]",
              modo === m ? "bg-card text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icono aria-hidden className={cn("size-4", modo === m && m === "real" && "text-status-ok")} />
            {etiqueta}
          </button>
        )
      })}
    </nav>
  )
}
