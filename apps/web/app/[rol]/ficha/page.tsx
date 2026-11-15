import { CuerpoTripulacion } from "@/components/crew/crew-body"
import { TrendsView } from "@/components/trends/trends-view"
import { seccionDe } from "@/lib/guardia"
import { S } from "@/lib/strings"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "ficha")
  return <CuerpoTripulacion titulo={S.crew.fichaTitle} subtitulo={S.crew.fichaSubtitle} vista={<TrendsView />} />
}
