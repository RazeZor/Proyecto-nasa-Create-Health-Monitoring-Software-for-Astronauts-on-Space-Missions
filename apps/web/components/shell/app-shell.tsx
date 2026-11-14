"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell, ChevronLeft, ChevronRight, ClipboardCheck, Info, LineChart, Menu, Moon, Orbit, Radio,
  Send, ShieldAlert, Sun, User, Volume2, VolumeX, Watch, Sprout,
} from "lucide-react"
import { useApp } from "@/components/app-context"
import { formatDelay } from "@/components/shared/delay-countdown"
import { STATUS_ICON, statusText } from "@/components/shared/status"
import { AlertCenter } from "@/components/shell/alert-center"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { isAdaptation } from "@/lib/engine"
import { S } from "@/lib/strings"
import type { ProfileId, Role } from "@/lib/types"
import { cn } from "@/lib/utils"

const NAV = [
  { href: "/", label: S.nav.body, icon: User },
  { href: "/check-in", label: S.nav.checkin, icon: ClipboardCheck },
  { href: "/trends", label: S.nav.trends, icon: LineChart },
  { href: "/environment", label: S.nav.environment, icon: Orbit },
  { href: "/alerts", label: S.nav.alerts, icon: Bell },
  { href: "/reports", label: S.nav.reports, icon: Send },
  { href: "/device", label: S.nav.device, icon: Watch },
  { href: "/about", label: S.nav.about, icon: Info },
]

const code = (i: number) => String(i + 1).padStart(2, "0")

function useActiveIndex() {
  const path = usePathname()
  return NAV.findIndex(({ href }) => (href === "/" ? path === "/" : path.startsWith(href)))
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const activeIndex = useActiveIndex()
  return (
    <nav aria-label={S.nav.label}>
      <ul className="flex flex-col">
        {NAV.map(({ href, label, icon: Icon }, i) => {
          const active = i === activeIndex
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-12 items-center gap-3 border-l-2 border-transparent px-4 text-[0.95rem] font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  active && "border-sidebar-primary bg-sidebar-accent text-sidebar-foreground",
                )}
              >
                <span aria-hidden className={cn("w-5 font-mono text-xs text-sidebar-foreground/45", active && "text-sidebar-primary")}>
                  {code(i)}
                </span>
                <Icon aria-hidden className={cn("size-[18px]", active && "text-sidebar-primary")} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-4">
      <span className="flex size-10 items-center justify-center rounded-sm border border-sidebar-primary/50 text-sidebar-primary">
        <Radio aria-hidden className="size-5" />
      </span>
      <div className="leading-tight">
        <p className="font-mono text-lg font-semibold tracking-[0.2em] text-sidebar-foreground">{S.app.name}</p>
        <p className="text-xs text-sidebar-foreground/60">{S.app.tagline}</p>
      </div>
    </div>
  )
}

function SystemStatus() {
  const { day, analisis } = useApp()
  const overall = analisis.overall(day)
  const Icon = STATUS_ICON[overall]
  return (
    <div className="mx-4 rounded-sm border border-sidebar-border p-3">
      <p className="eyebrow !text-sidebar-foreground/55">{S.shell.system}</p>
      <p className={cn("mt-1.5 flex items-center gap-2 font-mono text-lg font-semibold uppercase", statusText[overall])}>
        <Icon aria-hidden className="size-5" />
        {S.status[overall]}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/60">{S.statusLong[overall]}</p>
    </div>
  )
}

function Rail() {
  return (
    <div className="flex h-full flex-col gap-6 py-5">
      <Brand />
      <NavLinks />
      <div className="mt-auto">
        <SystemStatus />
      </div>
    </div>
  )
}

const selectCls =
  "min-h-10 rounded-sm border border-input bg-card px-2.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-ring"

function Cell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col justify-center gap-1 border-r border-border px-3 py-2 last:border-r-0", className)}>
      <span className="eyebrow">{label}</span>
      {children}
    </div>
  )
}

function TopBar() {
  const { day, setDay, profile, setProfileId, role, setRole, theme, toggleTheme, voice, setVoice, catalogo, analisis } = useApp()
  const MISSION_DAYS = analisis.missionDays
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex flex-wrap items-stretch">
        <Sheet>
          <SheetTrigger
            className="flex w-14 items-center justify-center border-r border-border lg:hidden"
            aria-label={S.nav.openMenu}
          >
            <Menu aria-hidden className="size-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
            <SheetTitle className="sr-only">{S.nav.label}</SheetTitle>
            <Rail />
          </SheetContent>
        </Sheet>

        <Cell label={S.top.profile}>
          <select className={selectCls} value={profile.id} onChange={(e) => setProfileId(e.target.value as ProfileId)}>
            {catalogo.perfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </Cell>

        <Cell label={S.top.missionDay}>
          <div className="flex items-center" role="group" aria-label={S.top.missionDay}>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-sm border border-input hover:bg-accent disabled:opacity-40"
              onClick={() => setDay(day - 1)}
              disabled={day <= 1}
              aria-label={S.top.prevDay}
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <p className="min-w-16 px-2 text-center font-mono text-lg tabular-nums" aria-live="polite">
              <span className="sr-only">{S.common.day} </span>
              <span className="font-semibold">{String(day).padStart(2, "0")}</span>
              <span className="text-sm text-muted-foreground">/{MISSION_DAYS}</span>
            </p>
            <button
              type="button"
              className="flex size-10 items-center justify-center rounded-sm border border-input hover:bg-accent disabled:opacity-40"
              onClick={() => setDay(day + 1)}
              disabled={day >= MISSION_DAYS}
              aria-label={S.top.nextDay}
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
        </Cell>

        <Cell label={S.top.delay}>
          <p className="flex min-h-10 items-center font-mono text-lg font-semibold tabular-nums">
            {formatDelay(profile.delayMinutes)}
          </p>
        </Cell>

        <Cell label={S.shell.link} className="hidden xl:flex">
          <p className="flex min-h-10 items-center gap-2 text-sm font-medium text-status-ok">
            <span aria-hidden className="size-2 rounded-full bg-status-ok" />
            {S.shell.linkValue}
          </p>
        </Cell>

        <div className="ml-auto flex items-stretch border-l border-border">
          <Cell label={S.top.viewAs}>
            <select className={selectCls} value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {(Object.keys(S.roles) as Role[]).map((r) => (
                <option key={r} value={r}>{S.roles[r]}</option>
              ))}
            </select>
          </Cell>
          <div className="flex items-center gap-1 px-2">
            <button
              type="button"
              onClick={() => setVoice(!voice)}
              aria-pressed={voice}
              aria-label={S.toast.voiceLabel}
              title={S.toast.voiceLabel}
              className={cn(
                "flex size-11 items-center justify-center rounded-sm border border-input hover:bg-accent",
                voice && "border-primary bg-primary/10 text-primary",
              )}
            >
              {voice ? <Volume2 aria-hidden className="size-5" /> : <VolumeX aria-hidden className="size-5" />}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={S.top.theme}
              className="flex size-11 items-center justify-center rounded-sm border border-input hover:bg-accent"
            >
              {theme === "dark" ? <Sun aria-hidden className="size-5" /> : <Moon aria-hidden className="size-5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function Banners() {
  const { day, analisis } = useApp()
  return (
    <>
      {analisis.storm(day) && (
        <div role="alert" className="flex items-start gap-3 border-b border-status-act/40 bg-status-act/12 px-4 py-3 md:px-8">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-status-act" />
          <div>
            <p className="font-semibold text-status-act">{S.banners.storm}</p>
            <p className="text-sm">{S.banners.stormDetail}</p>
          </div>
        </div>
      )}
      {isAdaptation(day) && (
        <div role="status" className="flex items-start gap-3 border-b border-primary/30 bg-primary/10 px-4 py-3 md:px-8">
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

function SectionCode() {
  const i = useActiveIndex()
  const { day } = useApp()
  if (i < 0) return null
  return (
    <p className="eyebrow mb-2">
      {S.app.name} / {code(i)} {NAV[i].label} · {S.common.day} {day}
    </p>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
        {S.app.skip}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:block">
        <Rail />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <Banners />
        <main id="main" className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <SectionCode />
          {children}
        </main>
        <footer className="border-t border-border px-4 py-3 text-xs text-muted-foreground md:px-8">
          {S.app.disclaimer}
        </footer>
      </div>
      <AlertCenter />
    </div>
  )
}
