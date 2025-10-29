// ============================================
// MERCADITO ONLINE PY - DASHBOARD LAYOUT
// Layout específico para el dashboard
// ============================================

import type { Metadata, Viewport } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: {
    default: 'Dashboard | Mercadito Online PY',
    template: '%s | Dashboard | Mercadito Online PY',
  },
  description: 'Panel de control para vendedores en Mercadito Online PY',
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header del Dashboard */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                📊 Dashboard
              </Link>
              <nav className="hidden md:flex space-x-8">
                <Link 
                  href="/dashboard" 
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Resumen
                </Link>
                <Link 
                  href="/dashboard/new-product" 
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Nuevo Producto
                </Link>
                <Link 
                  href="/dashboard/edit-product" 
                  className="text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Editar Productos
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                ← Volver al sitio
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
