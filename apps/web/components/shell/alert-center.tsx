"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { BellRing, Lock, OctagonAlert, Send, ShieldAlert, TriangleAlert, Users, X } from "lucide-react"
import { useApp } from "@/components/app-context"
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

const KIND_STYLE: Record<Kind, { bar: string; icon: typeof BellRing; text: string }> = {
  act: { bar: "bg-status-act", icon: OctagonAlert, text: "text-status-act" },
  watch: { bar: "bg-status-watch", icon: TriangleAlert, text: "text-status-watch" },
  env: { bar: "bg-status-act", icon: ShieldAlert, text: "text-status-act" },
  reminder: { bar: "bg-primary", icon: BellRing, text: "text-primary" },
}

const META_ICON: Record<Kind, typeof Send> = { act: Send, watch: Lock, env: Users, reminder: BellRing }

const MAX_VISIBLE = 2

function playTone(urgent: boolean) {
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
  return (
    <li
      role={urgent ? "alert" : "status"}
      className="toast-enter group pointer-events-auto relative flex overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg shadow-black/20"
    >
      <span aria-hidden className={cn("w-1.5 shrink-0", style.bar)} />
      <div className="min-w-0 flex-1 py-3 pl-3 pr-1">
        <p className="eyebrow flex items-center gap-1.5">
          <Icon aria-hidden className={cn("size-3.5", style.text)} />
          {S.toast.auto} · {t.stamp}
        </p>
        <p className={cn("mt-1 text-base font-semibold leading-snug", urgent && style.text)}>{t.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed">{t.body}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MetaIcon aria-hidden className="size-3.5" />
          {t.meta}
        </p>
        <Link href={t.href} onClick={() => onDone(t.id)} className="mt-2 inline-flex min-h-9 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline">
          {S.toast.view}
        </Link>
      </div>
      <button
        type="button"
        onClick={() => onDone(t.id)}
        aria-label={S.toast.close}
        className="flex size-11 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        <X aria-hidden className="size-4" />
      </button>
      <span
        aria-hidden
        className={cn("toast-timer absolute bottom-0 left-0 h-0.5 opacity-70", style.bar)}
        style={{ ["--ttl" as string]: `${t.ttl}ms` }}
        onAnimationEnd={() => onDone(t.id)}
      />
    </li>
  )
}

export function AlertCenter() {
  const { day, voice, analisis } = useApp()
  const seen = useRef(new Set<string>())
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback(
    (items: Toast[]) => {
      if (!items.length) return
      setToasts((cur) => [...items, ...cur].slice(0, MAX_VISIBLE))
      const urgent = items.some((t) => t.kind === "act" || t.kind === "env")
      playTone(urgent)
      if (voice) items.forEach((t) => speak(`${t.title}. ${t.body}`))
    },
    [voice],
  )

  const dismiss = useCallback((id: string) => setToasts((cur) => cur.filter((t) => t.id !== id)), [])

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
        href: kind === "env" ? "/environment" : "/alerts", ttl: kind === "watch" ? 12000 : 20000,
      })
    }
    push(fresh)
  }, [day, push, analisis])

  useEffect(() => {
    const id = window.setTimeout(() => {
      store.listCheckIns().then((list) => {
        const last = list.at(-1)
        const today = new Date().toDateString()
        if (last && new Date(last.createdAt).toDateString() === today) return
        if (seen.current.has("reminder")) return
        seen.current.add("reminder")
        push([{
          id: "reminder", kind: "reminder", stamp: S.toast.reminderMeta,
          title: S.toast.reminderTitle, body: S.toast.reminderBody, meta: S.toast.autoClose, href: "/check-in", ttl: 10000,
        }])
      })
    }, 8000)
    return () => window.clearTimeout(id)
  }, [push])

  return (
    <section aria-label={S.toast.region} className="pointer-events-none fixed right-3 top-3 z-50 w-[min(24rem,calc(100vw-1.5rem))] md:right-5 md:top-20">
      <ol className="flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} onDone={dismiss} />
        ))}
      </ol>
    </section>
  )
}
