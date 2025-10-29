// ============================================
// MERCADITO ONLINE PY - NEXT.JS CONFIG
// Configuración optimizada para SEO y rendimiento
// ============================================

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración de imágenes
  images: {
    domains: [
      'hqdatzhliaordlsqtjea.supabase.co',
      'placehold.co',
      'images.unsplash.com',
      'via.placeholder.com',
    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Configuración de compresión
  compress: true,

  // Configuración de headers para SEO
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
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
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=86400',
          },
        ],
      },
    ];
  },

  // Configuración de redirecciones
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/tienda/:path*',
        destination: '/store/:path*',
        permanent: true,
      },
      {
        source: '/producto/:path*',
        destination: '/products/:path*',
        permanent: true,
      },
    ];
  },

  // Configuración de rewrites para URLs amigables
  async rewrites() {
    return [
      {
        source: '/api/sitemap',
        destination: '/api/sitemap.xml',
      },
    ];
  },

  // Configuración experimental
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },

  // Configuración de webpack
  webpack: (config, { dev, isServer }) => {
    // Optimizaciones para producción
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }

    return config;
  },

  // Configuración de output
  output: 'standalone',

  // Configuración de poweredByHeader
  poweredByHeader: false,

  // Configuración de trailingSlash
  trailingSlash: false,

  // Configuración de generateEtags
  generateEtags: true,
};

module.exports = nextConfig;
