/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone режим для Docker
  output: 'standalone',
  
  // Отключаем ESLint и TypeScript проверки во время сборки для Docker
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  
  reactStrictMode: true,
  
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Оптимизация пакетов
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-slot', '@radix-ui/react-label', '@radix-ui/react-checkbox', '@radix-ui/react-select'],
  },
  
  // Отключаем x-powered-by заголовок
  poweredByHeader: false,
  
  // Compression
  compress: true,
}

module.exports = nextConfig
