import { CuerpoPropio, CuerpoTripulacion } from "@/components/crew/crew-body"
import { seccionDe } from "@/lib/guardia"
import { rolDeRuta } from "@/lib/roles"

export default async function Page({ params }: { params: Promise<{ rol: string }> }) {
  await seccionDe(params, "body")
  // El astronauta ve el suyo (igual que su inicio); los clínicos eligen entre los tripulantes.
  const rol = rolDeRuta(`/${(await params).rol}`)
  return rol === "astronaut" ? <CuerpoPropio /> : <CuerpoTripulacion />
}
