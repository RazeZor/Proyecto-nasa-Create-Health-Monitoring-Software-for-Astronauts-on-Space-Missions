"use client"

import { useEffect, useState } from "react"
import { CheckCheck, Clock, Satellite } from "lucide-react"
import { useApp } from "@/components/app-context"
import { DelayCountdown, formatDelay, useReportState } from "@/components/shared/delay-countdown"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { encolarReporte, listarReportes, retardoMin } from "@/lib/api-registro"
import type { ReporteServidor } from "@/lib/cola"
import { cargarPanelGold, type PanelEntornoEtl } from "@/lib/etl-client"
import { SEED_REPORTS, THREAD } from "@/lib/mock/alerts"
import { ppmToMmHg } from "@/lib/mock/environment"
import { S } from "@/lib/strings"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { store } from "@/lib/storage"
import type { Report } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATE_ICON = { queued: Clock, sent: Satellite, arrived: CheckCheck }

function ReportRow({ r, surgeon, servidor }: { r: Report; surgeon: boolean; servidor?: ReporteServidor }) {
  const { state, remainingMs, progress } = useReportState(r.createdAt, r.delayMinutes, servidor)
  const Icon = STATE_ICON[state]
  if (surgeon && state !== "arrived") return null
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium">{surgeon ? `${S.reports.received} · ` : ""}{r.title}</p>
        <span className={cn("inline-flex items-center gap-1.5 text-sm font-medium", state === "arrived" ? "text-status-ok" : "text-primary")}>
          <Icon aria-hidden className="size-4" />
          {S.reports[state]}
          {state === "sent" && <> · {S.reports.arrivesIn} <DelayCountdown remainingMs={remainingMs} label={S.reports.arrivesIn} /></>}
        </span>
      </div>
      {!surgeon && (
        <div className="mt-3 h-1.5 rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label={S.reports[state]}>
          <div className="h-1.5 rounded-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      <p className="mt-3 text-sm">{r.summary}</p>
      {servidor?.respuesta && (
        <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm"><span className="text-xs text-muted-foreground">{S.reports.reply}</span><br />{servidor.respuesta}</p>
      )}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {([["reading", r.reading], ["baseline", r.baseline], ["environment", r.environment], ["actionTaken", r.actionTaken]] as const).map(([k, v]) => (
          <div key={k}><dt className="text-xs text-muted-foreground">{S.reports[k]}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </li>
  )
}

export function ReportsView() {
  const { day, profile, role, analisis } = useApp()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [gold, setGold] = useState<PanelEntornoEtl | null>(null)
  useEffect(() => {
    store.listReports().then((saved) => {
      const seeded = SEED_REPORTS.map((r) => ({ ...r, createdAt: Date.now() - 3600_000 }))
      setReports([...seeded, ...saved])
    })
    cargarPanelGold("mision-vigia").then(({ panel }) => setGold(panel))
  }, [])
  const [cola, setCola] = useState<Map<number, ReporteServidor>>(new Map())
  useEffect(() => {
    if (!TRIPULANTE) return
    const tripulante = TRIPULANTE
    const leer = () => listarReportes(tripulante).then((l) => setCola(new Map(l.map((x) => [x.id, x]))))
    leer()
    const id = window.setInterval(leer, 3000)
    return () => window.clearInterval(id)
  }, [])
  const surgeon = role === "surgeon"

  async function queue() {
    const cab = gold?.cabina.find((c) => c.dia_mision === day) ?? gold?.cabina.at(-1)
    const prot = gold?.protones.find((p) => p.dia_mision === day && p.serie.includes(">=10 MeV")) ?? gold?.protones.at(-1)
    const co2Txt = cab?.co2_ppm_promedio_horario_max
      ? `${ppmToMmHg(cab.co2_ppm_promedio_horario_max, profile.cabinPressureMmHg)} mmHg`
      : "sin lectura"
    const protTxt = prot ? `${prot.max_pfu} pfu` : "sin lectura"
    const envResumen = gold
      ? `Gold (${gold.escenario}): protones >=10 MeV ${protTxt}, CO2 ${co2Txt} @ ${profile.cabinPressureMmHg} mmHg`
      : `Sin telemetría Gold conectada (apps/api fuera de línea) · perfil ${profile.cabinPressureMmHg} mmHg`
    const creado = Date.now()
    // demo: el retardo real del perfil se acorta a 1 min como en la vista local; sin red o sin identidad no hay serverId
    const serverId = TRIPULANTE ? await encolarReporte(profile.id, new Date(creado).toISOString(), TRIPULANTE, Math.min(retardoMin(profile.id), 1)) : null
    const r: Report = {
      serverId: serverId ?? undefined,
      id: crypto.randomUUID(),
      title: `Informe diario · Día ${day}`,
      createdAt: creado,
      delayMinutes: Math.min(profile.delayMinutes, 1),
      summary: `Overall ${S.status[analisis.overall(day)]}. Sent from ${profile.label} (one-way delay ${formatDelay(profile.delayMinutes)}, compressed to 1 min in demo).`,
      reading: "Ver el registro de hoy",
      baseline: "In-flight baseline active",
      environment: envResumen,
      actionTaken: "Siguiendo el protocolo a bordo",
    }
    await store.saveReport(r)
    setReports((cur) => [...(cur ?? []), r])
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={S.reports.title} subtitle={surgeon ? S.reports.surgeonNote : S.reports.subtitle}>
        {!surgeon && (
          <button type="button" onClick={queue} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            {S.reports.send}
          </button>
        )}
      </PageHeader>
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="q-h">
          <h2 id="q-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.reports.queue}</h2>
          {reports === null ? null : reports.length === 0 ? <EmptyState message={S.reports.empty} /> : (
            <ul className="flex flex-col gap-3">
              {[...reports].reverse().map((r) => <ReportRow key={r.id} r={r} surgeon={surgeon} servidor={r.serverId ? cola.get(r.serverId) : undefined} />)}
            </ul>
          )}
        </section>
        <section aria-labelledby="t-h">
          <h2 id="t-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.reports.thread}</h2>
          <ol className="flex flex-col gap-3">
            {THREAD.filter((m) => m.day <= day).map((m) => (
              <li key={m.id} className={cn("max-w-[90%] rounded-xl border p-3", m.from === "surgeon" ? "self-start border-border bg-card" : "self-end border-primary/30 bg-primary/10")}>
                <p className="text-xs text-muted-foreground">{m.author} · {S.common.day} {m.day} · {m.time}</p>
                <p className="mt-1 text-sm">{m.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}
