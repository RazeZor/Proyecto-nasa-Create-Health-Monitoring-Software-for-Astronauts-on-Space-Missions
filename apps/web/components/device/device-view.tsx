"use client"

import { useEffect, useState } from "react"
import { useApp } from "@/components/app-context"
import { COLOR_PULSO, FcChart } from "@/components/device/fc-chart"
import { IconoChequeo, IconoPunto, IconoSimulador, RelojIlustracion } from "@/components/device/iconos"
import { PasosConexion } from "@/components/device/pasos-conexion"
import { CrewWatches, WatchSettings } from "@/components/device/reloj-extras"
import { SwitchTrack } from "@/components/device/switch"
import { ICONO_INDICADOR, IconoPulso } from "@/components/shared/iconos"
import { PageHeader } from "@/components/shared/states"
import { ProvenanceTag, STATUS_ICON } from "@/components/shared/status"
import { type OrdenReloj, suenoSugerido, ultimoCambioInstrumento } from "@/lib/reloj"
import { S } from "@/lib/strings"
import type { DeviceState } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Ayuda } from "@/components/shared/ayuda"

const tarjeta = "rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6"
const principal = "flex min-h-16 items-center justify-center gap-3 rounded-2xl bg-primary px-7 text-xl font-semibold text-primary-foreground shadow-sm transition-transform active:scale-[0.98] disabled:opacity-50"
const secundario = "flex min-h-16 items-center justify-center gap-3 rounded-2xl border border-border bg-card px-7 text-xl font-semibold transition-transform hover:bg-accent active:scale-[0.98] disabled:opacity-50"
const fmt = (v: number | null | undefined, unidad = "") => (v == null ? "--" : `${Math.round(v * 10) / 10}${unidad}`)

const SUPERFICIE: Record<DeviceState, string> = {
  disconnected: "border-border bg-card",
  connecting: "border-border bg-card",
  connected: "border-status-ok/40 bg-status-ok/12",
  lost: "border-status-act/40 bg-status-act/12",
}
const TITULO: Record<DeviceState, string> = {
  disconnected: "text-foreground",
  connecting: "text-foreground",
  connected: "text-status-ok",
  lost: "text-status-act",
}
const IconoSpo2 = ICONO_INDICADOR.spo2
const IconoSueno = ICONO_INDICADOR.sleepH

/** Un dato con su etiqueta: cifra grande, legible a un brazo. */
function Dato({ etiqueta, valor, nota }: { etiqueta: React.ReactNode; valor: string; nota?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/60 px-4 py-3">
      <dt className="text-sm text-muted-foreground">{etiqueta}</dt>
      <dd className="mt-1 font-mono text-3xl font-semibold leading-none tabular-nums">{valor}</dd>
      {nota && <dd className="mt-1.5 text-sm text-muted-foreground">{nota}</dd>}
    </div>
  )
}

export function DeviceView() {
  const { device, setDevice, simulator, setSimulator, liveHr, reloj, ordenReloj, role, mode } = useApp()
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    if (!aviso) return
    const id = window.setTimeout(() => setAviso(null), 4000)
    return () => window.clearTimeout(id)
  }, [aviso])

  const ordenar = async (tipo: OrdenReloj) => {
    const ok = await ordenReloj(tipo)
    setAviso({ ok, texto: ok ? S.device.orderSent : S.device.orderFailed })
  }

  const datos = reloj?.reloj ?? null
  const ultimo = datos?.chequeos[0] ?? null
  const fcDia = datos?.resumen?.fc_reposo_dia ?? null
  const enCurso = datos?.chequeo_estado != null
  const progreso = datos?.chequeo_progreso ?? null
  const cambio = ultimoCambioInstrumento(reloj)
  const sueno = suenoSugerido(reloj)
  const rmssd = datos?.resumen?.rmssd_ms ?? null
  // el diagnóstico de la conexión va en cuatro pasos (PasosConexion); aquí solo el caso del puente apagado
  const puenteApagado = device !== "disconnected" && reloj !== null && reloj.puente.desactivado === true

  const conectado = device === "connected"
  const simulando = simulator && !conectado
  const simuladorBloqueado = mode === "real" // en modo real el contexto ignora el simulador: aquí solo se refleja
  const EstadoIcono = conectado ? STATUS_ICON.ok : device === "lost" ? STATUS_ICON.act : null
  const Atencion = STATUS_ICON.watch
  const ayuda = device === "lost" ? S.device.lostDetail : S.device.stateHelp[device]
  const horaLectura = datos?.ultima_lectura?.t?.slice(11, 19)
  const hayCurva = conectado && datos != null && datos.serie.filter((p) => p.fc_lpm != null).length > 1

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-4">
      <div className="-mb-4"><PageHeader title={S.device.title} ayuda={<p>{S.device.subtitle}</p>} /></div>

      {/* 1. Conexión: el estado se entiende de un vistazo y la acción está al lado */}
      <section aria-labelledby="conexion" className={cn("flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl border p-5 shadow-sm transition-colors duration-300 md:p-6", SUPERFICIE[device])}>
        <RelojIlustracion estado={device} simulando={simulando} className="h-36 w-auto shrink-0 md:h-44" />
        <div className="min-w-0 flex-1 basis-80">
          <p className="eyebrow">{S.device.connection} · {S.device.watch}{datos ? ` · ${datos.nombre}` : ""}</p>
          <h2 id="conexion" role="status" className={cn("mt-1 flex items-center gap-3 text-4xl font-bold leading-tight md:text-5xl", TITULO[device])}>
            {EstadoIcono && <EstadoIcono aria-hidden className="size-10 shrink-0 md:size-12" />}
            {S.device.states[device]}
          </h2>
          <p className="mt-2 max-w-3xl text-pretty text-lg leading-snug">
            {ayuda}{device === "lost" && ` ${S.device.lostAuto}`}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-muted-foreground">
            {conectado && horaLectura && <span className="tabular-nums">{S.device.lastReading(horaLectura)}</span>}
            {datos && (
              <span>
                {S.device.model}: {datos.modelo ?? "--"} · {S.device.sdk}: {datos.sdk ? S.device.yes : S.device.no}
                {datos.dispositivos.length > 0 && ` · ${datos.dispositivos.join(", ")}`}
              </span>
            )}
            {!datos && <span>{S.device.watchDesc}</span>}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-64">
          {device === "disconnected" && <button type="button" className={principal} onClick={() => setDevice("connecting")}>{S.device.connect}</button>}
          {device === "lost" && <button type="button" className={principal} onClick={() => setDevice("connecting")}>{S.device.reconnect}</button>}
          {device !== "disconnected" && <button type="button" className={secundario} onClick={() => setDevice("disconnected")}>{S.device.disconnect}</button>}
        </div>
        {puenteApagado && (
          <p className="flex w-full items-start gap-3 rounded-2xl border border-status-watch/40 bg-status-watch/12 p-4 text-lg">
            <Atencion aria-hidden className="mt-0.5 size-6 shrink-0 text-status-watch" />{S.device.bridgeOff}
          </p>
        )}
        {device !== "disconnected" && !conectado && !puenteApagado && <PasosConexion reloj={reloj} />}
      </section>

      {cambio && (
        <section role="alert" className="flex items-start gap-4 rounded-3xl border border-status-watch/40 bg-status-watch/12 p-5">
          <Atencion aria-hidden className="mt-0.5 size-8 shrink-0 text-status-watch" />
          <div>
            <h2 className="text-xl font-semibold">{S.device.instrumentTitle}</h2>
            <p className="mt-1 max-w-5xl text-pretty text-lg leading-snug">{S.device.instrumentChange(cambio.detalle ?? "")}</p>
          </div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        {/* 2. Pulso en vivo: el protagonista cuando hay señal */}
        <section aria-labelledby="pulso" className={cn(tarjeta, "flex flex-col gap-4")}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="pulso" className="text-xl font-semibold">{S.device.live}</h2>
            {liveHr != null && <ProvenanceTag provenance={{ kind: conectado ? "measured" : "simulated" }} className="gap-1.5 px-2.5 py-1.5 text-sm" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <p className="flex items-center gap-4">
              <IconoPulso
                className={cn("size-20 shrink-0", liveHr != null ? "latido" : "text-muted-foreground")}
                style={liveHr != null ? { color: COLOR_PULSO, animationDuration: `${(60 / Math.max(liveHr, 30)).toFixed(2)}s` } : undefined}
              />
              <span className={cn("font-mono text-8xl font-semibold leading-none tabular-nums", liveHr == null && "text-muted-foreground")}>{liveHr ?? "--"}</span>
              <span className="self-end pb-2 text-2xl text-muted-foreground">{S.device.bpm}</span>
            </p>
            {liveHr == null && (
              <p className="min-w-0 flex-1 basis-64 text-lg leading-snug">
                <strong className="block text-2xl font-semibold">{S.device.noSignal}</strong>
                <span className="text-muted-foreground">{S.device.noSignalHint}</span>
              </p>
            )}
            {simulando && liveHr != null && (
              <p className="flex max-w-md items-start gap-3 rounded-2xl bg-muted px-4 py-3 text-base">
                <IconoSimulador className="mt-0.5 size-6 shrink-0" />{S.device.simOn}
              </p>
            )}
          </div>
          {conectado && datos && (
            <>
              {hayCurva ? (
                <div>
                  <p className="eyebrow mb-1">{S.device.curve}</p>
                  <FcChart serie={datos.serie} label={S.device.curve} />
                  <p className="mt-1 text-sm text-muted-foreground">{S.device.curveGaps}</p>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-border p-4 text-base text-muted-foreground">{S.device.curveEmpty}</p>
              )}
              <dl className="grid gap-3 sm:grid-cols-3">
                {fcDia && <Dato etiqueta={S.device.restingToday} valor={`${fcDia.valor} ${S.device.bpm}`} nota={S.device.restingSource[fcDia.fuente] ?? fcDia.fuente} />}
                <Dato etiqueta={S.device.hrv5} valor={fmt(rmssd, " ms")} />
                <Dato
                  etiqueta={<span className="flex items-center gap-1.5"><IconoSueno className="size-4" />{S.device.sleepEst}</span>}
                  valor={fmt(sueno, " h")}
                  nota={<span className="rounded-full border border-border px-2 py-0.5 font-mono text-xs uppercase tracking-wider">{S.device.experimental}</span>}
                />
              </dl>
            </>
          )}
          {/* sin señal: una línea plana ocupa el lugar de la curva, para que se vea dónde aparecerá */}
          {liveHr == null && (
            <svg viewBox="0 0 720 120" preserveAspectRatio="none" aria-hidden className="mt-auto h-28 w-full text-muted-foreground">
              <path d="M0 70h720" stroke="currentColor" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={0.6} />
            </svg>
          )}
          {!conectado && fcDia && (
            <dl className="grid gap-3 sm:grid-cols-3">
              <Dato etiqueta={S.device.restingToday} valor={`${fcDia.valor} ${S.device.bpm}`} nota={S.device.restingSource[fcDia.fuente] ?? fcDia.fuente} />
            </dl>
          )}
        </section>

        {/* 3. Chequeo y órdenes al reloj; sin reloj, lo que este aporta */}
        {conectado ? (
          <section aria-labelledby="chequeo" className={cn(tarjeta, "flex flex-col gap-4")}>
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted"><IconoChequeo className="size-7" /></span>
              <div>
                <h2 id="chequeo" className="flex items-center gap-1 text-xl font-semibold">
                  {S.device.checkTitle}
                  <Ayuda titulo={S.device.checkTitle}><p>{S.device.checkDesc}</p></Ayuda>
                </h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
              <button type="button" disabled={enCurso} className={principal} onClick={() => void ordenar("iniciar_chequeo")}>
                <IconoChequeo className="size-7" />{S.device.startCheck}
              </button>
              <button type="button" disabled={enCurso || !datos?.sdk} className={secundario} onClick={() => void ordenar("medir_spo2")}>
                <IconoSpo2 className="size-7" />{S.device.measureSpo2}
              </button>
            </div>
            {datos && !datos.sdk && <p className="text-base text-muted-foreground">{S.device.spo2NeedsSdk}</p>}
            {aviso && (
              <p role="status" className={cn("flex items-center gap-3 rounded-2xl border p-4 text-lg font-medium", aviso.ok ? "border-status-ok/40 bg-status-ok/12" : "border-status-act/40 bg-status-act/12")}>
                {aviso.ok ? <STATUS_ICON.ok aria-hidden className="size-6 shrink-0 text-status-ok" /> : <STATUS_ICON.act aria-hidden className="size-6 shrink-0 text-status-act" />}
                {aviso.texto}
              </p>
            )}
            {enCurso && (
              <div role="status" className="rounded-2xl border border-primary/30 bg-muted/60 p-4">
                <p className="text-lg font-semibold">{S.device.checking}</p>
                <p className="mt-1 text-base">
                  {S.device.checkPhase}: <strong>{datos?.chequeo_estado}</strong>
                  {progreso && ` · ${S.device.checkProgress(progreso.quietos, progreso.ventana, progreso.transcurridos, progreso.maximo)}`}
                </p>
                {progreso && progreso.ventana > 0 && (
                  <div aria-hidden className="mt-3 h-3 overflow-hidden rounded-full bg-border">
                    <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.min(100, (progreso.quietos / progreso.ventana) * 100)}%` }} />
                  </div>
                )}
              </div>
            )}
            <div>
              <h3 className="eyebrow">{S.device.lastCheck}</h3>
              {ultimo ? (
                ultimo.valido ? (
                  <dl className="mt-2 grid grid-cols-3 gap-3">
                    <Dato etiqueta={S.device.restingHr} valor={fmt(ultimo.fc_reposo_lpm)} nota={S.device.bpm} />
                    <Dato etiqueta={S.device.hrv} valor={fmt(ultimo.rmssd_ms)} nota="ms" />
                    <Dato etiqueta={S.device.spo2} valor={fmt(ultimo.spo2_pct)} nota="%" />
                  </dl>
                ) : (
                  <p className="mt-2 flex items-start gap-3 rounded-2xl border border-status-watch/40 bg-status-watch/12 p-4 text-lg">
                    <Atencion aria-hidden className="mt-0.5 size-6 shrink-0 text-status-watch" />
                    <span><strong>{S.device.invalid}</strong>: {ultimo.motivo ?? "--"}</span>
                  </p>
                )
              ) : (
                <p className="mt-2 text-lg text-muted-foreground">{S.device.noCheck}</p>
              )}
            </div>
            <p className="mt-auto text-sm text-muted-foreground">{S.device.wellness}</p>
          </section>
        ) : (
          <section aria-labelledby="aporta" className={cn(tarjeta, "flex flex-col gap-4")}>
            <div>
              <h2 id="aporta" className="flex items-center gap-1 text-xl font-semibold">
                {S.device.gives}
                <Ayuda titulo={S.device.gives}><p>{S.device.givesNote}</p></Ayuda>
              </h2>
            </div>
            <ul className="flex flex-col gap-2 text-lg">
              {([
                [IconoPulso, S.device.givesList.live],
                [IconoPulso, S.device.givesList.resting],
                [IconoSpo2, S.device.givesList.spo2],
                [IconoSueno, S.device.givesList.sleep],
                [IconoChequeo, S.device.givesList.check],
              ] as const).map(([Icono, texto]) => (
                <li key={texto} className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Icono className="size-6" /></span>
                  {texto}
                </li>
              ))}
            </ul>
            <p className="mt-auto text-sm text-muted-foreground">{S.device.wellness}</p>
          </section>
        )}
      </div>

      {role !== "astronaut" && <CrewWatches />}

      {datos && datos.avisos.length > 0 && (
        <section aria-labelledby="avisos" className={tarjeta}>
          <h2 id="avisos" className="text-xl font-semibold">{S.device.notices}</h2>
          <ul className="mt-3 flex flex-col gap-2 text-lg">
            {datos.avisos.slice(-5).reverse().map((a, i) => (
              <li key={`${a.t}-${i}`} className="flex items-start gap-3">
                <IconoPunto className="mt-1.5 size-4 shrink-0 text-muted-foreground" />
                <span className="font-mono text-base tabular-nums text-muted-foreground">{a.t?.slice(11, 19)}</span>
                <span>{a.detalle ?? a.tipo}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 4. Segundo nivel: lo que no se toca a diario */}
      <section aria-labelledby="avanzado" className="mt-2">
        <div className="mb-3 border-t border-border pt-5">
          <h2 id="avanzado" className="flex items-center gap-1 text-2xl font-semibold">
            {S.device.advanced}
            <Ayuda titulo={S.device.advanced}><p>{S.device.advancedDesc}</p></Ayuda>
          </h2>
        </div>
        <div className={cn("grid gap-4", device !== "disconnected" && "lg:grid-cols-3")}>
          <button
            type="button"
            role="switch"
            aria-checked={simulator && !simuladorBloqueado}
            aria-disabled={simuladorBloqueado}
            disabled={simuladorBloqueado}
            onClick={() => setSimulator(!simulator)}
            className={cn(
              tarjeta,
              "flex flex-col gap-4 text-left transition-all active:scale-[0.99]",
              simulator && !simuladorBloqueado && "border-primary ring-2 ring-primary/40",
              simuladorBloqueado && "cursor-not-allowed opacity-60 active:scale-100",
            )}
          >
            <span className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted"><IconoSimulador className="size-7" /></span>
              <span>
                <span className="block text-xl font-semibold">{S.device.simulator}</span>
                <span className="mt-0.5 block text-base text-muted-foreground">{S.device.simulatorDesc}</span>
                {simuladorBloqueado && <span className="mt-2 block text-base font-medium">{S.device.simulatorRealHint}</span>}
              </span>
            </span>
            <span className="mt-auto flex min-h-14 items-center gap-4 rounded-2xl bg-muted/60 px-4">
              <SwitchTrack checked={simulator && !simuladorBloqueado} />
              <span className="text-lg font-semibold">{simulator && !simuladorBloqueado ? S.device.on : S.device.off}</span>
            </span>
          </button>
          {device !== "disconnected" && <WatchSettings />}
        </div>
      </section>
    </div>
  )
}
