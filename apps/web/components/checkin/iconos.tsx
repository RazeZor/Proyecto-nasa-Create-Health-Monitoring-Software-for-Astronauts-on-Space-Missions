/**
 * Iconos del registro diario, con el mismo lenguaje que `components/shared/iconos.tsx`: rejilla de 24 px,
 * trazo redondeado de 1,7 y relleno suave del mismo color (duotono). Heredan color y tamaño.
 */
import type { SVGProps } from "react"
import type { Symptom } from "@/lib/types"

type Icono = (p: SVGProps<SVGSVGElement>) => React.ReactElement

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoRegistroDiario(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
const R = { fill: "currentColor", fillOpacity: 0.2 } as const
const LLENO = { fill: "currentColor", stroke: "none" } as const

// ── Molestias ───────────────────────────────────────────────────────────────────
const DolorCabeza = lienzo(
  <>
    <circle {...R} cx="12" cy="13.6" r="7.2" />
    <path d="M8.2 3.4 9.4 5M12 2.4v2.2M15.8 3.4 14.6 5" />
    <path d="m8.6 12.2 2 .9M15.4 12.2l-2 .9M9.8 17.2c1.3-1 3.1-1 4.4 0" />
  </>,
)
const Nauseas = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.6" />
    <circle {...LLENO} cx="9" cy="9.8" r="1" />
    <circle {...LLENO} cx="15" cy="9.8" r="1" />
    <path d="M7.6 15.2c1.1-1.3 2.2 1.3 3.3 0s2.2 1.3 3.3 0 1.5.6 2.2 0" />
  </>,
)
const Mareo = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="9" stroke="none" />
    <path d="M12 12a1.5 1.5 0 0 0-3 0 3 3 0 0 0 6 0 4.5 4.5 0 0 0-9 0 6 6 0 0 0 12 0 7.5 7.5 0 0 0-7.5-7.5" />
  </>,
)
const Vision = lienzo(
  <>
    <path {...R} d="M2.8 12c2.4-4 5.5-6 9.2-6s6.8 2 9.2 6c-2.4 4-5.5 6-9.2 6s-6.8-2-9.2-6Z" />
    <circle cx="12" cy="12" r="2.9" />
    <path d="M4.4 4.6 6 6.4M19.6 4.6 18 6.4M12 2.4v1.8" />
  </>,
)
const Erupcion = lienzo(
  <>
    <rect {...R} x="3.6" y="3.6" width="16.8" height="16.8" rx="5.4" />
    <circle {...LLENO} cx="8.6" cy="9" r="1.3" />
    <circle {...LLENO} cx="14.6" cy="8" r="1" />
    <circle {...LLENO} cx="12" cy="12.6" r="1.5" />
    <circle {...LLENO} cx="16" cy="14.6" r="1.2" />
    <circle {...LLENO} cx="8.4" cy="15.6" r="1" />
  </>,
)
export const ICONO_SINTOMA: Record<Symptom, Icono> = {
  headache: DolorCabeza, nausea: Nauseas, dizziness: Mareo, visionChange: Vision, rash: Erupcion,
}

/** Paso de molestias: una silueta con el punto que duele. */
export const IconoMolestias = lienzo(
  <>
    <circle {...R} cx="10" cy="5.4" r="2.6" />
    <path {...R} d="M5 20.6v-5.2c0-2.8 2.2-5 5-5s5 2.2 5 5v5.2H5Z" />
    <path d="M18.6 4.4v4.4" />
    <circle {...LLENO} cx="18.6" cy="12" r="1.1" />
  </>,
)

// ── Controles ───────────────────────────────────────────────────────────────────
export const IconoHecho = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.8" />
    <path d="m8 12.4 2.7 2.7 5.3-5.6" />
  </>,
)
export const IconoSinMedir = lienzo(
  <>
    <circle {...R} cx="12" cy="12" r="8.8" />
    <path d="M8.4 12h7.2" />
  </>,
)
export const IconoPendiente = lienzo(<circle cx="12" cy="12" r="8.8" strokeDasharray="2.6 3.2" />)
export const IconoCrono = lienzo(
  <>
    <circle {...R} cx="12" cy="13.6" r="7.4" />
    <path d="M12 13.6V9.6M9.8 2.8h4.4M12 2.8v3.4" />
  </>,
)
export const IconoMenos = lienzo(<path d="M5.5 12h13" strokeWidth={2.4} />)
export const IconoMas = lienzo(<path d="M5.5 12h13M12 5.5v13" strokeWidth={2.4} />)
