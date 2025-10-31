'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getAuctionById, getAuctionStats, type AuctionProduct } from '@/lib/services/auctionService';
import AuctionTimer from '@/components/auction/AuctionTimer';
import BidForm from '@/components/auction/BidForm';
import BidHistory from '@/components/auction/BidHistory';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Badge from '@/components/ui/Badge';
import { ArrowLeft, Gavel, User, MapPin, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import ProductImageGallery from '@/components/ProductImageGallery';

export default function AuctionDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  
  const [auction, setAuction] = useState<AuctionProduct | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastBidTime, setLastBidTime] = useState<number>(0);

  useEffect(() => {
    if (productId) {
      loadAuction();
      
      // Configurar suscripción en tiempo real para actualizar el timer cuando hay nuevas pujas
      const channel = supabase
        .channel(`auction-${productId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products',
            filter: `id=eq.${productId}`,
          },
          (payload) => {
            // Recargar subasta cuando cambia
            loadAuction();
            if (payload.new) {
              const newAuction = payload.new as any;
              if (newAuction.auction_end_at) {
                setLastBidTime(Date.now());
              }
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'auction_bids',
            filter: `product_id=eq.${productId}`,
          },
          () => {
            // Nueva puja recibida - actualizar tiempo para anti-sniping
            setLastBidTime(Date.now());
            loadAuction();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [productId]);

  const loadAuction = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [auctionData, statsData] = await Promise.all([
        getAuctionById(productId),
        getAuctionStats(productId),
      ]);

      if (!auctionData) {
        setError('Subasta no encontrada');
        return;
      }

      setAuction(auctionData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading auction:', err);
      setError(err.message || 'Error al cargar la subasta');
    } finally {
      setLoading(false);
    }
  };

  const handleBidPlaced = () => {
    // Recargar subasta y actualizar timer
    loadAuction();
    setLastBidTime(Date.now());
  };

  const handleBuyNow = () => {
    // Recargar para mostrar estado actualizado
    loadAuction();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando subasta...</p>
        </div>
      </div>
    );
  }

  if (error || !auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <p className="text-lg font-semibold text-red-600 mb-2">
            {error || 'Subasta no encontrada'}
          </p>
          <Link href="/auctions" className="text-primary underline">
            ← Volver a subastas
          </Link>
        </div>
      </div>
    );
  }

  const isActive = auction.auction_status === 'active';
  const isEnded = auction.auction_status === 'ended' || auction.auction_status === 'cancelled';
  const currentBid = auction.current_bid || auction.price;
  
  // Calcular tiempo para el timer
  let endAtMs = 0;
  const serverNowMs = Date.now();
  
  if (auction.auction_end_at && !isEnded) {
    const endDate = new Date(auction.auction_end_at);
    endAtMs = endDate.getTime();
  }

  // Obtener imágenes del producto
  const productImages = auction.cover_url ? [auction.cover_url] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Botón volver */}
      <Link
        href="/auctions"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a subastas
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Columna izquierda: Imágenes y detalles */}
        <div className="lg:col-span-2 space-y-6">
          {/* Galería de imágenes */}
          <Card>
            <CardContent className="p-0">
              {productImages.length > 0 ? (
                <ProductImageGallery images={productImages} />
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <Gavel className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información del producto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">{auction.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {auction.description && (
                <div>
                  <h3 className="font-semibold mb-2">Descripción</h3>
                  <p className="text-muted-foreground whitespace-pre-line">
                    {auction.description}
                  </p>
                </div>
              )}

              {/* Información de la subasta */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Precio inicial</p>
                  <p className="font-semibold">
                    {formatCurrency(auction.attributes?.auction?.starting_price || auction.price)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Pujas recibidas</p>
                  <p className="font-semibold">{auction.total_bids || 0}</p>
                </div>
                {auction.buy_now_price && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Compra ahora</p>
                    <p className="font-semibold text-emerald-600">
                      {formatCurrency(auction.buy_now_price)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Información del vendedor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                Vendedor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Información del vendedor (próximamente)
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Columna derecha: Timer, formulario de puja, historial */}
        <div className="space-y-6">
          {/* Timer */}
          {isActive && endAtMs > 0 && (
            <Card>
              <CardContent className="p-6">
                <AuctionTimer
                  endAtMs={endAtMs}
                  serverNowMs={serverNowMs}
                  variant="full"
                  size="lg"
                  lastBidAtMs={lastBidTime}
                  onExpire={() => {
                    loadAuction();
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Estado finalizado */}
          {isEnded && (
            <Card>
              <CardContent className="p-6 text-center">
                <Badge variant="secondary" size="lg" className="mb-4">
                  Subasta Finalizada
                </Badge>
                {auction.winner_id && (
                  <p className="text-sm text-muted-foreground">
                    Ganador asignado
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Formulario de puja */}
          {isActive && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Realizar Puja</CardTitle>
              </CardHeader>
              <CardContent>
                <BidForm
                  productId={productId}
                  currentBid={currentBid}
                  minBidIncrement={auction.min_bid_increment}
                  buyNowPrice={auction.buy_now_price}
                  sellerId={auction.seller_id}
                  onBidPlaced={handleBidPlaced}
                  onBuyNow={handleBuyNow}
                />
              </CardContent>
            </Card>
          )}

          {/* Historial de pujas */}
          <Card>
            <CardContent className="p-6">
              <BidHistory productId={productId} realtime={true} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

