// ============================================
// MERCADITO ONLINE PY - ROBOTS.TXT
// Configuración para crawlers
// ============================================

import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/dashboard/',
        '/chat/',
        '/api/',
        '/auth/',
        '/checkout/',
        '/cart/',
      ],
    },
    sitemap: 'https://mercadito-online-py.vercel.app/sitemap.xml',
  };
}
