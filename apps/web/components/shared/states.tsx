import { Inbox, Loader2, ServerCrash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { S } from "@/lib/strings"

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
      <Inbox aria-hidden className="size-6" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export function LoadingState({ label = S.common.loading }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
      <Loader2 aria-hidden className="size-5 animate-spin motion-reduce:animate-none" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-lg border border-status-act/40 bg-status-act/10 p-6 text-center">
      <ServerCrash aria-hidden className="size-6 text-status-act" />
      <div>
        <p className="font-semibold">{S.common.errorTitle}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" className="min-h-11" onClick={onRetry}>
          {S.common.retry}
        </Button>
      )}
    </div>
  )
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-balance text-3xl font-semibold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}
