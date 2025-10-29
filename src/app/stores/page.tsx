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
  const [filtersOpen, setFiltersOpen] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadStores();
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
          created_at,
          seller:profiles!stores_seller_id_fkey(id, first_name, last_name)
        `)
        .eq('is_active', true);

      // Filtro de búsqueda
      if (filters.search.trim()) {
        query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Filtro de departamento
      if (filters.department) {
        query = query.ilike('location', `%${filters.department}%`);
      }

      // Filtro de ubicación (texto libre)
      if (filters.location.trim()) {
        query = query.ilike('location', `%${filters.location}%`);
      }

      // TODO: Filtro de categoría (requiere join con productos)
      // Por ahora se omite hasta tener mejor estructura

      const { data, error: queryError } = await query.order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      setStores(data || []);
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
            <p className="text-gray-500">
              {hasActiveFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'No hay tiendas disponibles en este momento'}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-gray-600">
                {stores.length} tienda{stores.length !== 1 ? 's' : ''} encontrada{stores.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  href={`/store/${store.slug}`}
                  className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="relative h-40">
                    {store.cover_image_url ? (
                      <img
                        src={store.cover_image_url}
                        alt={store.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center">
                        <Store className="w-16 h-16 text-white opacity-50" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      {store.logo_url ? (
                        <img
                          src={store.logo_url}
                          alt={store.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Store className="w-6 h-6 text-purple-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg text-gray-900 truncate">
                          {store.name}
                        </h3>
                        {store.location && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span className="truncate">{store.location}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {store.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {store.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-sm text-gray-500">
                        Ver tienda →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}

