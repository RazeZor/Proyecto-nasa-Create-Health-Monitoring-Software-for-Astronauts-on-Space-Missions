"use client"

/**
 * Diagnóstico de la conexión del reloj en cuatro pasos (API → smart-monitor → reloj vinculado y transmitiendo →
 * pulso en la muñeca). Marca el primer paso que falla y dice qué hacer con los valores concretos: la URL que la API
 * usa para smart-monitor, la URL que hay que escribir en el reloj y los nombres vinculados. Si el reloj aún no está
 * vinculado, lista los nombres que el servidor ve y deja elegir «Este es mi reloj» (POST .../reloj/vinculo).
 */
import { useEffect, useState } from "react"
import { STATUS_ICON } from "@/components/shared/status"
import { leerTripulacionReloj, pasosConexion, vincularReloj, type MiembroReloj, type RespuestaReloj } from "@/lib/reloj"
import { TRIPULANTE } from "@/lib/sincronizacion"
import { S } from "@/lib/strings"
import { cn } from "@/lib/utils"

const URL_RELOJ_GENERICA = "ws://<IP-de-la-API>:8765/watch"

export function PasosConexion({ reloj }: { reloj: RespuestaReloj | null }) {
  const pasos = pasosConexion(reloj, Date.now())
  const fallo = pasos.find((p) => !p.ok)
  const puente = reloj?.puente
  const urlLive = puente?.url_live ?? "ws://127.0.0.1:8765/live"
  const urlReloj = puente?.url_reloj_sugerida ?? URL_RELOJ_GENERICA
  const nombres = (reloj?.nombres ?? []).join(", ")
  const arreglo =
    !fallo ? null
      : fallo.id === "api" ? S.device.stepFix.api
      : fallo.id === "server" ? S.device.stepFix.server(urlLive)
      : fallo.id === "watch" ? (reloj?.vinculado ? S.device.stepFix.watchOffline(nombres, urlReloj) : S.device.stepFix.watchUnlinked(urlReloj))
      : S.device.stepFix.wrist
  return (
    <div className="w-full rounded-2xl border border-border bg-muted/40 p-4" role="status">
      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {pasos.map((p, i) => {
          const Icono = p.ok ? STATUS_ICON.ok : STATUS_ICON.watch
          const actual = fallo?.id === p.id
          return (
            <li key={p.id} className={cn("flex items-start gap-2 text-base leading-snug", p.ok ? "text-status-ok" : actual ? "font-semibold text-status-watch" : "text-muted-foreground")}>
              <Icono aria-hidden className={cn("mt-0.5 size-5 shrink-0", !p.ok && !actual && "opacity-40")} />
              <span>{i + 1}. {S.device.steps[p.id]}</span>
            </li>
          )
        })}
      </ol>
      {arreglo && (
        <div className="mt-3 text-base leading-snug">
          <p className="text-pretty">{arreglo}</p>
          {fallo?.id === "server" && puente?.error && <p className="mt-1 break-all font-mono text-sm text-muted-foreground">{puente.error}</p>}
          {fallo?.id === "watch" && !reloj?.vinculado && <Vincular />}
        </div>
      )}
    </div>
  )
}

/** Nombres que smart-monitor ve y nadie ha vinculado todavía; un toque los asocia a este tripulante. */
function Vincular() {
  const actor = TRIPULANTE ?? 1
  const [miembros, setMiembros] = useState<MiembroReloj[] | null>(null)
  const [resultado, setResultado] = useState<string | null>(null)
  useEffect(() => {
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
  }, [actor])
  const libres = (miembros ?? []).filter((m) => !m.vinculado && !m.nombre_por_defecto)
  const deFabrica = (miembros ?? []).filter((m) => m.nombre_por_defecto)
  const vincular = async (nombre: string) => {
    const r = await vincularReloj(actor, nombre)
    setResultado(r.ok ? S.device.linkDone : S.device.linkFailed(r.motivo))
  }
  return (
    <div className="mt-3 rounded-xl border border-border bg-card p-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.device.linkTitle}</p>
      {libres.length === 0 && <p className="mt-1 text-sm text-muted-foreground">{S.device.linkNone}</p>}
      <ul className="mt-2 flex flex-wrap gap-2">
        {libres.map((m) => (
          <li key={m.nombre}>
            <button type="button" onClick={() => void vincular(m.nombre)} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-primary bg-primary/10 px-4 text-base font-semibold text-primary active:scale-[0.98]">
              <span aria-hidden className={cn("size-2.5 rounded-full", m.conectado ? "bg-status-ok" : "bg-muted-foreground/50")} />
              {S.device.linkThis(m.nombre)}
            </button>
          </li>
        ))}
      </ul>
      {deFabrica.length > 0 && <p className="mt-2 text-sm text-muted-foreground">{S.device.linkDefaultNames(deFabrica.map((m) => m.nombre).join(", "))}</p>}
      {resultado && <p role="status" className="mt-2 text-base font-medium">{resultado}</p>}
    </div>
  )
}
