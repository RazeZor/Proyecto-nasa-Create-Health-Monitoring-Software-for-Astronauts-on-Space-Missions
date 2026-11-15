import { cn } from "@/lib/utils"

/** La pista del interruptor, solo visual: quien la usa pone el botón (`role="switch"`) y el texto del estado. */
export function SwitchTrack({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("flex h-9 w-16 shrink-0 items-center rounded-full p-1 transition-colors duration-200", checked ? "bg-primary" : "bg-muted-foreground/30", className)}>
      <span className={cn("size-7 rounded-full bg-background shadow transition-transform duration-200", checked && "translate-x-7")} />
    </span>
  )
}

export function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className="flex min-h-14 min-w-16 shrink-0 items-center"
    >
      <SwitchTrack checked={checked} />
    </button>
  )
}
