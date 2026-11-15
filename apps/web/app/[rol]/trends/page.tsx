import { TrendsView } from "@/components/trends/trends-view"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "trends")
  return <TrendsView />
}
