// ============================================
// MERCADITO ONLINE PY - SOURCING ORDER PROMPT
// Componente reutilizable para mostrar opción de crear sourcing order
// ============================================

'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { useSourcingOrder } from '@/lib/hooks/useSourcingOrder';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

// ============================================
// TIPOS
// ============================================

interface SourcingOrderPromptProps {
  query: string;
  onSuccess?: () => void;
  className?: string;
  variant?: 'inline' | 'card';
}

// ============================================
// COMPONENTE
// ============================================

export default function SourcingOrderPrompt({
  query,
  onSuccess,
  className = '',
  variant = 'card',
}: SourcingOrderPromptProps) {
  const { isCreating, createSourcingOrder } = useSourcingOrder();
  const [isSeller, setIsSeller] = useState<boolean | null>(null);
  const [checkingSeller, setCheckingSeller] = useState(true);

  // Verificar si el usuario es vendedor
  useEffect(() => {
    async function checkIfSeller() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setIsSeller(false);
          setCheckingSeller(false);
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
      } finally {
        setCheckingSeller(false);
      }
    }

    checkIfSeller();
  }, []);

  // Si está verificando o es vendedor, no mostrar el componente
  if (checkingSeller || isSeller) {
    return null;
  }

  const handleCreateOrder = async () => {
    const result = await createSourcingOrder({
      raw_query: query,
      normalized: { query: query.trim() },
      source: 'web-search',
      channel: 'web',
    });

    if (result.success && onSuccess) {
      onSuccess();
    }
  };

  if (variant === 'inline') {
    return (
      <div className={cn('mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg', className)}>
        <p className="text-sm text-gray-700 mb-3">
          No encontramos productos para "{query}". ¿Querés que lo busquemos por vos?
        </p>
        <Button
          onClick={handleCreateOrder}
          disabled={isCreating}
          loading={isCreating}
          variant="primary"
          className="w-full"
        >
          {isCreating ? (
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
      </div>
    );
  }

  // Variant 'card' (default)
  return (
    <div className={cn('p-6 bg-blue-50 border border-blue-200 rounded-lg', className)}>
      <div className="text-center">
        <ShoppingBag className="w-12 h-12 mx-auto mb-4 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No encontramos productos
        </h3>
        <p className="text-sm text-gray-700 mb-4">
          No encontramos productos para "{query}". ¿Querés que lo busquemos por vos?
        </p>
        <Button
          onClick={handleCreateOrder}
          disabled={isCreating}
          loading={isCreating}
          variant="primary"
        >
          {isCreating ? (
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
      </div>
    </div>
  );
}

