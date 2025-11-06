'use client';

import { useEffect, useState } from 'react';
import { getBidsForAuction, type AuctionBid } from '@/lib/services/auctionService';
import { formatCurrency } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import { getSessionWithTimeout } from '@/lib/supabase/client';
import { supabase } from '@/lib/supabaseClient';
// ScrollArea será un div con overflow si no existe el componente

interface BidHistoryProps {
  productId: string;
  realtime?: boolean;
}

export default function BidHistory({ productId, realtime = true }: BidHistoryProps) {
  const [bids, setBids] = useState<AuctionBid[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    // Obtener usuario actual
    const loadUser = async () => {
      const { data: session } = await getSessionWithTimeout();
      if (session?.session?.user?.id) {
        setCurrentUserId(session.session.user.id);
      }
    };
    loadUser();
  }, []);

  const loadBids = async () => {
    try {
      setLoading(true);
      const data = await getBidsForAuction(productId, 20);
      setBids(data);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBids();

    // Configurar suscripción en tiempo real si está habilitado
    if (realtime) {
      const channel = supabase
        .channel(`auction-bids-${productId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'auction_bids',
            filter: `product_id=eq.${productId}`,
          },
          (payload) => {
            // Recargar pujas cuando hay una nueva
            loadBids();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [productId, realtime]);

  const getBidderName = (bid: AuctionBid): string => {
    if (bid.bidder) {
      const firstName = bid.bidder.first_name || '';
      const lastName = bid.bidder.last_name || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      return bid.bidder.email?.split('@')[0] || 'Usuario';
    }
    return 'Usuario';
  };

  const getBidderInitials = (bid: AuctionBid): string => {
    const name = getBidderName(bid);
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const isMyBid = (bid: AuctionBid): boolean => {
    return currentUserId === bid.bidder_id;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Historial de Pujas</h3>
        <div className="text-center py-8 text-muted-foreground">
          Cargando pujas...
        </div>
      </div>
    );
  }

  if (bids.length === 0) {
    return (
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Historial de Pujas</h3>
        <div className="text-center py-8 text-muted-foreground">
          <p>Aún no hay pujas en esta subasta.</p>
          <p className="text-sm mt-1">¡Sé el primero en pujar!</p>
        </div>
      </div>
    );
  }

  // Ordenar pujas: la más alta primero
  const sortedBids = [...bids].sort((a, b) => {
    if (a.amount !== b.amount) {
      return b.amount - a.amount;
    }
    return new Date(b.bid_time).getTime() - new Date(a.bid_time).getTime();
  });

  const highestBid = sortedBids[0];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-lg">Historial de Pujas</h3>
        <Badge variant="secondary" size="sm">
          {bids.length} {bids.length === 1 ? 'puja' : 'pujas'}
        </Badge>
      </div>

      <div className="h-[400px] overflow-y-auto space-y-2 pr-4">
        {sortedBids.map((bid, index) => {
          const isHighest = index === 0;
          const isMyBidFlag = isMyBid(bid);
          const timeAgo = formatDistanceToNow(new Date(bid.bid_time), {
            addSuffix: true,
            locale: es,
          });

          return (
            <div
              key={bid.id}
              className={`
                flex items-center gap-3 p-3 rounded-lg border
                ${isHighest ? 'bg-emerald-50 border-emerald-200' : 'bg-background'}
                ${isMyBidFlag ? 'ring-2 ring-primary' : ''}
              `}
            >
              {/* Avatar */}
              <Avatar
                size="md"
                fallback={getBidderInitials(bid)}
                className={isMyBidFlag ? 'bg-primary text-primary-foreground' : ''}
              />

              {/* Información */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {getBidderName(bid)}
                  </p>
                  {isHighest && (
                    <Badge variant="success" size="sm">
                      Mayor
                    </Badge>
                  )}
                  {isMyBidFlag && (
                    <Badge variant="secondary" size="sm">
                      Tu puja
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {timeAgo}
                </p>
              </div>

              {/* Monto */}
              <div className="text-right">
                <p className="font-bold text-lg">
                  {formatCurrency(bid.amount)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {highestBid && (
        <div className="pt-2 border-t text-sm text-muted-foreground">
          <p>
            Puja más alta:{' '}
            <span className="font-semibold text-foreground">
              {formatCurrency(highestBid.amount)}
            </span>{' '}
            por <span className="font-medium">{getBidderName(highestBid)}</span>
          </p>
        </div>
      )}
    </div>
  );
}

