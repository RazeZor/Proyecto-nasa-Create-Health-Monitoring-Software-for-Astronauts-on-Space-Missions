/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true, // importa packages/engine sin copiarlo
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // La app llama a la API en su mismo origen (/vigia-api) y Next la reenvía desde el servidor: en la
  // red local basta con abrir el puerto 3000, sin CORS ni preflight de red privada.
  // Se resuelve al compilar: VIGIA_API_INTERNA debe estar definida en `next build`.
  // El modelo 3D (4 MB) no lleva huella en el nombre: el navegador lo reutiliza un día y lo revalida en segundo plano.
  async headers() {
    return [{ source: "/modelos/:archivo*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] }]
  },
  async rewrites() {
    const api = process.env.VIGIA_API_INTERNA || "http://127.0.0.1:8000"
    return [{ source: "/vigia-api/:ruta*", destination: `${api}/:ruta*` }]
  },
}

export default nextConfig
