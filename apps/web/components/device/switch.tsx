import { cn } from "@/lib/utils"

export function Switch({ checked, onChange, labelledBy }: { checked: boolean; onChange: (v: boolean) => void; labelledBy: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className="flex min-h-11 min-w-14 shrink-0 items-center"
    >
      <span className={cn("flex h-7 w-12 items-center rounded-full p-0.5 transition-colors", checked ? "bg-primary" : "bg-muted")}>
        <span className={cn("size-6 rounded-full bg-background shadow transition-transform", checked && "translate-x-5")} />
      </span>
    </button>
  )
}
