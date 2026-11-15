/**
 * Iconos de los informes: los dos extremos del enlace (nave y Tierra) y el mensaje que viaja entre ellos. Mismo
 * lenguaje que `components/shared/iconos.tsx`: rejilla de 24 px, trazo redondeado de 1,7 y relleno suave.
 */
import type { SVGProps } from "react"

export type Icono = (p: SVGProps<SVGSVGElement>) => React.ReactElement

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoInforme(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
const R = { fill: "currentColor", fillOpacity: 0.2 } as const

export const IconoNave = lienzo(
  <>
    <path {...R} d="M12 2.8c3 2.3 4.6 5.6 4.6 9.4v4.3H7.4v-4.3c0-3.8 1.6-7.1 4.6-9.4Z" />
    <circle cx="12" cy="10" r="1.9" />
    <path d="M7.4 13.2 4.6 16v3.2l2.8-1.5M16.6 13.2l2.8 2.8v3.2l-2.8-1.5M10.4 19.2 12 21.4l1.6-2.2" />
  </>,
)
export const IconoTierra = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.6" />
    <path d="M3.4 12h17.2M12 3.4c2.6 2.6 3.8 5.4 3.8 8.6s-1.2 6-3.8 8.6c-2.6-2.6-3.8-5.4-3.8-8.6s1.2-6 3.8-8.6Z" />
  </>,
)
export const IconoSobre = lienzo(
  <>
    <rect {...R} x="3.5" y="6" width="17" height="12" rx="2.5" />
    <path d="m4.2 7.6 7.8 5.9 7.8-5.9" />
  </>,
)
/** Respuesta del cirujano de vuelo. */
export const IconoRespuesta = lienzo(
  <>
    <path {...R} d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 4v-4A2.5 2.5 0 0 1 4 13.5v-7Z" />
    <path d="M8 8.8h8M8 11.8h5" />
  </>,
)
export const IconoEspera = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.6" />
    <path d="M12 7.4V12l3 2" />
  </>,
)
export const IconoVisto = lienzo(<path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth={2.2} />)
