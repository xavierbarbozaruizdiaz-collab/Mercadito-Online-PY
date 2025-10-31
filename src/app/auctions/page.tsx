'use client';

import { useState, useEffect } from 'react';
import { getActiveAuctions, type AuctionProduct } from '@/lib/services/auctionService';
import AuctionCard from '@/components/auction/AuctionCard';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import Select from '@/components/ui/Select';

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'ending_soon' | 'price_asc' | 'price_desc'>('ending_soon');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadAuctions();
  }, [search, category]);

  const loadAuctions = async () => {
    try {
      setLoading(true);
      const data = await getActiveAuctions({
        search: search || undefined,
        category: category || undefined,
      });
      
      // Ordenar
      let sorted = [...data];
      switch (sortBy) {
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
          sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          break;
      }
      
      setAuctions(sorted);
    } catch (error) {
      console.error('Error loading auctions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuctions();
  }, [sortBy]);

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
      )}
    </div>
  );
}

