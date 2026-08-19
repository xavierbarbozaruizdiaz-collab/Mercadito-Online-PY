// ============================================
// MERCADITO ONLINE PY - ROBOTS.TXT
// Configuración para crawlers
// ============================================

import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/config/site';

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
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
