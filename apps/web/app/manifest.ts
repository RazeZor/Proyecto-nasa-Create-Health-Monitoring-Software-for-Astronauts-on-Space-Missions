import type { MetadataRoute } from "next"

/** Manifiesto de la aplicación web progresiva: instalable en la tableta de a bordo y utilizable sin enlace. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VIGÍA",
    short_name: "VIGÍA",
    description: "Crew self-health monitor for long missions with communication delay. Decision support, not a medical device.",
    start_url: "/",
    display: "standalone",
    background_color: "#0B1020",
    theme_color: "#0B1020",
    lang: "es", // el manifiesto es estático; el idioma real de la interfaz se resuelve en el navegador (sw-register.tsx)
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icono-app-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icono-app-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono-app-180.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
