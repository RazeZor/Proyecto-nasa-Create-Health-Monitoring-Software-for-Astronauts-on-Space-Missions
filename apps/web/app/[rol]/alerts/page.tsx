import { AlertsView } from "@/components/alerts/alerts-view"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "alerts")
  return <AlertsView />
}
