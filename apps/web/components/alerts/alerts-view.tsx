"use client"

import { useCallback, useEffect, useState } from "react"
import { ArrowRight, ChevronDown } from "lucide-react"
import {
  type Icono, IconoCalma, IconoCandado, IconoCompartida, IconoEscalada, IconoInfo, IconoMatraz, IconoReloj, IconoTripulacion, IconoVisto,
} from "@/components/alerts/iconos"
import { useApp } from "@/components/app-context"
import { EmptyState, PageHeader } from "@/components/shared/states"
import { LayerChip, STATUS_ICON, StatusBadge, statusSurface, statusText } from "@/components/shared/status"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { claveAlerta } from "@/lib/alertas-sync"
import { agregarContexto, type Escalamiento, escalamientosPropios, escalamientosRecibidos, leerTripulacion } from "@/lib/api-registro"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import { store } from "@/lib/storage"
import type { Alert, Status } from "@/lib/types"
import { cn } from "@/lib/utils"

const btn = "inline-flex min-h-14 items-center justify-center gap-2 rounded-full px-6 text-lg font-semibold transition-transform active:scale-[0.98] disabled:active:scale-100"
const btnSecundario = cn(btn, "border border-input bg-card hover:bg-accent")
const btnPrincipal = cn(btn, "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50")
const seccionH = "text-2xl font-semibold"
const sello = (dia: number, hora: string) => [`${S.common.day} ${dia}`, hora].filter(Boolean).join(" · ")

/** Qué pasó con un rojo de capa A: simulado (demo), sin hora de medida, pendiente, guardado sin escalar o enviado. */
type Salida = { tipo: "demo" | "historial" | "pendiente" | "sin-escalar" | "enviada"; esc?: Escalamiento }

function salidaDe(a: Alert, demo: boolean, escalations: Record<string, number | null>, enviados: Escalamiento[]): Salida {
  if (demo) return { tipo: "demo" }
  if (!a.createdAt) return { tipo: "historial" }
  const clave = claveAlerta(a)
  if (!(clave in escalations)) return { tipo: "pendiente" }
  if (escalations[clave] === null) return { tipo: "sin-escalar" }
  return { tipo: "enviada", esc: enviados.find((e) => e.id === escalations[clave]) }
}

type Tono = "neutro" | "tinta" | "act" | "watch"
const TONO: Record<Tono, string> = {
  neutro: "border-border bg-card text-muted-foreground",
  tinta: "border-primary/40 bg-primary/10 text-foreground",
  act: "border-status-act/40 bg-status-act/12 text-status-act",
  watch: "border-status-watch/40 bg-status-watch/12 text-status-watch",
}
/** Quién ve la alerta: icono, palabra corta (de un vistazo) y frase completa (sin ambigüedad). */
interface Privacidad { Icono: Icono; corta: string; larga: string; tono: Tono }

function privacidadDe(a: Alert, compartida: boolean, salida: Salida): Privacidad {
  if (a.informative) return { Icono: IconoInfo, corta: S.alerts.pillInfo, larga: S.alerts.informative, tono: "neutro" }
  if (a.scope === "crew") return { Icono: IconoTripulacion, corta: S.alerts.pillCrew, larga: S.alerts.crewShared, tono: "tinta" }
  if (a.escalates) {
    if (salida.tipo === "demo") return { Icono: IconoMatraz, corta: S.alerts.pillSimulated, larga: S.alerts.demoEscalation, tono: "neutro" }
    if (salida.tipo === "historial") return { Icono: IconoInfo, corta: S.alerts.pillNotSent, larga: S.alerts.historyOnly, tono: "neutro" }
    if (salida.tipo === "pendiente") return { Icono: IconoReloj, corta: S.alerts.pillPending, larga: S.alerts.pendingSend, tono: "watch" }
    if (salida.tipo === "sin-escalar") return { Icono: IconoInfo, corta: S.alerts.pillNotSent, larga: S.alerts.notEscalated, tono: "neutro" }
    return { Icono: IconoEscalada, corta: S.alerts.pillEscalated, larga: S.alerts.autoSent, tono: "act" }
  }
  if (compartida) return { Icono: IconoCompartida, corta: S.alerts.pillShared, larga: S.alerts.shared, tono: "tinta" }
  return { Icono: IconoCandado, corta: S.alerts.pillPrivate, larga: S.alerts.private, tono: "neutro" }
}

function Pastilla({ p, className }: { p: Privacidad; className?: string }) {
  return (
    <span className={cn("inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-semibold", TONO[p.tono], className)}>
      <p.Icono className="size-5" />
      {p.corta}
    </span>
  )
}

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
      <DialogTrigger className={btnSecundario}>{S.alerts.viewSent}</DialogTrigger>
      <DialogContent showCloseButton={false} className="gap-4 rounded-3xl p-6 text-base sm:max-w-xl">
        <DialogTitle className="text-2xl font-semibold leading-tight">{S.alerts.autoSent}</DialogTitle>
        <DialogDescription className="text-base">{S.alerts.autoSentDetail}</DialogDescription>
        <pre className="overflow-x-auto rounded-2xl bg-muted p-4 font-mono text-sm leading-relaxed">{JSON.stringify(esc.contenido, null, 2)}</pre>
        <p className="text-sm text-muted-foreground">{S.alerts.sentAt}: <span className="font-mono">{esc.enviado_t_real}</span></p>
        {esc.contexto_astronauta ? (
          <p className="rounded-2xl border border-border p-4"><span className="eyebrow mb-1 block">{S.alerts.contextSaved}</span>{esc.contexto_astronauta}</p>
        ) : (
          <div className="flex flex-col gap-2">
            <label htmlFor={`ctx-${esc.id}`} className="font-semibold">{S.alerts.addContext}</label>
            <textarea id={`ctx-${esc.id}`} value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} placeholder={S.alerts.contextPlaceholder}
              className="rounded-2xl border border-input bg-background p-3 text-base" />
            <p className="text-sm text-muted-foreground">{S.alerts.cannotCancel}</p>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <DialogClose className={btnSecundario}>{S.common.close}</DialogClose>
          {!esc.contexto_astronauta && (
            <button type="button" onClick={enviar} disabled={enviando || !texto.trim()} className={btnPrincipal}>{S.alerts.contextSend}</button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Bandeja real del oficial médico: solo el dato mínimo de cada aviso escalado (§5.4). */
export function Bandeja() {
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
        <li key={e.id} className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className={cn("flex flex-wrap items-center gap-3 border-b px-5 py-3", statusSurface.act)}>
            <StatusBadge status="act" size="lg" />
            <span className="text-base font-semibold">{S.alerts.crewMember}: {alias[e.tripulante_id] ?? e.tripulante_id}</span>
            <span className="ml-auto font-mono text-sm text-muted-foreground">{e.enviado_t_real}</span>
          </div>
          <div className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="min-w-0">
              <p className="eyebrow">{S.alerts.indicator}</p>
              <p className="mt-1 text-2xl font-semibold leading-tight">{e.contenido.indicador}</p>
              <p className="mt-2 text-base text-muted-foreground">{S.alerts.band}: <span className="text-foreground">{e.contenido.tramo}</span></p>
            </div>
            <div className="sm:text-right">
              <p className="eyebrow">{S.alerts.value}</p>
              <p className="mt-1 text-5xl font-semibold leading-none tabular-nums text-status-act">{e.contenido.valor}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-5 py-3">
            <LayerChip layer="A" className="text-sm" />
            <span className="text-base text-muted-foreground">{S.alerts.layerPlain.A}</span>
          </div>
          {e.contexto_astronauta && (
            <p className="border-t border-border px-5 py-4 text-base"><span className="eyebrow mb-1 block">{S.alerts.contextSaved}</span>{e.contexto_astronauta}</p>
          )}
        </li>
      ))}
    </ul>
  )
}

interface PropsAlerta {
  a: Alert
  astronauta: boolean
  compartida: boolean
  vista: boolean
  salida: Salida
  onCompartir: () => void
  onEntendido: () => void
  onContexto: () => void
}

/** El contenido de una alerta, en el orden en que se necesita: qué pasa, qué hacer, por qué y quién lo ve. */
function Cuerpo({ a, astronauta, compartida, vista, salida, onCompartir, onEntendido, onContexto }: PropsAlerta) {
  const priv = privacidadDe(a, compartida, salida)
  const recomienda = !!a.recommendShare && !compartida && astronauta
  const valor = a.value || "—"
  return (
    <>
      <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-6">
        <div className="min-w-0">
          <p className="eyebrow">{a.zone ? S.zones[a.zone] : S.alerts.environment}</p>
          <h3 className="mt-1 text-balance text-2xl font-semibold leading-tight">{a.indicator}</h3>
          <p className={cn("mt-2 break-words font-semibold leading-none tabular-nums", valor.length > 10 ? "text-3xl" : "text-5xl", !a.informative && statusText[a.status])}>{valor}</p>
          {a.clinicalBand && <p className="mt-3 text-base text-muted-foreground">{S.alerts.band}: <span className="text-foreground">{a.clinicalBand}</span></p>}
        </div>
        <div className="flex flex-col justify-center rounded-2xl bg-primary p-5 text-primary-foreground">
          <p className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.12em] opacity-80">
            <ArrowRight aria-hidden className="size-4" />
            {S.alerts.whatToDo}
          </p>
          <p className="mt-2 text-pretty text-xl font-semibold leading-snug">{a.action}</p>
        </div>
      </div>

      <dl className="grid gap-x-6 gap-y-3 border-t border-border px-5 py-4 text-base md:grid-cols-[9rem_minmax(0,1fr)]">
        <dt className="eyebrow md:pt-1.5">{S.alerts.why}</dt>
        <dd className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <LayerChip layer={a.layer} className="text-sm" />
          <span>{S.alerts.layerPlain[a.layer]}</span>
        </dd>
        <dt className="eyebrow md:pt-1.5">{S.alerts.cause}</dt>
        <dd>{a.cause}</dd>
        {a.source && (
          <>
            <dt className="eyebrow md:pt-1.5">{S.alerts.source}</dt>
            <dd className="font-mono text-sm text-muted-foreground">{a.source}</dd>
          </>
        )}
      </dl>

      {recomienda && (
        <p className="mx-5 mb-4 flex items-start gap-3 rounded-2xl border border-status-watch/40 bg-status-watch/12 p-4 text-base">
          <IconoCompartida className="mt-0.5 size-6 shrink-0 text-status-watch" />
          {S.alerts.recommendShare}
        </p>
      )}

      {!a.informative && (
        <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/40 px-5 py-4">
          <p className="flex min-w-0 flex-1 basis-72 items-center gap-3 text-base">
            <priv.Icono className={cn("size-8 shrink-0", priv.tono === "act" ? "text-status-act" : priv.tono === "watch" ? "text-status-watch" : "text-muted-foreground")} />
            <span className="min-w-0">
              <span className="eyebrow block">{S.alerts.whoSees}</span>
              <span className="font-medium">{priv.larga}</span>
            </span>
          </p>
          {a.scope !== "crew" && a.escalates && (
            <>
              {salida.tipo === "enviada" && salida.esc && astronauta && <SentDialog esc={salida.esc} onContexto={onContexto} />}
              {astronauta && (
                <button type="button" disabled={vista} onClick={onEntendido}
                  className={cn(btn, vista ? "border border-border bg-card text-muted-foreground" : "bg-status-act text-background")}>
                  {vista && <IconoVisto className="size-5" />}
                  {vista ? S.alerts.acknowledged : S.alerts.acknowledge}
                </button>
              )}
            </>
          )}
          {a.scope !== "crew" && !a.escalates && !compartida && astronauta && (
            <button type="button" onClick={onCompartir} className={recomienda ? btnPrincipal : btnSecundario}>
              <IconoCompartida className="size-6" />
              {S.alerts.share}
            </button>
          )}
        </div>
      )}
    </>
  )
}

/** Alerta de hoy: desplegada, con el estado y la privacidad en la cabecera. */
function TarjetaHoy(p: PropsAlerta) {
  const { a } = p
  const priv = privacidadDe(a, p.compartida, p.salida)
  return (
    <li className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className={cn("flex flex-wrap items-center gap-3 border-b px-5 py-3", statusSurface[a.status])}>
        <StatusBadge status={a.status} size="lg" />
        <span className="font-mono text-sm text-muted-foreground">{sello(a.day, a.time)}</span>
        <Pastilla p={priv} className="ml-auto" />
      </div>
      <Cuerpo {...p} />
    </li>
  )
}

/** Alerta del historial: una fila que se despliega al tocarla. */
function FilaHistorial(p: PropsAlerta) {
  const { a } = p
  const [abierta, setAbierta] = useState(false)
  const priv = privacidadDe(a, p.compartida, p.salida)
  const Estado = a.informative ? IconoInfo : STATUS_ICON[a.status]
  return (
    <li className="overflow-hidden rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => setAbierta((v) => !v)} aria-expanded={abierta}
        className="flex min-h-16 w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-accent/60 active:bg-accent">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-full border", a.informative ? "border-border text-muted-foreground" : cn(statusSurface[a.status], statusText[a.status]))}>
          <Estado aria-hidden className="size-6" />
        </span>
        <span className="min-w-0 flex-1 basis-56">
          <span className="block truncate text-lg font-semibold">{a.indicator}{a.value ? ` · ${a.value}` : ""}</span>
          <span className="block text-sm text-muted-foreground">
            {a.informative ? S.alerts.pillInfo : S.status[a.status]} · <span className="font-mono">{sello(a.day, a.time)}</span>
          </span>
        </span>
        {!a.informative && <Pastilla p={priv} />}
        <span className="sr-only">{abierta ? S.alerts.detailHide : S.alerts.detailShow}</span>
        <ChevronDown aria-hidden className={cn("size-6 shrink-0 text-muted-foreground transition-transform duration-200", abierta && "rotate-180")} />
      </button>
      {abierta && <div className="border-t border-border"><Cuerpo {...p} /></div>}
    </li>
  )
}

/** Recuento de hoy por estado, con icono y palabra (el color nunca va solo). */
function Recuento({ lista }: { lista: Alert[] }) {
  return (
    <>
      {(["act", "watch", "ok"] as Status[]).map((s) => {
        const n = lista.filter((a) => a.status === s).length
        const Icon = STATUS_ICON[s]
        return n === 0 ? null : (
          <span key={s} className={cn("inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-base font-semibold", statusSurface[s], statusText[s])}>
            <Icon aria-hidden className="size-5" />
            <span className="tabular-nums">{n}</span> {S.status[s]}
          </span>
        )
      })}
    </>
  )
}

function Leyenda({ titulo }: { titulo: string }) {
  const filas: [Icono, string][] = [[IconoCandado, S.alerts.legendPrivate], [IconoEscalada, S.alerts.legendEscalated], [IconoTripulacion, S.alerts.legendCrew]]
  return (
    <aside aria-labelledby="quien-h" className="rounded-3xl border border-border bg-card p-5 shadow-sm">
      <h2 id="quien-h" className="text-xl font-semibold">{titulo}</h2>
      <ul className="mt-4 flex flex-col gap-4">
        {filas.map(([Ico, texto]) => (
          <li key={texto} className="flex items-start gap-3 text-base leading-snug">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted"><Ico className="size-6" /></span>
            <span className="pt-0.5">{texto}</span>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export function AlertsView() {
  const { day, role, analisis, mode, escalations } = useApp()
  const [shared, setShared] = useState<string[]>([])
  const [acked, setAcked] = useState<string[]>([])
  const [enviados, setEnviados] = useState<Escalamiento[]>([])
  const [verHistorial, setVerHistorial] = useState<boolean | null>(null)
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
  // primero lo que pide acción hoy (el rojo delante); lo de días anteriores y lo informativo va al historial
  const esDeHoy = (a: Alert) => a.day === day && !a.informative
  const hoy = list.filter(esDeHoy).sort((a, b) => Number(b.status === "act") - Number(a.status === "act"))
  const historial = list.filter((a) => !esDeHoy(a))
  const historialAbierto = verHistorial ?? !astronauta

  const props = (a: Alert): PropsAlerta => ({
    a,
    astronauta,
    compartida: shared.includes(a.id),
    vista: acked.includes(a.id),
    salida: salidaDe(a, mode === "demo", escalations, enviados),
    onCompartir: () => store.shareAlert(a.id).then(() => setShared((s) => [...s, a.id])),
    onEntendido: () => store.acknowledgeAlert(a.id).then(() => setAcked((s) => [...s, a.id])),
    onContexto: leerEnviados,
  })

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title={S.alerts.title} subtitle={astronauta ? S.alerts.subtitle : S.alerts.cmoNote} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-8">
          {!astronauta && mode === "real" && (
            <section aria-labelledby="inbox-h">
              <h2 id="inbox-h" className={cn(seccionH, "mb-4")}>{S.alerts.inbox}</h2>
              <Bandeja />
            </section>
          )}

          {hoy.length > 0 ? (
            <section aria-labelledby="hoy-h">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 id="hoy-h" className={seccionH}>{astronauta ? S.alerts.todayTitle : S.alerts.todayTitleCrew}</h2>
                <Recuento lista={hoy} />
              </div>
              <ul className="flex flex-col gap-5">
                {hoy.map((a) => <TarjetaHoy key={a.id} {...props(a)} />)}
              </ul>
            </section>
          ) : astronauta ? (
            <section role="status" className={cn("flex flex-wrap items-center gap-5 rounded-3xl border p-6 md:p-8", statusSurface.ok)}>
              <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-card text-status-ok shadow-sm">
                <IconoCalma className="size-12" />
              </span>
              <div className="min-w-0 flex-1 basis-72">
                <h2 className="text-3xl font-semibold leading-tight">{S.alerts.calmTitle}</h2>
                <p className="mt-2 text-lg text-muted-foreground">{S.alerts.calmBody}</p>
              </div>
            </section>
          ) : list.length === 0 && mode === "demo" ? (
            <EmptyState message={S.alerts.empty} />
          ) : null}

          {historial.length > 0 && (
            <section aria-labelledby="hist-h">
              <button type="button" onClick={() => setVerHistorial(!historialAbierto)} aria-expanded={historialAbierto} aria-controls="hist-lista"
                className="flex min-h-16 w-full items-center gap-4 rounded-2xl border border-border bg-card px-5 py-3 text-left shadow-sm hover:bg-accent/60 active:scale-[0.99]">
                <span className="min-w-0 flex-1">
                  <span id="hist-h" className="block text-xl font-semibold">{S.alerts.history}</span>
                  <span className="block text-base text-muted-foreground">{S.alerts.historyHint}</span>
                </span>
                <span className="shrink-0 text-base font-semibold">{historialAbierto ? S.alerts.historyHide : S.alerts.historyShow(historial.length)}</span>
                <ChevronDown aria-hidden className={cn("size-6 shrink-0 transition-transform duration-200", historialAbierto && "rotate-180")} />
              </button>
              {historialAbierto && (
                <ul id="hist-lista" className="mt-3 flex flex-col gap-3">
                  {historial.map((a) => <FilaHistorial key={a.id} {...props(a)} />)}
                </ul>
              )}
            </section>
          )}
        </div>
        <Leyenda titulo={astronauta ? S.alerts.whoSeesTitle : S.alerts.whoSees} />
      </div>
    </div>
  )
}
