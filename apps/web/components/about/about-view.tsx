"use client"

// Cliente: los textos salen de `S`, que resuelve el idioma en el navegador; en el servidor saldría siempre en español.
import { ArrowRight } from "lucide-react"
import { IconoCapas, IconoDatos, IconoLimites, IconoPrivacidad, IconoResultados, IconoSinConexion } from "@/components/about/iconos"
import { ICONO_INDICADOR, IconoAlertas, IconoCuerpo, IconoEntorno, IconoInformes, IconoRegistro, IconoTendencias, type Icono } from "@/components/shared/iconos"
import { Palabra, Simbolo } from "@/components/shared/logo"
import { LayerChip, ProvenanceTag, STATUS_ICON } from "@/components/shared/status"
import { S } from "@/lib/strings"
import type { Layer, Provenance } from "@/lib/types"
import { cn } from "@/lib/utils"

const PROV = (): [Provenance, string][] => [
  [{ kind: "measured" }, S.about.provMeasured],
  [{ kind: "simulated" }, S.about.provSimulated],
  [{ kind: "scenario" }, S.about.provScenario],
  [{ kind: "real", source: "NASA OSDR / NOAA SWPC", date: "2011-2026" }, S.about.provReal],
]
const CAPAS: Layer[] = ["A", "B", "C", "context"]
const ICONO_CAPA: Record<Layer, Icono> = { A: IconoAlertas, B: IconoCuerpo, C: IconoTendencias, context: IconoEntorno }
const ICONO_PASO: Icono[] = [IconoRegistro, IconoCapas, IconoCuerpo]
/** Mismo orden que `S.about.hazardList`: radiación, aislamiento, distancia, gravedad, entorno cerrado. */
const ICONO_RIESGO: Icono[] = [IconoEntorno, ICONO_INDICADOR.mood, IconoInformes, ICONO_INDICADOR.massKg, ICONO_INDICADOR.spo2]

const tarjeta = "rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7"

function Titulo({ id, icono: Ic, titulo, entrada }: { id: string; icono: Icono; titulo: string; entrada?: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted"><Ic className="size-7" /></span>
      <div>
        <h2 id={id} className="text-2xl font-semibold leading-tight md:text-3xl">{titulo}</h2>
        {entrada && <p className="mt-1 max-w-4xl text-pretty text-lg leading-snug text-muted-foreground">{entrada}</p>}
      </div>
    </div>
  )
}

export function AboutView() {
  const Aviso = STATUS_ICON.watch
  return (
    <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
      {/* 1. Qué es VIGÍA */}
      <section aria-labelledby="acerca" className="overflow-hidden rounded-3xl bg-[#0B1020] text-[#F2F5FA] shadow-sm dark:border dark:border-border">
        <div className="grid gap-8 p-6 md:p-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <h1 id="acerca" className="sr-only">{S.about.title}</h1>
            <div className="flex items-center gap-4">
              <Simbolo className="size-20 shrink-0 md:size-24" />
              <div>
                <Palabra className="h-10 w-auto md:h-12" />
                <p className="mt-2 text-lg font-medium opacity-80 md:text-xl">{S.app.tagline}</p>
              </div>
            </div>
            <p className="mt-6 max-w-3xl text-pretty text-xl leading-relaxed md:text-2xl md:leading-relaxed">{S.about.lead}</p>
            <p className="mt-5 font-mono text-sm uppercase tracking-wider opacity-70">{S.about.challenge}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            {S.about.facts.map((f) => (
              <div key={f.k} className="rounded-2xl border border-white/15 bg-white/8 p-4">
                <dd className="text-2xl font-bold leading-tight md:text-3xl">{f.v}</dd>
                <dt className="mt-1 text-base opacity-80">{f.l}</dt>
              </div>
            ))}
          </dl>
        </div>
        <p className="flex items-start gap-3 border-t border-white/15 bg-white/8 px-6 py-4 text-base md:px-10 md:text-lg">
          <Aviso aria-hidden className="mt-0.5 size-6 shrink-0" />
          <span>{S.app.disclaimer}</span>
        </p>
      </section>

      {/* 2. Cómo decide */}
      <section aria-labelledby="como" className={tarjeta}>
        <Titulo id="como" icono={IconoCapas} titulo={S.about.how} entrada={S.about.howLead} />
        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {S.about.steps.map((p, i) => {
            const Ic = ICONO_PASO[i]
            return (
              <li key={p.k} className="relative flex items-start gap-4 rounded-2xl bg-muted/60 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"><Ic className="size-6" /></span>
                <div>
                  <p className="text-xl font-semibold"><span className="font-mono text-muted-foreground">{i + 1}.</span> {p.t}</p>
                  <p className="mt-1 text-base leading-snug text-muted-foreground">{p.d}</p>
                </div>
                {i < 2 && <ArrowRight aria-hidden className="absolute -right-4 top-1/2 z-10 hidden size-6 -translate-y-1/2 rounded-full border border-border bg-card p-0.5 md:block" />}
              </li>
            )
          })}
        </ol>
        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {CAPAS.map((l) => {
            const Ic = ICONO_CAPA[l]
            return (
              <li key={l} className="flex flex-col gap-3 rounded-2xl border border-border bg-background p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted"><Ic className="size-6" /></span>
                  <LayerChip layer={l} className="px-2.5 py-1 text-sm" />
                </div>
                <p className="text-2xl font-semibold leading-tight">{S.about.layerQ[l]}</p>
                <p className="text-base leading-snug">{S.about.layerHow[l]}</p>
                <p className="mt-auto border-t border-border pt-3 text-base text-muted-foreground">{S.layerLong[l]}</p>
              </li>
            )
          })}
        </ul>
        <p className="mt-4 rounded-2xl bg-muted/60 px-5 py-4 text-base leading-snug md:text-lg">{S.about.baseline}</p>
      </section>

      {/* 3. Datos reales y simulados */}
      <section aria-labelledby="datos" className={tarjeta}>
        <Titulo id="datos" icono={IconoDatos} titulo={S.about.data} entrada={S.about.dataLead} />
        <div className="mt-6 grid gap-3 lg:grid-cols-2">
          {([
            [S.about.modeReal, S.about.realPhys, S.about.realEnv],
            [S.about.modeDemo, S.about.demoPhys, S.about.demoEnv],
          ] as const).map(([modo, fisio, entorno], i) => (
            <div key={modo} className={cn("rounded-2xl border p-5", i === 0 ? "border-primary/40 bg-background" : "border-dashed border-border bg-background")}>
              <h3 className="text-xl font-semibold">{modo}</h3>
              <dl className="mt-3 flex flex-col gap-3 text-base leading-snug">
                <div><dt className="eyebrow">{S.about.physiology}</dt><dd className="mt-1">{fisio}</dd></div>
                <div><dt className="eyebrow">{S.about.environment}</dt><dd className="mt-1">{entorno}</dd></div>
              </dl>
            </div>
          ))}
        </div>
        <h3 className="mt-6 text-xl font-semibold">{S.about.provenance}</h3>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {PROV().map(([p, d]) => (
            <li key={p.kind} className="flex flex-col items-start gap-2 rounded-2xl bg-muted/60 p-4">
              <ProvenanceTag provenance={p} className="gap-1.5 bg-card px-2.5 py-1.5 text-sm" />
              <span className="text-base leading-snug">{d}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-base leading-snug text-muted-foreground">{S.about.scenarioNote}</p>
      </section>

      {/* 4. Privacidad y funcionamiento sin conexión */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="privacidad" className={tarjeta}>
          <Titulo id="privacidad" icono={IconoPrivacidad} titulo={S.about.privacy} entrada={S.about.privacyLead} />
          <ul className="mt-6 flex flex-col gap-3">
            {([
              ["ok", S.about.privacyGreen, S.about.privacyStays, S.about.privacyGreenBody],
              ["act", S.about.privacyRed, S.about.privacyLeaves, S.about.privacyRedBody],
              ["env", S.about.privacyEnv, S.about.privacyShared, S.about.privacyEnvBody],
            ] as const).map(([tipo, que, destino, cuerpo]) => (
              <li key={tipo} className="flex flex-wrap items-start gap-x-4 gap-y-2 rounded-2xl border border-border bg-background p-4">
                <span className="flex min-w-48 items-center gap-2 text-lg font-semibold">
                  {tipo === "ok" && <><span aria-hidden className="size-4 rounded-full bg-status-ok" /><span aria-hidden className="-ml-1 size-4 rounded-full bg-status-watch" /></>}
                  {tipo === "act" && <span aria-hidden className="size-4 rounded-full bg-status-act" />}
                  {tipo === "env" && <IconoEntorno className="size-5" />}
                  {que}
                </span>
                <span className="min-w-0 flex-1 basis-72">
                  <span className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 font-mono text-sm font-semibold uppercase tracking-wider",
                    tipo === "act" ? "border-status-act/40 bg-status-act/12 text-status-act" : "border-border bg-muted")}>
                    {tipo === "act" && <ArrowRight aria-hidden className="size-4" />}{destino}
                  </span>
                  <span className="mt-2 block text-base leading-snug">{cuerpo}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="sinred" className={tarjeta}>
          <Titulo id="sinred" icono={IconoSinConexion} titulo={S.about.offline} />
          <p className="mt-5 text-lg leading-relaxed">{S.about.offlineBody}</p>
        </section>
      </div>

      {/* 5. Marco de riesgos */}
      <section aria-labelledby="riesgos" className={tarjeta}>
        <Titulo id="riesgos" icono={IconoEntorno} titulo={S.about.hazards} />
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {S.about.hazardList.map(([k, v], i) => {
            const Ic = ICONO_RIESGO[i]
            return (
              <div key={k} className="rounded-2xl bg-muted/60 p-4">
                <Ic className="size-8" />
                <dt className="mt-2 text-lg font-semibold leading-tight">{k}</dt>
                <dd className="mt-1 text-base leading-snug text-muted-foreground">{v}</dd>
              </div>
            )
          })}
        </dl>
      </section>

      {/* 6. Resultados de la simulación */}
      <section aria-labelledby="resultados" className={tarjeta}>
        <Titulo id="resultados" icono={IconoResultados} titulo={S.about.results} entrada={S.about.resultsLead} />
        <dl className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {S.about.kpis.map((k) => (
            <div key={k.k} className="rounded-2xl border border-border bg-background p-4">
              <dd className="font-mono text-4xl font-semibold leading-none tabular-nums">{k.v}</dd>
              <dt className="mt-2 text-base leading-snug text-muted-foreground">{k.l}</dt>
            </div>
          ))}
        </dl>
        <p className="mt-4 flex items-start gap-3 rounded-2xl border border-status-watch/40 bg-status-watch/12 p-4 text-base leading-snug md:text-lg">
          <Aviso aria-hidden className="mt-0.5 size-6 shrink-0 text-status-watch" />{S.about.resultsCaveat}
        </p>
      </section>

      {/* 7. Límites y fuentes */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="limites" className="rounded-3xl border border-status-watch/40 bg-status-watch/12 p-5 shadow-sm md:p-7">
          <Titulo id="limites" icono={IconoLimites} titulo={S.about.limits} />
          <p className="mt-5 text-lg font-semibold">{S.about.disclaimer}: {S.about.notDevice}.</p>
          <ul className="mt-3 flex flex-col gap-3 text-base leading-snug md:text-lg md:leading-snug">
            {S.about.limitsList.map((l) => (
              <li key={l.k} className="flex items-start gap-3"><span aria-hidden className="mt-2.5 size-2 shrink-0 rounded-full bg-foreground" />{l.t}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="fuentes" className={tarjeta}>
          <Titulo id="fuentes" icono={IconoDatos} titulo={S.about.sources} />
          <dl className="mt-5 flex flex-col divide-y divide-border">
            {S.about.sourcesList.map((f) => (
              <div key={f.k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <dt className="text-lg font-semibold">{f.t}</dt>
                <dd className="text-base text-muted-foreground">{f.d}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-base text-muted-foreground">{S.about.sourcesNote}</p>
          <h3 className="mt-5 text-lg font-semibold">{S.about.ai}</h3>
          <p className="mt-1 text-base leading-snug text-muted-foreground">{S.about.aiBody}</p>
        </section>
      </div>
    </div>
  )
}
