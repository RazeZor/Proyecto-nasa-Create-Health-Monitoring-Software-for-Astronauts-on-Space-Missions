"use client"

import { useEffect, useState } from "react"
import { useApp, VerComo } from "@/components/app-context"
import { BodyView } from "@/components/body/body-view"
import { Historico } from "@/components/crew/historico"
import { type Modo, SelectorModo, useModoAnimado } from "@/components/crew/modo-animado"
import { EmptyState, LoadingState, PageHeader } from "@/components/shared/states"
import { leerTripulacion } from "@/lib/api-registro"
import { rutaDe } from "@/lib/roles"
import { cargarHistorialAjeno, type Historial } from "@/lib/catalogo"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

type Miembro = { id: number; alias: string; rol: string }

/** Cuerpo de cada tripulante, para el oficial médico y el cirujano de vuelo: solo lectura y auditado en el servidor.
 * `real`: su cuerpo hoy; `historico`: el día de misión que se elija, con minimapa y tendencias. */
export function CuerpoTripulacion({ modo: inicial = "real" }: { modo?: Modo }) {
  const { mode, role } = useApp()
  // El modo es estado (no una navegación): así la elección de tripulante y su historial se conservan y la vista puede animarse.
  const { modo, cambiar, animacion } = useModoAnimado(inicial)
  // la ruta sigue al modo (recargar o compartir el enlace abre el mismo modo)
  const cambiarModo = (m: Modo) => cambiar(m, () => role && window.history.replaceState(null, "", rutaDe(role, m === "real" ? "body" : "ficha")))
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
      <PageHeader title={modo === "real" ? S.crew.bodyTitle : S.crew.fichaTitle} ayuda={<p>{modo === "real" ? S.crew.bodySubtitle : S.crew.fichaSubtitle}</p>} />
      {role && <SelectorModo modo={modo} onCambiar={cambiarModo} />}
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
        <div {...animacion}>
          <VerComo key={elegido} historial={historial}>
            {modo === "real" ? <HoyDelTripulante tripulante={elegido} actor={actor} /> : <Historico />}
          </VerComo>
        </div>
      )}
    </div>
  )
}

/** En tiempo real el cuerpo es el de hoy: el día de misión vuelve al actual del tripulante. */
function HoyDelTripulante({ tripulante, actor }: { tripulante: number | null; actor: number | null }) {
  const { setDay, catalogo } = useApp()
  const hoy = catalogo.historial.dia_actual
  useEffect(() => setDay(hoy), [setDay, hoy])
  return <BodyView ajeno tripulante={tripulante} actor={actor} />
}

/** El astronauta con su propio cuerpo: los mismos dos modos que los clínicos, sin selector de tripulante ni cambio de ruta. */
export function CuerpoPropio() {
  const { modo, cambiar, animacion } = useModoAnimado()
  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      <SelectorModo modo={modo} onCambiar={cambiar} />
      <div {...animacion}>{modo === "real" ? <HoyPropio /> : <Historico />}</div>
    </div>
  )
}

function HoyPropio() {
  const { setDay, catalogo } = useApp()
  const hoy = catalogo.historial.dia_actual
  useEffect(() => setDay(hoy), [setDay, hoy])
  return <BodyView />
}
