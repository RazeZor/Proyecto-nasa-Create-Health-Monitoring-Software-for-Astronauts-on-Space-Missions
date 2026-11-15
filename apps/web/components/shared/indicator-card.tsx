import { ExternalLink } from "lucide-react"
import { IconoAlertas, IconoDispositivo, type Icono } from "@/components/shared/iconos"
import { IconoPorQue, IconoPrevencion, IconoQueEs, IconoRiesgo } from "@/components/trends/iconos"
import { S } from "@/lib/strings"
import type { IndicatorInfo } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Ficha de un indicador en bloques que se leen de un vistazo: primero lo que pide una acción, después el contexto. */
export function IndicatorCard({ info }: { info: IndicatorInfo }) {
  const bloques: { icono: Icono; titulo: string; texto: string; destacado?: boolean; lista?: boolean }[] = [
    { icono: IconoAlertas, titulo: S.trends.whenToNotify, texto: info.whenToNotify, destacado: true },
    { icono: IconoDispositivo, titulo: S.trends.howToMeasure, texto: info.howToMeasure },
    { icono: IconoPrevencion, titulo: S.trends.prevention, texto: info.prevention },
    { icono: IconoQueEs, titulo: S.trends.whatItIs, texto: info.whatItIs },
    { icono: IconoPorQue, titulo: S.trends.whyNeeded, texto: info.whyNeeded },
    { icono: IconoRiesgo, titulo: S.trends.hazard, texto: info.hazard, lista: true },
  ]
  return (
    <section aria-labelledby={`ind-${info.id}`} className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="eyebrow">{S.trends.sheet}</p>
          <h2 id={`ind-${info.id}`} className="mt-1 text-2xl font-bold leading-tight">
            {info.label} {info.unit && <span className="font-normal text-muted-foreground">({info.unit})</span>}
          </h2>
        </div>
        <a
          href={info.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-full border border-border px-5 text-base font-semibold hover:bg-accent active:scale-[0.98]"
        >
          <span><span className="font-normal text-muted-foreground">{S.trends.source}:</span> {info.sourceLabel}</span>
          <ExternalLink aria-hidden className="size-5 shrink-0" />
        </a>
      </div>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {bloques.map(({ icono: Icono, titulo, texto, destacado, lista }) => {
          const partes = lista ? texto.split(" · ") : []
          return (
            <div key={titulo} className={cn("rounded-2xl border p-4", destacado ? "border-primary/40 bg-primary/5" : "border-border bg-muted/40")}>
              <dt className="flex items-center gap-2.5 text-lg font-semibold leading-tight">
                <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", destacado ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>
                  <Icono className="size-6" />
                </span>
                {titulo}
              </dt>
              <dd className="mt-2.5 text-pretty text-base leading-relaxed">
                {partes.length > 1 ? (
                  <ul className="flex flex-col gap-1.5">
                    {partes.map((p) => (
                      <li key={p} className="flex gap-2.5">
                        <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-foreground/60" />
                        {p}
                      </li>
                    ))}
                  </ul>
                ) : texto}
              </dd>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
