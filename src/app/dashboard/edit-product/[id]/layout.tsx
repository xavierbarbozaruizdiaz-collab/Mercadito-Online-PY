// ============================================
// MERCADITO ONLINE PY - EDIT PRODUCT LAYOUT
// Layout específico para la página de editar producto
// ============================================

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Editar Producto | Dashboard | Mercadito Online PY',
  description: 'Edita tu producto en Mercadito Online PY',
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

export default function EditProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
