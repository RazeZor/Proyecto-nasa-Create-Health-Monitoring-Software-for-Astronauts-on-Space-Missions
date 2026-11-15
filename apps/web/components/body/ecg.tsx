"use client"

import { useEffect, useRef } from "react"

const campana = (p: number, centro: number, ancho: number) => Math.exp(-((p - centro) ** 2) / (2 * ancho * ancho))
/** Forma PQRST de un latido en función de su fase (0..1). */
const onda = (p: number) =>
  0.12 * campana(p, 0.18, 0.03) - 0.13 * campana(p, 0.27, 0.008) + campana(p, 0.3, 0.012) - 0.24 * campana(p, 0.335, 0.01) + 0.28 * campana(p, 0.54, 0.045)

/**
 * Trazo de electrocardiograma que barre a los lpm indicados. Es una animación del ritmo, no una señal medida:
 * solo se mueve a la frecuencia real del dato. Sin dato (`lpm` null) queda la línea plana.
 */
export function Ecg({ lpm, className }: { lpm: number | null; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const ritmo = useRef(lpm)
  ritmo.current = lpm

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext("2d")
    if (!canvas || !g) return
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let muestras = new Float32Array(0)
    let cursor = 0
    let fase = 0
    let antes = performance.now()
    let cuadro = 0
    const pintar = (ahora: number) => {
      cuadro = requestAnimationFrame(pintar)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr)
      if (!w || !h) return
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        muestras = new Float32Array(w)
        cursor = 0
      }
      const dt = Math.min(0.05, (ahora - antes) / 1000)
      antes = ahora
      const pasos = quieto ? w : Math.max(1, Math.round(dt * w * 0.42)) // la pantalla se recorre en ~2,4 s
      for (let i = 0; i < pasos; i++) {
        const l = ritmo.current
        fase = (fase + (l ?? 0) / 60 / (w * 0.42)) % 1
        muestras[cursor] = l === null ? 0 : onda(fase)
        cursor = (cursor + 1) % w
      }
      g.clearRect(0, 0, w, h)
      g.lineWidth = 2 * dpr
      g.lineJoin = "round"
      g.strokeStyle = getComputedStyle(canvas).color
      const hueco = Math.round(w * 0.06)
      const y = (v: number) => h * 0.72 - v * h * 0.58
      g.beginPath()
      let trazando = false
      for (let x = 0; x < w; x++) {
        const d = (x - cursor + w) % w
        if (!quieto && d < hueco) {
          trazando = false
          continue
        }
        if (trazando) g.lineTo(x, y(muestras[x]))
        else g.moveTo(x, y(muestras[x]))
        trazando = true
      }
      g.stroke()
      if (!quieto) {
        const x = (cursor - 1 + w) % w
        g.fillStyle = g.strokeStyle
        g.beginPath()
        g.arc(x, y(muestras[x]), 3 * dpr, 0, Math.PI * 2)
        g.fill()
      }
      if (quieto) cancelAnimationFrame(cuadro)
    }
    cuadro = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(cuadro)
  }, [])

  return <canvas ref={ref} aria-hidden className={className} />
}
