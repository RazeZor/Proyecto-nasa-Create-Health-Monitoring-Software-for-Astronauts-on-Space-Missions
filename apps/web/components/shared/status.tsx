import { CheckCircle2, OctagonAlert, TriangleAlert, Database, FlaskConical, Activity, Clapperboard } from "lucide-react"
import { S } from "@/lib/strings"
import type { Layer, Provenance, Status } from "@/lib/types"
import { cn } from "@/lib/utils"

export const STATUS_ICON = { ok: CheckCircle2, watch: TriangleAlert, act: OctagonAlert } as const

export const statusText: Record<Status, string> = {
  ok: "text-status-ok",
  watch: "text-status-watch",
  act: "text-status-act",
}
export const statusSurface: Record<Status, string> = {
  ok: "bg-status-ok/12 border-status-ok/40",
  watch: "bg-status-watch/12 border-status-watch/40",
  act: "bg-status-act/12 border-status-act/40",
}

export function StatusBadge({ status, size = "md", className }: { status: Status; size?: "sm" | "md" | "lg"; className?: string }) {
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border font-mono font-semibold uppercase tracking-wider",
        statusSurface[status],
        statusText[status],
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-xs",
        size === "lg" && "px-3 py-1.5 text-sm",
        className,
      )}
    >
      <Icon aria-hidden className={size === "lg" ? "size-5" : "size-4"} />
      {S.status[status]}
    </span>
  )
}

export function LayerChip({ layer, className }: { layer: Layer; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-xs font-medium text-secondary-foreground",
        className,
      )}
      title={S.layerLong[layer]}
    >
      {S.layers[layer]}
    </span>
  )
}

const PROV_ICON = { measured: Activity, simulated: FlaskConical, scenario: Clapperboard, real: Database } as const

export function ProvenanceTag({ provenance, className }: { provenance: Provenance; className?: string }) {
  const Icon = PROV_ICON[provenance.kind]
  const label =
    provenance.kind === "real"
      ? `${S.provenance.real} · ${provenance.source} · ${provenance.date}`
      : S.provenance[provenance.kind]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border/70 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground",
        provenance.kind === "real" && "border-primary/40 text-primary",
        className,
      )}
    >
      <Icon aria-hidden className="size-3" />
      <span>{label}</span>
    </span>
  )
}
