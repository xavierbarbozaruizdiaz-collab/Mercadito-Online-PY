import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
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

