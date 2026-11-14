import { ExternalLink } from "lucide-react"
import { S } from "@/lib/strings"
import type { IndicatorInfo } from "@/lib/types"

export function IndicatorCard({ info }: { info: IndicatorInfo }) {
  const fields: [string, string][] = [
    [S.trends.whatItIs, info.whatItIs],
    [S.trends.howToMeasure, info.howToMeasure],
    [S.trends.whyNeeded, info.whyNeeded],
    [S.trends.hazard, info.hazard],
    [S.trends.whenToNotify, info.whenToNotify],
    [S.trends.prevention, info.prevention],
  ]
  return (
    <section aria-labelledby={`ind-${info.id}`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`ind-${info.id}`} className="text-lg font-semibold">
        {info.label} <span className="font-normal text-muted-foreground">({info.unit})</span>
      </h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        {fields.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-sm leading-relaxed">{v}</dd>
          </div>
        ))}
      </dl>
      <a
        href={info.sourceUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
      >
        {S.trends.source}: {info.sourceLabel}
        <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </section>
  )
}
