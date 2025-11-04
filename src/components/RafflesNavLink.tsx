'use client';

// ============================================
// MERCADITO ONLINE PY - RAFFLES NAV LINK
// Enlace de navegación a sorteos con contador
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Badge from '@/components/ui/Badge';

export default function RafflesNavLink() {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRafflesCount();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadRafflesCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadRafflesCount() {
    try {
      // Verificar si el sistema de sorteos está habilitado
      const { data: settings } = await supabase
        .from('raffle_settings')
        .select('value')
        .eq('key', 'global_enabled')
        .single();

      const isEnabled = settings?.value?.enabled === true;

      if (!isEnabled) {
        setActiveCount(0);
        setLoading(false);
        return;
      }

      // Contar sorteos activos
      const { count, error } = await supabase
        .from('raffles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .eq('is_enabled', true)
        .gte('draw_date', new Date().toISOString());

      if (error) {
        console.error('Error loading active raffles count:', error);
        return;
      }

      setActiveCount(count || 0);
    } catch (error) {
      console.error('Error loading raffles count:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && activeCount === 0) {
    return (
      <Link
        href="/raffles"
        className="relative flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <Ticket className="h-5 w-5" />
        <span className="hidden sm:inline">Sorteos</span>
      </Link>
    );
  }

  // No mostrar si no hay sorteos activos o el sistema está deshabilitado
  if (activeCount === 0) {
    return null;
  }

  return (
    <Link
      href="/raffles"
      className="relative flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors group"
    >
      <Ticket className="h-5 w-5" />
      <span className="hidden sm:inline">Sorteos</span>
      
      {activeCount > 0 && (
        <Badge 
          variant="success" 
          size="sm"
          className="ml-1"
        >
          {activeCount}
        </Badge>
      )}
    </Link>
  );
}

