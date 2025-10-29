// ============================================
// MERCADITO ONLINE PY - PERFORMANCE OPTIMIZATION
// Optimizaciones avanzadas para Core Web Vitals
// ============================================

import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ============================================
  // CONFIGURACIÓN DE RENDIMIENTO
  // ============================================
  
  // Compresión y optimización
  compress: true,
  poweredByHeader: false,
  
  // ============================================
  // OPTIMIZACIÓN DE IMÁGENES
  // ============================================
  images: {
    // Dominios permitidos
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
    
    // Formatos modernos
    formats: ['image/webp', 'image/avif'],
    
    // Tamaños optimizados
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    
    // Calidad optimizada
    quality: 85,
    
    // Lazy loading por defecto
    loader: 'default',
    
    // Configuración de carga
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 días
  },

  // ============================================
  // OPTIMIZACIÓN DE BUNDLE
  // ============================================
  webpack: (config, { dev, isServer }) => {
    // Optimizaciones para producción
    if (!dev && !isServer) {
      // Tree shaking mejorado
      config.optimization.usedExports = true;
      config.optimization.sideEffects = false;
      
      // Minificación avanzada
      config.optimization.minimize = true;
      
      // Code splitting optimizado
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // ============================================
  // HEADERS DE SEGURIDAD Y RENDIMIENTO
  // ============================================
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Seguridad
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          
          // Rendimiento
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // ============================================
  // REDIRECCIONES Y REWRITES
  // ============================================
  async redirects() {
    return [
      // Redirecciones SEO-friendly
      {
        source: '/dashboard',
        destination: '/dashboard/',
        permanent: true,
      },
      {
        source: '/admin',
        destination: '/admin/',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      // API routes internas
      {
        source: '/api/internal/:path*',
        destination: '/api/:path*',
      },
    ];
  },

  // ============================================
  // CONFIGURACIÓN EXPERIMENTAL
  // ============================================
  experimental: {
    // Optimizaciones de rendimiento
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    
    // Turbopack para desarrollo más rápido
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
    
    // Server components optimizados
    serverComponentsExternalPackages: ['sharp'],
  },

  // ============================================
  // CONFIGURACIÓN DE COMPILACIÓN
  // ============================================
  compiler: {
    // Eliminar console.log en producción
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // ============================================
  // CONFIGURACIÓN DE OUTPUT
  // ============================================
  output: 'standalone',
  
  // ============================================
  // CONFIGURACIÓN DE ENTORNO
  // ============================================
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // ============================================
  // CONFIGURACIÓN DE TYPESCRIPT
  // ============================================
  typescript: {
    // Ignorar errores de TypeScript en build
    ignoreBuildErrors: false,
  },

  // ============================================
  // CONFIGURACIÓN DE ESLINT
  // ============================================
  eslint: {
    // Ignorar errores de ESLint en build
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
