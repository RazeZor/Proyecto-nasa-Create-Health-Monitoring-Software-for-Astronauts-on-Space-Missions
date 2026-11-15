"use client"

import { type ReactNode, useEffect, useState } from "react"
import { useApp, VerComo } from "@/components/app-context"
import { BodyView } from "@/components/body/body-view"
import { EmptyState, LoadingState, PageHeader } from "@/components/shared/states"
import { leerTripulacion } from "@/lib/api-registro"
import { cargarHistorialAjeno, type Historial } from "@/lib/catalogo"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

type Miembro = { id: number; alias: string; rol: string }

/** Una vista cualquiera (cuerpo, ficha histórica) con los datos de cada tripulante, para el oficial médico y el cirujano
 * de vuelo: solo lectura y auditado en el servidor. Por defecto, el cuerpo. */
export function CuerpoTripulacion({ titulo = S.crew.bodyTitle, subtitulo = S.crew.bodySubtitle, vista = <BodyView ajeno /> }: {
  titulo?: string
  subtitulo?: string
  vista?: ReactNode
}) {
  const { mode } = useApp()
  const [miembros, setMiembros] = useState<Miembro[] | null>(null)
  const [actor, setActor] = useState<number | null>(null)
  const [elegido, setElegido] = useState<number | null>(null)
  const [historial, setHistorial] = useState<Historial | null | undefined>(undefined) // undefined: cargando; null: falló

  useEffect(() => {
    if (TRIPULANTE === null) return
    void leerTripulacion(TRIPULANTE).then((m) => {
      // shortcut: solo los astronautas con nombre (Sebastián, Fernando); el «astronauta» genérico del demo y los
      // cargos de apoyo no tienen cuerpo propio que mirar
      const astronautas = (m ?? []).filter((x) => x.rol === "astronauta" && x.alias !== x.rol)
      setMiembros(astronautas)
      // shortcut: sin autenticación se consulta con el id del oficial médico (también como cirujano de vuelo); sesión real en #46
      setActor(m?.find((x) => x.rol === "oficial_medico")?.id ?? null)
      setElegido((previo) => previo ?? astronautas[0]?.id ?? null)
    })
  }, [])

  useEffect(() => {
    if (elegido === null || actor === null) return
    let vivo = true
    setHistorial(undefined)
    void cargarHistorialAjeno(elegido, actor, mode).then((h) => vivo && setHistorial(h))
    return () => {
      vivo = false
    }
  }, [elegido, actor, mode])

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      <PageHeader title={titulo} subtitle={subtitulo} />
      {miembros === null ? <LoadingState /> : miembros.length === 0 ? <EmptyState message={S.crew.bodyError} /> : (
        <div role="radiogroup" aria-label={S.crew.pick} className="flex flex-wrap gap-2">
          {miembros.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={elegido === m.id}
              onClick={() => setElegido(m.id)}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-semibold capitalize transition-colors",
                elegido === m.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted",
              )}
            >
              {m.alias.replace("_", " ")}
            </button>
          ))}
        </div>
      )}
      {historial === undefined ? (miembros?.length ? <LoadingState /> : null) : historial === null ? <EmptyState message={S.crew.bodyError} /> : (
        <VerComo key={elegido} historial={historial}>
          {vista}
        </VerComo>
      )}
    </div>
  )
}
