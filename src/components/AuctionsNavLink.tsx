'use client';

// ============================================
// MERCADITO ONLINE PY - AUCTIONS NAV LINK
// Enlace de navegación a subastas con contador
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Gavel, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Badge from '@/components/ui/Badge';

export default function AuctionsNavLink() {
  const [activeCount, setActiveCount] = useState<number>(0);
  const [endingSoonCount, setEndingSoonCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuctionsCount();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadAuctionsCount, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadAuctionsCount() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hora

      // Contar subastas activas
      const { count: activeCount, error: activeError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('sale_type', 'auction')
        .eq('auction_status', 'active')
        .gte('auction_end_at', now.toISOString());

      if (activeError) {
        console.error('Error loading active auctions count:', activeError);
        return;
      }

      // Contar subastas que terminan pronto (en la próxima hora)
      const { count: endingSoonCount, error: endingSoonError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('sale_type', 'auction')
        .eq('auction_status', 'active')
        .gte('auction_end_at', now.toISOString())
        .lte('auction_end_at', oneHourFromNow.toISOString());

      if (endingSoonError) {
        console.error('Error loading ending soon auctions count:', endingSoonError);
        return;
      }

      setActiveCount(activeCount || 0);
      setEndingSoonCount(endingSoonCount || 0);
    } catch (error) {
      console.error('Error loading auctions count:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading && activeCount === 0) {
    return (
      <Link
        href="/auctions"
        className="relative flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <Gavel className="h-5 w-5" />
        <span className="hidden sm:inline">Subastas</span>
      </Link>
    );
  }

  return (
    <Link
      href="/auctions"
      className="relative flex items-center gap-2 px-3 py-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors group"
    >
      <Gavel className="h-5 w-5" />
      <span className="hidden sm:inline">Subastas</span>
      
      {activeCount > 0 && (
        <Badge 
          variant={endingSoonCount > 0 ? "warning" : "success"} 
          size="sm"
          className="ml-1"
        >
          {activeCount}
        </Badge>
      )}
      
      {endingSoonCount > 0 && (
        <div className="absolute -top-1 -right-1">
          <div className="relative">
            <Clock className="h-4 w-4 text-orange-500 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
          </div>
        </div>
      )}
    </Link>
  );
}

