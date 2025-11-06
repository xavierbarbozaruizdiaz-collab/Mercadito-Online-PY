'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Product = { 
  id: string; 
  title: string; 
  description: string | null; 
  price: number; 
  cover_url: string | null;
  condition: string;
  sale_type: string;
  category_id: string;
  created_at: string;
};

type Category = { id: string; name: string };

type FilterOptions = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  condition: string;
  saleType: string;
  sortBy: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'title_asc';
};

export default function ProductsListClient() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    condition: '',
    saleType: '',
    sortBy: 'date_desc'
  });

  // Cargar categorías
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (!error && data) {
        setCategories(data);
      }
    })();
  }, []);

  // Cargar productos con filtros
  useEffect(() => {
    loadProducts();
  }, [filters]);

  async function loadProducts() {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('products')
        .select(`
          id, 
          title, 
          description, 
          price, 
          cover_url,
          condition,
          sale_type,
          category_id,
          created_at
        `);

      // Filtro de búsqueda
      if (filters.search.trim()) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      // Filtro de categoría
      if (filters.category) {
        query = query.eq('category_id', filters.category);
      }

      // Filtro de precio mínimo
      if (filters.minPrice) {
        query = query.gte('price', Number(filters.minPrice));
      }

      // Filtro de precio máximo
      if (filters.maxPrice) {
        query = query.lte('price', Number(filters.maxPrice));
      }

      // Filtro de condición
      if (filters.condition) {
        query = query.eq('condition', filters.condition);
      }

      // Filtro de tipo de venta
      if (filters.saleType) {
        query = query.eq('sale_type', filters.saleType);
      }

      // Ordenamiento
      switch (filters.sortBy) {
        case 'price_asc':
          query = query.order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query.order('price', { ascending: false });
          break;
        case 'date_asc':
          query = query.order('created_at', { ascending: true });
          break;
        case 'date_desc':
          query = query.order('created_at', { ascending: false });
          break;
        case 'title_asc':
          query = query.order('title', { ascending: true });
          break;
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateFilter(key: keyof FilterOptions, value: string) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      condition: '',
      saleType: '',
      sortBy: 'date_desc'
    });
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== 'date_desc'
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header con búsqueda */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          {/* Búsqueda principal */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar productos..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 pl-10 sm:pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
              />
              <div className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base">
                🔍
              </div>
            </div>
          </div>

          {/* Ordenamiento */}
          <div className="sm:w-48">
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              <option value="date_desc">Más recientes</option>
              <option value="date_asc">Más antiguos</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="title_asc">Nombre A-Z</option>
            </select>
          </div>
        </div>

        {/* Filtros avanzados */}
        <div className="bg-white rounded-lg border p-3 sm:p-4">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="font-semibold text-gray-700 text-sm sm:text-base">Filtros</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
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

            {/* Precio mínimo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio mínimo</label>
              <input
                type="number"
                placeholder="0"
                value={filters.minPrice}
                onChange={(e) => updateFilter('minPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Precio máximo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio máximo</label>
              <input
                type="number"
                placeholder="Sin límite"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Condición */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
              <select
                value={filters.condition}
                onChange={(e) => updateFilter('condition', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las condiciones</option>
                <option value="nuevo">Nuevo</option>
                <option value="usado_como_nuevo">Usado como nuevo</option>
                <option value="usado">Usado</option>
              </select>
            </div>

            {/* Tipo de venta */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de venta</label>
              <select
                value={filters.saleType}
                onChange={(e) => updateFilter('saleType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los tipos</option>
                <option value="direct">Venta directa</option>
                <option value="auction">Subasta</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <b>Error:</b> {error}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-medium text-gray-600 mb-2">No se encontraron productos</h2>
          <p className="text-gray-500 mb-6">
            {hasActiveFilters 
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'No hay productos disponibles en este momento'
            }
          </p>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">
              {products.length} producto{products.length !== 1 ? 's' : ''} encontrado{products.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="group bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="relative overflow-hidden">
                  <img
                    src={product.cover_url ?? 'https://placehold.co/400x300?text=Producto'}
                    alt={product.title}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute top-2 left-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${
                      product.condition === 'nuevo' 
                        ? 'bg-green-500 text-white' 
                        : product.condition === 'usado_como_nuevo'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-600 text-white'
                    }`}>
                      {product.condition === 'nuevo' ? 'Nuevo' : 
                       product.condition === 'usado_como_nuevo' ? 'Usado como nuevo' : 'Usado'}
                    </span>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full shadow-sm ${
                      product.sale_type === 'auction' 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-blue-500 text-white'
                    }`}>
                      {product.sale_type === 'auction' ? '⚡ Subasta' : '💰 Directa'}
                    </span>
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                    {product.title}
                  </h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                    <p className="text-xl font-bold text-green-600">
                      {product.price.toLocaleString('es-PY')} <span className="text-sm font-normal text-gray-500">Gs.</span>
                    </p>
                    <a
                      href={`/products/${product.id}`}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm hover:shadow-md"
                    >
                      Ver detalles
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}