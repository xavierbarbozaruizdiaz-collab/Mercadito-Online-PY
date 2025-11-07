'use client';

// ============================================
// MERCADITO ONLINE PY - CATEGORY BUTTONS
// Botones de acceso rápido a categorías principales
// ============================================

import Link from 'next/link';
import { Store, Star, Heart } from 'lucide-react';

export default function CategoryButtons() {
  const enableProductsApi = process.env.NEXT_PUBLIC_ENABLE_PRODUCTS_API === 'true';
  const vitrinaHref = enableProductsApi ? '/products?showcase=true' : '/vitrina';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Botón Ver Tiendas - Morado */}
        <Link
          href="/stores"
          className="group relative flex items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md hover:shadow-xl transition-all hover:scale-105 min-h-[100px]"
        >
          <div className="flex-shrink-0">
            <Store className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              Ver Tiendas
            </h3>
            <p className="text-sm sm:text-base text-purple-100">
              Explora todas nuestras tiendas
            </p>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-colors" />
        </Link>

        {/* Botón Vitrina - Amarillo */}
        <Link
          href={vitrinaHref}
          prefetch={enableProductsApi}
          aria-disabled={!enableProductsApi}
          className="group relative flex items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-lg shadow-md hover:shadow-xl transition-all hover:scale-105 min-h-[100px]"
        >
          <div className="flex-shrink-0">
            <Star className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              Vitrina
            </h3>
            <p className="text-sm sm:text-base text-yellow-100">
              Productos destacados
            </p>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-colors" />
        </Link>

        {/* Botón Favoritas - Rojo */}
        <Link
          href="/favorites"
          className="group relative flex items-center gap-4 p-4 sm:p-6 bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow-md hover:shadow-xl transition-all hover:scale-105 min-h-[100px]"
        >
          <div className="flex-shrink-0">
            <Heart className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
              Favoritas
            </h3>
            <p className="text-sm sm:text-base text-red-100">
              Tus productos guardados
            </p>
          </div>
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-lg transition-colors" />
        </Link>
      </div>
    </div>
  );
}

