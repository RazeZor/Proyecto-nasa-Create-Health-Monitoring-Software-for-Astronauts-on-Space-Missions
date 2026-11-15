/* Service worker de VIGÍA: deja la aplicación disponible sin enlace (informe §4.2, "todo funciona sin enlace").
 * - Carcasa (HTML de cada pantalla y sus recursos de /_next/static): se guarda al instalar.
 * - Navegación: red primero para tomar el último despliegue; sin red, la copia guardada.
 * - Recursos con huella (/_next/static): caché primero, son inmutables.
 * - La API (/vigia-api) no se intercepta: la app guarda su propia copia del catálogo y su cola de envíos. */
const CACHE = "vigia-carcasa-v4"
// Recursos que la carcasa necesita y no llevan huella: el modelo anatómico del cuerpo 3D.
const RECURSOS = ["/modelos/cuerpo.glb"]
// Una por rol y pantalla (lib/roles.ts: SECCIONES): si cambian las rutas, cámbialas aquí y sube CACHE.
const PANTALLAS = [
  "/", "/astronauta", "/astronauta/check-in", "/astronauta/trends",
  "/astronauta/environment", "/astronauta/alerts", "/astronauta/reports", "/astronauta/device",
  "/astronauta/about", "/oficial", "/oficial/body", "/oficial/alerts", "/oficial/environment",
  "/oficial/device", "/oficial/about", "/medico", "/medico/body", "/medico/reports",
  "/medico/alerts", "/medico/environment", "/medico/about",
]

async function guardarPantalla(cache, ruta) {
  const res = await fetch(ruta, { cache: "no-store" })
  if (!res.ok) return
  await cache.put(ruta, res.clone())
  const html = await res.text()
  const recursos = [...new Set(html.match(/\/_next\/static\/[^"'\)\s<>]+/g) ?? [])]
  await Promise.all(recursos.map((r) => cache.add(r).catch(() => undefined)))
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => Promise.all([
      ...PANTALLAS.map((p) => guardarPantalla(cache, p).catch(() => undefined)),
      ...RECURSOS.map((r) => cache.add(r).catch(() => undefined)),
    ])).then(() => self.skipWaiting()),
  )
})

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((c) => c !== CACHE).map((c) => caches.delete(c)))).then(() => self.clients.claim()),
  )
})

self.addEventListener("fetch", (e) => {
  const req = e.request
  const url = new URL(req.url)
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/vigia-api")) return

  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(req).then((guardado) => guardado ?? fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
        return res
      })),
    )
    return
  }

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then((res) => {
        if (res.ok) caches.open(CACHE).then((c) => c.put(url.pathname, res.clone()))
        return res
      }).catch(() => caches.match(url.pathname).then((guardado) => guardado ?? caches.match("/"))),
    )
    return
  }

  // Datos de navegación interna de Next (RSC) y otros recursos: red; si falla, lo guardado. Sin copia, Next
  // recurre a una navegación completa, que sí está en la carcasa.
  if (url.searchParams.has("_rsc") || req.headers.get("RSC")) return
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()))
      return res
    }).catch(() => caches.match(req).then((guardado) => guardado ?? Response.error())),
  )
})
