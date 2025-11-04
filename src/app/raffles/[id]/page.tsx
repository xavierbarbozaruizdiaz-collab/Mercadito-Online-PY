'use client';

// ============================================
// MERCADITO ONLINE PY - DETALLE DE SORTEO
// ============================================

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Ticket, Clock, Gift, Users, ArrowLeft, CheckCircle } from 'lucide-react';
import { 
  getRaffleById, 
  getUserTicketsInRaffle, 
  type Raffle, 
  type RaffleTicket 
} from '@/lib/services/raffleService';
import { supabase } from '@/lib/supabaseClient';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import BuyRaffleTicketsButton from '@/components/BuyRaffleTicketsButton';

export default function RaffleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const raffleId = params.id as string;
  
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [userTickets, setUserTickets] = useState<RaffleTicket[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, [raffleId]);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      // Cargar sorteo
      const raffleData = await getRaffleById(raffleId);
      if (!raffleData) {
        setError('Sorteo no encontrado');
        return;
      }
      setRaffle(raffleData);

      // Obtener usuario actual
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || null;
      setCurrentUserId(userId);

      // Si hay usuario, cargar sus tickets
      if (userId) {
        const tickets = await getUserTicketsInRaffle(raffleId, userId);
        setUserTickets(tickets);
      }
    } catch (err: any) {
      console.error('Error loading raffle:', err);
      setError(err.message || 'Error al cargar el sorteo');
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
            <p className="mt-4 text-gray-600">Cargando sorteo...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !raffle) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <Link href="/raffles" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Volver a sorteos
          </Link>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Sorteo no encontrado'}</p>
          </div>
        </div>
      </main>
    );
  }

  const userTicketsCount = userTickets.length;
  const probability = raffle.total_tickets > 0 
    ? ((userTicketsCount / raffle.total_tickets) * 100).toFixed(2)
    : '0.00';

  const isDrawn = raffle.status === 'drawn';
  const isEnded = raffle.status === 'ended' || isDrawn;

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Botón volver */}
        <Link href="/raffles" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a sorteos
        </Link>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Imagen del producto o sorteo */}
          <div className="relative h-64 sm:h-96 bg-gray-100">
            {raffle.product?.cover_url ? (
              <img
                src={raffle.product.cover_url}
                alt={raffle.product.title}
                className="w-full h-full object-cover"
              />
            ) : raffle.cover_url ? (
              <img
                src={raffle.cover_url}
                alt={raffle.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Gift className="w-24 h-24 text-gray-400" />
              </div>
            )}
            <div className="absolute top-4 right-4">
              <span className="bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                🎟️ Sorteo
              </span>
            </div>
          </div>

          {/* Contenido */}
          <div className="p-6 sm:p-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {raffle.title}
            </h1>

            {raffle.description && (
              <p className="text-gray-600 mb-6 leading-relaxed">
                {raffle.description}
              </p>
            )}

            {/* Producto sorteado */}
            {raffle.product && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <h2 className="text-lg font-semibold text-purple-900 mb-2">
                  Producto a sortear:
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{raffle.product.title}</p>
                    {raffle.product.price && (
                      <p className="text-sm text-gray-600 mt-1">
                        Valor: {Number(raffle.product.price).toLocaleString('es-PY')} Gs.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Estado del sorteo */}
            {isDrawn && raffle.winner_id && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">
                    Sorteo finalizado
                  </h3>
                </div>
                {raffle.winner && (
                  <p className="text-green-800">
                    Ganador: {raffle.winner.first_name && raffle.winner.last_name
                      ? `${raffle.winner.first_name} ${raffle.winner.last_name}`
                      : raffle.winner.email}
                  </p>
                )}
                {raffle.drawn_at && (
                  <p className="text-sm text-green-700 mt-1">
                    Sorteado el {new Date(raffle.drawn_at).toLocaleDateString('es-PY')}
                  </p>
                )}
              </div>
            )}

            {/* Estadísticas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <Ticket className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {raffle.total_tickets.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600 mt-1">Total de tickets</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">
                  {raffle.total_participants}
                </p>
                <p className="text-xs text-gray-600 mt-1">Participantes</p>
              </div>
              {currentUserId && (
                <>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <Ticket className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-900">
                      {userTicketsCount}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Tus tickets</p>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-4 text-center">
                    <Gift className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-orange-900">
                      {probability}%
                    </p>
                    <p className="text-xs text-gray-600 mt-1">Probabilidad</p>
                  </div>
                </>
              )}
            </div>

            {/* Countdown */}
            {!isEnded && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-orange-600" />
                  <div>
                    <p className="text-sm text-gray-600">Sorteo en:</p>
                    <p className="text-lg font-bold text-orange-600">
                      {formatDistanceToNow(new Date(raffle.draw_date), {
                        addSuffix: true,
                        locale: es,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Información de participación */}
            {raffle.raffle_type === 'purchase_based' && !isEnded && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2">
                  💰 Cómo participar
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>
                    • Compra productos por mínimo {raffle.min_purchase_amount.toLocaleString('es-PY')} Gs.
                  </li>
                  <li>
                    • Gana 1 ticket por cada {raffle.tickets_per_amount.toLocaleString('es-PY')} Gs. de compra
                  </li>
                  {raffle.max_tickets_per_user && (
                    <li>
                      • Máximo {raffle.max_tickets_per_user} tickets por usuario
                    </li>
                  )}
                  <li>• Los tickets se generan automáticamente al completar tu compra</li>
                </ul>
              </div>
            )}

            {/* Compra directa de cupones */}
            {raffle.allow_direct_purchase && raffle.ticket_price && !isEnded && (
              <div className="mb-6">
                <BuyRaffleTicketsButton
                  raffleId={raffle.id}
                  ticketPrice={raffle.ticket_price}
                  maxTicketsPerUser={raffle.max_tickets_per_user}
                  currentUserTickets={userTicketsCount}
                  onPurchaseComplete={loadData}
                />
              </div>
            )}

            {/* Mis tickets */}
            {currentUserId && userTickets.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Mis tickets ({userTicketsCount})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {userTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center"
                    >
                      <Ticket className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                      <p className="text-xs font-mono text-purple-900">
                        {ticket.ticket_number.split('-').pop()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!currentUserId && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-gray-600 mb-3">
                  Inicia sesión para ver tus tickets y participar
                </p>
                <Link
                  href="/auth/sign-in"
                  className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Iniciar sesión
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

