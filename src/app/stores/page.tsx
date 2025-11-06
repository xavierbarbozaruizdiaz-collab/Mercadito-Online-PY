// ============================================
// MERCADITO ONLINE PY - STORES PAGE
// Página para listar todas las tiendas con filtros
// ============================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { MapPin, Store, Star, Package } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
  seller?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface Category {
  id: string;
  name: string;
}

// Departamentos de Paraguay
const DEPARTMENTS = [
  'Asunción',
  'Alto Paraguay',
  'Alto Paraná',
  'Amambay',
  'Boquerón',
  'Caaguazú',
  'Caazapá',
  'Canindeyú',
  'Central',
  'Concepción',
  'Cordillera',
  'Guairá',
  'Itapúa',
  'Misiones',
  'Ñeembucú',
  'Paraguarí',
  'Presidente Hayes',
  'San Pedro',
];

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    department: '',
    category: '',
    location: '',
    search: '',
  });
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function loadCategories() {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name');
      
      if (!error && data) {
        setCategories(data);
      }
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  }

  async function loadStores() {
    setLoading(true);
    setError(null);

    try {
      // Primero verificar si hay tiendas sin filtro para debugging
      const { count: totalCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true });
      
      console.log('🔍 Total de tiendas en BD:', totalCount);

      const { count: activeCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
      
      console.log('✅ Tiendas activas:', activeCount);

      let query = supabase
        .from('stores')
        .select(`
          id,
          name,
          slug,
          description,
          location,
          logo_url,
          cover_image_url,
          is_active,
          seller_id,
          created_at
        `)
        .eq('is_active', true);

      // Filtro de búsqueda
      if (filters.search.trim()) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Filtro de departamento (usar el nuevo campo structured)
      if (filters.department) {
        query = query.ilike('department', `%${filters.department}%`);
      }

      // Filtro de ubicación (texto libre - buscar en location antigua o city)
      if (filters.location.trim()) {
        query = query.or(`location.ilike.%${filters.location}%,city.ilike.%${filters.location}%,neighborhood.ilike.%${filters.location}%`);
      }

      // Filtro de categoría (por category_ids de la tienda)
      if (filters.category) {
        query = query.contains('category_ids', [filters.category]);
      }

      // Detectar si hay búsqueda activa
      const hasActiveSearch = filters.search.trim() !== '' || 
                               filters.department !== '' || 
                               filters.location.trim() !== '' ||
                               filters.category !== '';
      
      // Si no hay búsqueda activa, no aplicar orden (se mezclará aleatoriamente después)
      const { data: storesData, error: queryError } = hasActiveSearch 
        ? await query.order('created_at', { ascending: false })
        : await query;

      if (queryError) {
        console.error('❌ Error en consulta de tiendas:', queryError);
        throw queryError;
      }

      console.log('📦 Tiendas encontradas:', storesData?.length || 0);

      // Si hay stores, obtener información de sellers por separado
      if (storesData && storesData.length > 0) {
        const sellerIds = [...new Set((storesData as any[]).map((s: any) => s.seller_id).filter(Boolean))] as string[];
        
        let sellersMap: Record<string, any> = {};
        if (sellerIds.length > 0) {
          try {
            const { data: sellersData, error: sellersError } = await supabase
              .from('profiles')
              .select('id, first_name, last_name')
              .in('id', sellerIds);
            
            // Si hay error, simplemente continuar sin sellers (no crítico)
            if (!sellersError && sellersData) {
              sellersMap = (sellersData as any[]).reduce((acc: Record<string, any>, seller: any) => {
                acc[seller.id] = seller;
                return acc;
              }, {} as Record<string, any>);
            }
          } catch (sellersErr) {
            // Si falla, continuar sin sellers - no es crítico
            console.warn('No se pudo cargar información de vendedores:', sellersErr);
          }
        }

        const enrichedStores = (storesData as any[]).map((store: any) => ({
          ...store,
          seller: store.seller_id ? (sellersMap[store.seller_id] || null) : null,
        }));

        // Mezclar aleatoriamente si no hay búsqueda activa
        if (!hasActiveSearch) {
          // Algoritmo Fisher-Yates para mezclar aleatoriamente
          for (let i = enrichedStores.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [enrichedStores[i], enrichedStores[j]] = [enrichedStores[j], enrichedStores[i]];
          }
        }

        setStores(enrichedStores as Store[]);
      } else {
        setStores([]);
      }
    } catch (err: any) {
      console.error('Error loading stores:', err);
      setError(err.message || 'Error al cargar tiendas');
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key: string, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      department: '',
      category: '',
      location: '',
      search: '',
    });
  }

  const hasActiveFilters = Object.values(filters).some(value => value !== '');

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            🏪 Tiendas
          </h1>
          <p className="text-gray-600">
            Descubre todas las tiendas disponibles en Mercadito Online PY
          </p>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="bg-white rounded-lg border p-4 sm:p-6 mb-6">
          {/* Búsqueda */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar tiendas..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Filtros - Acordeón */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-blue-600 transition-colors"
              >
                <span>Filtros</span>
                <span className={`transform transition-transform ${filtersOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 transition-all duration-300 overflow-hidden ${
              filtersOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 hidden'
            }`}>
              {/* Departamento */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Departamento
                </label>
                <select
                  value={filters.department}
                  onChange={(e) => updateFilter('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los departamentos</option>
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría
                </label>
                <select
                  value={filters.category}
                  onChange={(e) => updateFilter('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ubicación
                </label>
                <input
                  type="text"
                  placeholder="Ciudad, barrio..."
                  value={filters.location}
                  onChange={(e) => updateFilter('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg">
            <b>Error:</b> {error}
          </div>
        ) : stores.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏪</div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">
              No se encontraron tiendas
            </h2>
            <p className="text-gray-500 mb-4">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay tiendas disponibles en este momento'}
            </p>
            {!hasActiveFilters && (
              <p className="text-sm text-gray-400">
                Las tiendas deben ser aprobadas por un administrador para aparecer aquí.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                {stores.length} tienda{stores.length !== 1 ? 's' : ''} encontrada{stores.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 sm:gap-6">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="flex flex-col items-center hover:opacity-80 transition-opacity"
                >
                  {/* Avatar circular */}
                  <div className="mb-2 sm:mb-3">
                    {store.logo_url ? (
                      <img
                        src={store.logo_url}
                        alt={store.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-purple-100 flex items-center justify-center">
                        <Store className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-purple-600" />
                      </div>
                    )}
                  </div>

                  {/* Nombre de la tienda */}
                  <h3 className="font-semibold text-xs sm:text-sm text-gray-900 text-center truncate w-full line-clamp-2">
                    {store.name}
                  </h3>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}




