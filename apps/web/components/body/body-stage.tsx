"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import type { AnclaId } from "@/components/body/anatomia"
import type { Escena, EstadoEscena, Proyeccion } from "@/components/body/escena"
import { S } from "@/lib/strings"
import type { Status } from "@/lib/types"
import { cn } from "@/lib/utils"

export interface Marcador {
  id: AnclaId
  estado: Status
  etiqueta: string
  tipo: "indicador" | "molestia"
  activo: boolean
}

const PUNTO: Record<Status, string> = { ok: "bg-status-ok", watch: "bg-status-watch", act: "bg-status-act" }
const ARO: Record<Status, string> = { ok: "border-status-ok", watch: "border-status-watch", act: "border-status-act" }

/**
 * Lienzo 3D del cuerpo con sus marcadores táctiles. La escena (three.js) se carga aparte y solo en el navegador;
 * si el equipo no tiene WebGL se avisa con un texto (el estado sigue en las tarjetas). En cada cuadro avisa a `onCuadro` de dónde cae
 * cada ancla, en coordenadas de la ventana, para las líneas guía de las tarjetas.
 */
export function BodyStage({
  estado, marcadores, onMarcador, onCuadro, onModelo, children, className,
}: {
  /** Se llama con `true` cuando el modelo anatómico real ya está en pantalla. */
  onModelo?: (real: boolean) => void
  estado: Omit<EstadoEscena, "quieto">
  marcadores: Marcador[]
  onMarcador: (id: AnclaId) => void
  onCuadro?: (p: Proyeccion, lienzo: DOMRect) => void
  children?: React.ReactNode
  className?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const escena = useRef<Escena | null>(null)
  const botones = useRef(new Map<AnclaId, HTMLButtonElement>())
  const cuadro = useRef(onCuadro)
  cuadro.current = onCuadro
  const modelo = useRef(onModelo)
  modelo.current = onModelo
  const ultimo = useRef(estado)
  ultimo.current = estado
  const [fase, setFase] = useState<"cargando" | "lista" | "sin-webgl">("cargando")

  useEffect(() => {
    let vivo = true
    const el = canvas.current
    if (!el) return
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    import("@/components/body/escena")
      .then(({ crearEscena }) => {
        if (!vivo) return
        escena.current = crearEscena(el, { ...ultimo.current, quieto }, (p, ancho, alto) => {
          for (const [id, b] of botones.current) {
            const a = p[id]
            const dentro = a.frente && a.x > 8 && a.y > 8 && a.x < ancho - 8 && a.y < alto - 8
            b.style.transform = `translate3d(${a.x.toFixed(1)}px, ${a.y.toFixed(1)}px, 0)`
            b.style.visibility = dentro ? "visible" : "hidden"
          }
          cuadro.current?.(p, el.getBoundingClientRect())
        }, (real) => {
          if (!vivo) return
          modelo.current?.(real)
          setFase("lista") // hasta aquí se ve «Preparando el modelo 3D…», nunca una anatomía a medias
        })
      })
      .catch(() => vivo && setFase("sin-webgl"))
    return () => {
      vivo = false
      escena.current?.destruir()
      escena.current = null
    }
  }, [])

  useEffect(() => {
    escena.current?.actualizar({ ...estado, quieto: window.matchMedia("(prefers-reduced-motion: reduce)").matches })
  }, [estado])

  return (
    <div className={cn("escenario relative overflow-hidden rounded-3xl border border-border", className)}>
      {fase === "sin-webgl" ? (
        <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">{S.body.sinWebgl}</div>
      ) : (
        <>
          <canvas ref={canvas} role="img" aria-label={S.body.stageLabel} className="absolute inset-0 size-full cursor-grab touch-pan-y active:cursor-grabbing" />
          {fase === "cargando" && (
            <p role="status" className="absolute inset-0 flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 aria-hidden className="size-5 animate-spin" /> {S.body.loading3d}
            </p>
          )}
          {fase === "lista" && marcadores.map((m) => (
            <button
              key={m.id}
              type="button"
              ref={(b) => {
                if (b) botones.current.set(m.id, b)
                else botones.current.delete(m.id)
              }}
              onClick={() => onMarcador(m.id)}
              aria-label={m.etiqueta}
              className="group absolute left-0 top-0 -ml-6 -mt-6 flex size-12 items-center justify-center rounded-full outline-offset-0"
              style={{ visibility: "hidden" }}
            >
              {m.tipo === "molestia" ? (
                <>
                  <span aria-hidden className="absolute size-9 rounded-full border-2 border-status-act/80 onda-dolor" />
                  <span aria-hidden className="absolute size-9 rounded-full border-2 border-status-act/80 onda-dolor [animation-delay:0.7s]" />
                  <span aria-hidden className="size-3.5 rounded-full bg-status-act shadow-[0_0_0_3px_var(--card)]" />
                  <span className="pointer-events-none absolute left-11 whitespace-nowrap rounded-full bg-status-act px-3 py-1 text-sm font-semibold text-white shadow-md">
                    {m.etiqueta}
                  </span>
                </>
              ) : (
                <>
                  {(m.estado !== "ok" || m.activo) && <span aria-hidden className={cn("absolute size-8 rounded-full border-2 onda-dolor", ARO[m.estado])} />}
                  <span aria-hidden className={cn("rounded-full shadow-[0_0_0_3px_var(--card)] transition-all group-active:scale-125", PUNTO[m.estado], m.activo ? "size-4" : "size-3")} />
                </>
              )}
            </button>
          ))}
        </>
      )}
      {children}
    </div>
  )
}
