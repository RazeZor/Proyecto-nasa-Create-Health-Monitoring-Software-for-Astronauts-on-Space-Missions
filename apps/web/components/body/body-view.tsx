"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, Clock, ListChecks } from "lucide-react"
import { useApp } from "@/components/app-context"
import { BodyFigure, type BodySide } from "@/components/body/body-figure"
import { PageHeader } from "@/components/shared/states"
import { LayerChip, ProvenanceTag, StatusBadge, STATUS_ICON, statusSurface, statusText } from "@/components/shared/status"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { REMINDERS } from "@/lib/mock/alerts"
import { S } from "@/lib/strings"
import { store } from "@/lib/storage"
import type { ZoneId } from "@/lib/types"
import { cn } from "@/lib/utils"

function useSinceLastCheckIn() {
  const [label, setLabel] = useState<string | null | undefined>(undefined)
  useEffect(() => {
    let alive = true
    const tick = () =>
      store.listCheckIns().then((list) => {
        if (!alive) return
        const last = list.at(-1)
        if (!last) return setLabel(null)
        const mins = Math.floor((Date.now() - new Date(last.createdAt).getTime()) / 60000)
        setLabel(mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h ${mins % 60} min`)
      })
    tick()
    const id = window.setInterval(tick, 30000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])
  return label
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring",
            value === o.value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function BodyView() {
  const { day, sex, setSex, analisis } = useApp()
  const [side, setSide] = useState<BodySide>("front")
  const zones = analisis.zones(day)
  const overall = analisis.overall(day)
  const [selected, setSelected] = useState<ZoneId | null>(null)
  const current = zones.find((z) => z.zone === selected)
  const since = useSinceLastCheckIn()
  const OverallIcon = STATUS_ICON[overall]
  const driver = zones.find((z) => z.status === overall && z.layer)

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={S.body.title} subtitle={S.body.subtitle} />
      <div className="grid gap-6 md:grid-cols-[minmax(260px,1fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-card p-6">
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <Segmented
              label={S.body.sexLabel}
              value={sex}
              onChange={setSex}
              options={[
                { value: "female", label: S.body.female },
                { value: "male", label: S.body.male },
              ]}
            />
            <Segmented
              label={S.body.sideLabel}
              value={side}
              onChange={setSide}
              options={[
                { value: "front", label: S.body.front },
                { value: "back", label: S.body.back },
              ]}
            />
          </div>
          <div className="flex h-[440px] w-full justify-center">
            <BodyFigure zones={zones} selected={selected} onSelect={setSelected} sex={sex} side={side} />
          </div>
          <ProvenanceTag provenance={{ kind: "simulated" }} />
        </section>

        <div className="flex flex-col gap-4">
          <section aria-labelledby="overall" className={cn("rounded-xl border p-5", statusSurface[overall])}>
            <h2 id="overall" className="text-sm font-medium text-muted-foreground">
              {S.body.overall} · {S.common.day} {day}
            </h2>
            <div className="mt-2 flex items-center gap-3">
              <OverallIcon aria-hidden className={cn("size-10", statusText[overall])} />
              <p className={cn("text-4xl font-semibold", statusText[overall])}>{S.status[overall]}</p>
            </div>
            <p className="mt-2 text-pretty">{S.statusLong[overall]}</p>
            {driver?.layer && (
              <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {S.body.triggeredBy} <LayerChip layer={driver.layer} /> {S.zones[driver.zone]}
              </p>
            )}
          </section>

          <section aria-labelledby="zones-h" className="rounded-xl border border-border bg-card p-2">
            <h2 id="zones-h" className="sr-only">{S.body.zones}</h2>
            <ul>
              {zones.map((z) => (
                <li key={z.zone}>
                  <button
                    type="button"
                    onClick={() => setSelected(z.zone)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 text-left hover:bg-accent"
                  >
                    <span className="font-medium">{S.zones[z.zone]}</span>
                    <span className="flex items-center gap-2">
                      {z.layer && <LayerChip layer={z.layer} className="hidden sm:inline-flex" />}
                      <StatusBadge status={z.status} size="sm" />
                      <ArrowRight aria-hidden className="size-4 text-muted-foreground" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <section aria-labelledby="rem-h" className="rounded-xl border border-border bg-card p-5">
              <h2 id="rem-h" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <ListChecks aria-hidden className="size-4" /> {S.body.reminders}
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {REMINDERS.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {r}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="since-h" className="flex flex-col rounded-xl border border-border bg-card p-5">
              <h2 id="since-h" className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock aria-hidden className="size-4" /> {S.body.lastCheckIn}
              </h2>
              <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
                {since === undefined ? "—" : since ?? S.body.never}
              </p>
              <Link
                href="/check-in"
                className="mt-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 pt-0 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {S.body.startCheckIn}
              </Link>
            </section>
          </div>
        </div>
      </div>

      <Sheet open={!!current} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
          {current && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{S.zones[current.zone]}</SheetTitle>
                <SheetDescription className="sr-only">{S.statusLong[current.status]}</SheetDescription>
                <div className="mt-2">
                  <StatusBadge status={current.status} size="lg" />
                </div>
              </SheetHeader>
              <dl className="flex flex-col gap-5 overflow-y-auto px-4 pb-6">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{S.body.why}</dt>
                  <dd className="mt-2 flex flex-col items-start gap-2">
                    {current.layer ? <LayerChip layer={current.layer} /> : <span className="text-sm text-muted-foreground">{S.body.noTrigger}</span>}
                    <p className="text-sm leading-relaxed">{current.layer ? S.layerLong[current.layer] : ""} {current.why}</p>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{S.body.deviation}</dt>
                  <dd className="mt-1 font-mono text-lg">{current.deviation}</dd>
                </div>
                <div className={cn("rounded-lg border p-4", statusSurface[current.status])}>
                  <dt className="text-xs font-medium uppercase tracking-wide">{S.body.next}</dt>
                  <dd className="mt-1 text-base font-medium leading-relaxed">{current.next}</dd>
                </div>
                <ProvenanceTag provenance={{ kind: "simulated" }} className="self-start" />
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
