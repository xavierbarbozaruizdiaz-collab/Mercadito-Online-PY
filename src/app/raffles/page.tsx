'use client';

// ============================================
// MERCADITO ONLINE PY - PÁGINA DE SORTEOS
// Lista de sorteos activos
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ticket, Clock, Gift, Users } from 'lucide-react';
import { getActiveRaffles, type Raffle } from '@/lib/services/raffleService';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export default function RafflesPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRaffles();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadRaffles, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadRaffles() {
    try {
      setLoading(true);
      setError(null);
      const data = await getActiveRaffles();
      setRaffles(data);
    } catch (err: any) {
      console.error('Error loading raffles:', err);
      setError(err.message || 'Error al cargar sorteos');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando sorteos...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={loadRaffles}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Ticket className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Sorteos Activos</h1>
          </div>
          <p className="text-gray-600">
            Participa en nuestros sorteos y gana productos increíbles. Cada compra te da tickets para participar.
          </p>
        </div>

        {raffles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No hay sorteos activos</h2>
            <p className="text-gray-600">
              Vuelve pronto para ver nuevos sorteos disponibles.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {raffles.map((raffle) => (
              <Link
                key={raffle.id}
                href={`/raffles/${raffle.id}`}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-200 group"
              >
                {/* Imagen del producto */}
                <div className="relative h-48 bg-gray-100 overflow-hidden">
                  {raffle.product?.cover_url ? (
                    <img
                      src={raffle.product.cover_url}
                      alt={raffle.product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="w-16 h-16 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                      🎟️ Sorteo
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {raffle.title}
                  </h2>
                  
                  {raffle.product && (
                    <p className="text-sm text-gray-600 mb-4">
                      Producto: <span className="font-medium">{raffle.product.title}</span>
                    </p>
                  )}

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-purple-600" />
                      <div>
                        <p className="text-xs text-gray-500">Tickets</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {raffle.total_tickets.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <div>
                        <p className="text-xs text-gray-500">Participantes</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {raffle.total_participants}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>
                      Sorteo en{' '}
                      <span className="font-semibold text-orange-600">
                        {formatDistanceToNow(new Date(raffle.draw_date), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </span>
                  </div>

                  {/* Información de participación */}
                  {raffle.raffle_type === 'purchase_based' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-600">
                        💰 Compra por mínimo {raffle.min_purchase_amount.toLocaleString('es-PY')} Gs.
                        y gana tickets automáticamente
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Link a mis tickets */}
        <div className="mt-8 text-center">
          <Link
            href="/raffles/mis-tickets"
            className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
          >
            <Ticket className="w-5 h-5" />
            Ver mis tickets
          </Link>
        </div>
      </div>
    </main>
  );
}

