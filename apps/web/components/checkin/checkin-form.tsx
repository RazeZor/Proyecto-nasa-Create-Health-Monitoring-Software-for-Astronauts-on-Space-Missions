"use client"

import { useEffect, useRef, useState } from "react"
import { Info, Timer, Watch } from "lucide-react"
import { useApp } from "@/components/app-context"
import { ErrorState, PageHeader } from "@/components/shared/states"
import { ProvenanceTag, StatusBadge, statusSurface } from "@/components/shared/status"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { evaluateCheckIn } from "@/lib/engine"
import { comoMedirEnPerfil } from "@/lib/catalogo"
import { fcReposoSugerida, spo2Sugerida, suenoSugerido, ultimoCambioInstrumento } from "@/lib/reloj"
import { S } from "@/lib/strings"
import { sincronizarRegistros } from "@/lib/sincronizacion"
import { store } from "@/lib/storage"
import type { CheckInEntry, IndicatorId, Status, Symptom } from "@/lib/types"
import { cn } from "@/lib/utils"

const inputCls =
  "min-h-11 w-full rounded-lg border border-input bg-background px-3 font-mono text-lg tabular-nums focus-visible:outline-2 focus-visible:outline-ring"
const selCls = "min-h-11 rounded-lg border border-input bg-background px-2 text-sm"

function InfoPop({ id, label }: { id: IndicatorId; label: string }) {
  const { profile, catalogo } = useApp()
  return (
    <Popover>
      <PopoverTrigger
        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label={`${S.checkin.info} ${label}`}
      >
        <Info aria-hidden className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {S.checkin.howTo} · {profile.label}
        </p>
        <p className="text-sm">{comoMedirEnPerfil(catalogo, id, profile.id)}</p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{S.checkin.whyMatters}</p>
        <p className="text-sm">{catalogo.indicadores[id].whyNeeded}</p>
      </PopoverContent>
    </Popover>
  )
}

function Field({
  id, label, unit, info, children, extra,
}: { id: string; label: string; unit?: string; info: IndicatorId; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor={id} className="flex flex-wrap items-center gap-2 font-medium">
          {label} {unit && <span className="text-sm font-normal text-muted-foreground">({unit})</span>}
          {extra}
        </label>
        <InfoPop id={info} label={label} />
      </div>
      {children}
    </div>
  )
}

/** Sitio de la SpO2 del reloj; se compara con la línea base del mismo sitio (§2.4). */
const WRIST = "Muñeca"
const num = (v: string) => (v.trim() === "" ? null : Number(v))

export function CheckInScreen() {
  const [key, setKey] = useState(0)
  return <CheckInForm key={key} onReset={() => setKey((k) => k + 1)} />
}

function CheckInForm({ onReset }: { onReset: () => void }) {
  const { day, liveHr, device, simulator, reloj, checkIns, recargarRegistros, catalogo } = useApp()
  // A.6: con el reloj real se precarga la FC en reposo del día (chequeo, sueño o día despierto), nunca el pulso
  // instantáneo; el simulador sigue dando su valor de demostración.
  const fcReloj = device === "connected" ? fcReposoSugerida(reloj) : null
  const hrSugerida = fcReloj ? String(fcReloj.valor) : device !== "connected" && simulator && liveHr !== null ? String(liveHr) : null
  const watchOn = hrSugerida !== null
  const suenoReloj = device === "connected" ? suenoSugerido(reloj) : null
  const cambioInstrumento = device === "connected" ? ultimoCambioInstrumento(reloj) : null
  const [sleep, setSleep] = useState("")
  const spo2Reloj = device === "connected" ? spo2Sugerida(reloj, Date.now()) : null
  const [spo2, setSpo2] = useState("")
  const [spo2Site, setSpo2Site] = useState("Dedo")
  const spo2FromWatch = spo2 === "" && spo2Reloj !== null
  const spo2Value = spo2FromWatch ? String(spo2Reloj) : spo2
  const [start] = useState(() => Date.now())
  const [elapsed, setElapsed] = useState(0)
  const [result, setResult] = useState<{ status: Status; sec: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [mood, setMood] = useState(7)
  const [hr, setHr] = useState("")
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) return
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => window.clearInterval(id)
  }, [start, result])

  const instrumentoHr = hr !== "" ? "manual" : fcReloj ? `galaxy_watch4:${reloj?.reloj?.dispositivos[0] ?? "?"}` : watchOn ? "simulador" : "manual"
  const instrumentoPrevio = checkIns.filter((c) => c.day >= 1 && c.day < day && c.restingHr != null).sort((a, b) => a.day - b.day).at(-1)?.hrInstrument ?? "manual"
  const hrValue = hr !== "" ? hr : (hrSugerida ?? "")
  const cambiaInstrumento = hrValue !== "" && instrumentoHr !== instrumentoPrevio

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const g = (k: string) => String(f.get(k) ?? "")
    const sec = Math.floor((Date.now() - start) / 1000)
    const base = {
      day, durationSec: sec,
      restingHr: num(hrValue), hrFromWatch: hr === "" && watchOn,
      hrInstrument: instrumentoHr,
      systolic: num(g("sys")), diastolic: num(g("dia")),
      spo2: num(spo2Value), spo2Site: spo2FromWatch ? WRIST : spo2Site, spo2FromWatch,
      tempC: num(g("temp")), tempMethod: g("tempMethod"),
      sleepH: num(g("sleep")), mood, symptoms,
      glucose: num(g("glucose")), glucoseEnzyme: g("enzyme"),
      massKg: num(g("mass")), massMethod: g("massMethod"),
    }
    const status = evaluateCheckIn(base, checkIns, catalogo.historial)
    const entry: CheckInEntry = { ...base, status, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    setSaving(true)
    setError(false)
    try {
      await store.saveCheckIn(entry)
      void recargarRegistros() // el motor recalcula cuerpo, tendencias y alertas
      void sincronizarRegistros() // sube a la API sin bloquear: sin red queda pendiente
      setResult({ status, sec })
      requestAnimationFrame(() => resultRef.current?.focus())
    } catch {
      setError(true)
    } finally {
      setSaving(false)
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-xl">
        <div
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className={cn("flex flex-col items-center gap-4 rounded-2xl border p-8 text-center", statusSurface[result.status])}
        >
          <p className="text-sm text-muted-foreground">{S.checkin.result}</p>
          <StatusBadge status={result.status} size="lg" />
          <p className="text-lg text-pretty">{S.statusLong[result.status]}</p>
          <p className="text-sm text-muted-foreground">
            {S.checkin.completedIn} <span className="font-mono">{result.sec} s</span>
          </p>
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 rounded-lg border border-input px-4 text-sm font-medium hover:bg-accent"
          >
            {S.checkin.another}
          </button>
        </div>
      </div>
    )
  }

  const over = elapsed > 90
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-5xl" aria-describedby="ci-sub">
      <PageHeader title={S.checkin.title} subtitle={S.checkin.subtitle}>
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl border px-4 py-2",
            over ? "border-status-watch/50 text-status-watch" : "border-border",
          )}
          role="timer"
          aria-label={`${S.checkin.elapsed} ${elapsed} seconds ${S.checkin.target}`}
        >
          <Timer aria-hidden className="size-5" />
          <span className="text-sm text-muted-foreground">{S.checkin.elapsed}</span>
          <span className="font-mono text-2xl font-semibold tabular-nums">{elapsed}s</span>
          <span className="text-sm text-muted-foreground">{S.checkin.target}</span>
        </div>
      </PageHeader>
      <p id="ci-sub" className="sr-only">{S.checkin.subtitle}</p>

      {cambiaInstrumento && !cambioInstrumento && <p role="status" className="mb-4 rounded-lg border border-status-watch/40 bg-status-watch/10 p-3 text-sm">{S.device.instrumentChange(`${instrumentoPrevio} → ${instrumentoHr}`)}</p>}
      {cambioInstrumento && <p role="alert" className="mb-4 rounded-lg border border-status-watch/40 bg-status-watch/10 p-3 text-sm">{S.device.instrumentChange(cambioInstrumento.detalle ?? "")}</p>}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{S.checkin.daily}</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Field
          id="hr" label={S.checkin.hr} unit="bpm" info="restingHr"
          extra={watchOn && hr === "" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
              <Watch aria-hidden className="size-3" /> {fcReloj ? S.checkin.fromWatchSource[fcReloj.fuente] ?? S.checkin.fromWatch : S.checkin.fromWatch}
            </span>
          ) : null}
        >
          <input id="hr" inputMode="numeric" type="number" min={30} max={200} className={inputCls}
            value={hrValue} onChange={(e) => setHr(e.target.value)} placeholder="60" />
        </Field>

        <Field id="sys" label={S.checkin.bp} unit="mmHg" info="systolic">
          <div className="flex items-center gap-2">
            <input id="sys" name="sys" type="number" min={60} max={220} className={inputCls} placeholder="115" aria-label={S.checkin.systolic} />
            <span aria-hidden className="text-xl text-muted-foreground">/</span>
            <input name="dia" type="number" min={30} max={140} className={inputCls} placeholder="72" aria-label={S.checkin.diastolic} />
          </div>
        </Field>

        <Field
          id="spo2" label={S.checkin.spo2} unit="%" info="spo2"
          extra={spo2FromWatch ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
              <Watch aria-hidden className="size-3" /> {S.checkin.fromWatch}
            </span>
          ) : null}
        >
          <div className="flex gap-2">
            <input id="spo2" name="spo2" type="number" min={70} max={100} className={inputCls} placeholder="97"
              value={spo2Value} onChange={(e) => setSpo2(e.target.value)} />
            <select name="spo2Site" className={selCls} aria-label={S.checkin.site} disabled={spo2FromWatch}
              value={spo2FromWatch ? WRIST : spo2Site} onChange={(e) => setSpo2Site(e.target.value)}>
              <option>Dedo</option><option>Frente</option><option>Oreja</option><option value={WRIST}>{S.checkin.wrist}</option>
            </select>
          </div>
          {spo2FromWatch && <p className="mt-1 text-xs text-muted-foreground">{S.checkin.spo2WatchNote}</p>}
        </Field>

        <Field id="temp" label={S.checkin.temp} unit="°C" info="tempC">
          <div className="flex gap-2">
            <input id="temp" name="temp" type="number" step="0.1" min={33} max={42} className={inputCls} placeholder="36.7" />
            <select name="tempMethod" className={selCls} aria-label={S.checkin.method}>
              <option>Oral</option><option>Temporal</option><option>Timpánica</option>
            </select>
          </div>
        </Field>

        <Field id="sleep" label={S.checkin.sleep} unit="h" info="sleepH">
          <input id="sleep" name="sleep" type="number" step="0.1" min={0} max={16} className={inputCls} placeholder="7.0"
            value={sleep} onChange={(e) => setSleep(e.target.value)} />
          {suenoReloj !== null && sleep === "" && (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <Watch aria-hidden className="size-3" /> {S.checkin.sleepFromWatch(suenoReloj)}
              <button type="button" className="rounded border border-input px-2 py-0.5 hover:bg-accent" onClick={() => setSleep(String(suenoReloj))}>{S.checkin.useValue}</button>
            </p>
          )}
        </Field>

        <Field id="mood" label={`${S.checkin.mood}: ${mood}`} unit="1-10" info="mood">
          <Slider id="mood" min={1} max={10} step={1} value={[mood]} aria-label={S.checkin.mood}
            onValueChange={(v) => setMood(Array.isArray(v) ? v[0] : v)} className="py-4" />
          <p className="text-xs text-muted-foreground">{S.checkin.moodHint}</p>
        </Field>
      </div>

      <fieldset className="mt-4 rounded-xl border border-border bg-card p-4">
        <legend className="px-1 font-medium">{S.checkin.symptoms}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(S.symptoms) as Symptom[]).map((s) => {
            const on = symptoms.includes(s)
            return (
              <button key={s} type="button" aria-pressed={on}
                onClick={() => setSymptoms((cur) => (on ? cur.filter((x) => x !== s) : [...cur, s]))}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-sm font-medium",
                  on ? "border-status-watch bg-status-watch/15 text-status-watch" : "border-input hover:bg-accent",
                )}>
                {S.symptoms[s]}
              </button>
            )
          })}
        </div>
      </fieldset>

      <details className="group mt-6 rounded-xl border border-border">
        <summary className="flex min-h-12 cursor-pointer items-center justify-between px-4 font-medium">
          <span>{S.checkin.weekly} <span className="ml-2 text-sm font-normal text-muted-foreground">{S.checkin.weeklyHint}</span></span>
          <span aria-hidden className="text-muted-foreground group-open:rotate-180">⌄</span>
        </summary>
        <div className="grid gap-4 p-4 pt-0 md:grid-cols-2">
          <Field id="glucose" label={S.checkin.glucose} unit="mg/dL" info="glucose">
            <div className="flex gap-2">
              <input id="glucose" name="glucose" type="number" min={30} max={400} className={inputCls} placeholder="92" />
              <select name="enzyme" className={selCls} aria-label={S.checkin.enzyme}>
                <option>GDH</option><option>GOx</option>
              </select>
            </div>
          </Field>
          <Field id="mass" label={S.checkin.mass} unit="kg" info="massKg">
            <div className="flex gap-2">
              <input id="mass" name="mass" type="number" step="0.1" min={30} max={150} className={inputCls} placeholder="74.0" />
              <select name="massMethod" className={selCls} aria-label={S.checkin.method}>
                <option>Inercial</option><option>Gravimétrica</option>
              </select>
            </div>
          </Field>
        </div>
      </details>

      {error && <div className="mt-4"><ErrorState message={S.checkin.saveError} /></div>}

      <div className="sticky bottom-0 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 py-4 backdrop-blur">
        <ProvenanceTag provenance={{ kind: "measured" }} />
        <button type="submit" disabled={saving}
          className="min-h-12 rounded-lg bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
          {saving ? S.checkin.saving : S.checkin.submit}
        </button>
      </div>
    </form>
  )
}
