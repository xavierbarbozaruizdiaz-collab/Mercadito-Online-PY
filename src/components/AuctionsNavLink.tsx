'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Gavel } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { HeaderNavPill } from '@/components/HeaderNavPill';

export default function AuctionsNavLink() {
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState(0);
  const [endingSoonCount, setEndingSoonCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAuctionsCount();
    const interval = setInterval(loadAuctionsCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAuctionsCount() {
    try {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      const { count: active, error: activeError } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('sale_type', 'auction')
        .eq('auction_status', 'active')
        .gte('auction_end_at', now.toISOString());

      if (activeError) {
        console.error('Error loading active auctions count:', activeError);
        return;
      }

      const { count: endingSoon, error: endingSoonError } = await supabase
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

      setActiveCount(active || 0);
      setEndingSoonCount(endingSoon || 0);
    } catch (error) {
      console.error('Error loading auctions count:', error);
    } finally {
      setLoading(false);
    }
  }

  const isActive = pathname === '/auctions' || pathname?.startsWith('/auctions/');

  return (
    <HeaderNavPill
      href="/auctions"
      label="Subastas"
      icon={Gavel}
      active={isActive}
      badge={!loading && activeCount > 0 ? activeCount : undefined}
      alertDot={endingSoonCount > 0}
    />
  );
}
