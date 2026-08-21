import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Sharp carga binarios nativos en runtime. Debe quedar externo al bundle y
  // sus paquetes Linux deben copiarse a la función serverless de upload.
  serverExternalPackages: ['sharp'],
  outputFileTracingIncludes: {
    '/api/products/upload-images': [
      './node_modules/sharp/**/*',
      './node_modules/@img/sharp-linux-x64/**/*',
      './node_modules/@img/sharp-libvips-linux-x64/**/*',
    ],
  },
  webpack: (config, { isServer }) => {
    // Manejar módulos nativos de Tailwind v4 en Vercel
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Ignorar errores de módulos nativos durante el build
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@tailwindcss\/oxide/ },
    ];
    
    return config;
  },
  images: {
    // Configuración estándar de Next.js sin loader personalizado
    // Las imágenes de Supabase se manejan con unoptimized en los componentes
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Dominios de Supabase para imágenes del proyecto
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: 'hqdatzhliaordlsqtjea.supabase.co' },
      // Otros dominios comunes
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'via.placeholder.com' },
      { protocol: 'https', hostname: 'ae01.alicdn.com' },
      { protocol: 'https', hostname: 'ae02.alicdn.com' },
      { protocol: 'https', hostname: 'ae03.alicdn.com' },
      { protocol: 'https', hostname: 'ae04.alicdn.com' },
      { protocol: 'https', hostname: '**.alicdn.com' },
      { protocol: 'https', hostname: 'ae-pic-a1.aliexpress-media.com' },
      { protocol: 'https', hostname: '**.aliexpress-media.com' },
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Permitir imágenes sin optimización para Supabase
    unoptimized: false,
  },
  experimental: {
    optimizePackageImports: [],
  },
  // Configuración para optimizar preloads y reducir warnings
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Optimizar compilación y reducir warnings de preload
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Configuración de headers para optimizar carga
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
        ],
      },
    ];
  },
  // Redirects removido - Next.js maneja manifest.webmanifest automáticamente
  // async redirects() {
  //   return [
  //     {
  //       source: '/manifest.webmanifest',
  //       destination: '/manifest.json',
  //       permanent: true,
  //     },
  //   ];
  // },
};

export default nextConfig;

