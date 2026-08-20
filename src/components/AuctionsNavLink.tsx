'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Gavel } from 'lucide-react';
import { HeaderNavPill } from '@/components/HeaderNavPill';
import { getActiveAuctions } from '@/lib/services/auctionService';

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
      const auctions = await getActiveAuctions();
      const now = Date.now();
      const oneHourFromNow = now + 60 * 60 * 1000;

      const live = auctions.filter((a) => a.auction_status === 'active');
      const endingSoon = live.filter((a) => {
        if (!a.auction_end_at) return false;
        const end = new Date(a.auction_end_at).getTime();
        return end <= oneHourFromNow && end > now;
      });

      setActiveCount(live.length);
      setEndingSoonCount(endingSoon.length);
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
