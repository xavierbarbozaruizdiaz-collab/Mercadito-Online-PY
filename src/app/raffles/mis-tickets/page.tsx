'use client';

// ============================================
// MERCADITO ONLINE PY - MIS TICKETS
// Página para ver los tickets del usuario
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Gift, Clock, CheckCircle, ArrowLeft } from 'lucide-react';
import { getUserTickets, getUserRaffleStats, type RaffleStats } from '@/lib/services/raffleService';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface TicketWithRaffle {
  id: string;
  raffle_id: string;
  user_id: string;
  order_id?: string | null;
  ticket_number: string;
  ticket_type: 'purchase' | 'seller_bonus' | 'admin_bonus' | 'manual';
  purchase_amount?: number | null;
  created_at: string;
  raffle: {
    id: string;
    title: string;
    product_id?: string | null;
    draw_date: string;
    status: 'draft' | 'active' | 'ended' | 'cancelled' | 'drawn';
    product?: {
      id: string;
      title: string;
      cover_url?: string | null;
    } | null;
  };
}

export default function MyTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketWithRaffle[]>([]);
  const [stats, setStats] = useState<RaffleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Verificar autenticación
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      const userId = session.user.id;
      setCurrentUserId(userId);

      // Cargar tickets y estadísticas
      const [ticketsData, statsData] = await Promise.all([
        getUserTickets(userId),
        getUserRaffleStats(userId)
      ]);

      setTickets(ticketsData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Error loading tickets:', err);
      setError(err.message || 'Error al cargar tus tickets');
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
            <p className="mt-4 text-gray-600">Cargando tus tickets...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/raffles" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a sorteos
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  // Agrupar tickets por sorteo
  const ticketsByRaffle = tickets.reduce((acc, ticket) => {
    const raffleId = ticket.raffle_id;
    if (!acc[raffleId]) {
      acc[raffleId] = {
        raffle: ticket.raffle,
        tickets: []
      };
    }
    acc[raffleId].tickets.push(ticket);
    return acc;
  }, {} as Record<string, { raffle: TicketWithRaffle['raffle']; tickets: TicketWithRaffle[] }>);

  const raffles = Object.values(ticketsByRaffle);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/raffles" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a sorteos
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Ticket className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Mis Tickets</h1>
          </div>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <Ticket className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.total_tickets}</p>
              <p className="text-xs text-gray-600 mt-1">Total tickets</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <Gift className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.active_raffles_count}</p>
              <p className="text-xs text-gray-600 mt-1">Sorteos activos</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.participated_raffles_count}</p>
              <p className="text-xs text-gray-600 mt-1">Participaciones</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.won_raffles_count}</p>
              <p className="text-xs text-gray-600 mt-1">Ganados</p>
            </div>
          </div>
        )}

        {/* Lista de sorteos */}
        {raffles.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Ticket className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No tienes tickets aún</h2>
            <p className="text-gray-600 mb-4">
              Realiza compras para ganar tickets automáticamente en sorteos activos.
            </p>
            <Link
              href="/raffles"
              className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Ver sorteos activos
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {raffles.map(({ raffle, tickets: raffleTickets }) => {
              const isDrawn = raffle.status === 'drawn';
              const isEnded = raffle.status === 'ended' || isDrawn;
              
              return (
                <div
                  key={raffle.id}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                          {raffle.title}
                        </h2>
                        {raffle.product && (
                          <p className="text-sm text-gray-600">
                            Producto: {raffle.product.title}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/raffles/${raffle.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Ver sorteo →
                      </Link>
                    </div>

                    {/* Estado */}
                    <div className="mb-4">
                      {isDrawn ? (
                        <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-3 py-1 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Sorteo finalizado
                        </div>
                      ) : isEnded ? (
                        <div className="inline-flex items-center gap-2 bg-gray-50 text-gray-800 px-3 py-1 rounded-full text-sm">
                          <Clock className="w-4 h-4" />
                          Finalizado
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 px-3 py-1 rounded-full text-sm">
                          <Clock className="w-4 h-4" />
                          Sorteo en{' '}
                          {formatDistanceToNow(new Date(raffle.draw_date), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                      )}
                    </div>

                    {/* Tickets */}
                    <div>
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        Tus tickets ({raffleTickets.length}):
                      </p>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                        {raffleTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center"
                          >
                            <Ticket className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                            <p className="text-xs font-mono text-purple-900">
                              {ticket.ticket_number.split('-').pop()}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

