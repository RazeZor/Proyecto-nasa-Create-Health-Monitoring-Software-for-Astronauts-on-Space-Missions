/**
 * Iconos e ilustración de la pantalla Dispositivo, con el lenguaje de `components/shared/iconos.tsx`:
 * rejilla de 24 px, trazo redondeado de 1,7 y relleno suave del mismo color (duotono), todo en `currentColor`.
 */
import type { SVGProps } from "react"
import type { DeviceState } from "@/lib/types"
import { cn } from "@/lib/utils"

type Icono = (p: SVGProps<SVGSVGElement>) => React.ReactElement

const lienzo = (hijos: React.ReactNode): Icono =>
  function IconoDispositivo(p) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
        {hijos}
      </svg>
    )
  }
const R = { fill: "currentColor", fillOpacity: 0.2 } as const
const LLENO = { fill: "currentColor", stroke: "none" } as const

/** Simulador: una onda dentro de un marco punteado (señal que no viene de un sensor). */
export const IconoSimulador = lienzo(
  <>
    <rect {...R} x="3.4" y="5.4" width="17.2" height="13.2" rx="3.2" strokeDasharray="2.6 2.6" />
    <path d="M6.6 12h2.2l1.4-3 2.4 6 1.6-3h3.2" />
  </>,
)
/** Tolerancia al movimiento: el reloj y las marcas de sacudida a los lados. */
export const IconoMovimiento = lienzo(
  <>
    <rect {...R} x="8" y="6.6" width="8" height="10.8" rx="2.6" />
    <path d="M10 6.6 10.4 4h3.2l.4 2.6M10 17.4l.4 2.6h3.2l.4-2.6" />
    <path d="M4.8 9.4c-1 1.6-1 3.6 0 5.2M19.2 9.4c1 1.6 1 3.6 0 5.2" />
  </>,
)
export const IconoDescarga = lienzo(
  <>
    <path {...R} d="M4.4 14.6v3.6c0 .8.6 1.4 1.4 1.4h12.4c.8 0 1.4-.6 1.4-1.4v-3.6H4.4Z" />
    <path d="M12 4v10.2M8.2 10.6l3.8 3.8 3.8-3.8" />
  </>,
)
export const IconoTripulacion = lienzo(
  <>
    <circle {...R} cx="8.6" cy="8.4" r="3" />
    <path {...R} d="M3 19.4c0-3.2 2.4-5.4 5.6-5.4s5.6 2.2 5.6 5.4H3Z" />
    <path d="M15.4 5.6a3 3 0 0 1 0 5.6M17 14.4c2.4.6 4 2.5 4 5" />
  </>,
)
/** Chequeo guiado: cronómetro. */
export const IconoChequeo = lienzo(
  <>
    <circle {...R} cx="12" cy="13.4" r="7.4" />
    <path d="M12 13.4V9.4M9.8 3h4.4M12 3v3M18.4 6.6l1.2-1.2" />
  </>,
)
export const IconoPunto = lienzo(<circle {...LLENO} cx="12" cy="12" r="3.4" />)

const COLOR: Record<DeviceState, string> = {
  disconnected: "text-muted-foreground",
  connecting: "text-foreground",
  connected: "text-status-ok",
  lost: "text-status-act",
}

/**
 * El reloj dibujado: la esfera cuenta el estado sin leer nada. Apagado (línea plana), buscando (arco que gira
 * y ondas), midiendo (trazo de pulso que se dibuja) y señal perdida (trazo roto y aviso).
 */
export function RelojIlustracion({ estado, simulando = false, className }: { estado: DeviceState; simulando?: boolean; className?: string }) {
  const trazo = "M38 82h9l5-13 8 27 6-19 4 5h12"
  return (
    <svg viewBox="0 0 120 160" fill="none" stroke="currentColor" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("transition-colors duration-300", COLOR[estado], className)}>
      <style>{`
        @keyframes reloj-trazo { 0% { stroke-dashoffset: 120; } 55%, 100% { stroke-dashoffset: 0; } }
        @keyframes reloj-onda { 0% { opacity: 0; } 35% { opacity: 0.9; } 100% { opacity: 0; } }
        @keyframes reloj-giro { to { transform: rotate(360deg); } }
        .reloj-trazo { stroke-dasharray: 120; animation: reloj-trazo 1.4s ease-out infinite; }
        .reloj-onda { animation: reloj-onda 1.5s ease-out infinite; }
        .reloj-giro { transform-origin: 60px 80px; animation: reloj-giro 1.3s linear infinite; }
      `}</style>
      {/* correas */}
      <path fill="currentColor" fillOpacity={0.12} d="M44 44 47 12c.3-3 2-4.6 4.8-4.6h16.4c2.800 0 4.500 1.600 4.800 4.600L76 44" />
      <path fill="currentColor" fillOpacity={0.12} d="M44 116l3 32c.3 3 2 4.600 4.800 4.600h16.400c2.800 0 4.500-1.600 4.800-4.600l3-32" />
      {/* caja redonda, bisel y botones */}
      <circle cx="60" cy="80" r="40" fill="currentColor" fillOpacity={0.14} />
      <circle cx="60" cy="80" r="31" strokeWidth={2} opacity={0.45} />
      <path d="M100.600 68.500l3.400-1.400M102.800 86l3.600.4" strokeWidth={4.4} />

      {estado === "disconnected" && !simulando && <path d="M40 82h40" strokeDasharray="1 8" opacity={0.8} />}
      {estado === "disconnected" && simulando && <path d={trazo} strokeDasharray="5 5" strokeWidth={3} />}
      {estado === "connecting" && (
        <>
          <path className="reloj-giro" d="M60 44.500a35.500 35.500 0 0 1 35.500 35.500" strokeWidth={4} />
          {[46, 60, 74].map((x, i) => (
            <circle key={x} className="reloj-onda" style={{ animationDelay: `${i * 0.25}s` }} cx={x} cy="80" r="3.600" fill="currentColor" stroke="none" />
          ))}
        </>
      )}
      {estado === "connected" && (
        <>
          <path d={trazo} opacity={0.25} />
          <path className="reloj-trazo" d={trazo} />
        </>
      )}
      {estado === "lost" && (
        <>
          <path d="M38 82h9l5-13 5 17" />
          <path d="M66 82h14" strokeDasharray="1 7" />
          <circle cx="94" cy="46" r="13" className="fill-card" strokeWidth={3} />
          <path d="M94 39.500v7.500" strokeWidth={3.400} />
          <circle cx="94" cy="52.400" r="2" fill="currentColor" stroke="none" />
        </>
      )}
    </svg>
  )
}
