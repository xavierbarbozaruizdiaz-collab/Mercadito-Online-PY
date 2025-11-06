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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header mejorado */}
        <div className="mb-10">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 sm:p-12 text-white shadow-lg mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Ticket className="w-10 h-10" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">Sorteos Activos</h1>
                <p className="text-purple-100 text-base sm:text-lg">
                  Participa y gana productos increíbles. Cada compra te da tickets automáticamente.
                </p>
              </div>
            </div>
          </div>
        </div>

        {raffles.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 sm:p-16 text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ticket className="w-8 h-8 text-purple-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">No hay sorteos activos</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Vuelve pronto para ver nuevos sorteos disponibles. ¡Sigue comprando para acumular tickets!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {raffles.map((raffle) => (
              <Link
                key={raffle.id}
                href={`/raffles/${raffle.id}`}
                className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group hover:-translate-y-1"
              >
                {/* Imagen del producto */}
                <div className="relative h-56 bg-gradient-to-br from-purple-100 to-pink-100 overflow-hidden">
                  {raffle.product?.cover_url ? (
                    <img
                      src={raffle.product.cover_url}
                      alt={raffle.product.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="w-16 h-16 text-purple-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute top-4 right-4">
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg">
                      🎟️ Sorteo
                    </span>
                  </div>
                </div>

                {/* Contenido */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {raffle.title}
                  </h2>
                  
                  {raffle.product && (
                    <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-xs text-purple-700 font-semibold uppercase tracking-wide mb-1">Producto</p>
                      <p className="text-sm font-medium text-gray-900">
                        {raffle.product.title}
                      </p>
                    </div>
                  )}

                  {/* Estadísticas */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl border border-purple-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Ticket className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-purple-700 font-semibold uppercase">Tickets</p>
                      </div>
                      <p className="text-lg font-bold text-purple-900">
                        {raffle.total_tickets.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl border border-blue-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-blue-700 font-semibold uppercase">Participantes</p>
                      </div>
                      <p className="text-lg font-bold text-blue-900">
                        {raffle.total_participants}
                      </p>
                    </div>
                  </div>

                  {/* Countdown */}
                  <div className="flex items-center gap-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 mb-4 border border-orange-200">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-orange-700 font-semibold uppercase mb-1">Sorteo en</p>
                      <p className="text-sm font-bold text-orange-900">
                        {formatDistanceToNow(new Date(raffle.draw_date), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Información de participación */}
                  {raffle.raffle_type === 'purchase_based' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-800 font-medium">
                        💰 Compra por mínimo <span className="font-bold">{raffle.min_purchase_amount.toLocaleString('es-PY')} Gs.</span> y gana tickets automáticamente
                      </p>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Link a mis tickets */}
        {raffles.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/raffles/mis-tickets"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all font-bold shadow-lg hover:shadow-xl"
            >
              <Ticket className="w-6 h-6" />
              Ver mis tickets
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

