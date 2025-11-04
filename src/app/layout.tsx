
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import CartButton from "@/components/CartButton";
import UserMenu from "@/components/UserMenu";
import AuctionsNavLink from "@/components/AuctionsNavLink";
import RafflesNavLink from "@/components/RafflesNavLink";
import MobileMenu from "@/components/MobileMenu";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ToastProvider from "@/components/ui/ToastProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Gavel, Ticket } from "lucide-react";

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
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;
  const fbPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;

  return (
    <html lang="es">
      <head>
        {/* Google Tag Manager */}
        {gtmId && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                  })(window,document,'script','dataLayer','${gtmId}');
                `,
              }}
            />
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
              />
            </noscript>
          </>
        )}

        {/* Google Analytics 4 */}
        {gaId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}', {
                    page_path: window.location.pathname,
                    send_page_view: true
                  });
                `,
              }}
            />
          </>
        )}

        {/* Facebook Pixel */}
        {fbPixelId && (
          <>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${fbPixelId}');
                  fbq('track', 'PageView');
                `,
              }}
            />
            <noscript>
              <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1`}
                alt=""
              />
            </noscript>
          </>
        )}
      </head>
      <body className="antialiased">
        <ErrorBoundary>
          <ThemeProvider>
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
              {/* Menú móvil y Logo */}
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
                <MobileMenu />
                <Link href="/" className="flex items-center gap-1 sm:gap-2 min-w-0">
                  <span className="text-base sm:text-xl md:text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors truncate">
                    <span className="hidden md:inline">🛒 </span>
                    <span className="hidden sm:inline">Mercadito Online PY</span>
                    <span className="sm:hidden">Mercadito PY</span>
                  </span>
                </Link>
              </div>
              
              {/* Espacio central - Opciones disponibles (solo desktop) */}
              <div className="hidden md:flex flex-1 justify-center items-center gap-4">
                <AuctionsNavLink />
                <RafflesNavLink />
              </div>
              
              {/* Iconos de subastas/sorteos y acciones derecha juntos */}
              <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
                {/* Iconos en móvil */}
                <div className="md:hidden flex items-center gap-1">
                  <Link
                    href="/auctions"
                    className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label="Subastas"
                  >
                    <Gavel className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Link>
                  <Link
                    href="/raffles"
                    className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-gray-900 transition-colors"
                    aria-label="Sorteos"
                  >
                    <Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Link>
                </div>
                
                {/* Acciones derecha */}
                <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
                  <CartButton />
                  <UserMenu />
                </div>
              </div>
            </div>
          </div>
        </header>
        {children}
        <ToastProvider />
        {/* Service Worker deshabilitado y desregistrado agresivamente */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Ejecutar inmediatamente para desregistrar SW antes de cualquier otro código
              (function() {
                if ('serviceWorker' in navigator) {
                  // Desregistrar todos los Service Workers
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    // Solo log en desarrollo
                    if (window.location.hostname === 'localhost') {
                      console.log('[SW Cleanup] Desregistrando', registrations.length, 'Service Workers...');
                    }
                    for(let registration of registrations) {
                      registration.unregister().then(function(success) {
                        if (success && window.location.hostname === 'localhost') {
                          console.log('[SW Cleanup] Service Worker desregistrado correctamente');
                        }
                      });
                    }
                  }).catch(function(err) {
                    // Warnings se mantienen para debugging
                    console.warn('[SW Cleanup] Error al obtener registraciones:', err);
                  });
                  
                  // Limpiar todos los cachés
                  if ('caches' in window) {
                    caches.keys().then(function(cacheNames) {
                      if (window.location.hostname === 'localhost') {
                        console.log('[SW Cleanup] Eliminando', cacheNames.length, 'cachés...');
                      }
                      return Promise.allSettled(
                        cacheNames.map(function(cacheName) {
                          return caches.delete(cacheName);
                        })
                      );
                    }).then(function(results) {
                      const deleted = results.filter(r => r.status === 'fulfilled').length;
                      if (window.location.hostname === 'localhost') {
                        console.log('[SW Cleanup]', deleted, 'cachés eliminados');
                      }
                    }).catch(function(err) {
                      console.warn('[SW Cleanup] Error al limpiar cachés:', err);
                    });
                  }
                  
                      // Prevenir nuevos registros del SW
                  const originalRegister = navigator.serviceWorker.register;
                  navigator.serviceWorker.register = function() {
                    // Solo log en desarrollo
                    if (window.location.hostname === 'localhost') {
                      console.warn('[SW Cleanup] Intento de registro de SW bloqueado');
                    }
                    return Promise.reject(new Error('Service Worker está deshabilitado temporalmente'));
                  };
                }
                
                // Log consolidado cuando se montan los grupos de botones (solo en desarrollo)
                if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                  setTimeout(function() {
                    console.log('[BTN] Header/Login, Hero CTA, Card CTA -> montados');
                  }, 1000);
                }
              })();
            `,
          }}
        />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
