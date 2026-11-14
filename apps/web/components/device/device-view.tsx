"use client"

import { useEffect, useState } from "react"
import { Bluetooth, BluetoothOff, HeartPulse, Loader2 } from "lucide-react"
import { useApp } from "@/components/app-context"
import { PageHeader } from "@/components/shared/states"
import { ProvenanceTag } from "@/components/shared/status"
import { FcChart } from "@/components/device/fc-chart"
import { CrewWatches, WatchSettings } from "@/components/device/reloj-extras"
import { Switch } from "@/components/device/switch"
import { type OrdenReloj, suenoSugerido, ultimoCambioInstrumento } from "@/lib/reloj"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const btn = "min-h-11 rounded-lg px-5 text-sm font-semibold"
const fmt = (v: number | null | undefined, unidad = "") => (v == null ? "--" : `${Math.round(v * 10) / 10}${unidad}`)

export function DeviceView() {
  const { device, setDevice, simulator, setSimulator, liveHr, reloj, ordenReloj, role } = useApp()
  const [aviso, setAviso] = useState<string | null>(null)

  useEffect(() => {
    if (!aviso) return
    const id = window.setTimeout(() => setAviso(null), 4000)
    return () => window.clearTimeout(id)
  }, [aviso])

  const ordenar = async (tipo: OrdenReloj) => setAviso((await ordenReloj(tipo)) ? S.device.orderSent : S.device.orderFailed)

  const datos = reloj?.reloj ?? null
  const ultimo = datos?.chequeos[0] ?? null
  const fcDia = datos?.resumen?.fc_reposo_dia ?? null
  const enCurso = datos?.chequeo_estado != null
  const cambio = ultimoCambioInstrumento(reloj)
  const sueno = suenoSugerido(reloj)
  const rmssd = datos?.resumen?.rmssd_ms ?? null
  const diagnostico =
    device === "disconnected" || !reloj ? null
      : !reloj.puente.configurado ? S.device.bridgeOff
      : !reloj.puente.conectado ? S.device.bridgeDown
      : !reloj.vinculado ? S.device.notLinked
      : null

  const Icon = device === "connected" ? Bluetooth : device === "connecting" ? Loader2 : BluetoothOff
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={S.device.title} subtitle={S.device.subtitle} />
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <span className={cn("flex size-12 items-center justify-center rounded-xl",
            device === "connected" ? "bg-status-ok/15 text-status-ok" : device === "lost" ? "bg-status-act/15 text-status-act" : "bg-muted text-muted-foreground")}>
            <Icon aria-hidden className={cn("size-6", device === "connecting" && "animate-spin")} />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold">{S.device.watch}{datos ? ` · ${datos.nombre}` : ""}</h2>
            <p className="text-sm text-muted-foreground">{S.device.watchDesc}</p>
            {datos && (
              <p className="mt-1 text-xs text-muted-foreground">
                {S.device.model}: {datos.modelo ?? "--"} · {S.device.sdk}: {datos.sdk ? S.device.yes : S.device.no}
                {datos.dispositivos.length > 0 && ` · ${datos.dispositivos.join(", ")}`}
              </p>
            )}
          </div>
          <p role="status" className="text-sm font-medium">{S.device.states[device]}</p>
        </div>
        {diagnostico && <p className="mt-4 rounded-lg border border-status-watch/40 bg-status-watch/10 p-3 text-sm">{diagnostico}</p>}
        {device === "lost" && !diagnostico && <p role="alert" className="mt-4 rounded-lg border border-status-act/40 bg-status-act/10 p-3 text-sm">{S.device.lostDetail}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {device === "disconnected" && <button type="button" className={cn(btn, "bg-primary text-primary-foreground")} onClick={() => setDevice("connecting")}>{S.device.connect}</button>}
          {device === "lost" && <button type="button" className={cn(btn, "bg-primary text-primary-foreground")} onClick={() => setDevice("connecting")}>{S.device.reconnect}</button>}
          {device !== "disconnected" && <button type="button" className={cn(btn, "border border-input hover:bg-accent")} onClick={() => setDevice("disconnected")}>{S.device.disconnect}</button>}
        </div>
      </section>

      <section className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 id="sim-l" className="font-semibold">{S.device.simulator}</h2>
          <p className="text-sm text-muted-foreground">{S.device.simulatorDesc}</p>
        </div>
        <Switch checked={simulator} onChange={setSimulator} labelledBy="sim-l" />
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm text-muted-foreground">{S.device.live}</h2>
        <p className="mt-2 flex items-center gap-3">
          <HeartPulse aria-hidden className={cn("size-8", liveHr ? "text-status-act" : "text-muted-foreground")} />
          <span className="font-mono text-5xl font-semibold tabular-nums">{liveHr ?? "--"}</span>
          <span className="text-muted-foreground">bpm</span>
        </p>
        <ProvenanceTag provenance={{ kind: device === "connected" ? "measured" : "simulated" }} className="mt-3" />
        {fcDia && (
          <p className="mt-3 text-sm">
            {S.device.restingToday}: <strong className="tabular-nums">{fcDia.valor} bpm</strong>{" "}
            <span className="text-muted-foreground">({S.device.restingSource[fcDia.fuente] ?? fcDia.fuente})</span>
          </p>
        )}
        {device === "connected" && datos && (
          <>
            <div className="mt-4"><FcChart serie={datos.serie} label={S.device.curve} /></div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-muted-foreground">{S.device.hrv5}</dt><dd className="font-mono text-xl tabular-nums">{fmt(rmssd, " ms")}</dd></div>
              <div>
                <dt className="text-muted-foreground">{S.device.sleepEst} <span className="text-xs">({S.device.experimental})</span></dt>
                <dd className="font-mono text-xl tabular-nums">{fmt(sueno, " h")}</dd>
              </div>
            </dl>
          </>
        )}
        {cambio && <p role="alert" className="mt-4 rounded-lg border border-status-watch/40 bg-status-watch/10 p-3 text-sm">{S.device.instrumentChange(cambio.detalle ?? "")}</p>}
      </section>

      {device === "connected" && (
        <section className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">{S.device.checkTitle}</h2>
          <p className="text-sm text-muted-foreground">{S.device.checkDesc}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={enCurso} className={cn(btn, "bg-primary text-primary-foreground disabled:opacity-50")} onClick={() => void ordenar("iniciar_chequeo")}>{S.device.startCheck}</button>
            <button type="button" disabled={enCurso || !datos?.sdk} className={cn(btn, "border border-input hover:bg-accent disabled:opacity-50")} onClick={() => void ordenar("medir_spo2")}>{S.device.measureSpo2}</button>
          </div>
          {aviso && <p role="status" className="mt-3 text-sm">{aviso}</p>}
          {enCurso && (
            <p role="status" className="mt-3 text-sm">
              {S.device.checkPhase}: <strong>{datos?.chequeo_estado}</strong>
              {datos?.chequeo_progreso && ` · ${S.device.checkProgress(datos.chequeo_progreso.quietos, datos.chequeo_progreso.ventana, datos.chequeo_progreso.transcurridos, datos.chequeo_progreso.maximo)}`}
            </p>
          )}
          <h3 className="mt-5 text-sm text-muted-foreground">{S.device.lastCheck}</h3>
          {ultimo ? (
            ultimo.valido ? (
              <dl className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <div><dt className="text-muted-foreground">{S.device.restingHr}</dt><dd className="font-mono text-xl tabular-nums">{fmt(ultimo.fc_reposo_lpm, " bpm")}</dd></div>
                <div><dt className="text-muted-foreground">{S.device.hrv}</dt><dd className="font-mono text-xl tabular-nums">{fmt(ultimo.rmssd_ms, " ms")}</dd></div>
                <div><dt className="text-muted-foreground">{S.device.spo2}</dt><dd className="font-mono text-xl tabular-nums">{fmt(ultimo.spo2_pct, " %")}</dd></div>
              </dl>
            ) : (
              <p className="mt-2 text-sm">{S.device.invalid}: {ultimo.motivo ?? "--"}</p>
            )
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{S.device.noCheck}</p>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{S.device.wellness}</p>
        </section>
      )}

      {role !== "astronaut" && <CrewWatches />}
      {device !== "disconnected" && <WatchSettings />}

      {datos && datos.avisos.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm text-muted-foreground">{S.device.notices}</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {datos.avisos.slice(-5).reverse().map((a, i) => (
              <li key={`${a.t}-${i}`}><span className="font-mono text-xs text-muted-foreground">{a.t?.slice(11, 19)}</span> {a.detalle ?? a.tipo}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
