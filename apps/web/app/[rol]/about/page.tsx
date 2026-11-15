import { AboutView } from "@/components/about/about-view"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "about")
  return <AboutView />
}
