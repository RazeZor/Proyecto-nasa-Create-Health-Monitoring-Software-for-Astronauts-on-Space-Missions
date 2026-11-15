/**
 * Iconos de la pantalla Acerca de, con el lenguaje de `components/shared/iconos.tsx`: rejilla de 24 px,
 * trazo redondeado de 1,7 y relleno suave del mismo color (duotono), todo en `currentColor`.
 */
import type { SVGProps } from "react"

type Icono = (p: SVGProps<SVGSVGElement>) => React.ReactElement

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoAcercaDe(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
const R = { fill: "currentColor", fillOpacity: 0.2 } as const

/** Privacidad: un escudo con su cerradura. */
export const IconoPrivacidad = lienzo(
  <>
    <path {...R} d="M12 3 4.8 5.8v5.6c0 4.400 2.900 7.800 7.200 9.600 4.300-1.800 7.200-5.200 7.200-9.600V5.800L12 3Z" />
    <path d="M12 10.400v3.400" />
    <circle cx="12" cy="10" r="1.200" />
  </>,
)
/** Sin conexión: la nave sigue funcionando aunque el enlace esté cortado. */
export const IconoSinConexion = lienzo(
  <>
    <circle {...R} cx="12" cy="17.400" r="2.200" />
    <path d="M7.600 13.200a6.200 6.200 0 0 1 8.800 0M4.400 9.800a10.800 10.800 0 0 1 15.200 0M4 4l16 16" />
  </>,
)
/** Motor de capas: tres planos apilados. */
export const IconoCapas = lienzo(
  <>
    <path {...R} d="m12 3.400 8.400 4.400L12 12.200 3.600 7.800 12 3.400Z" />
    <path d="m3.600 12 8.400 4.400 8.400-4.400M3.600 16.200l8.400 4.400 8.400-4.400" />
  </>,
)
/** Datos y fuentes: un cilindro de datos. */
export const IconoDatos = lienzo(
  <>
    <ellipse {...R} cx="12" cy="6.400" rx="7.400" ry="2.800" />
    <path d="M4.600 6.400v11.200c0 1.500 3.300 2.800 7.400 2.800s7.400-1.300 7.400-2.800V6.400M4.600 12c0 1.500 3.300 2.800 7.400 2.800s7.400-1.300 7.400-2.800" />
  </>,
)
/** Resultados: una diana. */
export const IconoResultados = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.600" />
    <circle cx="12" cy="12" r="4.600" />
    <circle cx="12" cy="12" r="0.900" fill="currentColor" />
  </>,
)
/** Límites: una señal de alto el paso. */
export const IconoLimites = lienzo(
  <>
    <path {...R} d="M8.400 3.400h7.200l5 5v7.200l-5 5H8.400l-5-5V8.400l5-5Z" />
    <path d="M12 7.800v5" />
    <circle cx="12" cy="16" r="0.900" fill="currentColor" />
  </>,
)
