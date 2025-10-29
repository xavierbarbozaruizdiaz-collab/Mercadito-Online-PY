
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UserMenu from "@/components/UserMenu";
import CartButton from "@/components/CartButton";
import NotificationsPanel from "@/components/NotificationsPanel";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import OfflineIndicator from "@/components/OfflineIndicator";
import Link from "next/link";

// Sentry se carga automáticamente via instrumentation.ts

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3b82f6',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Mercadito Online PY" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Mercadito PY" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/icons/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#3b82f6" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="theme-color" content="#3b82f6" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167x167.png" />
        
        {/* Favicons */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Splash Screens */}
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-2048-2732.jpg" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1668-2388.jpg" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1536-2048.jpg" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1125-2436.jpg" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-1242-2688.jpg" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-750-1334.jpg" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
        <link rel="apple-touch-startup-image" href="/icons/apple-splash-828-1792.jpg" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AnalyticsProvider>
          {/* Header global */}
          <header className="flex items-center justify-between px-4 py-3 border-b bg-white sticky top-0 z-50">
            <Link href="/" className="text-lg sm:text-xl font-bold truncate hover:text-blue-600 transition-colors">
              🛒 Mercadito Online PY
            </Link>
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationsPanel />
              <CartButton />
              <UserMenu />
            </div>
          </header>

          {/* Contenido de cada página */}
          {children}
        </AnalyticsProvider>
        
        {/* Indicador de estado offline */}
        <OfflineIndicator />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
