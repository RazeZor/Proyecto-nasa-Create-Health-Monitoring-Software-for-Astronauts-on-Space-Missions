import { ReportsView } from "@/components/reports/reports-view"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "reports")
  return <ReportsView />
}
