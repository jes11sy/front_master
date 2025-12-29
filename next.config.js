/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone режим для Docker
  output: 'standalone',
  
  // Генерируем уникальный build ID для cache busting
  generateBuildId: async () => {
    return `build-${Date.now()}`
  },
  
  // Отключаем TypeScript проверки во время сборки для Docker
  typescript: {
    ignoreBuildErrors: true,
  },
  
  reactStrictMode: false,
  
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  
  // Оптимизация пакетов
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-slot', '@radix-ui/react-label', '@radix-ui/react-checkbox', '@radix-ui/react-select'],
  },
  
  // Turbopack конфигурация (пустая, чтобы использовать дефолтные настройки)
  turbopack: {},
  
  // Отключаем x-powered-by заголовок
  poweredByHeader: false,
  
  // Compression
  compress: true,
}

module.exports = nextConfig
