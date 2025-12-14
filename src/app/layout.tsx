import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ToastProvider from "@/components/ui/ToastProvider";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import FooterWrapper from "@/components/FooterWrapper";
import HeaderWrapper from "@/components/HeaderWrapper";
import { SITE_URL } from "@/lib/config/site";
import MercaditoAssistantWidget from "@/components/MercaditoAssistantWidget";
import { getSiteSettings } from "@/lib/services/siteSettingsServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Genera metadata dinámica usando los settings del sitio
 * Esto permite que el nombre del sitio y descripción se actualicen desde el admin
 */
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  
  const siteName = settings.siteName || 'Mercadito Online PY';
  const title = `${siteName} - Marketplace de Paraguay`;
  const description = settings.siteDescription ?? 
    'El mejor marketplace de Paraguay. Compra y vende productos nuevos y usados de forma segura. Encuentra las mejores ofertas en tecnología, hogar, deportes y más.';

  return {
    title: {
      default: title,
      template: `%s | ${siteName}`,
    },
    description,
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
      siteName,
    ],
    authors: [{ name: siteName }],
    creator: siteName,
    publisher: siteName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: '/',
      languages: {
        'es-PY': '/',
      },
    },
    openGraph: {
      type: 'website',
      locale: 'es_PY',
      url: SITE_URL,
      siteName,
      title,
      description,
      images: [
        {
          url: '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: siteName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.jpg'],
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon.svg', type: 'image/svg+xml' },
        { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: [
        { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        { url: '/icons/apple-touch-icon-152x152.png', sizes: '152x152', type: 'image/png' },
        { url: '/icons/apple-touch-icon-167x167.png', sizes: '167x167', type: 'image/png' },
        { url: '/icons/apple-touch-icon-180x180.png', sizes: '180x180', type: 'image/png' },
      ],
    },
    manifest: '/manifest.json',
  };
}

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
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PQ8Q6JGW';

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* A) Inicializa dataLayer ANTES de GTM */}
        <Script
          id="gtm-datalayer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];`,
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

        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Deshabilitar preload automático problemático */}
        <meta name="next-head-count" content="0" />
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
            <AnalyticsProvider>
            {/* Header dinámico */}
            <HeaderWrapper />

            {/* Toast Provider */}
            <ToastProvider />

            {/* Contenido de cada página */}
            <div className="flex flex-col min-h-screen">
              <main className="flex-1">
                {children}
              </main>
              <FooterWrapper />
            </div>

            {/* Widget del Asistente - Disponible en toda la aplicación */}
            <MercaditoAssistantWidget />
            </AnalyticsProvider>

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