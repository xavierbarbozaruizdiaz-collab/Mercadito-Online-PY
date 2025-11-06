'use client';

import { useState, useEffect } from 'react';
import { getUserBids } from '@/lib/services/auctionService';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import Image from 'next/image';
import AuctionTimer from '@/components/auction/AuctionTimer';
import { Gavel, TrendingUp, TrendingDown, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { getSessionWithTimeout } from '@/lib/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface BidWithProduct {
  id: string;
  product_id: string;
  bidder_id: string;
  amount: number;
  bid_time: string;
  created_at: string;
  product?: {
    id: string;
    title: string;
    cover_url?: string;
    auction_status: string;
    auction_end_at?: string;
    current_bid?: number;
    winner_id?: string;
  };
}

export default function MyBidsPage() {
  const [bids, setBids] = useState<BidWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'winning' | 'won' | 'lost'>('all');

  useEffect(() => {
    const loadUser = async () => {
      const { data: session } = await getSessionWithTimeout();
      if (session?.session?.user?.id) {
        setUserId(session.session.user.id);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadBids();
    }
  }, [userId]);

  const loadBids = async () => {
    try {
      setLoading(true);
      if (!userId) return;
      
      const data = await getUserBids(userId);
      setBids(data as any);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar pujas según estado
  const filteredBids = bids.filter((bid) => {
    if (!bid.product) return false;
    
    const product = bid.product;
    const isActive = product.auction_status === 'active';
    const isEnded = product.auction_status === 'ended';
    const isWon = isEnded && product.winner_id === userId;
    const isLost = isEnded && product.winner_id !== userId && product.winner_id;
    
    // Determinar si está ganando (tiene la puja más alta)
    const isWinning = isActive && product.current_bid === bid.amount;

    switch (filter) {
      case 'active':
        return isActive;
      case 'winning':
        return isActive && isWinning;
      case 'won':
        return isWon;
      case 'lost':
        return isLost;
      default:
        return true;
    }
  });

  // Estadísticas
  const stats = {
    total: bids.length,
    active: bids.filter((b) => b.product?.auction_status === 'active').length,
    winning: bids.filter((b) => {
      const p = b.product;
      return p?.auction_status === 'active' && p.current_bid === b.amount;
    }).length,
    won: bids.filter((b) => {
      const p = b.product;
      return p?.auction_status === 'ended' && p.winner_id === userId;
    }).length,
    lost: bids.filter((b) => {
      const p = b.product;
      return p?.auction_status === 'ended' && p.winner_id && p.winner_id !== userId;
    }).length,
    totalAmount: bids.reduce((sum, b) => sum + b.amount, 0),
  };

  const getBidStatus = (bid: BidWithProduct) => {
    if (!bid.product) return 'unknown';
    
    const product = bid.product;
    const isActive = product.auction_status === 'active';
    const isEnded = product.auction_status === 'ended';
    
    if (isActive) {
      const isWinning = product.current_bid === bid.amount;
      return isWinning ? 'winning' : 'outbid';
    }
    
    if (isEnded) {
      return product.winner_id === userId ? 'won' : 'lost';
    }
    
    return 'unknown';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'winning':
        return <Badge variant="success" size="sm">Ganando</Badge>;
      case 'outbid':
        return <Badge variant="warning" size="sm">Puja superada</Badge>;
      case 'won':
        return <Badge variant="success" size="sm">Ganada</Badge>;
      case 'lost':
        return <Badge variant="secondary" size="sm">Perdida</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Mis Pujas</h1>
        <p className="text-muted-foreground">
          Gestiona todas tus pujas y subastas
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Activas</p>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Ganando</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.winning}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Ganadas</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.won}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-1">Total invertido</p>
            <p className="text-lg font-bold">{formatCurrency(stats.totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'active'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Activas ({stats.active})
        </button>
        <button
          onClick={() => setFilter('winning')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'winning'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Ganando ({stats.winning})
        </button>
        <button
          onClick={() => setFilter('won')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'won'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Ganadas ({stats.won})
        </button>
        <button
          onClick={() => setFilter('lost')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'lost'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Perdidas ({stats.lost})
        </button>
      </div>

      {/* Lista de pujas */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando tus pujas...</p>
        </div>
      ) : filteredBids.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Gavel className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-semibold mb-2">No hay pujas para mostrar</p>
            <p className="text-muted-foreground mb-4">
              {filter === 'all'
                ? 'Aún no has realizado ninguna puja. Explora las subastas activas y comienza a pujar.'
                : `No tienes pujas en la categoría "${filter}"`}
            </p>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="text-primary underline"
              >
                Ver todas las pujas
              </button>
            )}
            {filter === 'all' && (
              <Link href="/auctions">
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                  Ver Subastas Activas
                </button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBids.map((bid) => {
            const product = bid.product;
            const status = getBidStatus(bid);
            const isActive = product?.auction_status === 'active';
            
            // Calcular tiempo para timer
            let endAtMs = 0;
            if (product?.auction_end_at && isActive) {
              const endDate = new Date(product.auction_end_at);
              endAtMs = endDate.getTime();
            }

            return (
              <Card key={bid.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    {/* Imagen */}
                    <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {product?.cover_url ? (
                        <Image
                          src={product.cover_url}
                          alt={product.title || 'Producto'}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gavel className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Información */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <Link href={`/auctions/${bid.product_id}`}>
                            <h3 className="font-semibold text-lg hover:text-primary line-clamp-2">
                              {product?.title || 'Producto sin título'}
                            </h3>
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">
                            Puja realizada {formatDistanceToNow(new Date(bid.bid_time), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                        <div className="text-right">
                          {getStatusBadge(status)}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Tu puja</p>
                          <p className="text-lg font-bold">{formatCurrency(bid.amount)}</p>
                        </div>
                        {product && (
                          <>
                            <div>
                              <p className="text-sm text-muted-foreground">Puja actual</p>
                              <p className="text-lg font-semibold">
                                {formatCurrency(product.current_bid || product.current_bid || 0)}
                              </p>
                            </div>
                            {isActive && endAtMs > 0 && (
                              <div className="ml-auto">
                                <AuctionTimer
                                  endAtMs={endAtMs}
                                  serverNowMs={Date.now()}
                                  variant="compact"
                                  size="md"
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Acciones */}
                      <div className="mt-4 flex gap-2">
                        <Link href={`/auctions/${bid.product_id}`}>
                          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm flex items-center gap-2 hover:bg-primary/90">
                            Ver Subasta
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        </Link>
                        {status === 'outbid' && isActive && (
                          <Link href={`/auctions/${bid.product_id}`}>
                            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-700">
                              Pujar más
                              <TrendingUp className="h-4 w-4" />
                            </button>
                          </Link>
                        )}
                        {status === 'won' && (
                          <Link href={`/products/${bid.product_id}`}>
                            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-emerald-700">
                              Completar compra
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

