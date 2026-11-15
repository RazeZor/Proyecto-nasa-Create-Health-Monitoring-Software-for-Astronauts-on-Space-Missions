/**
 * Iconos de las alertas y de los avisos emergentes: privacidad (quién lo ve) y tipo de aviso. Mismo lenguaje que
 * `components/shared/iconos.tsx`: rejilla de 24 px, trazo redondeado de 1,7 y relleno suave del mismo color.
 */
import type { SVGProps } from "react"

export type Icono = (p: SVGProps<SVGSVGElement>) => React.ReactElement

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoAlerta(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
const R = { fill: "currentColor", fillOpacity: 0.2 } as const
const LLENO = { fill: "currentColor", stroke: "none" } as const
const ESCUDO = "M12 3 5 5.8v5.4c0 4.4 2.9 7.9 7 9.8 4.1-1.9 7-5.4 7-9.8V5.8L12 3Z"

/** Privada: no sale del dispositivo. */
export const IconoCandado = lienzo(
  <>
    <rect {...R} x="5" y="10.5" width="14" height="9.5" rx="2.5" />
    <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7M12 14.2v2.4" />
  </>,
)
/** Compartida por decisión del astronauta. */
export const IconoCompartida = lienzo(
  <>
    <circle {...R} cx="17.6" cy="5.6" r="2.5" />
    <circle {...R} cx="6.4" cy="12" r="2.5" />
    <circle {...R} cx="17.6" cy="18.4" r="2.5" />
    <path d="m8.6 10.8 6.8-3.9M8.6 13.2l6.8 3.9" />
  </>,
)
/** Escalada: salió sola hacia el oficial médico. */
export const IconoEscalada = lienzo(
  <>
    <path {...R} d="M20.5 3.5 3.5 10.3l6.6 2.9 2.9 6.8 7.5-16.5Z" />
    <path d="M10.1 13.2 20.5 3.5" />
  </>,
)
export const IconoTripulacion = lienzo(
  <>
    <circle {...R} cx="9" cy="8.2" r="3.2" />
    <path {...R} d="M3 19.6c0-3.3 2.7-5.7 6-5.7s6 2.4 6 5.7H3Z" />
    <path d="M15.8 5.3a3.2 3.2 0 0 1 0 5.9M17.6 14.3c2 .7 3.4 2.7 3.4 5.3" />
  </>,
)
/** Simulado (modo demo). */
export const IconoMatraz = lienzo(
  <>
    <path {...R} d="M7.5 14h9l2.6 4.2a1.6 1.6 0 0 1-1.4 2.3H6.3a1.6 1.6 0 0 1-1.4-2.3L7.5 14Z" />
    <path d="M9.4 3.5h5.2M10.2 3.5v5.7l-5.3 9a1.6 1.6 0 0 0 1.4 2.3h11.4a1.6 1.6 0 0 0 1.4-2.3l-5.3-9V3.5" />
  </>,
)
export const IconoReloj = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.6" />
    <path d="M12 7.4V12l3 2" />
  </>,
)
export const IconoInfo = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.6" />
    <path d="M12 11.2v5.2" />
    <circle {...LLENO} cx="12" cy="7.9" r="1.1" />
  </>,
)
/** Sin alertas: el escudo con la marca de comprobado. */
export const IconoCalma = lienzo(
  <>
    <path {...R} d={ESCUDO} />
    <path d="m8.7 12.1 2.4 2.4 4.3-4.7" />
  </>,
)
/** Aviso de entorno (tormenta, CO2). */
export const IconoEscudoAviso = lienzo(
  <>
    <path {...R} d={ESCUDO} />
    <path d="M12 8v4.8" />
    <circle {...LLENO} cx="12" cy="15.7" r="1.1" />
  </>,
)
export const IconoCampana = lienzo(
  <>
    <path {...R} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z" />
    <path d="M10 20.6a2.2 2.2 0 0 0 4 0M12 3v2" />
  </>,
)
export const IconoVisto = lienzo(<path d="m5 12.5 4.5 4.5L19 7.5" strokeWidth={2.2} />)
