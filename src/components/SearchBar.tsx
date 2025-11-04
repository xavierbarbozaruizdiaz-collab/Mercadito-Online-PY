// ============================================
// MERCADITO ONLINE PY - SEARCH BAR COMPONENT
// Barra de búsqueda para el header
// ============================================

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  className?: string;
  placeholder?: string;
  onSearch?: (query: string) => void;
}

function SearchBarContent({ 
  className = '',
  placeholder = 'Buscar productos...',
  onSearch
}: SearchBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams?.get('q') || '');

  // Sincronizar con URL params
  useEffect(() => {
    const urlQuery = searchParams?.get('q') || '';
    if (urlQuery !== query) {
      setQuery(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleSearch = useCallback((searchQuery: string) => {
    const trimmedQuery = searchQuery.trim();
    
    if (onSearch) {
      onSearch(trimmedQuery);
    } else {
      // Navegar a la página principal con query string
      if (trimmedQuery) {
        router.push(`/?q=${encodeURIComponent(trimmedQuery)}`);
      } else {
        router.push('/');
      }
    }
  }, [router, onSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    if (onSearch) {
      onSearch('');
    } else {
      router.push('/');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={`relative flex-1 max-w-xl ${className}`}
    >
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    </form>
  );
}

export default function SearchBar(props: SearchBarProps) {
  return (
    <Suspense fallback={
      <div className={`relative flex-1 max-w-xl ${props.className || ''}`}>
        <input
          type="text"
          placeholder={props.placeholder || 'Buscar productos...'}
          disabled
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm sm:text-base opacity-50"
        />
      </div>
    }>
      <SearchBarContent {...props} />
    </Suspense>
  );
}

