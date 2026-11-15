import { EnvironmentView } from "@/components/environment/environment-view"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "environment")
  return <EnvironmentView />
}
