import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import CartButton from "@/components/CartButton";
import MobileMenu from "@/components/MobileMenu";
import AuctionsNavLink from "@/components/AuctionsNavLink";
import RafflesNavLink from "@/components/RafflesNavLink";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ToastProvider from "@/components/ui/ToastProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Gavel, Ticket } from "lucide-react";
import Logo from "@/components/Logo";
import Footer from "@/components/Footer";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://mercadito-online-py.vercel.app'),
  alternates: {
    canonical: '/',
    languages: {
      'es-PY': '/',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'es_PY',
    url: process.env.NEXT_PUBLIC_SITE_URL || 'https://mercadito-online-py.vercel.app',
    siteName: 'Mercadito Online PY',
    title: 'Mercadito Online PY - Marketplace de Paraguay',
    description: 'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mercadito Online PY',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mercadito Online PY - Marketplace de Paraguay',
    description: 'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: [
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icons/apple-touch-icon-167x167.png', sizes: '167x167', type: 'image/png' },
      { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#000000',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fbPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PQ8Q6JGW';

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* A) Inicializa dataLayer ANTES de GTM */}
        <Script
          id="gtm-datalayer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
            `,
          }}
        />

        {/* B) Carga de GTM ÚNICO */}
        <Script
          id="gtm-init"
          strategy="afterInteractive"
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* C) Noscript */}
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        
        <ErrorBoundary>
          <ThemeProvider>
            {/* Header mejorado */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-md">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
                  {/* Menú móvil y Logo */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
                    <MobileMenu />
                    <Link 
                      href="/" 
                      className="flex items-center gap-2 sm:gap-3 min-w-0 group"
                    >
                      {/* Logo PWA - con fallback si no existe la imagen */}
                      <div className="relative">
                        <Logo />
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 rounded-full transition-colors"></div>
                      </div>
                      <span className="text-base sm:text-xl md:text-2xl font-bold text-blue-600 group-hover:text-blue-700 transition-colors truncate">
                        <span className="hidden sm:inline">Mercadito Online PY</span>
                        <span className="sm:hidden">Mercadito PY</span>
                      </span>
                    </Link>
                  </div>
                  
                  {/* Navegación central (solo desktop) */}
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
                        className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                        aria-label="Subastas"
                      >
                        <Gavel className="w-5 h-5 sm:w-6 sm:h-6" />
                      </Link>
                      <Link
                        href="/raffles"
                        className="flex items-center justify-center p-2 min-h-[44px] min-w-[44px] text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-all"
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

            {/* Toast Provider */}
            <ToastProvider />

            {/* Contenido de cada página */}
            <div className="flex flex-col min-h-screen">
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>

            {/* Service Worker - Desregistro agresivo */}
            <Script
              id="sw-cleanup"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function(registrations) {
                      for(let registration of registrations) {
                        registration.unregister();
                      }
                    });
                    caches.keys().then(function(names) {
                      for (let name of names) {
                        caches.delete(name);
                      }
                    });
                  }
                `,
              }}
            />
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
