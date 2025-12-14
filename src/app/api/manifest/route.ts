// ============================================
// MERCADITO ONLINE PY - MANIFEST API ROUTE
// Route handler para servir manifest en formato .webmanifest
// Algunos navegadores buscan .webmanifest por defecto
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config/site';

/**
 * Genera el manifest en formato JSON
 * Esto es idéntico al manifest.ts pero servido como API route
 */
function generateManifest(): MetadataRoute.Manifest {
  return {
    name: 'Mercadito Online PY - Marketplace de Paraguay',
    short_name: 'Mercadito PY',
    description:
      'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es-PY',
    categories: ['shopping', 'business', 'lifestyle'],

    icons: [
      // Favicons (para navegadores)
      {
        src: '/icons/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },

      // Íconos PWA principales
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },

      // Íconos PWA maskable
      {
        src: '/icons/maskable-icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/maskable-icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },

      // Íconos adicionales
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'any',
      },
    ],

    shortcuts: [],

    related_applications: [
      {
        platform: 'webapp',
        url: `${SITE_URL}/manifest.json`,
      },
    ],

    prefer_related_applications: false,

    launch_handler: {
      client_mode: 'navigate-existing',
    },
  };
}

export async function GET(request: NextRequest) {
  const manifest = generateManifest();
  
  return NextResponse.json(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}




