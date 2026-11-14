"use client"

import { useEffect } from "react"
import { Bluetooth, BluetoothOff, HeartPulse, Loader2 } from "lucide-react"
import { useApp } from "@/components/app-context"
import { PageHeader } from "@/components/shared/states"
import { ProvenanceTag } from "@/components/shared/status"
import { Switch } from "@/components/device/switch"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const btn = "min-h-11 rounded-lg px-5 text-sm font-semibold"

export function DeviceView() {
  const { device, setDevice, simulator, setSimulator, liveHr } = useApp()

  useEffect(() => {
    if (device !== "connecting") return
    const id = window.setTimeout(() => setDevice("connected"), 1800)
    return () => window.clearTimeout(id)
  }, [device, setDevice])

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
            <h2 className="font-semibold">{S.device.watch}</h2>
            <p className="text-sm text-muted-foreground">{S.device.watchDesc}</p>
          </div>
          <p role="status" className="text-sm font-medium">{S.device.states[device]}</p>
        </div>
        {device === "lost" && <p role="alert" className="mt-4 rounded-lg border border-status-act/40 bg-status-act/10 p-3 text-sm">{S.device.lostDetail}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {device === "disconnected" && <button type="button" className={cn(btn, "bg-primary text-primary-foreground")} onClick={() => setDevice("connecting")}>{S.device.connect}</button>}
          {device === "lost" && <button type="button" className={cn(btn, "bg-primary text-primary-foreground")} onClick={() => setDevice("connecting")}>{S.device.reconnect}</button>}
          {device === "connected" && (
            <>
              <button type="button" className={cn(btn, "border border-input hover:bg-accent")} onClick={() => setDevice("disconnected")}>{S.device.disconnect}</button>
              <button type="button" className={cn(btn, "border border-input hover:bg-accent")} onClick={() => setDevice("lost")}>{S.device.simulateLoss}</button>
            </>
          )}
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
        <ProvenanceTag provenance={{ kind: simulator && device !== "connected" ? "simulated" : "measured" }} className="mt-3" />
      </section>
    </div>
  )
}
