/**
 * Iconos propios de VIGÍA, dibujados para esta aplicación (no vienen de una librería). Mismo lenguaje en todos:
 * rejilla de 24 px, trazo redondeado de 1,7 y un relleno suave del mismo color (duotono) que marca la forma.
 * Heredan el color del texto (`currentColor`) y el tamaño de su clase.
 */
import type { SVGProps } from "react"
import type { IndicatorId } from "@/lib/types"

export type Icono = (p: SVGProps<SVGSVGElement>) => React.ReactElement

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoVigia(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
/** Relleno suave del duotono. */
const R = { fill: "currentColor", fillOpacity: 0.2 } as const
const LLENO = { fill: "currentColor", stroke: "none" } as const

// ── Indicadores ─────────────────────────────────────────────────────────────────
const Pulso = lienzo(
  <>
    <path {...R} d="M12 20.4C5.6 15.6 3 12.2 3 8.9 3 6.2 5.1 4 7.7 4c1.7 0 3.3.9 4.3 2.4C13 4.9 14.6 4 16.3 4 18.9 4 21 6.2 21 8.9c0 3.3-2.6 6.7-9 11.5Z" />
    <path d="M6.6 11.6h2.7l1.3-2.5 2.2 4.9 1.4-2.4h3.2" />
  </>,
)
/** Presión: la pared de la arteria y la sangre que la empuja hacia fuera. */
const Presion = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.6" />
    <circle cx="12" cy="12" r="4.3" />
    <path d="M12 9.6V6.3M12 14.4v3.3M9.6 12H6.3M14.4 12h3.3" />
    <path d="M10.9 7.3 12 6.2l1.1 1.1M10.9 16.7l1.1 1.1 1.1-1.1M7.3 10.9 6.2 12l1.1 1.1M16.7 10.9l1.1 1.1-1.1 1.1" />
  </>,
)
const Pulmones = lienzo(
  <>
    <path d="M12 3v7.2M12 10.2l-1.6 1.4M12 10.2l1.6 1.4" />
    <path {...R} d="M9.6 8.4c-3 .9-5.5 4.4-6 8.6-.2 1.9.6 2.8 2.1 2.8 2.6 0 4.7-1.3 4.7-3.8V9.2c0-.6-.3-.9-.8-.8Z" />
    <path {...R} d="M14.4 8.4c3 .9 5.5 4.4 6 8.6.2 1.9-.6 2.8-2.1 2.8-2.6 0-4.7-1.3-4.7-3.8V9.2c0-.6.3-.9.8-.8Z" />
  </>,
)
const Temperatura = lienzo(
  <>
    <path {...R} d="M8.2 13.7V5.2a2.3 2.3 0 0 1 4.6 0v8.5a4.3 4.3 0 1 1-4.6 0Z" />
    <circle {...LLENO} cx="10.5" cy="17.2" r="1.9" />
    <path d="M10.5 15.4V8.6" />
    <path d="M16.6 5.6c1.2.8 1.2 2 0 2.8s-1.2 2 0 2.8M19.8 5.6c1.2.8 1.2 2 0 2.8s-1.2 2 0 2.8" />
  </>,
)
const Sueno = lienzo(
  <>
    <path {...R} d="M19.6 14.4A8.2 8.2 0 0 1 9.6 4.4a8.2 8.2 0 1 0 10 10Z" />
    <path d="M14.2 3.6h3.6l-3.6 4h3.6M18.6 9.6h2.2l-2.2 2.4h2.2" />
  </>,
)
const Animo = lienzo(
  <>
    <circle {...R} cx="11.4" cy="12.6" r="8.4" />
    <path d="M7.6 14.4c1 1.6 2.3 2.4 3.8 2.4s2.8-.8 3.8-2.4" />
    <path d="M8.2 10.6c.5-.7 1.3-.7 1.8 0M12.8 10.6c.5-.7 1.3-.7 1.8 0" />
    <path d="M19.4 2.4v3.2M17.8 4h3.2" />
  </>,
)
/** Glucosa: una gota de sangre con la molécula dentro. */
const Glucosa = lienzo(
  <>
    <path {...R} d="M12 2.8c3.9 4.4 6 7.7 6 10.7a6 6 0 0 1-12 0c0-3 2.1-6.3 6-10.7Z" />
    <path d="m12 10.4 2.6 1.5v3L12 16.4l-2.6-1.5v-3L12 10.4Z" />
  </>,
)
/** Masa corporal: hueso y músculo. */
const Masa = lienzo(
  <>
    <path {...R} d="M5.2 13.2a2.5 2.5 0 0 1 3.6-.1l5-5a2.5 2.5 0 1 1 4.3-2 2.5 2.5 0 1 1-2 4.3l-5 5a2.5 2.5 0 1 1-4.3 2 2.5 2.5 0 0 1-1.6-4.2Z" />
  </>,
)
export const ICONO_INDICADOR: Record<IndicatorId, Icono> = {
  restingHr: Pulso, systolic: Presion, spo2: Pulmones, tempC: Temperatura, sleepH: Sueno, mood: Animo, glucose: Glucosa, massKg: Masa,
}
export { Pulso as IconoPulso }

// ── Navegación ──────────────────────────────────────────────────────────────────
export const IconoCuerpo = lienzo(
  <>
    <circle {...R} cx="12" cy="4.6" r="2.4" />
    <path {...R} d="M8.2 9.2h7.6c.9 0 1.6.7 1.6 1.6l-.5 4.6h-1.6l-.6 6h-5.4l-.6-6H7.1l-.5-4.6c0-.9.7-1.6 1.6-1.6Z" />
    <path d="M12 15.6v5.6" />
  </>,
)
export const IconoRegistro = lienzo(
  <>
    <path {...R} d="M6.4 4.6h11.2c.8 0 1.4.6 1.4 1.4v13.4c0 .8-.6 1.4-1.4 1.4H6.4c-.8 0-1.4-.6-1.4-1.4V6c0-.8.6-1.4 1.4-1.4Z" />
    <path d="M9 3.2h6v3H9zM8.6 13.2l2.3 2.3 4.6-4.8" />
  </>,
)
export const IconoTendencias = lienzo(
  <>
    <path {...R} d="M4 15.5 8.5 11l3.4 3 7.6-8v14H4v-4.5Z" stroke="none" />
    <path d="M4 4v16h16M4 15.5 8.5 11l3.4 3 7.6-8" />
  </>,
)
/** Entorno: el sol y una órbita con la nave. */
export const IconoEntorno = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="3.6" />
    <ellipse cx="12" cy="12" rx="9.6" ry="4.4" transform="rotate(-24 12 12)" />
    <circle {...LLENO} cx="19.6" cy="7.4" r="1.6" />
  </>,
)
export const IconoAlertas = lienzo(
  <>
    <path {...R} d="M6.4 16.8V11a5.6 5.6 0 0 1 11.2 0v5.8l1.6 2H4.8l1.6-2Z" />
    <path d="M10.2 21h3.6M12 3.2v2.2" />
  </>,
)
/** Informes: el mensaje que viaja a tierra con retardo. */
export const IconoInformes = lienzo(
  <>
    <path {...R} d="M3.4 11.2 20.6 4l-4.8 16.4-4-6.6-8.4-2.6Z" />
    <path d="m11.8 13.8 4-4.6" />
  </>,
)
export const IconoDispositivo = lienzo(
  <>
    <path d="M9 6.4 9.6 3h4.8l.6 3.4M9 17.6l.6 3.4h4.8l.6-3.4" />
    <rect {...R} x="6.4" y="6.4" width="11.2" height="11.2" rx="3.2" />
    <path d="M8.8 12h1.6l.9-1.7 1.5 3.4 1-1.7h1.4" />
  </>,
)
export const IconoAcerca = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.8" />
    <path d="M12 11v5.4" />
    <circle {...LLENO} cx="12" cy="7.8" r="1.1" />
  </>,
)
