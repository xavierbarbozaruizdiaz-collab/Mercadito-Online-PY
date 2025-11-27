// ============================================
// MERCADITO ONLINE PY - USE SOURCING ORDER HOOK
// Hook reutilizable para crear sourcing orders
// ============================================

'use client';

import { useState } from 'react';
import { useToast } from '@/lib/hooks/useToast';
import { supabase } from '@/lib/supabase/client';

// ============================================
// TIPOS
// ============================================

interface CreateSourcingOrderParams {
  raw_query: string;
  normalized?: Record<string, any>;
  source?: string;
  channel?: string;
}

interface UseSourcingOrderReturn {
  isCreating: boolean;
  createSourcingOrder: (params: CreateSourcingOrderParams) => Promise<{ success: boolean; id?: string; error?: string }>;
}

// ============================================
// HOOK
// ============================================

export function useSourcingOrder(): UseSourcingOrderReturn {
  const [isCreating, setIsCreating] = useState(false);
  const toast = useToast();

  const createSourcingOrder = async (params: CreateSourcingOrderParams): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!params.raw_query || !params.raw_query.trim()) {
      const error = 'Por favor ingresá qué querés comprar';
      toast.error(error);
      return { success: false, error };
    }

    setIsCreating(true);

    try {
      // Obtener el token de sesión de Supabase (está en localStorage)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        toast.error('No autorizado. Debes iniciar sesión.');
        return { success: false, error: 'No autorizado. Debes iniciar sesión.' };
      }

      // Verificar si el usuario es vendedor (tiene una tienda activa)
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('seller_id', session.user.id)
        .eq('is_active', true)
        .limit(1);

      if (storesError) {
        console.error('Error verificando tienda:', storesError);
        // Si hay error, continuar (no bloquear por error técnico)
      } else if (stores && stores.length > 0) {
        // El usuario es vendedor, bloquear la creación
        const error = 'Los vendedores no pueden crear pedidos "por conseguir". Esta funcionalidad es solo para compradores.';
        toast.error(error);
        return { success: false, error };
      }

      const response = await fetch('/api/assistant/sourcing-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`, // Enviar token en header
        },
        credentials: 'include', // Incluir cookies para autenticación
        body: JSON.stringify({
          raw_query: params.raw_query.trim(),
          normalized: params.normalized || { query: params.raw_query.trim() },
          source: params.source || 'web-assistant',
          channel: params.channel || 'web',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'Error al crear el pedido';
        toast.error(errorMessage);
        return { success: false, error: errorMessage };
      }

      const data = await response.json();
      toast.success('¡Pedido creado! Te contactaremos cuando encontremos lo que buscás.');
      return { success: true, id: data.id };
    } catch (error: any) {
      console.error('Error creando sourcing order:', error);
      const errorMessage = error.message || 'Error al crear el pedido. Intenta nuevamente.';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createSourcingOrder,
  };
}

