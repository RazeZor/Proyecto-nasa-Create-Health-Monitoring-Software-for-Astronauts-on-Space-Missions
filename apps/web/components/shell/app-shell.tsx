"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight, Moon, ShieldAlert, Sprout, Sun, Volume2, VolumeX } from "lucide-react"
import { useApp } from "@/components/app-context"
import { formatDelay } from "@/components/shared/delay-countdown"
import {
  IconoAcerca, IconoAlertas, IconoCuerpo, IconoDispositivo, IconoEntorno, IconoInformes, IconoRegistro, IconoTendencias,
} from "@/components/shared/iconos"
import { Logo } from "@/components/shared/logo"
import { STATUS_ICON, statusSurface, statusText } from "@/components/shared/status"
import { AlertCenter } from "@/components/shell/alert-center"
import { isAdaptation } from "@/lib/engine"
import { cambiarIdioma, IDIOMA, S } from "@/lib/strings"
import type { Mode, ProfileId, Role } from "@/lib/types"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: S.nav.body, icon: IconoCuerpo },
  { href: "/check-in", label: S.nav.checkin, icon: IconoRegistro },
  { href: "/trends", label: S.nav.trends, icon: IconoTendencias },
  { href: "/environment", label: S.nav.environment, icon: IconoEntorno },
  { href: "/alerts", label: S.nav.alerts, icon: IconoAlertas },
  { href: "/reports", label: S.nav.reports, icon: IconoInformes },
  { href: "/device", label: S.nav.device, icon: IconoDispositivo },
  { href: "/about", label: S.nav.about, icon: IconoAcerca },
]

function useActiveIndex() {
  const path = usePathname()
  return NAV.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href)))
}

/** Pestañas de sección: icono sobre etiqueta, del tamaño de un dedo; en pantallas estrechas se desplazan. */
function NavLinks() {
  const activeIndex = useActiveIndex()
  return (
    <nav aria-label={S.nav.label} className="order-last min-w-0 basis-full sm:order-none sm:flex-1 sm:basis-auto sm:overflow-x-auto">
      <ul className="flex flex-wrap items-stretch justify-center gap-1 px-2 sm:flex-nowrap sm:justify-start">
        {NAV.map(({ href, label, icon: Icon }, i) => {
          const active = i === activeIndex
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-16 min-w-[4.75rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 text-xs font-semibold transition-colors xl:min-w-[5.75rem] xl:text-[0.8rem]",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className={cn("flex h-8 w-14 items-center justify-center rounded-full transition-colors", active ? "bg-primary text-primary-foreground shadow-sm" : "group-hover:bg-accent")}>
                  <Icon className="size-[22px]" />
                </span>
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Logotipo «Centinela»: su punto muestra el estado del sistema, como define la guía de marca. */
function Brand() {
  const { day, analisis } = useApp()
  return (
    <Link href="/" aria-label={S.app.name} className="flex h-16 shrink-0 items-center pl-4 pr-2 md:pl-6">
      <Logo estado={analisis.overall(day)} className="h-11" />
    </Link>
  )
}

function SystemStatus() {
  const { day, analisis } = useApp()
  const overall = analisis.overall(day)
  const Icon = STATUS_ICON[overall]
  return (
    <p title={S.statusLong[overall]} className={cn("hidden min-h-11 items-center gap-2 rounded-full border px-4 font-mono text-sm font-semibold uppercase md:flex", statusSurface[overall], statusText[overall])}>
      <Icon aria-hidden className="size-5" />
      <span className="sr-only">{S.shell.system}: </span>
      {S.status[overall]}
    </p>
  )
}

const selectCls =
  "min-h-10 rounded-xl border border-input bg-card px-2.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"
const botonCls = "flex size-11 items-center justify-center rounded-full border border-input bg-card hover:bg-accent"

/** `corta`: en pantallas medianas la etiqueta solo se anuncia (el propio control ya dice qué es). */
function Cell({ label, children, className, corta }: { label: string; children: React.ReactNode; className?: string; corta?: boolean }) {
  return (
    <label className={cn("flex items-center gap-2", className)}>
      <span className={cn("eyebrow", corta && "sr-only 2xl:not-sr-only")}>{label}</span>
      {children}
    </label>
  )
}

function TopBar() {
  const { day, setDay, profile, setProfileId, role, setRole, theme, toggleTheme, voice, setVoice, catalogo, analisis, mode, setMode, online, pending } = useApp()
  const MISSION_DAYS = analisis.missionDays
  return (
    <header className="border-b border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center gap-1 sm:flex-nowrap">
        <Brand />
        <NavLinks />
        <div className="flex shrink-0 items-center gap-2 pr-4 md:pr-6">
          <SystemStatus />
          <button
            type="button"
            onClick={() => setVoice(!voice)}
            aria-pressed={voice}
            aria-label={S.toast.voiceLabel}
            title={S.toast.voiceLabel}
            className={cn(botonCls, voice && "border-primary bg-primary/10 text-primary")}
          >
            {voice ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
          </button>
          <button type="button" onClick={() => cambiarIdioma(IDIOMA === "es" ? "en" : "es")} aria-label={`${S.top.language}: ${IDIOMA === "es" ? "English" : "Español"}`} title={S.top.language} className={cn(botonCls, "font-mono text-sm font-bold uppercase")}>
            {IDIOMA}
          </button>
          <button type="button" onClick={toggleTheme} aria-label={S.top.theme} className={botonCls}>
            {theme === "dark" ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
          </button>
        </div>
      </div>

      {/* Contexto de la misión: una sola franja, con la etiqueta al lado de cada control */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border bg-background/70 px-4 py-1.5 md:px-6">
        <Cell label={S.top.profile} corta>
          <select className={cn(selectCls, "max-w-44")} value={profile.id} onChange={(e) => setProfileId(e.target.value as ProfileId)}>
            {catalogo.perfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </Cell>

        <div className="flex items-center gap-2" role="group" aria-label={S.top.missionDay}>
          <span className="eyebrow">{S.top.missionDay}</span>
          <div className="flex items-center rounded-xl border border-input bg-card">
            <button type="button" className="flex size-10 items-center justify-center rounded-l-xl hover:bg-accent disabled:opacity-40" onClick={() => setDay(day - 1)} disabled={day <= 1} aria-label={S.top.prevDay}>
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <p className="min-w-16 px-1 text-center font-mono text-lg tabular-nums" aria-live="polite">
              <span className="sr-only">{S.common.day} </span>
              <span className="font-semibold">{String(day).padStart(2, "0")}</span>
              <span className="text-sm text-muted-foreground">/{MISSION_DAYS}</span>
            </p>
            <button type="button" className="flex size-10 items-center justify-center rounded-r-xl hover:bg-accent disabled:opacity-40" onClick={() => setDay(day + 1)} disabled={day >= MISSION_DAYS} aria-label={S.top.nextDay}>
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>
        </div>

        <p className="flex items-center gap-2">
          <span className="eyebrow">{S.top.delay}</span>
          <span className="font-mono text-base font-semibold tabular-nums">{formatDelay(profile.delayMinutes)}</span>
        </p>

        <Cell label={S.top.mode} corta>
          <select className={selectCls} value={mode} onChange={(e) => setMode(e.target.value as Mode)}>
            <option value="real">{S.top.modeReal}</option>
            <option value="demo">{S.top.modeDemo}</option>
          </select>
        </Cell>

        <p className={cn("flex items-center gap-2 text-sm font-medium", online ? "text-status-ok" : "text-status-watch")} role="status">
          <span className="eyebrow hidden 2xl:inline">{S.shell.link}</span>
          <span aria-hidden className={cn("size-2 rounded-full", online ? "bg-status-ok" : "bg-status-watch")} />
          {online ? S.shell.linkOnline : S.shell.linkOffline}
          {pending > 0 && <span className="font-mono text-xs text-muted-foreground">· {S.shell.pending(pending)}</span>}
        </p>

        <Cell label={S.top.viewAs} className="ml-auto">
          <select className={cn(selectCls, "max-w-44")} value={role} onChange={(e) => setRole(e.target.value as Role)}>
            {(Object.keys(S.roles) as Role[]).map((r) => (
              <option key={r} value={r}>{S.roles[r]}</option>
            ))}
          </select>
        </Cell>
      </div>
    </header>
  )
}

function Banners() {
  const { day, analisis, mode, setMode, online, checkIns, catalogo } = useApp()
  const tormenta = analisis.stormInfo(day)
  const sinRegistros = mode === "real" && checkIns.length === 0 && catalogo.historial.lecturas.length === 0
  // sitio público de la hackatón: el modo real usa un tripulante de prueba compartido por todos los visitantes
  const publico = process.env.NEXT_PUBLIC_VIGIA_PUBLICO === "1" && mode === "real"
  return (
    <>
      {mode === "demo" && (
        <div role="status" className="flex items-center gap-3 border-b border-status-watch/40 bg-status-watch/10 px-4 py-1.5 md:px-6">
          <p className="min-w-0 flex-1 truncate text-sm" title={S.banners.demoDetail}><span className="font-semibold">{S.banners.demo}.</span> <span className="text-muted-foreground">{S.banners.demoDetail}</span></p>
          <button type="button" onClick={() => setMode("real")} className="min-h-9 shrink-0 rounded-full border border-input bg-card px-4 text-sm font-medium hover:bg-accent">{S.banners.demoExit}</button>
        </div>
      )}
      {!online && (
        <div role="status" className="flex items-start gap-3 border-b border-status-watch/40 bg-status-watch/10 px-4 py-3 md:px-6">
          <div>
            <p className="font-semibold">{S.banners.offline}</p>
            <p className="text-sm text-muted-foreground">{S.banners.offlineDetail}</p>
          </div>
        </div>
      )}
      {publico && (
        <div role="note" className="border-b border-border bg-muted px-4 py-2 text-sm md:px-6">
          <span className="font-semibold">{S.banners.publicShared}</span> <span className="text-muted-foreground">{S.banners.publicSharedDetail}</span>
        </div>
      )}
      {sinRegistros && (
        <div role="status" className="flex flex-wrap items-center gap-3 border-b border-primary/30 bg-primary/10 px-4 py-3 md:px-6">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{S.banners.realEmpty}</p>
            <p className="text-sm text-muted-foreground">{S.banners.realEmptyDetail}</p>
          </div>
          <Link href="/check-in" className="inline-flex min-h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-primary-foreground">{S.banners.realEmptyCta}</Link>
          <button type="button" onClick={() => setMode("demo")} className="min-h-10 rounded-sm border border-input px-4 text-sm font-medium hover:bg-accent">{S.banners.realEmptyDemo}</button>
        </div>
      )}
      {tormenta && (
        <div role="alert" className="flex items-start gap-3 border-b border-status-act/40 bg-status-act/12 px-4 py-3 md:px-6">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-status-act" />
          <div>
            <p className="font-semibold text-status-act">{S.banners.storm}</p>
            <p className="text-sm">{S.banners.stormDetail}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{S.banners.stormSource}: {tormenta.source}{tormenta.flux !== null ? ` · ${tormenta.flux} pfu` : ""}</p>
          </div>
        </div>
      )}
      {isAdaptation(day) && (
        <div role="status" className="flex items-start gap-3 border-b border-primary/30 bg-primary/10 px-4 py-3 md:px-6">
          <Sprout aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
          <div>
            <p className="font-semibold">{S.banners.adaptation}</p>
            <p className="text-sm text-muted-foreground">{S.banners.adaptationDetail}</p>
          </div>
        </div>
      )}
    </>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        {S.app.skip}
      </a>
      <TopBar />
      <Banners />
      <main id="main" className="flex-1 px-4 py-4 md:px-6">
        {children}
      </main>
      <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground md:px-6">
        {S.app.disclaimer}
      </footer>
      <AlertCenter />
    </div>
  )
}
