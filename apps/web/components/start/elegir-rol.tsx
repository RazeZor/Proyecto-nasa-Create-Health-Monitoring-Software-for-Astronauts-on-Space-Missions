"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { rutaDe } from "@/lib/roles"
import { S } from "@/lib/strings"
import type { Role } from "@/lib/types"

const ROLES: Role[] = ["astronaut", "cmo", "surgeon"]

/**
 * Inicio: primero qué es VIGÍA y por qué importa (la propuesta de valor, visible sin entrar a nada), luego el
 * recorrido reunir → evaluar → actuar, y al final se elige el rol (/astronauta, /oficial, /medico).
 */
export function ElegirRol() {
  return (
    <div className="mx-auto max-w-5xl">
      <section className="mb-8 border-b border-border pb-8">
        <h1 className="max-w-3xl text-balance text-3xl font-semibold leading-tight md:text-5xl">{S.start.tagline}</h1>
        <p className="mt-4 max-w-3xl text-pretty text-lg leading-relaxed text-muted-foreground">{S.start.lead}</p>
        {/* En móvil los pasos no se muestran: empujan la elección de rol dos pantallas abajo. */}
        <ol className="mt-6 hidden gap-3 md:grid md:grid-cols-3">
          {S.about.steps.map((p, i) => (
            <li key={p.k} className="rounded-2xl bg-muted/60 p-4">
              <p className="text-lg font-semibold">
                <span className="font-mono text-muted-foreground">{i + 1}.</span> {p.t}
              </p>
              <p className="mt-1 text-base leading-snug text-muted-foreground">{p.d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-pretty text-base leading-relaxed">{S.start.diff}</p>
      </section>

      <h2 className="text-2xl font-semibold md:text-3xl">{S.start.title}</h2>
      <p className="mb-4 mt-1 text-base text-muted-foreground">{S.start.subtitle}</p>
      <ul className="grid gap-4 md:grid-cols-3">
        {ROLES.map((r) => (
          <li key={r}>
            <Link
              href={rutaDe(r)}
              className="flex h-full min-h-40 flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary hover:bg-accent/60 active:scale-[0.99]"
            >
              <span className="text-2xl font-semibold leading-tight">{S.roles[r]}</span>
              <span className="flex-1 text-base text-muted-foreground">{S.start[r]}</span>
              <span className="inline-flex items-center gap-2 font-semibold text-primary">
                {S.start.enter} <ArrowRight aria-hidden className="size-5" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
