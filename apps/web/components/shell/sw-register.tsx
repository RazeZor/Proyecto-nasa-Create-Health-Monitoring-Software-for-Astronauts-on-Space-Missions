"use client"

import { useEffect } from "react"
import { IDIOMA } from "@/lib/strings"

/** Registra el service worker (public/sw.js) para que la app abra sin enlace (solo en producción: en desarrollo una
 *  carcasa guardada escondería los cambios) y fija el idioma del documento. */
export function SwRegister() {
  useEffect(() => {
    document.documentElement.lang = IDIOMA // el HTML se sirve en español; el idioma se resuelve en el navegador
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js").catch(() => undefined)
  }, [])
  return null
}
