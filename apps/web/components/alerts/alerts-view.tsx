"use client"

import { useEffect, useState } from "react"
import { Lock, Send, Share2 } from "lucide-react"
import { useApp } from "@/components/app-context"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { LayerChip, StatusBadge, statusSurface } from "@/components/shared/status"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { S } from "@/lib/strings"
import { store } from "@/lib/storage"
import type { Alert } from "@/lib/types"
import { cn } from "@/lib/utils"

function SentDialog({ a }: { a: Alert }) {
  return (
    <Dialog>
      <DialogTrigger className="min-h-11 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent">
        {S.alerts.viewSent}
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>{S.alerts.autoSent}</DialogTitle>
        <DialogDescription>{S.alerts.autoSentDetail}</DialogDescription>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">
{JSON.stringify({ day: a.day, time: a.time, status: a.status, layer: a.layer, indicator: a.indicator, value: a.value, band: a.clinicalBand, cause: a.cause }, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  )
}

export function AlertsView() {
  const { day, role, analisis } = useApp()
  const [shared, setShared] = useState<string[]>([])
  const [acked, setAcked] = useState<string[]>([])
  useEffect(() => {
    store.listSharedAlertIds().then(setShared)
    store.listAcknowledgedAlertIds().then(setAcked)
  }, [])

  const all = [...analisis.alerts(day)].sort((a, b) => b.day - a.day || b.time.localeCompare(a.time))
  const list = role === "astronaut" ? all : all.filter((a) => a.status === "act" || shared.includes(a.id))

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={S.alerts.title} subtitle={role === "astronaut" ? S.alerts.subtitle : S.alerts.cmoNote} />
      {list.length === 0 ? <EmptyState message={S.alerts.empty} /> : (
        <ul className="flex flex-col gap-4">
          {list.map((a) => {
            const isShared = shared.includes(a.id)
            const isAcked = acked.includes(a.id)
            return (
              <li key={a.id} className={cn("rounded-xl border p-4 md:p-5", a.status === "act" ? statusSurface.act : "border-border bg-card")}>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={a.status} />
                  <LayerChip layer={a.layer} />
                  <span className="text-sm text-muted-foreground">{S.zones[a.zone]}</span>
                  <span className="ml-auto font-mono text-sm text-muted-foreground">{S.common.day} {a.day} · {a.time}</span>
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-muted-foreground">{S.alerts.indicator}</dt><dd className="font-medium">{a.indicator}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{S.alerts.value}</dt><dd className="font-mono font-medium">{a.value}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{S.alerts.band}</dt><dd>{a.clinicalBand}</dd></div>
                  <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">{S.alerts.cause}</dt><dd>{a.cause}</dd></div>
                  <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">{S.alerts.action}</dt><dd className="font-medium">{a.action}</dd></div>
                </dl>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {a.status === "act" ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-act"><Send aria-hidden className="size-4" />{S.alerts.autoSent}</span>
                      <SentDialog a={a} />
                      {role === "astronaut" && (
                        <button type="button" disabled={isAcked}
                          onClick={() => store.acknowledgeAlert(a.id).then(() => setAcked((s) => [...s, a.id]))}
                          className="min-h-11 rounded-lg bg-status-act px-4 text-sm font-semibold text-background disabled:opacity-50">
                          {isAcked ? `${S.alerts.acknowledge} ✓` : S.alerts.acknowledge}
                        </button>
                      )}
                    </>
                  ) : isShared ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-primary"><Share2 aria-hidden className="size-4" />{S.alerts.shared}</span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Lock aria-hidden className="size-4" />{S.alerts.private}</span>
                      {role === "astronaut" && (
                        <button type="button" onClick={() => store.shareAlert(a.id).then(() => setShared((s) => [...s, a.id]))}
                          className="min-h-11 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent">
                          {S.alerts.share}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
