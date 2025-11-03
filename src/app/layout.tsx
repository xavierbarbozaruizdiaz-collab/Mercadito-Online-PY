
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import CartButton from "@/components/CartButton";
import UserMenu from "@/components/UserMenu";
import AuctionsNavLink from "@/components/AuctionsNavLink";
import MobileMenu from "@/components/MobileMenu";
import { ThemeProvider } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: {
    default: 'Mercadito Online PY - Marketplace de Paraguay',
    template: '%s | Mercadito Online PY',
  },
  description: 'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura. Encuentra las mejores ofertas en tecnología, hogar, deportes y más.',
  keywords: [
    'marketplace',
    'Paraguay',
    'comprar',
    'vender',
    'productos',
    'usados',
    'nuevos',
    'tecnología',
    'hogar',
    'deportes',
    'automóviles',
    'ropa',
    'accesorios',
    'Mercadito Online PY'
  ],
  authors: [{ name: 'Mercadito Online PY' }],
  creator: 'Mercadito Online PY',
  publisher: 'Mercadito Online PY',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://mercadito-online-py.vercel.app'),
  alternates: {
    canonical: '/',
    languages: {
      'es-PY': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_PY',
    url: 'https://mercadito-online-py.vercel.app',
    siteName: 'Mercadito Online PY',
    title: 'Mercadito Online PY - Marketplace de Paraguay',
    description: 'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mercadito Online PY - Marketplace de Paraguay',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercadito Online PY - Marketplace de Paraguay',
    description: 'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura.',
    images: ['/og-image.jpg'],
    creator: '@mercaditopy',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <ThemeProvider>
          <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-4">
              {/* Menú móvil y Logo */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <MobileMenu />
                <Link href="/" className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors">
                    🛒 Mercadito Online PY
                  </span>
                </Link>
              </div>
              
              {/* Espacio central - Opciones disponibles (solo desktop) */}
              <div className="hidden md:flex flex-1 justify-center items-center gap-4">
                <AuctionsNavLink />
              </div>
              
              {/* Acciones derecha */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <CartButton />
                <UserMenu />
              </div>
            </div>
          </div>
        </header>
        {children}
        {/* Service Worker deshabilitado y desregistrado agresivamente */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Ejecutar inmediatamente para desregistrar SW antes de cualquier otro código
              (function() {
                if ('serviceWorker' in navigator) {
                  // Desregistrar todos los Service Workers
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    console.log('[SW Cleanup] Desregistrando', registrations.length, 'Service Workers...');
                    for(let registration of registrations) {
                      registration.unregister().then(function(success) {
                        if (success) {
                          console.log('[SW Cleanup] Service Worker desregistrado correctamente');
                        }
                      });
                    }
                  }).catch(function(err) {
                    console.warn('[SW Cleanup] Error al obtener registraciones:', err);
                  });
                  
                  // Limpiar todos los cachés
                  if ('caches' in window) {
                    caches.keys().then(function(cacheNames) {
                      console.log('[SW Cleanup] Eliminando', cacheNames.length, 'cachés...');
                      return Promise.allSettled(
                        cacheNames.map(function(cacheName) {
                          return caches.delete(cacheName);
                        })
                      );
                    }).then(function(results) {
                      const deleted = results.filter(r => r.status === 'fulfilled').length;
                      console.log('[SW Cleanup]', deleted, 'cachés eliminados');
                    }).catch(function(err) {
                      console.warn('[SW Cleanup] Error al limpiar cachés:', err);
                    });
                  }
                  
                      // Prevenir nuevos registros del SW
                  const originalRegister = navigator.serviceWorker.register;
                  navigator.serviceWorker.register = function() {
                    console.warn('[SW Cleanup] Intento de registro de SW bloqueado');
                    return Promise.reject(new Error('Service Worker está deshabilitado temporalmente'));
                  };
                }
                
                // Log consolidado cuando se montan los grupos de botones
                setTimeout(function() {
                  console.log('[BTN] Header/Login, Hero CTA, Card CTA -> montados');
                }, 1000);
              })();
            `,
          }}
        />
        </ThemeProvider>
      </body>
    </html>
  );
}
