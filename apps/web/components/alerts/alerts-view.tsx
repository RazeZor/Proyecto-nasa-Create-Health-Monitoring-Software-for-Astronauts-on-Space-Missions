"use client"

import { useCallback, useEffect, useState } from "react"
import { Clock, FlaskConical, Info, Lock, Send, Share2, Users } from "lucide-react"
import { useApp } from "@/components/app-context"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { LayerChip, StatusBadge, statusSurface } from "@/components/shared/status"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { claveAlerta } from "@/lib/alertas-sync"
import { agregarContexto, type Escalamiento, escalamientosPropios, escalamientosRecibidos, leerTripulacion } from "@/lib/api-registro"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import { store } from "@/lib/storage"
import type { Alert } from "@/lib/types"
import { cn } from "@/lib/utils"

const btn = "min-h-11 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent"

/** Lo que salió de verdad (GET /tripulantes/{id}/escalamientos) y la única acción posible: añadir contexto. */
function SentDialog({ esc, onContexto }: { esc: Escalamiento; onContexto: () => void }) {
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  async function enviar() {
    if (!texto.trim() || TRIPULANTE === null) return
    setEnviando(true)
    if (await agregarContexto(esc.id, texto.trim(), TRIPULANTE)) onContexto()
    setEnviando(false)
  }
  return (
    <Dialog>
      <DialogTrigger className={btn}>{S.alerts.viewSent}</DialogTrigger>
      <DialogContent>
        <DialogTitle>{S.alerts.autoSent}</DialogTitle>
        <DialogDescription>{S.alerts.autoSentDetail}</DialogDescription>
        <pre className="overflow-x-auto rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed">{JSON.stringify(esc.contenido, null, 2)}</pre>
        <p className="text-xs text-muted-foreground">{S.alerts.sentAt}: <span className="font-mono">{esc.enviado_t_real}</span></p>
        {esc.contexto_astronauta ? (
          <p className="rounded-lg border border-border p-3 text-sm"><span className="text-xs text-muted-foreground">{S.alerts.contextSaved}</span><br />{esc.contexto_astronauta}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor={`ctx-${esc.id}`} className="text-sm font-medium">{S.alerts.addContext}</label>
            <textarea id={`ctx-${esc.id}`} value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder={S.alerts.contextPlaceholder}
              className="rounded-lg border border-input bg-background p-2 text-sm" />
            <p className="text-xs text-muted-foreground">{S.alerts.cannotCancel}</p>
            <button type="button" onClick={enviar} disabled={enviando || !texto.trim()} className="min-h-11 self-start rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {S.alerts.contextSend}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Bandeja real del oficial médico: solo el dato mínimo de cada aviso escalado (§5.4). */
function Bandeja() {
  const [avisos, setAvisos] = useState<Escalamiento[] | null>(null)
  const [alias, setAlias] = useState<Record<number, string>>({})
  useEffect(() => {
    if (TRIPULANTE === null) return
    let vivo = true
    const leer = async () => {
      const tripulacion = await leerTripulacion(TRIPULANTE as number)
      const medico = tripulacion?.find((t) => t.rol === "oficial_medico")
      if (!vivo || !tripulacion || !medico) return vivo && setAvisos([])
      setAlias(Object.fromEntries(tripulacion.map((t) => [t.id, t.alias])))
      // shortcut: sin autenticación, la vista "como oficial médico" consulta con su id; reemplazar por sesión real
      const recibidos = await escalamientosRecibidos(medico.id)
      if (vivo) setAvisos(recibidos ?? [])
    }
    void leer()
    const id = window.setInterval(leer, 5000)
    return () => {
      vivo = false
      window.clearInterval(id)
    }
  }, [])
  if (avisos === null) return null
  if (avisos.length === 0) return <EmptyState message={S.alerts.inboxEmpty} />
  return (
    <ul className="flex flex-col gap-4">
      {[...avisos].reverse().map((e) => (
        <li key={e.id} className={cn("rounded-xl border p-4 md:p-5", statusSurface.act)}>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status="act" />
            <LayerChip layer="A" />
            <span className="text-sm text-muted-foreground">{S.alerts.crewMember}: {alias[e.tripulante_id] ?? e.tripulante_id}</span>
            <span className="ml-auto font-mono text-sm text-muted-foreground">{e.enviado_t_real}</span>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">{S.alerts.indicator}</dt><dd className="font-medium">{e.contenido.indicador}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{S.alerts.value}</dt><dd className="font-mono font-medium">{e.contenido.valor}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{S.alerts.band}</dt><dd>{e.contenido.tramo}</dd></div>
            {e.contexto_astronauta && <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">{S.alerts.contextSaved}</dt><dd>{e.contexto_astronauta}</dd></div>}
          </dl>
        </li>
      ))}
    </ul>
  )
}

export function AlertsView() {
  const { day, role, analisis, mode, escalations } = useApp()
  const [shared, setShared] = useState<string[]>([])
  const [acked, setAcked] = useState<string[]>([])
  const [enviados, setEnviados] = useState<Escalamiento[]>([])
  const leerEnviados = useCallback(() => {
    if (mode === "real" && TRIPULANTE !== null) void escalamientosPropios(TRIPULANTE).then((e) => e && setEnviados(e))
  }, [mode])
  useEffect(() => {
    store.listSharedAlertIds().then(setShared)
    store.listAcknowledgedAlertIds().then(setAcked)
  }, [])
  useEffect(leerEnviados, [leerEnviados, escalations])

  const all = [...analisis.alerts(day)].sort((a, b) => b.day - a.day || b.time.localeCompare(a.time))
  const astronauta = role === "astronaut"
  // el oficial médico ve lo escalado y lo que el astronauta decidió compartir; el entorno lo ve toda la tripulación
  const list = astronauta ? all : all.filter((a) => !a.informative && (a.scope === "crew" || shared.includes(a.id) || (mode === "demo" && a.escalates)))

  /** Qué pasó con un rojo de capa A: enviado (con su escalamiento real), pendiente, sin escalar o simulado. */
  function Escalada({ a }: { a: Alert }) {
    if (mode === "demo") return <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><FlaskConical aria-hidden className="size-4" />{S.alerts.demoEscalation}</span>
    if (!a.createdAt) return <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Info aria-hidden className="size-4" />{S.alerts.historyOnly}</span>
    const clave = claveAlerta(a)
    if (!(clave in escalations)) return <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-watch"><Clock aria-hidden className="size-4" />{S.alerts.pendingSend}</span>
    const esc = enviados.find((e) => e.id === escalations[clave])
    if (escalations[clave] === null) return <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><Info aria-hidden className="size-4" />{S.alerts.notEscalated}</span>
    return (
      <>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-status-act"><Send aria-hidden className="size-4" />{S.alerts.autoSent}</span>
        {esc && astronauta && <SentDialog esc={esc} onContexto={leerEnviados} />}
      </>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={S.alerts.title} subtitle={astronauta ? S.alerts.subtitle : S.alerts.cmoNote} />
      {!astronauta && mode === "real" && (
        <section aria-labelledby="inbox-h" className="mb-8">
          <h2 id="inbox-h" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.alerts.inbox}</h2>
          <Bandeja />
        </section>
      )}
      {list.length === 0 ? (astronauta || mode === "demo" ? <EmptyState message={S.alerts.empty} /> : null) : (
        <ul className="flex flex-col gap-4">
          {list.map((a) => {
            const isShared = shared.includes(a.id)
            const isAcked = acked.includes(a.id)
            return (
              <li key={a.id} className={cn("rounded-xl border p-4 md:p-5", a.status === "act" ? statusSurface.act : "border-border bg-card", a.informative && "opacity-80")}>
                <div className="flex flex-wrap items-center gap-2">
                  {a.informative ? <span className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">{S.alerts.informative}</span> : <StatusBadge status={a.status} />}
                  <LayerChip layer={a.layer} />
                  <span className="text-sm text-muted-foreground">{a.zone ? S.zones[a.zone] : S.alerts.environment}</span>
                  <span className="ml-auto font-mono text-sm text-muted-foreground">{[`${S.common.day} ${a.day}`, a.time].filter(Boolean).join(" · ")}</span>
                </div>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-muted-foreground">{S.alerts.indicator}</dt><dd className="font-medium">{a.indicator}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{S.alerts.value}</dt><dd className="font-mono font-medium">{a.value || "—"}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">{S.alerts.band}</dt><dd>{a.clinicalBand}</dd></div>
                  <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">{S.alerts.cause}</dt><dd>{a.cause}</dd></div>
                  {a.source && <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">{S.alerts.source}</dt><dd className="font-mono text-xs">{a.source}</dd></div>}
                  <div className="sm:col-span-3"><dt className="text-xs text-muted-foreground">{S.alerts.action}</dt><dd className="font-medium">{a.action}</dd></div>
                </dl>
                {a.recommendShare && !isShared && astronauta && <p className="mt-3 rounded-lg border border-status-watch/40 bg-status-watch/10 p-3 text-sm">{S.alerts.recommendShare}</p>}
                {!a.informative && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {a.scope === "crew" ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-primary"><Users aria-hidden className="size-4" />{S.alerts.crewShared}</span>
                    ) : a.escalates ? (
                      <>
                        <Escalada a={a} />
                        {astronauta && (
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
                        {astronauta && (
                          <button type="button" onClick={() => store.shareAlert(a.id).then(() => setShared((s) => [...s, a.id]))} className={btn}>
                            {S.alerts.share}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
