import { RUTA_DE_ROL } from "@/lib/roles"

// Solo existen /astronauta, /oficial y /medico: cualquier otro tramo es 404 (y todo se genera al compilar).
export const dynamicParams = false
export const generateStaticParams = () => Object.values(RUTA_DE_ROL).map((rol) => ({ rol }))

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
