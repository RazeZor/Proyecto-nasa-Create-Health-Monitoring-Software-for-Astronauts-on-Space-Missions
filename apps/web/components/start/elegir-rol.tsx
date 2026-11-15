"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { PageHeader } from "@/components/shared/states"
import { rutaDe } from "@/lib/roles"
import { S } from "@/lib/strings"
import type { Role } from "@/lib/types"

const ROLES: Role[] = ["astronaut", "cmo", "surgeon"]

/** Inicio: aquí se elige el rol y cada uno entra a su tablero (/astronauta, /oficial, /medico). */
export function ElegirRol() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title={S.start.title} subtitle={S.start.subtitle} />
      <ul className="grid gap-4 md:grid-cols-3">
        {ROLES.map((r) => (
          <li key={r}>
            <Link
              href={rutaDe(r)}
              className="flex h-full min-h-48 flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-sm transition-colors hover:border-primary hover:bg-accent/60 active:scale-[0.99]"
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
