import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Configuración de imágenes
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hqdatzhliaordlsqtjea.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
    ],
  },
  
  // Remover console.logs en producción (excepto error y warn)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { 
          exclude: ['error', 'warn'] // Mantener errores y warnings en producción
        } 
      : false,
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Scripts: unsafe-inline y unsafe-eval necesarios para Next.js (HMR, hot reload, etc.)
              // Nota: 'unsafe-eval' es requerido por Next.js en desarrollo y puede ser necesario en producción
              // dependiendo de la configuración de webpack y optimizaciones
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://vercel.live",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: https: blob:",
              "connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co",
              "frame-src 'none'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
              "upgrade-insecure-requests"
            ].join('; ')
          }
        ],
      },
    ];
  },
};

// Sentry está opcional - solo wrappear si está completamente configurado
// Para habilitarlo, descomenta las siguientes líneas y agrega NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, y SENTRY_PROJECT
// import { withSentryConfig } from "@sentry/nextjs";
// export default withSentryConfig(nextConfig, {
//   // Configuración de Sentry aquí
// });
export default nextConfig;
