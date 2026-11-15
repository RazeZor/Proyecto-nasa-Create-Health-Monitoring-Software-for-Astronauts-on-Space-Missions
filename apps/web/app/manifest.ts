import type { MetadataRoute } from "next"

/** Manifiesto de la aplicación web progresiva: instalable en la tableta de a bordo y utilizable sin enlace. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VIGÍA",
    short_name: "VIGÍA",
    description: "Crew self-health monitor for long missions with communication delay. Decision support, not a medical device.",
    start_url: "/",
    display: "standalone",
    background_color: "#11161f",
    theme_color: "#11161f",
    lang: "es",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  }
}
