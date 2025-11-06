// ============================================
// MERCADITO ONLINE PY - NEW PRODUCT LAYOUT
// Layout específico para la página de nuevo producto
// ============================================

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Nuevo Producto | Dashboard | Mercadito Online PY',
  description: 'Agrega un nuevo producto a tu tienda en Mercadito Online PY',
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#3b82f6',
};

export default function NewProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
