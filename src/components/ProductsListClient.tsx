'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import SearchBar from '@/components/SearchBar';
import AuctionTimer from '@/components/auction/AuctionTimer';
import { Clock, Users, Gavel } from 'lucide-react';

type Product = { 
  id: string; 
  title: string; 
  description: string | null; 
  price: number; 
  image_url: string | null;
  condition: string;
  sale_type: string;
  category_id: string;
  seller_id: string;
  store_id: string | null;
  created_at: string;
  // Campos de subasta
  auction_status?: 'scheduled' | 'active' | 'ended' | 'cancelled';
  auction_start_at?: string;
  auction_end_at?: string;
  current_bid?: number;
  total_bids?: number;
  seller?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    username: string | null;
  } | null;
  store?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

type Category = { id: string; name: string };

type FilterOptions = {
  search: string;
  category: string;
  minPrice: string;
  maxPrice: string;
  condition: string;
  saleType: string;
  auctionFilter: '' | 'active' | 'ending_soon';
  sortBy: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc' | 'title_asc' | 'auction_ending' | 'auction_bids';
};

export default function ProductsListClient() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: searchParams?.get('q') || '',
    category: '',
    minPrice: '',
    maxPrice: '',
    condition: '',
    saleType: '',
    auctionFilter: '',
    sortBy: 'date_desc'
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [vehicleFields, setVehicleFields] = useState({
    marca: '',
    modelo: '',
    año: '',
    kilometraje: '',
    color: '',
    documentacion: ''
  });
  
  // Actualizar búsqueda cuando cambia la URL
  useEffect(() => {
    const urlQuery = searchParams?.get('q') || '';
    // Solo actualizar si realmente cambió para evitar loops
    if (urlQuery !== filters.search && urlQuery !== undefined) {
      setFilters(prev => ({ ...prev, search: urlQuery }));
    }
  }, [searchParams]); // Remover filters.search de dependencias para evitar loops

  // Cargar categorías con manejo de errores mejorado
  useEffect(() => {
    let mounted = true;
    let retries = 0;
    const maxRetries = 3;

    const loadCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('id, name')
          .order('name', { ascending: true });
        
        if (error) {
          console.error('Error loading categories:', error);
          // Si es error 500, reintentar hasta 3 veces
          if (error.code === 'PGRST500' || error.message?.includes('500') || error.message?.includes('internal')) {
            if (retries < maxRetries && mounted) {
              retries++;
              setTimeout(loadCategories, 1000 * retries); // Backoff exponencial
              return;
            }
          }
          // Si es otro error o ya se intentó 3 veces, continuar sin categorías
          return;
        }
        
        if (mounted && data) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Unexpected error loading categories:', err);
        // Continuar sin categorías, no bloquear la app
      }
    };

    // Esperar un poco para asegurar que Supabase está inicializado
    const timer = setTimeout(loadCategories, 100);
    
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  // Cargar productos con filtros
  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => {
      if (mounted) {
        loadProducts();
      }
    }, 100); // Pequeño delay para evitar múltiples llamadas
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [filters]);

  async function loadProducts() {
    setLoading(true);
    setError(null);

    // Timeout de seguridad: si después de 30 segundos no hay respuesta, mostrar error
    const timeoutId = setTimeout(() => {
      setError('⏱️ Tiempo de espera agotado. Por favor recarga la página.');
      setLoading(false);
    }, 30000);

    try {
      // Esperar un poco para asegurar que la sesión de Supabase está lista
      // Esto ayuda a evitar errores en la primera carga
      await new Promise(resolve => setTimeout(resolve, 50));

      // Query básica sin joins complejos para evitar 400
      // Obtenemos seller/store en queries separadas después
      let query = supabase
        .from('products')
        .select(`
          id, 
          title, 
          description, 
          price, 
          image_url:cover_url,
          condition,
          sale_type,
          category_id,
          seller_id,
          store_id,
          created_at,
          auction_status,
          auction_start_at,
          auction_end_at,
          current_bid,
          total_bids,
          attributes
        `)
        .or('status.is.null,status.eq.active'); // Incluir productos sin status o activos

      // Por defecto, excluir subastas de la página principal
      // Solo mostrar subastas si se filtra explícitamente por 'auction'
      if (!filters.saleType || filters.saleType !== 'auction') {
        query = query.neq('sale_type', 'auction');
      }

      // Filtro de búsqueda - incluye título, descripción, y también busca por vendedor/tienda
      // Primero, si hay búsqueda, intentar encontrar stores y sellers que coincidan
      let matchingStoreIds: string[] = [];
      let matchingSellerIds: string[] = [];
      
      if (filters.search.trim()) {
        const searchTerm = filters.search.trim();
        
        try {
          // Buscar stores que coincidan con el nombre
          const { data: matchingStores } = await supabase
            .from('stores')
            .select('id, seller_id')
            .or(`name.ilike.%${searchTerm}%`)
            .eq('is_active', true)
            .limit(100);
          
          if (matchingStores) {
            matchingStoreIds = matchingStores.map((s: any) => s.id);
            matchingSellerIds = matchingStores.map((s: any) => s.seller_id).filter(Boolean);
          }
          
          // Buscar sellers (profiles) que coincidan con el nombre
          const { data: matchingProfiles } = await supabase
            .from('profiles')
            .select('id')
            .or(`first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
            .eq('role', 'seller')
            .limit(100);
          
          if (matchingProfiles) {
            matchingSellerIds = [...new Set([...matchingSellerIds, ...matchingProfiles.map((p: any) => p.id)])];
          }
        } catch (err) {
          console.warn('Error buscando stores/sellers:', err);
          // Continuar con la búsqueda normal si falla
        }
        
        // Construir filtro de búsqueda que incluya:
        // 1. Título y descripción del producto
        // 2. Productos de stores que coincidan
        // 3. Productos de sellers que coincidan
        const searchConditions: string[] = [
          `title.ilike.%${searchTerm}%`,
          `description.ilike.%${searchTerm}%`
        ];
        
        // Agregar condiciones para stores y sellers si hay coincidencias
        if (matchingStoreIds.length > 0) {
          searchConditions.push(`store_id.in.(${matchingStoreIds.join(',')})`);
        }
        
        if (matchingSellerIds.length > 0) {
          searchConditions.push(`seller_id.in.(${matchingSellerIds.join(',')})`);
        }
        
        query = query.or(searchConditions.join(','));
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

      // Filtros especiales para subastas
      if (filters.auctionFilter === 'active') {
        query = query.eq('sale_type', 'auction').eq('auction_status', 'active');
      } else if (filters.auctionFilter === 'ending_soon') {
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
        query = query
          .eq('sale_type', 'auction')
          .eq('auction_status', 'active')
          .gte('auction_end_at', now.toISOString())
          .lte('auction_end_at', oneHourFromNow.toISOString());
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
        case 'auction_ending':
          query = query.order('auction_end_at', { ascending: true });
          break;
        case 'auction_bids':
          query = query.order('total_bids', { ascending: false });
          break;
      }

      const { data: productsData, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      // Filtrar productos por atributos de vehículos/motos (filtrado del lado del cliente)
      let filteredProductsData = productsData || [];
      
      // Filtrar productos anómalos o inválidos (métricas del dashboard, Firebase, etc.)
      filteredProductsData = filteredProductsData.filter((p: any) => {
        // Excluir productos que no tengan estructura válida
        if (!p.id || !p.title) return false;
        
        // Excluir productos cuyo título sea exactamente "Resumen" (común en productos de Firebase/Vercel)
        const titleTrimmed = (p.title || '').trim().toLowerCase();
        if (titleTrimmed === 'resumen') return false;
        
        // Excluir cualquier producto cuyo título o descripción contenga métricas del dashboard
        const title = (p.title || '').toLowerCase();
        const description = (p.description || '').toLowerCase();
        
        // Palabras clave que indican productos anómalos
        const anomalousKeywords = [
          'resumen',
          'solicitudes',
          'firebase studio',
          'firebase',
          'vercel',
          'errores',
          'solicitud',
          'application has',
          'requests',
          'errors',
          'últimos 7 días',
          'últimos 7 dias',
          'dashboard',
          'métricas',
          'metrics',
          'implementado desde',
          'publicación en vivo',
          'ver detalles'
        ];
        
        const containsAnomalousContent = anomalousKeywords.some(keyword => 
          title.includes(keyword) || description.includes(keyword)
        );
        
        if (containsAnomalousContent) return false;
        
        // Excluir productos con descripciones que contengan URLs de Firebase/Vercel
        const fullText = `${title} ${description}`;
        if (fullText.includes('firebase') || fullText.includes('vercel.app') || fullText.includes('studio')) {
          return false;
        }
        
        return true;
      });
      
      if (vehicleFields.marca || vehicleFields.modelo || vehicleFields.año || vehicleFields.kilometraje || vehicleFields.color || vehicleFields.documentacion) {
        filteredProductsData = filteredProductsData.filter((p: any) => {
          const attrs = p.attributes || {};
          
          // Filtro por marca
          if (vehicleFields.marca && (!attrs.marca || !attrs.marca.toLowerCase().includes(vehicleFields.marca.toLowerCase()))) {
            return false;
          }
          
          // Filtro por modelo
          if (vehicleFields.modelo && (!attrs.modelo || !attrs.modelo.toLowerCase().includes(vehicleFields.modelo.toLowerCase()))) {
            return false;
          }
          
          // Filtro por año
          if (vehicleFields.año && attrs.año && attrs.año.toString() !== vehicleFields.año) {
            return false;
          }
          
          // Filtro por kilometraje (rango ±10%)
          if (vehicleFields.kilometraje) {
            const km = parseFloat(vehicleFields.kilometraje);
            if (!isNaN(km)) {
              const productKm = parseFloat(attrs.kilometraje || '0');
              if (productKm < km * 0.9 || productKm > km * 1.1) {
                return false;
              }
            }
          }
          
          // Filtro por color
          if (vehicleFields.color && (!attrs.color || !attrs.color.toLowerCase().includes(vehicleFields.color.toLowerCase()))) {
            return false;
          }
          
          // Filtro por documentación
          if (vehicleFields.documentacion && attrs.documentacion !== vehicleFields.documentacion) {
            return false;
          }
          
          return true;
        });
      }

      // Si hay productos, obtener información de sellers y stores (optimizado con límites)
      if (filteredProductsData && filteredProductsData.length > 0) {
        // Limitar productos a enriquecer para mejor rendimiento
        const maxProductsToEnrich = 50;
        const productsToEnrich = filteredProductsData.slice(0, maxProductsToEnrich);
        
        const sellerIds = [...new Set(productsToEnrich.map((p: any) => p.seller_id).filter(Boolean))].slice(0, 100) as string[];
        const storeIds = [...new Set(productsToEnrich.map((p: any) => p.store_id).filter(Boolean))].slice(0, 100) as string[];
        
        // Función helper para crear query con timeout
        const createQueryWithTimeout = async (queryBuilder: any, timeoutMs: number = 10000) => {
          try {
            return await Promise.race([
              queryBuilder,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Query timeout')), timeoutMs)
              )
            ]);
          } catch (err) {
            console.warn('Query timeout or error:', err);
            return { data: [], error: err };
          }
        };
        
        // Cargar sellers y stores en paralelo con timeouts individuales
        const [profilesResult, storesResult] = await Promise.allSettled([
          // Obtener información de sellers (profiles)
          sellerIds.length > 0 
            ? createQueryWithTimeout(
                supabase
                  .from('profiles')
                  .select('id, first_name, last_name, email')
                  .in('id', sellerIds),
                15000
              )
            : Promise.resolve({ data: [], error: null }),
          
          // Obtener información de stores
          storeIds.length > 0
            ? createQueryWithTimeout(
                supabase
                  .from('stores')
                  .select('id, name, slug')
                  .in('id', storeIds),
                15000
              )
            : Promise.resolve({ data: [], error: null }),
        ]);

        // Procesar resultados de profiles
        let sellersMap: Record<string, any> = {};
        if (profilesResult.status === 'fulfilled' && !profilesResult.value.error && profilesResult.value.data) {
          profilesResult.value.data.forEach((profile: any) => {
            sellersMap[profile.id] = {
              ...profile,
              display_name: profile.first_name || profile.last_name 
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                : profile.email?.split('@')[0] || 'Vendedor'
            };
          });
        }
        
        // Placeholders para sellers no encontrados
        sellerIds.forEach((id) => {
          if (!sellersMap[id]) {
            sellersMap[id] = {
              id,
              display_name: `Vendedor ${id.slice(0, 6)}`
            };
          }
        });

        // Procesar resultados de stores
        let storesMap: Record<string, any> = {};
        if (storesResult.status === 'fulfilled' && !storesResult.value.error && storesResult.value.data) {
          storesResult.value.data.forEach((store: any) => {
            storesMap[store.id] = store;
          });
        }

        // Enriquecer productos (todos, no solo los primeros 50)
        let enrichedProducts = (filteredProductsData as any[]).map((product: any) => ({
          ...product,
          seller: sellersMap[product.seller_id] || null,
          store: storesMap[product.store_id] || null,
          // Asegurar valores por defecto para subastas
          auction_status: product.auction_status || null,
          auction_start_at: product.auction_start_at || null,
          auction_end_at: product.auction_end_at || null,
          current_bid: product.current_bid || null,
          total_bids: product.total_bids || 0,
        }));

        // Filtro adicional por nombre de vendedor o tienda (si hay búsqueda)
        if (filters.search.trim()) {
          const searchLower = filters.search.toLowerCase();
          enrichedProducts = enrichedProducts.filter((product: any) => {
            // Buscar en título y descripción (ya se hizo en la query, pero mantenemos por si acaso)
            const matchesProduct = 
              product.title?.toLowerCase().includes(searchLower) ||
              product.description?.toLowerCase().includes(searchLower);
            
            // Buscar en nombre del vendedor
            const matchesSeller = 
              product.seller?.display_name?.toLowerCase().includes(searchLower) ||
              product.seller?.first_name?.toLowerCase().includes(searchLower) ||
              product.seller?.last_name?.toLowerCase().includes(searchLower);
            
            // Buscar en nombre de la tienda
            const matchesStore = 
              product.store?.name?.toLowerCase().includes(searchLower);
            
            return matchesProduct || matchesSeller || matchesStore;
          });
        }

        // Ordenamiento adicional para subastas (si es necesario ordenar por fecha de fin)
        if (filters.sortBy === 'auction_ending') {
          enrichedProducts.sort((a: any, b: any) => {
            if (!a.auction_end_at && !b.auction_end_at) return 0;
            if (!a.auction_end_at) return 1;
            if (!b.auction_end_at) return -1;
            return new Date(a.auction_end_at).getTime() - new Date(b.auction_end_at).getTime();
          });
        } else if (filters.sortBy === 'auction_bids') {
          enrichedProducts.sort((a: any, b: any) => {
            const bidsA = a.total_bids || 0;
            const bidsB = b.total_bids || 0;
            return bidsB - bidsA;
          });
        }

        // Aplicar los productos filtrados (no solo los enriquecidos)
        const allFilteredProducts = filteredProductsData.map((p: any) => {
          const enriched = enrichedProducts.find((ep: any) => ep.id === p.id);
          return enriched || p;
        });
        
        setProducts(allFilteredProducts);
      } else {
        setProducts([]);
      }

    } catch (err: any) {
      console.error('Error loading products:', err);
      // Mensaje de error más amigable
      const errorMessage = err?.message || 'Error al cargar productos. Por favor, inténtalo de nuevo.';
      setError(errorMessage);
      // NO reintentar automáticamente para evitar loops infinitos
      // El usuario puede recargar la página manualmente si lo necesita
    } finally {
      clearTimeout(timeoutId);
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
      auctionFilter: '',
      sortBy: 'date_desc'
    });
    setVehicleFields({
      marca: '',
      modelo: '',
      año: '',
      kilometraje: '',
      color: '',
      documentacion: ''
    });
  }

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== '' && value !== 'date_desc'
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Botón para ir a página de tiendas */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-center justify-between mb-4 sm:mb-6">
          <a
            href="/stores"
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm sm:text-base font-medium flex items-center gap-2"
          >
            <span>🏪</span>
            <span>Ver Todas las Tiendas</span>
          </a>

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
              <option value="auction_ending">Subastas: Finalizan pronto</option>
              <option value="auction_bids">Subastas: Más pujas</option>
            </select>
          </div>
        </div>

        {/* Búsqueda y Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center p-3">
            {/* Buscador - al lado de Filtros */}
            <div className="flex-1 min-w-0">
              <SearchBar
                placeholder="Buscar productos..."
                onSearch={(query) => updateFilter('search', query)}
                className="w-full"
              />
            </div>
            
            {/* Botón Filtros */}
            <div className="flex items-center justify-between gap-2 sm:flex-shrink-0">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors font-medium whitespace-nowrap"
              >
                <svg className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Filtros</span>
                {hasActiveFilters && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                    {Object.values(filters).filter(v => v !== '' && v !== 'date_desc').length}
                  </span>
                )}
              </button>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          <div className={`px-3 pb-3 transition-all duration-300 overflow-hidden border-t border-gray-100 ${
            filtersOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0 hidden'
          }`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-3">
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

            {/* Filtro especial para subastas */}
            {filters.saleType === 'auction' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filtro de subastas</label>
                <select
                  value={filters.auctionFilter}
                  onChange={(e) => updateFilter('auctionFilter', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todas las subastas</option>
                  <option value="active">Solo activas</option>
                  <option value="ending_soon">Finalizan en menos de 1 hora</option>
                </select>
              </div>
            )}
          </div>
          
          {/* Campos específicos para vehículos/motos */}
          {(() => {
            const selectedCategory = categories.find(cat => cat.id === filters.category);
            const selectedCategoryName = selectedCategory?.name?.toLowerCase() || '';
            const isVehicleCategory = selectedCategoryName === 'vehiculos' || selectedCategoryName === 'motos';
            
            if (!isVehicleCategory) return null;
            
            return (
              <div className="px-3 pb-3 border-t border-gray-200 mt-3 pt-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-sm">
                  {selectedCategoryName === 'vehiculos' ? '🚗 Información del Vehículo' : '🏍️ Información de la Moto'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
                    <input
                      type="text"
                      placeholder={selectedCategoryName === 'vehiculos' ? 'Ej: Ford, Toyota...' : 'Ej: Honda, Yamaha...'}
                      value={vehicleFields.marca}
                      onChange={(e) => setVehicleFields(prev => ({ ...prev, marca: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo</label>
                    <input
                      type="text"
                      placeholder={selectedCategoryName === 'vehiculos' ? 'Ej: Fiesta, Corolla...' : 'Ej: CG 150, XTZ 250...'}
                      value={vehicleFields.modelo}
                      onChange={(e) => setVehicleFields(prev => ({ ...prev, modelo: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Año</label>
                    <input
                      type="number"
                      placeholder="Ej: 2020"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={vehicleFields.año}
                      onChange={(e) => setVehicleFields(prev => ({ ...prev, año: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kilometraje</label>
                    <input
                      type="number"
                      placeholder="Ej: 50000"
                      min="0"
                      value={vehicleFields.kilometraje}
                      onChange={(e) => setVehicleFields(prev => ({ ...prev, kilometraje: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                    <input
                      type="text"
                      placeholder="Ej: Blanco, Negro..."
                      value={vehicleFields.color}
                      onChange={(e) => setVehicleFields(prev => ({ ...prev, color: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Documentación</label>
                    <select
                      value={vehicleFields.documentacion}
                      onChange={(e) => setVehicleFields(prev => ({ ...prev, documentacion: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 dark:text-gray-200"
                    >
                      <option value="">— Selecciona —</option>
                      <option value="al_dia">Al día</option>
                      <option value="solo_titulo">Solo título</option>
                      <option value="solo_cedula_verde">Solo cédula verde</option>
                      <option value="titulo_y_cedula_verde">Título y cédula verde</option>
                      <option value="ninguna">Ninguna de las anteriores</option>
                    </select>
                  </div>
                </div>
              </div>
            );
          })()}
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
            {products.map((product) => {
              const isAuction = product.sale_type === 'auction';
              const isActiveAuction = isAuction && product.auction_status === 'active';
              const auctionEndAt = product.auction_end_at ? new Date(product.auction_end_at).getTime() : 0;
              const serverNow = Date.now(); // Tiempo actual para el timer
              const endsInOneHour = isActiveAuction && auctionEndAt > serverNow && auctionEndAt <= serverNow + 60 * 60 * 1000;
              
              return (
              <div key={product.id} className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${
                endsInOneHour ? 'ring-2 ring-orange-300 bg-orange-50' : ''
              }`}>
                <div className="relative">
                  <img
                    src={product.image_url ?? 'https://placehold.co/400x300?text=Producto'}
                    alt={product.title}
                    className="w-full h-48 object-cover"
                  />
                  {/* Badges de condición y tipo de venta - OCULTOS */}
                  {/* <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      product.condition === 'nuevo' 
                        ? 'bg-green-100 text-green-800' 
                        : product.condition === 'usado_como_nuevo'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.condition === 'nuevo' ? 'Nuevo' : 
                       product.condition === 'usado_como_nuevo' ? 'Usado como nuevo' : 'Usado'}
                    </span>
                    {endsInOneHour && (
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 animate-pulse flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Finaliza pronto
                      </span>
                    )}
                  </div> */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                    {/* Badge de tipo de venta - OCULTO */}
                    {/* <span className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${
                      isAuction 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isAuction && <Gavel className="h-3 w-3" />}
                      {isAuction ? 'Subasta' : 'Directa'}
                    </span> */}
                    {isActiveAuction && product.total_bids !== undefined && product.total_bids > 0 && (
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {product.total_bids} {product.total_bids === 1 ? 'puja' : 'pujas'}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.title}</h3>
                  {product.description && (
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                  )}
                  
                  {/* Timer para subastas activas */}
                  {isActiveAuction && product.auction_end_at && auctionEndAt > serverNow && (
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <AuctionTimer
                        endAtMs={auctionEndAt}
                        serverNowMs={serverNow}
                        variant="compact"
                        size="md"
                        tickMs={1000}
                      />
                    </div>
                  )}
                  
                  {/* Información del vendedor/tienda */}
                  {(product.store || product.seller) && (
                    <div className="mb-3 pb-3 border-b">
                      {product.store ? (
                        <Link
                          href={`/store/${product.store.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          <span>🏪</span>
                          <span>{product.store.name}</span>
                        </Link>
                      ) : product.seller ? (
                        <Link
                          href={(product.store as any)?.slug ? `/store/${(product.store as any).slug}` : `/seller/${product.seller?.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          <span>👤</span>
                          <span>
                            {(product.seller as any)?.display_name || 
                             ((product.seller as any)?.first_name || (product.seller as any)?.last_name 
                              ? `${(product.seller as any)?.first_name || ''} ${(product.seller as any)?.last_name || ''}`.trim()
                              : (product.seller as any)?.full_name || (product.seller as any)?.email?.split('@')[0] || `Vendedor ${product.seller_id?.slice(0, 6) || ''}`)}
                          </span>
                        </Link>
                      ) : product.seller_id ? (
                        <Link
                          href={`/seller/${product.seller_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                        >
                          <span>👤</span>
                          <span>{`Vendedor ${product.seller_id.slice(0, 6)}`}</span>
                        </Link>
                      ) : null}
                    </div>
                  )}
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      {isAuction && isActiveAuction ? (
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">Puja actual</span>
                          <p className="text-xl font-bold text-purple-600">
                            {(product.current_bid || product.price).toLocaleString('es-PY')} Gs.
                          </p>
                        </div>
                      ) : (
                        <p className="text-xl font-bold text-green-600">
                          {product.price.toLocaleString('es-PY')} Gs.
                        </p>
                      )}
                    </div>
                    <a
                      href={isAuction ? `/auctions/${product.id}` : `/products/${product.id}`}
                      className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors text-center font-medium"
                    >
                      {isAuction ? 'Ver subasta' : 'Ver detalles'}
                    </a>
                  </div>
                </div>
        </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}