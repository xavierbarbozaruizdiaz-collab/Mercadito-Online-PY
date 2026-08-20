'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Ticket } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { HeaderNavPill } from '@/components/HeaderNavPill';

export default function RafflesNavLink() {
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRafflesCount();
    const interval = setInterval(loadRafflesCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadRafflesCount() {
    try {
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

  const isActive = pathname === '/raffles' || pathname?.startsWith('/raffles/');

  return (
    <HeaderNavPill
      href="/raffles"
      label="Sorteos"
      icon={Ticket}
      active={isActive}
      badge={!loading && activeCount > 0 ? activeCount : undefined}
    />
  );
}
