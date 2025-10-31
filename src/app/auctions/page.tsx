'use client';

import { useState, useEffect, useMemo } from 'react';
import { getActiveAuctions, type AuctionProduct } from '@/lib/services/auctionService';
import AuctionCard from '@/components/auction/AuctionCard';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui';
import { Search, Filter, SlidersHorizontal, Clock, AlertCircle } from 'lucide-react';
import Select from '@/components/ui/Select';
import Badge from '@/components/ui/Badge';

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'all' | 'recent' | 'ending_soon' | 'price_asc' | 'price_desc'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadAuctions();
    
    // Recargar subastas cada 15 segundos para reflejar cambios (eliminaciones, actualizaciones)
    const refreshInterval = setInterval(() => {
      console.log('🔄 Refrescando subastas automáticamente...');
      loadAuctions();
    }, 15000); // Cada 15 segundos
    
    return () => clearInterval(refreshInterval);
  }, [search, category]);
  
  // También recargar cuando la ventana recupera el foco (usuario vuelve a la pestaña)
  useEffect(() => {
    const handleFocus = () => {
      console.log('🔄 Ventana recuperó foco, recargando subastas...');
      loadAuctions();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando subastas...', { search, category });
      
      const data = await getActiveAuctions({
        search: search || undefined,
        category: category || undefined,
      });
      
      console.log('✅ Subastas cargadas:', data.length, data);
      
      // Ordenar
      let sorted = [...data];
      switch (sortBy) {
        case 'all':
          // Para "TODAS", mostrar por fecha de creación (más recientes primero)
          sorted.sort((a, b) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime());
          break;
        case 'ending_soon':
          sorted.sort((a, b) => {
            const aEnd = a.auction_end_at ? new Date(a.auction_end_at).getTime() : 0;
            const bEnd = b.auction_end_at ? new Date(b.auction_end_at).getTime() : 0;
            return aEnd - bEnd;
          });
          break;
        case 'price_asc':
          sorted.sort((a, b) => (a.current_bid || a.price) - (b.current_bid || b.price));
          break;
        case 'price_desc':
          sorted.sort((a, b) => (b.current_bid || b.price) - (a.current_bid || a.price));
          break;
        case 'recent':
          sorted.sort((a, b) => new Date(b.created_at || b.id).getTime() - new Date(a.created_at || a.id).getTime());
          break;
      }
      
      setAuctions(sorted);
    } catch (error) {
      console.error('❌ Error loading auctions:', error);
      setAuctions([]); // Asegurar que se establezca un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, [sortBy]);

  // Separar subastas que terminan pronto (en la próxima hora)
  // Si está en modo "TODAS", no separar, mostrar todas juntas
  const { endingSoon, otherAuctions } = useMemo(() => {
    if (!auctions.length) return { endingSoon: [], otherAuctions: [] };
    
    // Si está en modo "TODAS", no separar por tiempo de finalización
    if (sortBy === 'all') {
      return { endingSoon: [], otherAuctions: auctions };
    }
    
    const now = Date.now();
    const oneHourFromNow = now + 60 * 60 * 1000; // 1 hora
    
    const endingSoon: AuctionProduct[] = [];
    const otherAuctions: AuctionProduct[] = [];
    
    auctions.forEach(auction => {
      if (auction.auction_end_at) {
        const endTime = new Date(auction.auction_end_at).getTime();
        if (endTime <= oneHourFromNow && endTime > now) {
          endingSoon.push(auction);
        } else {
          otherAuctions.push(auction);
        }
      } else {
        otherAuctions.push(auction);
      }
    });
    
    return { endingSoon, otherAuctions };
  }, [auctions, sortBy]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subastas Activas</h1>
        <p className="text-muted-foreground">
          Puja en tiempo real y gana los mejores productos
        </p>
      </div>

      {/* Filtros y búsqueda */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar subastas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Ordenar */}
          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">TODAS</option>
              <option value="ending_soon">Finaliza pronto</option>
              <option value="recent">Más recientes</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de subastas */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando subastas...</p>
        </div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg font-semibold mb-2">No hay subastas activas</p>
          <p className="text-muted-foreground">
            {search ? 'Intenta con otros términos de búsqueda' : 'Vuelve pronto para ver nuevas subastas'}
          </p>
        </div>
      ) : (
        <>
          {/* Modo "TODAS": mostrar todas las subastas juntas */}
          {sortBy === 'all' && (
            <div>
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                : 'space-y-4'
              }>
                {auctions.map((auction) => (
                  <AuctionCard
                    key={auction.id}
                    auction={auction}
                    variant={viewMode === 'list' ? 'compact' : 'default'}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Modo filtrado: separar subastas que terminan pronto */}
          {sortBy !== 'all' && (
            <>
              {/* Subastas que terminan pronto - Sección destacada */}
              {endingSoon.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500 animate-pulse" />
                      <h2 className="text-2xl font-bold text-gray-900">
                        Finalizan en menos de 1 hora
                      </h2>
                    </div>
                    <Badge variant="warning" size="lg">
                      {endingSoon.length} {endingSoon.length === 1 ? 'subasta' : 'subastas'}
                    </Badge>
                  </div>
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4 mb-4">
                    <div className={viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                      : 'space-y-4'
                    }>
                      {endingSoon.map((auction) => (
                        <div key={auction.id} className="relative">
                          <div className="absolute -top-2 -right-2 z-10">
                            <Badge variant="error" size="sm" className="animate-pulse">
                              <Clock className="h-3 w-3 mr-1" />
                              Finaliza pronto
                            </Badge>
                          </div>
                          <AuctionCard
                            auction={auction}
                            variant={viewMode === 'list' ? 'compact' : 'default'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Resto de subastas activas */}
              {otherAuctions.length > 0 && (
                <div>
                  {endingSoon.length > 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">
                        Otras subastas activas
                      </h2>
                      <Badge variant="secondary" size="md">
                        {otherAuctions.length}
                      </Badge>
                    </div>
                  )}
                  <div className={viewMode === 'grid' 
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' 
                    : 'space-y-4'
                  }>
                    {otherAuctions.map((auction) => (
                      <AuctionCard
                        key={auction.id}
                        auction={auction}
                        variant={viewMode === 'list' ? 'compact' : 'default'}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

