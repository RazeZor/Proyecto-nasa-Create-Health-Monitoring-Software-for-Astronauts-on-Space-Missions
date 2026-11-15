"use client"

import { useEffect, useState } from "react"
import { IconoDescarga, IconoMovimiento, IconoTripulacion } from "@/components/device/iconos"
import { STATUS_ICON } from "@/components/shared/status"
import { cambiarTolerancia, descargarCsvReloj, leerConfigReloj, leerTripulacionReloj, type ConfigReloj, type MiembroReloj, type PresetTolerancia } from "@/lib/reloj"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const PRESETS: PresetTolerancia[] = ["estricta", "normal", "flexible", "personalizada"]
const tarjeta = "rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6"
const chip = "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold"

/** Para quien coordina (oficial médico, cirujano): dato mínimo de cada reloj, sin valores fisiológicos (§5.4). */
export function CrewWatches() {
  const [miembros, setMiembros] = useState<MiembroReloj[] | null>(null)
  useEffect(() => {
    if (TRIPULANTE === null) return
    const actor = TRIPULANTE
    let vivo = true
    const leer = async () => {
      const m = await leerTripulacionReloj(actor)
      if (vivo) setMiembros(m)
    }
    void leer()
    const id = window.setInterval(leer, 5000)
    return () => {
      vivo = false
      window.clearInterval(id)
    }
  }, [])

  const Ok = STATUS_ICON.ok
  const Atencion = STATUS_ICON.watch
  const Alerta = STATUS_ICON.act
  return (
    <section aria-labelledby="crew-l" className={tarjeta}>
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted"><IconoTripulacion className="size-7" /></span>
        <div>
          <h2 id="crew-l" className="text-xl font-semibold">{S.device.crew}</h2>
          <p className="mt-0.5 text-base text-muted-foreground">{S.device.crewDesc}</p>
        </div>
      </div>
      {!miembros?.length ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border p-4 text-base text-muted-foreground">{S.device.crewEmpty}</p>
      ) : (
        <ul className="mt-4 grid gap-3 lg:grid-cols-2">
          {miembros.map((m) => (
            <li key={m.nombre} className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-background px-4 py-3">
              <span className="mr-auto text-lg font-semibold">{m.nombre}</span>
              <span className={cn(chip, m.conectado ? "border-status-ok/40 bg-status-ok/12 text-status-ok" : "border-border bg-muted text-muted-foreground")}>
                <span aria-hidden className={cn("size-2.5 rounded-full", m.conectado ? "bg-status-ok" : "bg-muted-foreground")} />
                {m.conectado ? S.device.states.connected : S.device.states.disconnected}
              </span>
              <span className={cn(chip, m.chequeo_hoy === true ? "border-status-ok/40 bg-status-ok/12 text-status-ok" : m.chequeo_hoy === false ? "border-status-watch/40 bg-status-watch/12 text-status-watch" : "border-border text-muted-foreground")}>
                {m.chequeo_hoy === true ? <Ok aria-hidden className="size-4" /> : m.chequeo_hoy === false ? <Atencion aria-hidden className="size-4" /> : null}
                {m.chequeo_hoy === true ? S.device.crewCheckOk : m.chequeo_hoy === false ? S.device.crewCheckFailed : S.device.crewCheckNone}
              </span>
              {m.relojes_conectados > 1 && (
                <span role="alert" className="flex w-full items-center gap-2 rounded-xl border border-status-act/40 bg-status-act/12 px-3 py-2 text-base font-medium text-status-act">
                  <Alerta aria-hidden className="size-5 shrink-0" />{S.device.crewDuplicate}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Tolerancia al movimiento del chequeo (la guarda smart-monitor y la aplica a todos los relojes) y CSV. */
export function WatchSettings() {
  const [config, setConfig] = useState<ConfigReloj | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    void leerConfigReloj().then(setConfig)
  }, [])

  const actual = config?.tolerancia?.preset ?? null
  const valores = actual && actual !== "personalizada" ? config?.presets?.[actual] : config?.tolerancia

  async function elegir(preset: PresetTolerancia) {
    if (TRIPULANTE === null || preset === "personalizada" || preset === actual) return
    setEnviando(true)
    const ok = await cambiarTolerancia(TRIPULANTE, { preset })
    // el servidor del reloj la confirma por /live: se relee tras un instante
    window.setTimeout(() => void leerConfigReloj().then((c) => { setConfig(c); setEnviando(false) }), 1200)
    setAviso(ok ? S.device.toleranceSent : S.device.orderFailed)
  }

  async function exportar() {
    if (TRIPULANTE === null) return
    setAviso((await descargarCsvReloj(TRIPULANTE)) ? null : S.device.exportFailed)
  }

  const bloqueado = !config?.tolerancia || enviando
  return (
    <>
      <section className={cn(tarjeta, "flex flex-col gap-4")}>
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted"><IconoMovimiento className="size-7" /></span>
          <div>
            <h3 id="tol-l" className="text-xl font-semibold">{S.device.tolerance}</h3>
            <p className="mt-0.5 text-base text-muted-foreground">{S.device.toleranceDesc}</p>
          </div>
        </div>
        {/* Botones en lugar de un desplegable: se elige de un toque. «Personalizada» solo se muestra si es la vigente. */}
        <div role="radiogroup" aria-labelledby="tol-l" className="flex flex-wrap gap-2">
          {PRESETS.filter((p) => p !== "personalizada" || actual === "personalizada").map((p) => (
            <button key={p} type="button" role="radio" aria-checked={actual === p} disabled={bloqueado || p === "personalizada"} onClick={() => void elegir(p)}
              className={cn(
                "min-h-14 flex-1 rounded-2xl border px-5 text-lg font-semibold transition-all active:scale-[0.98] disabled:opacity-60",
                actual === p ? "border-primary bg-primary text-primary-foreground ring-2 ring-primary/40" : "border-border bg-background hover:bg-accent",
              )}>
              {S.device.presets[p]}
            </button>
          ))}
        </div>
        {valores && <p className="font-mono text-sm tabular-nums text-muted-foreground">{S.device.toleranceValues(valores.mov_quieto, valores.mov_inquieto, valores.mov_sacudida, valores.max_inquietos_pct)}</p>}
        <p className="rounded-2xl bg-muted px-4 py-3 text-base">{S.device.toleranceWarn}</p>
        {aviso && aviso !== S.device.exportFailed && <p role="status" className="text-base font-medium">{aviso}</p>}
      </section>

      <section className={cn(tarjeta, "flex flex-col gap-4")}>
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted"><IconoDescarga className="size-7" /></span>
          <div>
            <h3 className="text-xl font-semibold">{S.device.export}</h3>
            <p className="mt-0.5 text-base text-muted-foreground">{S.device.exportDesc}</p>
          </div>
        </div>
        <button type="button" onClick={() => void exportar()} className="mt-auto flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 text-lg font-semibold transition-transform hover:bg-accent active:scale-[0.98]">
          <IconoDescarga className="size-6" />{S.device.exportCsv}
        </button>
        {aviso === S.device.exportFailed && <p role="alert" className="text-base font-medium text-status-act">{aviso}</p>}
      </section>
    </>
  )
}
