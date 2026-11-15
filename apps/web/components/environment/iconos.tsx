/**
 * Iconos de la pantalla Entorno, con el mismo lenguaje que `components/shared/iconos.tsx`: rejilla de 24 px,
 * trazo redondeado de 1,7 y relleno suave del mismo color (duotono). Heredan color (`currentColor`) y tamaño.
 */
import type { Icono } from "@/components/shared/iconos"

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoEntornoDetalle(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
const R = { fill: "currentColor", fillOpacity: 0.2 } as const
const LLENO = { fill: "currentColor", stroke: "none" } as const

/** Tormenta solar: el sol y las partículas que salen de él. */
export const IconoTormenta = lienzo(
  <>
    <circle {...R} cx="8.6" cy="8.6" r="4.2" />
    <path d="M8.6 1.8v1.4M1.8 8.600h1.4M3.800 3.800l1 1M13.400 3.800l-1 1M3.800 13.400l1-1" />
    <path d="m13.600 13.600 1.800 1.800M17.800 17.800l3 3M15.400 10.200l5.200 2M10.200 15.400l2 5.200" />
  </>,
)
/** CO2: la molécula (O=C=O) en el aire que circula. */
export const IconoCo2 = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="2.8" />
    <circle {...R} cx="4.800" cy="12" r="2.2" />
    <circle {...R} cx="19.200" cy="12" r="2.2" />
    <path d="M4.600 5.800c2.500-1.600 4.900-1.600 7.400 0s4.900 1.600 7.400 0M4.600 18.200c2.500 1.600 4.900 1.600 7.400 0s4.900-1.600 7.400 0" />
  </>,
)
/** Dosis de radiación: el trébol. */
export const IconoDosis = lienzo(
  <>
    <path {...R} d="M13.800 15.120 16.500 19.790A9 9 0 0 1 7.500 19.790L10.200 15.120A3.600 3.600 0 0 0 13.800 15.120Z" />
    <path {...R} d="M13.800 8.880 16.500 4.210A9 9 0 0 1 21 12H15.600A3.600 3.600 0 0 0 13.800 8.880Z" />
    <path {...R} d="M8.400 12H3A9 9 0 0 1 7.500 4.210L10.200 8.880A3.600 3.600 0 0 0 8.400 12Z" />
    <circle {...LLENO} cx="12" cy="12" r="1.5" />
  </>,
)
/** Humedad: una gota. */
export const IconoHumedad = lienzo(
  <>
    <path {...R} d="M12 3.200c3.600 4.100 5.600 7.200 5.600 10a5.600 5.600 0 0 1-11.200 0c0-2.800 2-5.900 5.600-10Z" />
    <path d="M9.600 14.200c.3 1.300 1.100 2.100 2.400 2.400" />
  </>,
)
/** Presión de cabina: un manómetro. */
export const IconoPresion = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.8" />
    <path d="m12 12 4-3.400M12 5.400v1.400M5.400 12h1.400M17.200 12h1.400" />
    <circle {...LLENO} cx="12" cy="12" r="1.3" />
  </>,
)
/** Procedencia de los datos: los discos de un almacén. */
export const IconoDatos = lienzo(
  <>
    <ellipse {...R} cx="12" cy="6.200" rx="7.400" ry="2.800" />
    <path d="M4.600 6.200v11.600c0 1.500 3.300 2.800 7.400 2.800s7.400-1.300 7.400-2.800V6.200M4.600 12c0 1.500 3.300 2.800 7.400 2.800s7.400-1.300 7.400-2.800" />
  </>,
)
