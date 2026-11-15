"use client"

import { CircleHelp } from "lucide-react"
import type { ReactNode } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

/**
 * Botón [?] que guarda la explicación fuera de la vista: un toque la abre y tocar fuera la cierra (pantalla táctil, sin
 * depender del cursor). Zona de toque de 44 px. `titulo` nombra lo que explica, también para el lector de pantalla.
 */
export function Ayuda({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${S.common.help}: ${titulo}`}
        className={cn(
          "inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-95 data-[popup-open]:bg-primary data-[popup-open]:text-primary-foreground",
          className,
        )}
      >
        <CircleHelp aria-hidden className="size-6" />
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)] gap-2 p-4 text-base leading-relaxed">
        <p className="font-semibold">{titulo}</p>
        <div className="flex flex-col gap-2 text-pretty text-muted-foreground">{children}</div>
      </PopoverContent>
    </Popover>
  )
}
