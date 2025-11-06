// ============================================
// MERCADITO ONLINE PY - REAL-TIME SEARCH
// Componente de búsqueda en tiempo real
// ============================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  SearchBar,
  LoadingSpinner
} from '@/components/ui';
import { useSearch } from '@/lib/hooks/useSearch';
import { SearchSuggestion } from '@/lib/services/searchService';

// ============================================
// TIPOS
// ============================================

interface RealTimeSearchProps {
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSuggestions?: boolean;
  maxSuggestions?: number;
  onSearch?: (query: string) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
}

// ============================================
// COMPONENTE
// ============================================

export default function RealTimeSearch({
  placeholder = 'Buscar productos, marcas, categorías...',
  className = '',
  size = 'md',
  showSuggestions = true,
  maxSuggestions = 8,
  onSearch,
  onSuggestionClick,
}: RealTimeSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Usar el hook de búsqueda
  const {
    suggestions,
    trending,
    recent,
    loading,
    loadSuggestions,
    loadTrending,
    loadRecent,
  } = useSearch({
    autoSearch: false, // No hacer búsqueda automática, solo sugerencias
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadTrending();
    loadRecent();
  }, [loadTrending, loadRecent]);

  // Manejar cambio de query (no usado actualmente, pero puede ser útil en el futuro)
  // const handleQueryChange = (value: string) => {
  //   setQuery(value);
  //   setSelectedIndex(-1);
  //   
  //   if (value.length > 2) {
  //     loadSuggestions(value);
  //     setIsOpen(true);
  //   } else {
  //     setIsOpen(false);
  //   }
  // };

  // Manejar búsqueda
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    if (finalQuery.trim()) {
      if (onSearch) {
        onSearch(finalQuery);
      } else {
        router.push(`/search?q=${encodeURIComponent(finalQuery)}`);
      }
      setIsOpen(false);
    }
  };

  // Manejar clic en sugerencia
  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setIsOpen(false);
    
    if (onSuggestionClick) {
      onSuggestionClick(suggestion);
    } else {
      // Navegar según el tipo de sugerencia
      switch (suggestion.type) {
        case 'product':
          router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
          break;
        case 'category':
          router.push(`/search?category=${encodeURIComponent(suggestion.text)}`);
          break;
        case 'store':
          router.push(`/search?store=${encodeURIComponent(suggestion.text)}`);
          break;
        case 'location':
          router.push(`/search?location=${encodeURIComponent(suggestion.text)}`);
          break;
        default:
          router.push(`/search?q=${encodeURIComponent(suggestion.text)}`);
      }
    }
  };

  // Manejar clic en trending
  const handleTrendingClick = (trend: string) => {
    setQuery(trend);
    handleSearch(trend);
  };

  // Manejar teclas (no usado actualmente, pero puede ser útil en el futuro)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const allSuggestions = [
      ...suggestions,
      ...trending,
      ...recent,
    ].slice(0, maxSuggestions);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < allSuggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : allSuggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < allSuggestions.length) {
          handleSuggestionClick(allSuggestions[selectedIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Manejar clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Obtener todas las sugerencias (no usado actualmente, pero puede ser útil en el futuro)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getAllSuggestions = () => {
    const allSuggestions = [
      ...suggestions,
      ...trending,
      ...recent,
    ];
    
    return allSuggestions.slice(0, maxSuggestions);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Barra de búsqueda */}
      <SearchBar
        placeholder={placeholder}
        size={size}
        onSearch={handleSearch}
        onSuggestionClick={handleSuggestionClick}
        className="w-full"
      />
      
      {/* Sugerencias */}
      {showSuggestions && isOpen && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-96 overflow-y-auto"
        >
          <div className="p-4">
            {/* Sugerencias de búsqueda */}
            {query.length > 2 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Sugerencias para &quot;{query}&quot;
                </h4>
                {loading ? (
                  <div className="flex items-center justify-center py-2">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-1">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm ${
                          selectedIndex === index ? 'bg-gray-100' : ''
                        }`}
                      >
                        {suggestion.text}
                        {suggestion.category && (
                          <span className="text-gray-500 text-xs ml-2">
                            en {suggestion.category}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No se encontraron sugerencias.</p>
                )}
              </div>
            )}
            
            {/* Tendencias */}
            {trending.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Tendencias</h4>
                <div className="space-y-1">
                  {trending.map((trend, index) => (
                    <button
                      key={trend.id}
                      onClick={() => handleTrendingClick(trend.text)}
                      className={`w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm ${
                        selectedIndex === suggestions.length + index ? 'bg-gray-100' : ''
                      }`}
                    >
                      {trend.text}
                      {trend.category && (
                        <span className="text-gray-500 text-xs ml-2">
                          en {trend.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Recientes */}
            {recent.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Recientes</h4>
                <div className="space-y-1">
                  {recent.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleSuggestionClick(item)}
                      className={`w-full text-left px-2 py-1 hover:bg-gray-100 rounded text-sm ${
                        selectedIndex === suggestions.length + trending.length + index ? 'bg-gray-100' : ''
                      }`}
                    >
                      {item.text}
                      {item.category && (
                        <span className="text-gray-500 text-xs ml-2">
                          en {item.category}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
