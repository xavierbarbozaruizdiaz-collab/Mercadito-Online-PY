// ============================================
// MERCADITO ONLINE PY - SEARCH BAR
// Componente de barra de búsqueda
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Button, 
  Input,
  Badge
} from '@/components/ui';
import { 
  Search, 
  X,
  TrendingUp,
  Clock,
  Tag,
  MapPin
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'store' | 'location';
  count?: number;
}

interface SearchBarProps {
  placeholder?: string;
  suggestions?: SearchSuggestion[];
  onSearch?: (query: string) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showSuggestions?: boolean;
  maxSuggestions?: number;
}

// ============================================
// COMPONENTE
// ============================================

export default function SearchBar({
  placeholder = 'Buscar productos, marcas, categorías...',
  suggestions = [],
  onSearch,
  onSuggestionClick,
  className = '',
  size = 'md',
  showSuggestions = true,
  maxSuggestions = 8,
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Clases de tamaño
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  // Manejar cambio de query
  const handleQueryChange = (value: string) => {
    setQuery(value);
    setIsOpen(value.length > 0 && showSuggestions);
    setSelectedIndex(-1);
  };

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

  // Manejar teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
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

  // Obtener icono según el tipo
  const getSuggestionIcon = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'product':
        return <Search className="w-4 h-4" />;
      case 'category':
        return <Tag className="w-4 h-4" />;
      case 'store':
        return <TrendingUp className="w-4 h-4" />;
      case 'location':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Search className="w-4 h-4" />;
    }
  };

  // Obtener color del badge según el tipo
  const getSuggestionBadgeColor = (type: SearchSuggestion['type']) => {
    switch (type) {
      case 'product':
        return 'primary';
      case 'category':
        return 'info';
      case 'store':
        return 'success';
      case 'location':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => query.length > 0 && setIsOpen(true)}
            className={`pl-10 pr-4 ${sizeClasses[size]}`}
          />
          
          {/* Botón de limpiar */}
          {query && (
            <button
              onClick={() => handleQueryChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <Button 
          onClick={() => handleSearch()}
          className="ml-2 px-6"
        >
          Buscar
        </Button>
      </div>

      {/* Sugerencias */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-50 mt-1 max-h-96 overflow-y-auto"
        >
          <div className="p-2">
            {suggestions.slice(0, maxSuggestions).map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm flex items-center justify-between ${
                  selectedIndex === index ? 'bg-gray-100' : ''
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">
                    {getSuggestionIcon(suggestion.type)}
                  </span>
                  <span className="text-gray-900">{suggestion.text}</span>
                </div>
                
                <div className="flex items-center space-x-2">
                  {suggestion.count && (
                    <Badge variant="secondary" size="sm">
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
