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
}

export default nextConfig
