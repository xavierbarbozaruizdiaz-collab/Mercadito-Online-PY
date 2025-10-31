'use client';

// ============================================
// MERCADITO ONLINE PY - SEARCH PAGE
// Página de búsqueda avanzada de productos
// ============================================

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AdvancedSearch from '@/components/AdvancedSearch';

// ============================================
// COMPONENTE INTERNO
// ============================================

function SearchContent() {
  const searchParams = useSearchParams();
  
  // Obtener parámetros iniciales de la URL
  const initialQuery = searchParams.get('q') || '';
  const initialFilters = {
    category_id: searchParams.get('category') || '',
    min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    condition: searchParams.get('condition') || '',
    sale_type: searchParams.get('sale_type') || '',
    location: searchParams.get('location') || '',
    sort_by: searchParams.get('sort_by') || 'created_at',
    sort_order: searchParams.get('sort_order') || 'desc',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdvancedSearch
          initialQuery={initialQuery}
          initialFilters={initialFilters}
          showFilters={true}
          showSuggestions={true}
          showTrending={true}
          showRecent={true}
          maxSuggestions={8}
        />
      </div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando búsqueda...</p>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
