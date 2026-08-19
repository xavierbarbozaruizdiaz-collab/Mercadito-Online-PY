// ============================================
// MERCADITO ONLINE PY - SEARCH SUGGESTIONS
// Componente de sugerencias de búsqueda
// ============================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Badge
} from '@/components/ui';
import { 
  Search, 
  TrendingUp,
  Clock,
  Tag,
  MapPin,
  Package,
  Store,
  Star,
  TrendingDown
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'store' | 'location' | 'trending';
  count?: number;
  trend?: 'up' | 'down' | 'stable';
  category?: string;
  location?: string;
  product?: {
    id: string;
    title: string;
    price: number;
    compare_price?: number;
    image_url?: string;
    condition: string;
    sale_type: string;
    store: {
      name: string;
      slug: string;
    };
    category?: {
      name: string;
    };
  };
}

interface SearchSuggestionsProps {
  query: string;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  onTrendingClick?: (trend: string) => void;
  className?: string;
  maxSuggestions?: number;
  showTrending?: boolean;
  showRecent?: boolean;
}

// ============================================
// COMPONENTE
// ============================================

export default function SearchSuggestions({
  query,
  onSuggestionClick,
  onTrendingClick,
  className = '',
  maxSuggestions = 8,
  showTrending = true,
  showRecent = true,
}: SearchSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [trending, setTrending] = useState<SearchSuggestion[]>([]);
  const [recent, setRecent] = useState<SearchSuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Cargar sugerencias cuando cambie la query
  useEffect(() => {
    if (query.length > 2) {
      loadSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Cargar trending y recientes al montar
  useEffect(() => {
    loadTrending();
    loadRecent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cargar sugerencias reales desde el servicio
  const loadSuggestions = async (searchQuery: string) => {
    setLoading(true);
    try {
      // Usar el servicio real de búsqueda
      const { SearchService } = await import('@/lib/services/searchService');
      const realSuggestions = await SearchService.getSearchSuggestions(searchQuery);
      
      // Mapear a formato de componente (preservar campo product si existe)
      const mappedSuggestions: SearchSuggestion[] = realSuggestions.map((s, index) => ({
        id: s.id || `suggestion-${index}`,
        text: s.text,
        type: s.type as 'product' | 'category' | 'store' | 'location',
        count: s.count,
        category: s.category,
        location: s.location,
        product: (s as any).product, // Preservar datos completos del producto
      }));

      setSuggestions(mappedSuggestions.slice(0, maxSuggestions));
    } catch (error) {
      console.error('Error loading suggestions:', error);
      // Si falla, no mostrar sugerencias en lugar de mostrar datos incorrectos
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar trending
  const loadTrending = async () => {
    try {
      const mockTrending: SearchSuggestion[] = [
        {
          id: 't1',
          text: 'iPhone 15 Pro Max',
          type: 'trending',
          count: 156,
          trend: 'up',
          category: 'Electrónicos',
        },
        {
          id: 't2',
          text: 'Samsung Galaxy S24',
          type: 'trending',
          count: 134,
          trend: 'up',
          category: 'Electrónicos',
        },
        {
          id: 't3',
          text: 'MacBook Air M3',
          type: 'trending',
          count: 98,
          trend: 'up',
          category: 'Computadoras',
        },
        {
          id: 't4',
          text: 'PlayStation 5 Slim',
          type: 'trending',
          count: 87,
          trend: 'down',
          category: 'Gaming',
        },
        {
          id: 't5',
          text: 'AirPods Pro 2',
          type: 'trending',
          count: 76,
          trend: 'stable',
          category: 'Accesorios',
        },
      ];

      setTrending(mockTrending);
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  // Cargar recientes
  const loadRecent = async () => {
    try {
      const mockRecent: SearchSuggestion[] = [
        {
          id: 'r1',
          text: 'iPhone 14',
          type: 'product',
          count: 23,
          category: 'Electrónicos',
        },
        {
          id: 'r2',
          text: 'Laptop Gaming',
          type: 'product',
          count: 45,
          category: 'Computadoras',
        },
        {
          id: 'r3',
          text: 'Zapatos Nike',
          type: 'product',
          count: 67,
          category: 'Calzado',
        },
        {
          id: 'r4',
          text: 'Mochila',
          type: 'product',
          count: 34,
          category: 'Accesorios',
        },
        {
          id: 'r5',
          text: 'Cámara Canon',
          type: 'product',
          count: 19,
          category: 'Fotografía',
        },
      ];

      setRecent(mockRecent);
    } catch (error) {
      console.error('Error loading recent:', error);
    }
  };

  // Manejar clic en sugerencia
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    }
  };

  // Manejar clic en trending
  const handleTrendingClick = (trend: string) => {
    if (onTrendingClick) {
      onTrendingClick(trend);
    }
  };

  // Obtener icono según el tipo
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'category':
        return <Tag className="w-4 h-4" />;
      case 'store':
        return <Store className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      case 'trending':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  // Obtener color del badge según el tipo
  const getSuggestionBadgeColor = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'product':
        return 'default';
      case 'category':
        return 'info';
      case 'store':
        return 'success';
      case 'location':
        return 'warning';
      case 'trending':
        return 'error';
      default:
        return 'default';
    }
  };

  // Obtener icono de tendencia
  const getTrendIcon = (trend: SearchSuggestion['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-500" />;
      case 'stable':
        return <Clock className="w-3 h-3 text-gray-500" />;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Sugerencias de búsqueda */}
      {query.length > 2 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            <Search className="w-4 h-4 inline mr-2" />
            Sugerencias para &quot;{query}&quot;
          </h3>
          
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="space-y-3">
              {suggestions.map((suggestion) => {
                // Si es un producto con datos completos, mostrar ProductCard
                if (suggestion.type === 'product' && suggestion.product) {
                  return (
                    <Link
                      key={suggestion.id}
                      href={`/products/${suggestion.product.id}`}
                      className="block w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSuggestionClick) {
                          handleSuggestionClick(suggestion);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                        {/* Imagen del producto */}
                        <div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                          {suggestion.product.image_url ? (
                            <Image
                              src={suggestion.product.image_url}
                              alt={suggestion.product.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Información del producto */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate text-sm">
                            {suggestion.product.title}
                          </h4>
                          {suggestion.product.category && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {suggestion.product.category.name}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-bold text-green-600">
                              {formatCurrency(suggestion.product.price)}
                            </span>
                            {suggestion.product.compare_price && (
                              <span className="text-xs text-gray-400 line-through">
                                {formatCurrency(suggestion.product.compare_price)}
                              </span>
                            )}
                          </div>
                          {suggestion.product.store && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              🏪 {suggestion.product.store.name}
                            </p>
                          )}
                        </div>
                        
                        {/* Badge de tipo */}
                        <div className="flex-shrink-0">
                          <Badge variant="info" size="sm">
                            Ver
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                }
                
                // Para otros tipos, mostrar formato simple
                return (
                  <button
                    key={suggestion.id}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-400">
                        {getSuggestionIcon(suggestion.type)}
                      </span>
                      <span className="text-gray-900">{suggestion.text}</span>
                      {suggestion.category && (
                        <span className="text-gray-500 text-xs">
                          en {suggestion.category}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {suggestion.count && (
                        <Badge variant="default" size="sm">
                          {suggestion.count}
                        </Badge>
                      )}
                      <Badge 
                        variant={getSuggestionBadgeColor(suggestion.type)}
                        size="sm"
                      >
                        {suggestion.type}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No se encontraron sugerencias.</p>
          )}
        </div>
      )}

      {/* Trending */}
      {showTrending && trending.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Tendencias
          </h3>
          
          <div className="space-y-2">
            {trending.map((trend) => (
              <button
                key={trend.id}
                onClick={() => handleTrendingClick(trend.text)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">
                    {getSuggestionIcon(trend.type)}
                  </span>
                  <span className="text-gray-900">{trend.text}</span>
                  {trend.category && (
                    <span className="text-gray-500 text-xs">
                      en {trend.category}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {trend.count && (
                    <Badge variant="default" size="sm">
                      {trend.count}
                    </Badge>
                  )}
                  {trend.trend && getTrendIcon(trend.trend)}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recientes */}
      {showRecent && recent.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            <Clock className="w-4 h-4 inline mr-2" />
            Búsquedas recientes
          </h3>
          
          <div className="space-y-2">
            {recent.map((item) => (
              <button
                key={item.id}
                onClick={() => handleSuggestionClick(item)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm flex items-center justify-between"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">
                    {getSuggestionIcon(item.type)}
                  </span>
                  <span className="text-gray-900">{item.text}</span>
                  {item.category && (
                    <span className="text-gray-500 text-xs">
                      en {item.category}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {item.count && (
                    <Badge variant="default" size="sm">
                      {item.count}
                    </Badge>
                  )}
                  <Badge 
                    variant={getSuggestionBadgeColor(item.type)}
                    size="sm"
                  >
                    {item.type}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
