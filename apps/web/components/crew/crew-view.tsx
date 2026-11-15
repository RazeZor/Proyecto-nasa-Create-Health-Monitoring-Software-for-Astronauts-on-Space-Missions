"use client"

import { Bandeja } from "@/components/alerts/alerts-view"
import { CrewWatches } from "@/components/device/reloj-extras"
import { PageHeader } from "@/components/shared/states"
import { S } from "@/lib/strings"

const seccionH = "mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground"

/** Tablero del oficial médico: relojes de la tripulación y avisos rojos escalados, con el dato mínimo (§5.4). */
export function CrewView() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeader title={S.crew.title} ayuda={<p>{S.crew.subtitle}</p>} />
      <CrewWatches />
      <section aria-labelledby="inbox-h">
        <h2 id="inbox-h" className={seccionH}>{S.alerts.inbox}</h2>
        <Bandeja />
      </section>
    </div>
  )
}
