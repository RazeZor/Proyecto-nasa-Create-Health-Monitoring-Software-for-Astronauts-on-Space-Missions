"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowRight, X } from "lucide-react"
import { type Icono, IconoCampana, IconoCandado, IconoEscalada, IconoEscudoAviso, IconoTripulacion } from "@/components/alerts/iconos"
import { useApp } from "@/components/app-context"
import { rolDeRuta, rutaDe } from "@/lib/roles"
import { STATUS_ICON } from "@/components/shared/status"
import { S } from "@/lib/strings"
import { store } from "@/lib/storage"
import { cn } from "@/lib/utils"

type Kind = "act" | "watch" | "env" | "reminder"

interface Toast {
  id: string
  kind: Kind
  stamp: string
  title: string
  body: string
  meta: string
  href: string
  ttl: number
}

const KIND_STYLE: Record<Kind, { bar: string; icon: Icono | (typeof STATUS_ICON)["act"]; text: string; disco: string }> = {
  act: { bar: "bg-status-act", icon: STATUS_ICON.act, text: "text-status-act", disco: "bg-status-act/12 text-status-act" },
  watch: { bar: "bg-status-watch", icon: STATUS_ICON.watch, text: "text-status-watch", disco: "bg-status-watch/12 text-status-watch" },
  env: { bar: "bg-status-act", icon: IconoEscudoAviso, text: "text-status-act", disco: "bg-status-act/12 text-status-act" },
  reminder: { bar: "bg-primary", icon: IconoCampana, text: "text-foreground", disco: "bg-muted text-foreground" },
}

const META_ICON: Record<Kind, Icono> = { act: IconoEscalada, watch: IconoCandado, env: IconoTripulacion, reminder: IconoCampana }

const MAX_VISIBLE = 2

function playTone(urgent: boolean) {
  // sin un gesto previo del usuario el navegador bloquea el audio y la vibración y lo registra como error:
  // el aviso visual basta hasta entonces
  if (!(navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation?.hasBeenActive) return
  try {
    const ctx = new AudioContext()
    const tones = urgent ? [880, 660, 880] : [660]
    tones.forEach((f, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = f
      gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.22)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.18)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + i * 0.22)
      osc.stop(ctx.currentTime + i * 0.22 + 0.2)
    })
    navigator.vibrate?.(urgent ? [200, 100, 200] : 120)
  } catch {
    // Audio may be blocked until the first user gesture; the visual notice still shows.
  }
}

function speak(text: string) {
  if (!("speechSynthesis" in window)) return
  const u = new SpeechSynthesisUtterance(text)
  u.lang = document.documentElement.lang === "en" ? "en-US" : "es-ES"
  window.speechSynthesis.speak(u)
}

function ToastItem({ t, onDone }: { t: Toast; onDone: (id: string) => void }) {
  const style = KIND_STYLE[t.kind]
  const Icon = style.icon
  const MetaIcon = META_ICON[t.kind]
  const urgent = t.kind === "act" || t.kind === "env"
  // mientras el dedo está encima, el temporizador se detiene (con ratón o teclado ya lo hace la regla CSS de `.group`)
  const [tocando, setTocando] = useState(false)
  return (
    <li
      role={urgent ? "alert" : "status"}
      onPointerDown={() => setTocando(true)}
      onPointerUp={() => setTocando(false)}
      onPointerLeave={() => setTocando(false)}
      onPointerCancel={() => setTocando(false)}
      className="toast-enter group pointer-events-auto relative overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl shadow-black/20"
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1.5", style.bar)} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 pl-5 pr-2.5">
        <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-full", style.disco)}>
          <Icon aria-hidden className="size-7" />
        </span>
        <div className="min-w-0 flex-1 basis-64">
          <p className={cn("line-clamp-2 text-lg font-semibold leading-snug", urgent && style.text)}>
            <span className="sr-only">{S.toast.auto}: </span>
            {t.title}
          </p>
          <p className="line-clamp-2 text-base leading-snug">{t.body}</p>
          <p className="mt-1 flex items-start gap-1.5 text-sm leading-snug text-muted-foreground">
            <MetaIcon className="mt-0.5 size-4 shrink-0" />
            <span>{t.meta} <span className="whitespace-nowrap font-mono">· {t.stamp}</span></span>
          </p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <Link
            href={t.href}
            onClick={() => onDone(t.id)}
            className="flex min-h-14 items-center gap-2 rounded-full border border-input bg-card px-5 text-base font-semibold hover:bg-accent active:scale-[0.98]"
          >
            {S.toast.view}
            <ArrowRight aria-hidden className="size-5" />
          </Link>
          <button
            type="button"
            onClick={() => onDone(t.id)}
            aria-label={S.toast.close}
            className="flex size-14 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground active:scale-95"
          >
            <X aria-hidden className="size-7" />
          </button>
        </div>
      </div>
      <span
        aria-hidden
        className={cn("toast-timer absolute bottom-0 left-0 h-1 opacity-70", style.bar)}
        style={{ ["--ttl" as string]: `${t.ttl}ms`, ...(tocando ? { animationPlayState: "paused" } : {}) }}
        onAnimationEnd={() => onDone(t.id)}
      />
    </li>
  )
}

/** Avisos emergentes: son del astronauta (su registro y sus alertas privadas); los otros roles no los reciben. */
export function AlertCenter() {
  return rolDeRuta(usePathname() ?? "") === "astronaut" ? <AvisosDelAstronauta /> : null
}

function AvisosDelAstronauta() {
  const { day, voice, analisis } = useApp()
  const seen = useRef(new Set<string>())
  // en la pantalla de registro el recordatorio sobra y taparía el cronómetro y el botón de confirmar
  const ruta = usePathname() ?? ""
  const enRegistro = ruta.startsWith(rutaDe("astronaut", "check-in"))
  // `ocultos`: avisos que no caben en la pila; no se pierden de vista, se cuentan y se enlazan a Alertas
  const [{ toasts, ocultos }, setPila] = useState<{ toasts: Toast[]; ocultos: number }>({ toasts: [], ocultos: 0 })

  const push = useCallback(
    (items: Toast[]) => {
      if (!items.length) return
      setPila((cur) => {
        const todos = [...items, ...cur.toasts]
        return { toasts: todos.slice(0, MAX_VISIBLE), ocultos: (cur.toasts.length ? cur.ocultos : 0) + Math.max(0, todos.length - MAX_VISIBLE) }
      })
      const urgent = items.some((t) => t.kind === "act" || t.kind === "env")
      playTone(urgent)
      if (voice) items.forEach((t) => speak(`${t.title}. ${t.body}`))
    },
    [voice],
  )

  const dismiss = useCallback((id: string) => setPila((cur) => ({ ...cur, toasts: cur.toasts.filter((t) => t.id !== id) })), [])

  useEffect(() => {
    const fresh: Toast[] = []
    // la tormenta y el CO2 llegan como alertas de entorno del motor; las informativas (adaptación) no avisan
    for (const a of analisis.alerts(day).filter((x) => x.day === day && !x.informative)) {
      if (seen.current.has(a.id)) continue
      seen.current.add(a.id)
      const kind: Kind = a.scope === "crew" ? "env" : a.status === "act" ? "act" : "watch"
      fresh.push({
        id: a.id, kind, stamp: [`${S.common.day} ${a.day}`, a.time].filter(Boolean).join(" · "),
        title: kind === "env" ? `${a.indicator}${a.value ? ` · ${a.value}` : ""}` : `${S.status[a.status]} · ${a.indicator} ${a.value}`, body: a.action,
        meta: kind === "act" ? (a.escalates ? S.toast.escalated : S.toast.private) : kind === "env" ? S.toast.crew : S.toast.private,
        href: rutaDe("astronaut", kind === "env" ? "environment" : "alerts"), ttl: kind === "watch" ? 12000 : 20000,
      })
    }
    push(fresh)
  }, [day, push, analisis])

  useEffect(() => {
    if (enRegistro) return
    const id = window.setTimeout(() => {
      store.listCheckIns().then((list) => {
        const last = list.at(-1)
        const today = new Date().toDateString()
        if (last && new Date(last.createdAt).toDateString() === today) return
        if (seen.current.has("reminder")) return
        seen.current.add("reminder")
        push([{
          id: "reminder", kind: "reminder", stamp: S.toast.reminderMeta,
          title: S.toast.reminderTitle, body: S.toast.reminderBody, meta: S.toast.autoClose, href: rutaDe("astronaut", "check-in"), ttl: 10000,
        }])
      })
    }, 8000)
    return () => window.clearTimeout(id)
  }, [push, enRegistro])

  // un aviso no repite lo que la pantalla abierta ya muestra entero: ni las alertas en Alertas ni el entorno en Entorno.
  // Durante el registro no se muestra ninguno: taparían el dial y el resultado del registro ya trae el estado y el siguiente paso
  const visibles = toasts.filter((t) =>
    enRegistro ? false : ruta.startsWith(rutaDe("astronaut", "alerts")) ? t.kind !== "watch" && t.kind !== "act" : ruta.startsWith(rutaDe("astronaut", "environment")) ? t.kind !== "env" : true)
  return (
    // franja baja y a la derecha: lejos de la barra superior y de la acción principal de cada pantalla; solo el aviso recibe toques
    <section aria-label={S.toast.region} className="pointer-events-none fixed bottom-3 right-3 z-50 w-[min(38rem,calc(100vw-1.5rem))] md:bottom-5 md:right-5">
      <ol className="flex flex-col gap-2">
        {visibles.map((t) => (
          <ToastItem key={t.id} t={t} onDone={dismiss} />
        ))}
      </ol>
      {visibles.length > 0 && ocultos > 0 && (
        <Link
          href={rutaDe("astronaut", "alerts")}
          onClick={() => setPila({ toasts: [], ocultos: 0 })}
          className="pointer-events-auto ml-auto mt-2 flex min-h-12 w-fit items-center justify-center gap-2 rounded-full border border-border bg-popover px-5 text-base font-semibold text-popover-foreground shadow-lg shadow-black/20 hover:bg-accent active:scale-[0.98]"
        >
          {S.toast.more(ocultos)}
          <ArrowRight aria-hidden className="size-5" />
        </Link>
      )}
    </section>
  )
}
