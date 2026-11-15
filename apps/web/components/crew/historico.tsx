"use client"

import { useMemo } from "react"
import { useApp } from "@/components/app-context"
import { BodyStage } from "@/components/body/body-stage"
import { NavegadorDias } from "@/components/crew/navegador-dias"
import { TrayectoriaMarte } from "@/components/environment/trayectoria-marte"
import { TrendsView } from "@/components/trends/trends-view"
import { S } from "@/lib/strings"
import type { IndicatorId, Status } from "@/lib/types"

const HEX: Record<Status, string> = { ok: "#16a34a", watch: "#f59e0b", act: "#ef4444" }

/** Modo histórico de un tripulante: elige el día de misión, ve su cuerpo ese día en pequeño (minimapa) y sus tendencias. */
export function Historico() {
  const { day, setDay, analisis, sex, theme, catalogo } = useApp()
  const dias = analisis.missionDays
  // El cuerpo de ese día: cada indicador fuera de rango tiñe su órgano (el 3D de body-view, sin marcadores ni giro a la vista)
  const estadoEscena = useMemo(() => {
    const estados = analisis.indicatorStatus(day)
    const lpm = analisis.vitals(day).find((v) => v.day === day)?.restingHr ?? null
    const calientes = (Object.keys(estados) as IndicatorId[]).filter((id) => estados[id] !== "ok")
      .map((id) => ({ ancla: id, color: HEX[estados[id]], radio: estados[id] === "act" ? 0.15 : 0.12 }))
    return { sexo: sex, oscuro: theme === "dark", lpm, vista: null, calientes, giroFijo: 0 }
  }, [analisis, day, sex, theme])
  const diasConAlerta = useMemo(
    () => [...new Set(analisis.alerts(catalogo.historial.dia_actual).filter((a) => !a.informative).map((a) => a.day))],
    [analisis, catalogo.historial.dia_actual],
  )
  return (
    <div className="flex flex-col gap-4">
      <NavegadorDias dia={day} dias={dias} hoy={catalogo.historial.dia_actual} diasConAlerta={diasConAlerta} onCambiar={setDay} />
      <div className="grid gap-4 lg:grid-cols-[11rem_1fr] lg:items-start">
        <div className="mx-auto w-44 lg:sticky lg:top-4">
          <BodyStage className="h-72 w-full" estado={estadoEscena} marcadores={[]} onMarcador={() => {}} />
          <div className="mt-3"><TrayectoriaMarte dia={day} mini /></div>
        </div>
        <TrendsView />
      </div>
    </div>
  )
}
