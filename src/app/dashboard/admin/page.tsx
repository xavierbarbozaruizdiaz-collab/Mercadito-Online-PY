'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Store, Users, Settings, BarChart3, Package, ShoppingCart, FileText, Bell, Image } from 'lucide-react';

export default function DashboardAdminPage() {
  const router = useRouter();

  // Redirigir a /admin si el usuario es admin
  useEffect(() => {
    // Pequeño delay para evitar loops
    const timer = setTimeout(() => {
      router.push('/admin');
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            Panel de Administración
          </h1>
          <p className="text-gray-600 mt-2">Redirigiendo al panel de administración...</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/stores"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Store className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tiendas</h3>
            <p className="text-gray-600 text-sm">Gestionar tiendas y vendedores</p>
          </Link>

          <Link
            href="/admin/users"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Users className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Usuarios</h3>
            <p className="text-gray-600 text-sm">Gestionar usuarios y permisos</p>
          </Link>

          <Link
            href="/dashboard/admin/hero"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Image className="w-8 h-8 text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Hero Images</h3>
            <p className="text-gray-600 text-sm">Gestionar imágenes del hero</p>
          </Link>

          <Link
            href="/admin/categories"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Package className="w-8 h-8 text-orange-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Categorías</h3>
            <p className="text-gray-600 text-sm">Gestionar categorías de productos</p>
          </Link>

          <Link
            href="/admin/orders"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <ShoppingCart className="w-8 h-8 text-red-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Órdenes</h3>
            <p className="text-gray-600 text-sm">Ver y gestionar todas las órdenes</p>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
          >
            <Settings className="w-8 h-8 text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Configuración</h3>
            <p className="text-gray-600 text-sm">Configuración general del sistema</p>
          </Link>
        </div>
      </div>
    </div>
  );
}











