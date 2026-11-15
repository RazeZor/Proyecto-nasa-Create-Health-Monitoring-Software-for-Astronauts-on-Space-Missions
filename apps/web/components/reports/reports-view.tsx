"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useApp } from "@/components/app-context"
import { IconoEspera, IconoNave, IconoRespuesta, IconoSobre, IconoTierra, IconoVisto } from "@/components/reports/iconos"
import { Trayecto } from "@/components/reports/trayecto"
import { formatDelay, useReportState } from "@/components/shared/delay-countdown"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { encolarReporte, listarReportes, reporteDeServidor, responderReporte, retardoEnvio } from "@/lib/api-registro"
import { estadoReporte, type ReporteServidor } from "@/lib/cola"
import { S } from "@/lib/strings"
import { TRIPULANTE } from "@/lib/sincronizacion"
import type { Report } from "@/lib/types"
import { cn } from "@/lib/utils"

const seccionH = "mb-4 text-2xl font-semibold"
const pastilla = "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold"
const CAMPOS = ["reading", "baseline", "environment", "actionTaken"] as const

/** Si ya hay respuesta de Tierra o el informe sigue esperándola. Solo tiene sentido cuando ya llegó. */
function Respuesta({ servidor }: { servidor?: ReporteServidor }) {
  if (!servidor) return null
  return servidor.respuesta ? (
    <span className={cn(pastilla, "border-primary/40 bg-primary/10")}><IconoRespuesta className="size-5" />{S.reports.replied}</span>
  ) : (
    <span className={cn(pastilla, "border-border bg-card text-muted-foreground")}><IconoEspera className="size-5" />{S.reports.countNoReply}</span>
  )
}

function ReportRow({ r, surgeon, servidor, destacado, onReply }: { r: Report; surgeon: boolean; servidor?: ReporteServidor; destacado: boolean; onReply: () => void }) {
  const { state, remainingMs, progress } = useReportState(r.createdAt, r.delayMinutes, servidor)
  const [texto, setTexto] = useState("")
  const [fallo, setFallo] = useState(false)
  const [plegado, setPlegado] = useState<boolean | null>(null)
  async function responder() {
    if (!r.serverId || !texto.trim()) return
    const ok = await responderReporte(r.serverId, texto.trim(), TRIPULANTE ?? 1)
    setFallo(!ok)
    if (ok) onReply()
  }
  if (surgeon && state !== "arrived") return null
  const llego = state === "arrived"
  const porResponder = surgeon && servidor?.estado === "entregado"
  // a la vista: el más reciente, lo que aún viaja y (para el cirujano) lo que espera su respuesta; el resto, plegado
  const abierto = !(plegado ?? !(destacado || !llego || porResponder))
  const campos = CAMPOS.filter((k) => r[k])
  return (
    <li className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <button type="button" onClick={() => setPlegado(abierto)} aria-expanded={abierto}
        className="flex min-h-16 w-full flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 text-left hover:bg-accent/60 active:bg-accent">
        <span className="min-w-0 flex-1 basis-56 text-xl font-semibold">{surgeon ? `${S.reports.received} · ` : ""}{r.title}</span>
        {llego ? (
          <>
            {!abierto && <span className={cn(pastilla, "border-status-ok/40 bg-status-ok/12 text-status-ok")}><IconoVisto className="size-5" />{S.reports.arrived}</span>}
            <Respuesta servidor={servidor} />
          </>
        ) : (
          <span className={cn(pastilla, "border-primary/40 bg-primary/10")}>
            {state === "sent" ? <IconoSobre className="size-5" /> : <IconoEspera className="size-5" />}
            {S.reports[state]}
          </span>
        )}
        <span className="sr-only">{abierto ? S.reports.contentHide : S.reports.contentShow}</span>
        <ChevronDown aria-hidden className={cn("size-6 shrink-0 text-muted-foreground transition-transform duration-200", abierto && "rotate-180")} />
      </button>

      {abierto && (
        <div className="flex flex-col gap-5 border-t border-border p-5">
          {!surgeon && <Trayecto state={state} progress={progress} remainingMs={remainingMs} />}
          <p className="text-lg leading-relaxed">{r.summary}</p>

          {servidor?.respuesta ? (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card"><IconoRespuesta className="size-6" /></span>
              <p className="min-w-0 text-lg leading-relaxed"><span className="eyebrow mb-1 block">{S.reports.reply}</span>{servidor.respuesta}</p>
            </div>
          ) : llego && servidor && !surgeon ? (
            <p className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-base text-muted-foreground">
              <IconoEspera className="size-6 shrink-0" />
              {S.reports.noReplyYet}
            </p>
          ) : null}

          {porResponder && (
            <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/40 p-4">
              <label htmlFor={`resp-${r.id}`} className="text-lg font-semibold">{S.reports.replyLabel}</label>
              <textarea id={`resp-${r.id}`} rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} className="rounded-2xl border border-input bg-background p-3 text-lg" />
              <button type="button" onClick={responder} disabled={!texto.trim()}
                className="min-h-14 self-start rounded-full bg-primary px-6 text-lg font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50">
                {S.reports.replySend}
              </button>
              {fallo && <p role="alert" className="text-base font-medium text-status-act">{S.reports.replyFailed}</p>}
            </div>
          )}

          {campos.length > 0 && (
            <div>
              <h3 className="eyebrow mb-2">{S.reports.content}</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                {campos.map((k) => (
                  <div key={k} className={cn("rounded-2xl border border-border p-4", k === "actionTaken" && "bg-muted/50")}>
                    <dt className="text-sm font-semibold text-muted-foreground">{S.reports[k]}</dt>
                    <dd className="mt-1 text-base leading-relaxed">{r[k]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function Dato({ etiqueta, valor, children }: { etiqueta: string; valor: string | number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">{children}</span>
      <p>
        <span className="eyebrow block">{etiqueta}</span>
        <span className="block text-4xl font-semibold leading-tight tabular-nums">{valor}</span>
      </p>
    </div>
  )
}

export function ReportsView() {
  const { day, profile, role, analisis, catalogo, mode } = useApp()
  // los informes, su contenido y su estado viven en la API; se releen cada 3 s para ver la cola avanzar
  const tripulante = TRIPULANTE ?? 1
  const [cola, setCola] = useState<ReporteServidor[] | null>(null)
  const [fallo, setFallo] = useState(false)
  const [sinEnlace, setSinEnlace] = useState(false)
  const [encolando, setEncolando] = useState(false)
  // sin red la API no responde: se avisa y se conserva lo último leído, nunca se muestra una cola vacía falsa
  const leer = useCallback(() => listarReportes(tripulante).then((c) => { setSinEnlace(c === null); if (c !== null) setCola(c) }), [tripulante])
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
  const servidorDe = (r: Report) => (r.serverId ? porId.get(r.serverId) : undefined)

  // recuento de un vistazo: qué viaja todavía y qué espera respuesta (se refresca con cada relectura de la cola)
  const ahora = Date.now()
  const recientes = [...(reports ?? [])].reverse()
  const haLlegado = (r: Report) => estadoReporte(r.createdAt, r.delayMinutes, ahora, servidorDe(r)).state === "arrived"
  const llegados = recientes.filter(haLlegado)
  const enCamino = recientes.length - llegados.length
  const conRespuesta = llegados.filter((r) => servidorDe(r)?.respuesta).length
  const sinRespuesta = llegados.filter((r) => { const s = servidorDe(r); return s && !s.respuesta }).length
  // lo que aún viaja va arriba: es lo que el tripulante está esperando ver avanzar
  const listado = surgeon ? llegados : [...recientes.filter((r) => !haLlegado(r)), ...llegados]

  async function queue() {
    setEncolando(true)
    // el informe lleva lo que pide §6.1: lectura, línea base, entorno y acción, todo del día y con su procedencia
    const v = analisis.vitals(day).find((x) => x.day === day)
    const medida = (valor: number | null | undefined, unidad: string) => (valor == null ? null : `${valor} ${unidad}`)
    const lectura = v
      ? [medida(v.restingHr, catalogo.indicadores.restingHr.unit), medida(v.systolic, "mmHg"), medida(v.spo2, "% SpO2"), medida(v.tempC, "°C"),
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
    // modo real: el retardo del perfil; demo: se acorta a 1 min para ver la cola avanzar
    const id = await encolarReporte(profile.id, new Date().toISOString(), tripulante, retardoEnvio(mode, profile.id), {
      titulo: S.reports.dailyTitle(day),
      resumen: (mode === "demo" ? S.reports.summary : S.reports.summaryReal)(S.status[analisis.overall(day)], profile.label, formatDelay(profile.delayMinutes)),
      lectura,
      linea_base: lineaBase,
      entorno,
      accion: alerta ? alerta.action : S.reports.noAction,
      ...(mode === "demo" ? { demo: true } : {}),
    })
    setFallo(id === null)
    await leer()
    setEncolando(false)
  }

  const mensajes = catalogo.mensajes.filter((m) => m.day <= day).sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={S.reports.title} subtitle={surgeon ? S.reports.surgeonNote : S.reports.subtitle}>
        {!surgeon && (
          <button type="button" onClick={queue} disabled={encolando}
            className="inline-flex min-h-14 items-center gap-3 rounded-full bg-primary px-7 text-lg font-semibold text-primary-foreground transition-transform hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60">
            <IconoSobre className="size-6" />
            {encolando ? S.reports.sending : S.reports.send}
          </button>
        )}
      </PageHeader>
      {fallo && <p role="alert" className="mb-5 rounded-2xl border border-status-act/40 bg-status-act/12 p-4 text-base font-medium">{S.reports.sendFailed}</p>}
      {sinEnlace && <p role="status" className="mb-5 rounded-2xl border border-border bg-muted p-4 text-base font-medium">{S.reports.offline}</p>}

      {/* El enlace de un vistazo: cuánto tarda un mensaje, qué viaja y qué espera respuesta */}
      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
        <div className="flex min-w-0 flex-1 basis-[28rem] items-center gap-4">
          <span className="flex shrink-0 items-center gap-1.5" aria-hidden>
            <IconoNave className="size-9" />
            <span className="w-10 border-t-2 border-dashed border-muted-foreground/50" />
            <IconoTierra className="size-9" />
          </span>
          <p className="shrink-0">
            <span className="eyebrow block">{S.reports.oneWay}</span>
            <span className="block text-4xl font-semibold leading-tight tabular-nums">{formatDelay(profile.delayMinutes)}</span>
          </p>
          <p className="min-w-0 text-sm leading-snug text-muted-foreground">{S.reports.oneWayHint(profile.label)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {!surgeon && <Dato etiqueta={S.reports.countTransit} valor={reports ? enCamino : "—"}><IconoSobre className="size-7" /></Dato>}
          <Dato etiqueta={S.reports.countNoReply} valor={reports ? sinRespuesta : "—"}><IconoEspera className="size-7" /></Dato>
          <Dato etiqueta={S.reports.countReplied} valor={reports ? conRespuesta : "—"}><IconoRespuesta className="size-7" /></Dato>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="q-h" className="min-w-0">
          <h2 id="q-h" className={seccionH}>{S.reports.queue}</h2>
          {reports === null ? null : listado.length === 0 ? <EmptyState message={surgeon ? S.reports.surgeonEmpty : S.reports.empty} /> : (
            <ul className="flex flex-col gap-4">
              {listado.map((r, i) => <ReportRow key={r.id} r={r} surgeon={surgeon} servidor={servidorDe(r)} destacado={i === 0} onReply={leer} />)}
            </ul>
          )}
        </section>
        <section aria-labelledby="t-h" className="min-w-0">
          <h2 id="t-h" className={seccionH}>{S.reports.thread}</h2>
          {mensajes.length === 0 ? <EmptyState message={S.reports.threadEmpty} /> : (
            <ol className="flex flex-col gap-3 rounded-3xl border border-border bg-card/60 p-4">
              {mensajes.map((m) => {
                const deTierra = m.from === "surgeon"
                const propio = deTierra === surgeon
                const Ico = deTierra ? IconoTierra : IconoNave
                return (
                  <li key={m.id} className={cn("max-w-[92%] rounded-2xl border p-4", propio ? "self-end rounded-br-md border-primary bg-primary text-primary-foreground" : "self-start rounded-bl-md border-border bg-card shadow-sm")}>
                    <p className={cn("flex flex-wrap items-center gap-x-2 text-sm", propio ? "opacity-80" : "text-muted-foreground")}>
                      <Ico className="size-5 shrink-0" />
                      <span className={cn("font-semibold", !propio && "text-foreground")}>{m.author}</span>
                      <span className="font-mono">{S.common.day} {m.day} · {m.time}</span>
                    </p>
                    <p className="mt-1.5 text-base leading-relaxed">{m.body}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
