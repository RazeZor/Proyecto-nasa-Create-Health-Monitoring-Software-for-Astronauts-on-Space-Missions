"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCheck, Clock, Satellite } from "lucide-react"
import { useApp } from "@/components/app-context"
import { DelayCountdown, formatDelay, useReportState } from "@/components/shared/delay-countdown"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { avanzarCola, encolarReporte, listarReportes, reporteDeServidor, responderReporte, retardoMin } from "@/lib/api-registro"
import { leerMensajes } from "@/lib/catalogo"
import type { ReporteServidor } from "@/lib/cola"
import { cargarPanelGold, type PanelEntornoEtl } from "@/lib/etl-client"
import { S } from "@/lib/strings"
import { actorDeRol, TRIPULANTE } from "@/lib/sincronizacion"
import type { Report, ThreadMessage } from "@/lib/types"
import { cn, ppmToMmHg } from "@/lib/utils"

const STATE_ICON = { queued: Clock, sent: Satellite, arrived: CheckCheck }

function ReportRow({
  r,
  surgeon,
  servidor,
  onReplied,
}: {
  r: Report
  surgeon: boolean
  servidor?: ReporteServidor
  onReplied: () => Promise<void>
}) {
  const { state, remainingMs, progress } = useReportState(r.createdAt, r.delayMinutes, servidor)
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [errorRespuesta, setErrorRespuesta] = useState(false)
  const Icon = STATE_ICON[state]
  if (surgeon && state !== "arrived") return null

  async function enviarRespuesta(e: React.FormEvent) {
    e.preventDefault()
    if (!servidor || !texto.trim()) return
    setEnviando(true)
    setErrorRespuesta(false)
    const instante = new Date(Math.max(Date.now(), Date.parse(servidor.llega_t_real))).toISOString()
    if (servidor.estado === "en_cola") await avanzarCola(instante, 2)
    const ok = await responderReporte(servidor.id, texto.trim(), instante, 2)
    setEnviando(false)
    if (!ok) {
      setErrorRespuesta(true)
      return
    }
    setTexto("")
    await onReplied()
  }

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
      {servidor?.respuesta ? (
        <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm"><span className="text-xs text-muted-foreground">{S.reports.reply}</span><br />{servidor.respuesta}</p>
      ) : surgeon && servidor ? (
        <form onSubmit={enviarRespuesta} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={S.reports.replyPlaceholder}
            aria-label={S.reports.reply}
            className="min-h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          />
          <button
            type="submit"
            disabled={enviando || !texto.trim()}
            className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {S.reports.sendReply}
          </button>
          {errorRespuesta && <span role="alert" className="text-xs text-status-act">{S.reports.replyFailed}</span>}
        </form>
      ) : null}
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        {([["reading", r.reading], ["baseline", r.baseline], ["environment", r.environment], ["actionTaken", r.actionTaken]] as const).filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt className="text-xs text-muted-foreground">{S.reports[k]}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </li>
  )
}

export function ReportsView() {
  const { day, profile, role, analisis, catalogo } = useApp()
  const [gold, setGold] = useState<PanelEntornoEtl | null>(null)
  useEffect(() => {
    cargarPanelGold("mision-vigia").then(({ panel }) => setGold(panel))
  }, [])
  // los informes, su contenido y su estado viven en la API; se releen cada 3 s para ver la cola avanzar
  const tripulante = TRIPULANTE ?? 1
  const [cola, setCola] = useState<ReporteServidor[] | null>(null)
  const [mensajes, setMensajes] = useState<ThreadMessage[]>(catalogo.mensajes)
  const [fallo, setFallo] = useState(false)
  const leer = useCallback(async () => {
    const [lista, hilo] = await Promise.all([listarReportes(tripulante), leerMensajes(tripulante)])
    setCola(lista)
    if (hilo) setMensajes(hilo)
  }, [tripulante])
  useEffect(() => {
    void leer()
    const id = window.setInterval(leer, 3000)
    return () => window.clearInterval(id)
  }, [leer])
  const reports: Report[] | null = cola && cola.map(reporteDeServidor)
  const porId = new Map((cola ?? []).map((x) => [x.id, x]))
  const surgeon = role === "surgeon"
  const hayEnCola = (cola ?? []).some((x) => x.estado === "en_cola")

  async function adelantarCola() {
    const futuro = new Date(Date.now() + 25 * 60_000).toISOString()
    await avanzarCola(futuro, actorDeRol(role))
    await leer()
  }

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
    // demo: el retardo real del perfil se acorta a 1 min
    const id = await encolarReporte(profile.id, new Date().toISOString(), tripulante, Math.min(retardoMin(profile.id), 1), {
      titulo: `Informe diario · Día ${day}`,
      resumen: `Estado general ${S.status[analisis.overall(day)]}. Enviado desde ${profile.label} (retardo de ida ${formatDelay(profile.delayMinutes)}, acortado a 1 min en la demo).`,
      lectura: "Ver el registro de hoy",
      linea_base: "Línea base en vuelo activa",
      entorno: envResumen,
      accion: "Siguiendo el protocolo a bordo",
    })
    setFallo(id === null)
    await leer()
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={S.reports.title} subtitle={surgeon ? S.reports.surgeonNote : S.reports.subtitle}>
        <div className="flex flex-wrap items-center gap-2">
          {hayEnCola && (
            <button type="button" onClick={adelantarCola} className="min-h-11 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent">
              {S.reports.advanceQueue}
            </button>
          )}
          {!surgeon && (
            <button type="button" onClick={queue} className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              {S.reports.send}
            </button>
          )}
        </div>
      </PageHeader>
      {fallo && <p role="alert" className="mb-4 rounded-lg border border-status-act/40 bg-status-act/10 p-3 text-sm">{S.reports.sendFailed}</p>}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="q-h">
          <h2 id="q-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.reports.queue}</h2>
          {reports === null ? null : reports.length === 0 ? <EmptyState message={S.reports.empty} /> : (
            <ul className="flex flex-col gap-3">
              {[...reports].reverse().map((r) => <ReportRow key={r.id} r={r} surgeon={surgeon} servidor={r.serverId ? porId.get(r.serverId) : undefined} onReplied={leer} />)}
            </ul>
          )}
        </section>
        <section aria-labelledby="t-h">
          <h2 id="t-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.reports.thread}</h2>
          <ol className="flex flex-col gap-3">
            {mensajes.filter((m) => m.day <= day).map((m) => (
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
