import { PageHeader } from "@/components/shared/states"
import { LayerChip, ProvenanceTag } from "@/components/shared/status"
import { S } from "@/lib/strings"
import type { Layer, Provenance } from "@/lib/types"

const PROV: [Provenance, string][] = [
  [{ kind: "measured" }, "Introducido por el astronauta o transmitido desde un dispositivo vinculado."],
  [{ kind: "simulated" }, "Fisiología sintética generada para este prototipo."],
  [{ kind: "scenario" }, "Evento guionizado para demostrar una respuesta."],
  [{ kind: "real", source: "NASA OSDR", date: "2021" }, "Datos públicos archivados de misiones reproducidos en los días de misión."],
]

const HAZARDS = [
  ["Radiación", "Dosis y eventos de partículas solares del clima espacial."],
  ["Aislamiento y confinamiento", "Ánimo, sueño y salud conductual."],
  ["Distancia a la Tierra", "Retardo de comunicación; la tripulación debe actuar primero."],
  ["Gravedad alterada", "Desplazamiento de fluidos, pérdida ósea y muscular, cambios de visión."],
  ["Entorno cerrado hostil", "CO2, temperatura, humedad y presión de cabina."],
]

export function AboutView() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader title={S.about.title} />
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">{S.about.scope}</h2>
        <p className="mt-2 leading-relaxed">{S.about.scopeBody}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {(["A", "B", "C", "context"] as Layer[]).map((l) => (
            <li key={l} className="flex items-start gap-3 text-sm"><LayerChip layer={l} /><span>{S.layerLong[l]}</span></li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">{S.about.provenance}</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {PROV.map(([p, d]) => (
            <li key={p.kind} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
              <ProvenanceTag provenance={p} className="self-start" /><span className="text-sm text-muted-foreground">{d}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">{S.about.hazards}</h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {HAZARDS.map(([k, v]) => (
            <div key={k}><dt className="font-medium">{k}</dt><dd className="text-sm text-muted-foreground">{v}</dd></div>
          ))}
        </dl>
      </section>
      <section className="rounded-xl border border-status-watch/40 bg-status-watch/10 p-5">
        <h2 className="font-semibold">{S.about.disclaimer}</h2>
        <p className="mt-2 text-sm">{S.app.disclaimer}</p>
      </section>
    </div>
  )
}
