'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import AuctionTimer from './AuctionTimer';
import { Gavel, Users, Clock } from 'lucide-react';

interface AuctionCardProps {
  auction: {
    id: string;
    title: string;
    cover_url?: string;
    current_bid?: number;
    price: number;
    total_bids: number;
    auction_end_at?: string;
    auction_status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  };
  variant?: 'default' | 'compact';
}

export default function AuctionCard({ auction, variant = 'default' }: AuctionCardProps) {
  const isEnded = auction.auction_status === 'ended' || auction.auction_status === 'cancelled';
  const isActive = auction.auction_status === 'active';
  
  const currentBid = auction.current_bid || auction.price;
  
  // Calcular tiempo restante
  let endAtMs = 0;
  let serverNowMs = Date.now();
  
  if (auction.auction_end_at && !isEnded) {
    const endDate = new Date(auction.auction_end_at);
    endAtMs = endDate.getTime();
  }

  if (variant === 'compact') {
    return (
      <Link href={`/auctions/${auction.id}`}>
        <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex gap-3 p-3">
            {/* Imagen compacta */}
            <div className="relative w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
              {auction.cover_url ? (
                <Image
                  src={auction.cover_url}
                  alt={auction.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Gavel className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Contenido */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                {auction.title}
              </h3>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(currentBid)}
                </span>
                {isActive && (
                  <Badge variant="secondary" size="sm">
                    <Users className="h-3 w-3 mr-1" />
                    {auction.total_bids}
                  </Badge>
                )}
              </div>
              {isActive && endAtMs > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <AuctionTimer
                    endAtMs={endAtMs}
                    serverNowMs={serverNowMs}
                    variant="compact"
                    size="md"
                  />
                </div>
              )}
              {isEnded && (
                <Badge variant="default" className="text-xs">
                  Finalizada
                </Badge>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/auctions/${auction.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full flex flex-col">
        {/* Imagen */}
        <div className="relative w-full h-48 bg-muted">
          {auction.cover_url ? (
            <Image
              src={auction.cover_url}
              alt={auction.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Gavel className="h-16 w-16" />
            </div>
          )}
          
          {/* Badge de estado */}
          <div className="absolute top-2 right-2">
            {isActive && (
              <Badge variant="success" size="sm">
                <Gavel className="h-3 w-3 mr-1" />
                En Vivo
              </Badge>
            )}
            {isEnded && (
              <Badge variant="secondary" size="sm">Finalizada</Badge>
            )}
          </div>
        </div>

        <CardContent className="flex-1 flex flex-col p-4">
          {/* Título */}
          <h3 className="font-semibold text-lg mb-2 line-clamp-2">
            {auction.title}
          </h3>

          {/* Timer (solo si está activa) */}
          {isActive && endAtMs > 0 && (
            <div className="mb-3">
              <AuctionTimer
                endAtMs={endAtMs}
                serverNowMs={serverNowMs}
                variant="compact"
                size="md"
                tickMs={1000}
              />
            </div>
          )}

          {/* Precio y pujas */}
          <div className="space-y-2 mt-auto">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Puja actual</span>
              <span className="text-xl font-bold text-primary">
                {formatCurrency(currentBid)}
              </span>
            </div>
            
            {isActive && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {auction.total_bids} {auction.total_bids === 1 ? 'puja' : 'pujas'}
                </span>
                <Badge variant="secondary" size="sm">Activa</Badge>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="p-4 pt-0">
          <div className="w-full text-center text-sm text-muted-foreground">
            {isActive ? 'Ver subasta →' : 'Ver detalles →'}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

