import { CuerpoPropio } from "@/components/crew/crew-body"
import { CrewView } from "@/components/crew/crew-view"
import { ReportsView } from "@/components/reports/reports-view"
import { rolDeRuta } from "@/lib/roles"

/** Inicio de cada rol: el astronauta ve su cuerpo; el oficial médico, la tripulación; el cirujano, sus informes. */
export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  const rol = rolDeRuta(`/${(await params).rol}`)
  return rol === "cmo" ? <CrewView /> : rol === "surgeon" ? <ReportsView /> : <CuerpoPropio />
}
