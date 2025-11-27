// ============================================
// MERCADITO ONLINE PY - SOURCING SEARCH MODAL
// Modal para búsqueda y creación de sourcing orders
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2, ShoppingBag } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useToast } from '@/lib/hooks/useToast';
import { useSourcingOrder } from '@/lib/hooks/useSourcingOrder';
import { SearchService } from '@/lib/services/searchService';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface SourcingSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// COMPONENTE
// ============================================

export default function SourcingSearchModal({ isOpen, onClose }: SourcingSearchModalProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [isSeller, setIsSeller] = useState<boolean | null>(null);
  const toast = useToast();
  const router = useRouter();
  const { isCreating: isCreatingOrder, createSourcingOrder } = useSourcingOrder();

  // Verificar si el usuario es vendedor cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      async function checkIfSeller() {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) {
            setIsSeller(false);
            return;
          }

          const { data: stores } = await supabase
            .from('stores')
            .select('id')
            .eq('seller_id', session.user.id)
            .eq('is_active', true)
            .limit(1);

          setIsSeller(stores && stores.length > 0);
        } catch (error) {
          console.error('Error verificando si es vendedor:', error);
          setIsSeller(false);
        }
      }

      checkIfSeller();
    }
  }, [isOpen]);

  // Resetear estado cuando se cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setIsSearching(false);
      setHasSearched(false);
      setHasResults(false);
    }
  }, [isOpen]);

  // Buscar productos
  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Por favor ingresá qué querés comprar');
      return;
    }

    setIsSearching(true);
    setHasSearched(false);

    try {
      const result = await SearchService.searchProducts({
        query: query.trim(),
        page: 1,
        limit: 12,
      });

      const foundResults = result.data.length > 0;
      setHasResults(foundResults);
      setHasSearched(true);

      if (foundResults) {
        // Si hay resultados, redirigir a la página de búsqueda
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        toast.success(`Encontramos ${result.data.length} producto${result.data.length > 1 ? 's' : ''}`);
        onClose();
      }
    } catch (error: any) {
      console.error('Error buscando productos:', error);
      toast.error('Error al buscar productos. Intenta nuevamente.');
      setHasSearched(true);
      setHasResults(false);
    } finally {
      setIsSearching(false);
    }
  };

  // Crear sourcing order
  const handleCreateSourcingOrder = async () => {
    const result = await createSourcingOrder({
      raw_query: query,
      normalized: { query: query.trim() },
      source: 'web-assistant',
      channel: 'web',
    });

    if (result.success) {
      setQuery('');
      setHasSearched(false);
      setHasResults(false);
      onClose();
    }
  };

  // Manejar Enter en el input
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isSearching && !isCreatingOrder) {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            ¿Qué querés comprar?
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Texto de ayuda */}
          <p className="text-sm text-gray-600">
            Contanos qué producto estás buscando. Si no lo encontramos, lo buscaremos por vos.
          </p>

          {/* Ejemplos */}
          <div className="text-xs text-gray-500 space-y-1">
            <p className="font-medium">Ejemplos:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-2">
              <li>iPhone 13 Pro Max</li>
              <li>Notebook Dell Inspiron</li>
              <li>Bicicleta mountain bike</li>
            </ul>
          </div>

          {/* Input de búsqueda */}
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Ej: iPhone 13, Notebook Dell, Bicicleta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching || isCreatingOrder}
              className="w-full"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-2">
            <Button
              onClick={handleSearch}
              disabled={isSearching || isCreatingOrder || !query.trim()}
              loading={isSearching}
              className="flex-1"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Buscar
                </>
              )}
            </Button>
          </div>

          {/* Mensaje si no hay resultados */}
          {hasSearched && !hasResults && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              {isSeller ? (
                <p className="text-sm text-gray-700 text-center">
                  No encontramos productos para "{query}". Los vendedores no pueden crear pedidos "por conseguir". Esta funcionalidad es solo para compradores.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-700 mb-3">
                    No encontramos productos para "{query}". ¿Querés que lo busquemos por vos?
                  </p>
                  <Button
                    onClick={handleCreateSourcingOrder}
                    disabled={isCreatingOrder}
                    loading={isCreatingOrder}
                    variant="primary"
                    className="w-full"
                  >
                    {isCreatingOrder ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creando pedido...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Crear pedido por conseguir
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



