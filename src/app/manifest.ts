// ============================================
// MERCADITO ONLINE PY - PWA MANIFEST
// Configuración de Progressive Web App
// ============================================

import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mercadito Online PY - Marketplace de Paraguay',
    short_name: 'Mercadito PY',
    description: 'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'es-PY',
    categories: ['shopping', 'business', 'lifestyle'],
    
    icons: [
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-128x128.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-152x152.png',
        sizes: '152x152',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-384x384.png',
        sizes: '384x384',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    
    shortcuts: [
      {
        name: 'Buscar productos',
        short_name: 'Buscar',
        description: 'Buscar productos en el marketplace',
        url: '/search',
        icons: [
          {
            src: '/icons/search-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Mi carrito',
        short_name: 'Carrito',
        description: 'Ver productos en mi carrito',
        url: '/cart',
        icons: [
          {
            src: '/icons/cart-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Mi perfil',
        short_name: 'Perfil',
        description: 'Ver mi perfil de usuario',
        url: '/dashboard',
        icons: [
          {
            src: '/icons/profile-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Tiendas',
        short_name: 'Tiendas',
        description: 'Explorar tiendas',
        url: '/stores',
        icons: [
          {
            src: '/icons/store-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
        ],
      },
    ],
    
    related_applications: [
      {
        platform: 'webapp',
        url: 'https://mercadito-online-py.vercel.app/manifest.json',
      },
    ],
    
    prefer_related_applications: false,
    
    // edge_side_panel: {
    //   preferred_width: 400,
    // },
    
    launch_handler: {
      client_mode: 'navigate-existing',
    },
  };
}
