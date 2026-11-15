"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCheck, Clock, Satellite } from "lucide-react"
import { useApp } from "@/components/app-context"
import { DelayCountdown, formatDelay, useReportState } from "@/components/shared/delay-countdown"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { encolarReporte, listarReportes, reporteDeServidor, responderReporte, retardoMin } from "@/lib/api-registro"
import type { ReporteServidor } from "@/lib/cola"
import { S } from "@/lib/strings"
import { TRIPULANTE } from "@/lib/sincronizacion"
import type { Report } from "@/lib/types"
import { cn } from "@/lib/utils"

const STATE_ICON = { queued: Clock, sent: Satellite, arrived: CheckCheck }

function ReportRow({ r, surgeon, servidor, onReply }: { r: Report; surgeon: boolean; servidor?: ReporteServidor; onReply: () => void }) {
  const { state, remainingMs, progress } = useReportState(r.createdAt, r.delayMinutes, servidor)
  const [texto, setTexto] = useState("")
  const [fallo, setFallo] = useState(false)
  async function responder() {
    if (!r.serverId || !texto.trim()) return
    const ok = await responderReporte(r.serverId, texto.trim(), TRIPULANTE ?? 1)
    setFallo(!ok)
    if (ok) onReply()
  }
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
      {surgeon && servidor?.estado === "entregado" && (
        <div className="mt-3 flex flex-col gap-2">
          <label htmlFor={`resp-${r.id}`} className="text-xs text-muted-foreground">{S.reports.replyLabel}</label>
          <textarea id={`resp-${r.id}`} rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-lg border border-input bg-background p-2 text-sm" />
          <button type="button" onClick={responder} disabled={!texto.trim()} className="min-h-10 self-start rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{S.reports.replySend}</button>
          {fallo && <p role="alert" className="text-sm text-status-act">{S.reports.replyFailed}</p>}
        </div>
      )}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {([["reading", r.reading], ["baseline", r.baseline], ["environment", r.environment], ["actionTaken", r.actionTaken]] as const).filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt className="text-xs text-muted-foreground">{S.reports[k]}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </li>
  )
}

export function ReportsView() {
  const { day, profile, role, analisis, catalogo, mode } = useApp()
  // los informes, su contenido y su estado viven en la API; se releen cada 3 s para ver la cola avanzar
  const tripulante = TRIPULANTE ?? 1
  const [cola, setCola] = useState<ReporteServidor[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const leer = useCallback(() => listarReportes(tripulante).then(setCola), [tripulante])
  useEffect(() => {
    leer()
    const id = window.setInterval(leer, 3000)
    return () => window.clearInterval(id)
  }, [leer])
  // los informes de ejemplo sembrados para la demo (o fechados en el futuro) no son del tripulante real
  const visibles = cola && cola.filter((x) => mode === "demo" || !(x.contenido?.demo || Date.parse(x.creado_t_real) > Date.now() + 86_400_000))
  const reports: Report[] | null = visibles && visibles.map(reporteDeServidor)
  const porId = new Map((cola ?? []).map((x) => [x.id, x]))
  const surgeon = role === "surgeon"

  async function queue() {
    // el informe lleva lo que pide §6.1: lectura, línea base, entorno y acción, todo del día y con su procedencia
    const v = analisis.vitals(day).find((x) => x.day === day)
    const medida = (valor: number | null | undefined, unidad: string) => (valor == null ? null : `${valor} ${unidad}`)
    const lectura = v
      ? [medida(v.restingHr, "lpm"), medida(v.systolic, "mmHg"), medida(v.spo2, "% SpO2"), medida(v.tempC, "°C"),
          v.sleepH == null ? null : `${S.reports.sleep} ${v.sleepH} h`, v.mood == null ? null : `${S.reports.mood} ${v.mood}/10`].filter(Boolean).join(" · ")
      : S.reports.noReading
    const banda = analisis.band("restingHr").findLast((b) => b.day <= day)
    const lineaBase = banda
      ? S.reports.bandText(banda.low.toFixed(0), banda.high.toFixed(0), banda.flightWeight === 0 ? S.reports.phaseGround : banda.flightWeight === 1 ? S.reports.phaseFlight : S.reports.phaseMix)
      : S.reports.noBaseline
    const co2 = analisis.co2(day)
    const tormenta = analisis.stormInfo(day)
    const entorno = [
      co2 ? `CO2 ${co2.mmHg.toFixed(2)} mmHg @ ${profile.cabinPressureMmHg} mmHg (${co2.source})` : null,
      tormenta ? `${S.reports.stormOn} (${tormenta.source})` : null,
    ].filter(Boolean).join(" · ") || S.reports.noEnvironment
    const alerta = analisis.alerts(day).find((a) => a.day === day && !a.informative)
    // demo: el retardo real del perfil se acorta a 1 min
    const id = await encolarReporte(profile.id, new Date().toISOString(), tripulante, Math.min(retardoMin(profile.id), 1), {
      titulo: S.reports.dailyTitle(day),
      resumen: S.reports.summary(S.status[analisis.overall(day)], profile.label, formatDelay(profile.delayMinutes)),
      lectura,
      linea_base: lineaBase,
      entorno,
      accion: alerta ? alerta.action : S.reports.noAction,
      ...(mode === "demo" ? { demo: true } : {}),
    })
    setFallo(id === null)
    await leer()
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
      {fallo && <p role="alert" className="mb-4 rounded-lg border border-status-act/40 bg-status-act/10 p-3 text-sm">{S.reports.sendFailed}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="q-h">
          <h2 id="q-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.reports.queue}</h2>
          {reports === null ? null : reports.length === 0 ? <EmptyState message={S.reports.empty} /> : (
            <ul className="flex flex-col gap-3">
              {[...reports].reverse().map((r) => <ReportRow key={r.id} r={r} surgeon={surgeon} servidor={r.serverId ? porId.get(r.serverId) : undefined} onReply={leer} />)}
            </ul>
          )}
        </section>
        <section aria-labelledby="t-h">
          <h2 id="t-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.reports.thread}</h2>
          <ol className="flex flex-col gap-3">
            {catalogo.mensajes.filter((m) => m.day <= day).map((m) => (
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
