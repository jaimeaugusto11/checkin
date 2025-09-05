/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '4mb'
    }
  },
   eslint: {
    // ⚠️ AVISO: Isso desativa o ESLint no build
    ignoreDuringBuilds: true,
  },
   typescript: {
    // ⚠️ Ignora erros de TypeScript no build
    ignoreBuildErrors: true,
  },
}
export default nextConfig
