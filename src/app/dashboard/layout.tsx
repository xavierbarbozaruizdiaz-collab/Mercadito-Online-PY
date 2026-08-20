// ============================================
// MERCADITO ONLINE PY - DASHBOARD LAYOUT
// El menú principal vive en DashboardSidebar (sin barra duplicada)
// ============================================

import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Mi cuenta | Mercadito Online PY',
    template: '%s | Mi cuenta | Mercadito Online PY',
  },
  description: 'Panel de vendedores y compradores en Mercadito Online PY',
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
  themeColor: '#22C55E',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
