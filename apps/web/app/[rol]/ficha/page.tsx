import { CuerpoTripulacion } from "@/components/crew/crew-body"
import { seccionDe } from "@/lib/guardia"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "ficha")
  return <CuerpoTripulacion modo="historico" />
}
