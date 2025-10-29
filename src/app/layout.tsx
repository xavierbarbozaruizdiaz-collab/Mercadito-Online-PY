
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import UserMenu from "@/components/UserMenu";
import CartButton from "@/components/CartButton";
import NotificationsPanel from "@/components/NotificationsPanel";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import Link from "next/link";

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
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
      </body>
    </html>
  );
}
