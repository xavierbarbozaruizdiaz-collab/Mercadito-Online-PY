// ============================================
// MERCADITO ONLINE PY - OFFLINE PAGE
// Página mostrada cuando no hay conexión
// ============================================

'use client';

import Link from 'next/link';
import { WifiOff, RefreshCw, Home, Search, Store } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Icono */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <WifiOff className="w-8 h-8 text-red-600" />
        </div>
        
        {/* Título */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Sin conexión a internet
        </h1>
        
        {/* Descripción */}
        <p className="text-gray-600 mb-8">
          Parece que no tienes conexión a internet. Algunas funciones pueden no estar disponibles.
        </p>
        
        {/* Botón de reintentar */}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-6 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" />
          Reintentar conexión
        </button>
        
        {/* Enlaces rápidos */}
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-4">
            Funciones disponibles offline:
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/"
              className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Inicio</span>
            </Link>
            
            <Link
              href="/search"
              className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Search className="w-4 h-4" />
              <span className="text-sm">Buscar</span>
            </Link>
            
            <Link
              href="/stores"
              className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span className="text-sm">Tiendas</span>
            </Link>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-sm">Recargar</span>
            </button>
          </div>
        </div>
        
        {/* Información adicional */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Mercadito Online PY funciona mejor con conexión a internet.
            <br />
            Algunas funciones están disponibles offline.
          </p>
        </div>
      </div>
    </div>
  );
}
