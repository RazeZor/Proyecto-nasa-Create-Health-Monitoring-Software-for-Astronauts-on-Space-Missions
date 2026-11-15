/**
 * Iconos de la ficha del indicador, con el mismo lenguaje que `components/shared/iconos.tsx`: rejilla de 24 px,
 * trazo redondeado de 1,7 y relleno suave del mismo color (duotono). Heredan color (`currentColor`) y tamaño.
 */
import type { Icono } from "@/components/shared/iconos"

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoFicha(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
const R = { fill: "currentColor", fillOpacity: 0.2 } as const
const LLENO = { fill: "currentColor", stroke: "none" } as const

/** Qué es: un libro abierto. */
export const IconoQueEs = lienzo(
  <>
    <path {...R} d="M12 6.4C10 5 7.4 4.6 4.4 5v13c3-.4 5.6 0 7.6 1.4 2-1.4 4.6-1.8 7.6-1.4V5c-3-.4-5.6 0-7.6 1.4Z" />
    <path d="M12 6.4v13" />
  </>,
)
/** Por qué se necesita: una diana. */
export const IconoPorQue = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.8" />
    <circle cx="12" cy="12" r="4.6" />
    <circle {...LLENO} cx="12" cy="12" r="1.5" />
  </>,
)
/** Riesgo del vuelo espacial: un cuerpo que cruza el espacio. */
export const IconoRiesgo = lienzo(
  <>
    <circle {...R} cx="15.2" cy="15.2" r="5.4" />
    <path d="M3.2 3.2 10.4 10.4M3.6 9.4l3.8 3.8M9.4 3.6l3.8 3.8" />
  </>,
)
/** Prevención: un escudo con su marca de hecho. */
export const IconoPrevencion = lienzo(
  <>
    <path {...R} d="M12 3 19 5.8v5.4c0 4.4-2.8 7.9-7 9.8-4.2-1.900-7-5.4-7-9.8V5.8L12 3Z" />
    <path d="m8.8 11.9 2.3 2.3 4.2-4.4" />
  </>,
)
