"use client"

import { useEffect, useState } from "react"
import { cambiarTolerancia, descargarCsvReloj, leerConfigReloj, leerTripulacionReloj, type ConfigReloj, type MiembroReloj, type PresetTolerancia } from "@/lib/reloj"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const btn = "min-h-11 rounded-lg px-5 text-sm font-semibold"
const sel = "min-h-11 rounded-lg border border-input bg-background px-3 text-sm"
const PRESETS: PresetTolerancia[] = ["estricta", "normal", "flexible", "personalizada"]

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

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">{S.device.crew}</h2>
      <p className="text-sm text-muted-foreground">{S.device.crewDesc}</p>
      {!miembros?.length ? (
        <p className="mt-3 text-sm text-muted-foreground">{S.device.crewEmpty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {miembros.map((m) => (
            <li key={m.nombre} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
              <span className={cn("size-2.5 rounded-full", m.conectado ? "bg-status-ok" : "bg-muted-foreground")} aria-hidden />
              <span className="font-medium">{m.nombre}</span>
              <span className="text-muted-foreground">{m.conectado ? S.device.states.connected : S.device.states.disconnected}</span>
              <span>{m.chequeo_hoy === true ? S.device.crewCheckOk : m.chequeo_hoy === false ? S.device.crewCheckFailed : S.device.crewCheckNone}</span>
              {m.relojes_conectados > 1 && <span role="alert" className="text-status-act">{S.device.crewDuplicate}</span>}
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
    if (TRIPULANTE === null || preset === "personalizada") return
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

  return (
    <section className="mt-4 rounded-xl border border-border bg-card p-5">
      <h2 id="tol-l" className="font-semibold">{S.device.tolerance}</h2>
      <p className="text-sm text-muted-foreground">{S.device.toleranceDesc}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <select aria-labelledby="tol-l" className={sel} disabled={!config?.tolerancia || enviando}
          value={actual ?? ""} onChange={(e) => void elegir(e.target.value as PresetTolerancia)}>
          {!actual && <option value="">--</option>}
          {PRESETS.map((p) => (
            <option key={p} value={p} disabled={p === "personalizada" && actual !== "personalizada"}>{S.device.presets[p]}</option>
          ))}
        </select>
        {valores && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {S.device.toleranceValues(valores.mov_quieto, valores.mov_inquieto, valores.mov_sacudida, valores.max_inquietos_pct)}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{S.device.toleranceWarn}</p>
      <div className="mt-4 border-t border-border pt-4">
        <button type="button" className={cn(btn, "border border-input hover:bg-accent")} onClick={() => void exportar()}>{S.device.exportCsv}</button>
      </div>
      {aviso && <p role="status" className="mt-3 text-sm">{aviso}</p>}
    </section>
  )
}
