'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: GESTIÓN DE MULTAS
// Panel de administración de multas por no-pago de subastas
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, DollarSign, Calendar, User, Package } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type PenaltyStatus = 'pending' | 'paid' | 'waived' | 'cancelled';

type AuctionPenalty = {
  id: string;
  auction_id: string;
  user_id: string;
  order_id: string | null;
  winning_bid_amount: number;
  penalty_percent: number;
  penalty_amount: number;
  status: PenaltyStatus;
  membership_cancelled: boolean;
  membership_level_before: string;
  membership_level_after: string;
  applied_at: string;
  paid_at: string | null;
  waived_at: string | null;
  notified_at: string | null;
  auction?: {
    id: string;
    title: string;
  };
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
};

export default function AdminPenaltiesPage() {
  const [penalties, setPenalties] = useState<AuctionPenalty[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PenaltyStatus | 'all'>('all');
  const [selectedPenalty, setSelectedPenalty] = useState<AuctionPenalty | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [waiveReason, setWaiveReason] = useState('');

  useEffect(() => {
    loadPenalties();
  }, [filter]);

  async function loadPenalties() {
    setLoading(true);
    try {
      let query = supabase
        .from('auction_penalties')
        .select(`
          *,
          auction:products!auction_penalties_auction_id_fkey(id, title),
          user:profiles!auction_penalties_user_id_fkey(id, email, first_name, last_name)
        `)
        .order('applied_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPenalties((data || []) as AuctionPenalty[]);
    } catch (err) {
      logger.error('Error loading penalties', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(penaltyId: string, newStatus: PenaltyStatus, reason?: string) {
    if (!confirm(`¿Confirmas cambiar el estado a "${newStatus}"?`)) return;

    setProcessing(penaltyId);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('No autenticado');
        return;
      }

      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'paid') {
        updateData.paid_at = new Date().toISOString();
      } else if (newStatus === 'waived') {
        updateData.waived_at = new Date().toISOString();
        updateData.waived_by = session.session.user.id;
        updateData.waived_reason = reason || 'Sin razón especificada';
      }

      const { error } = await (supabase as any)
        .from('auction_penalties')
        .update(updateData)
        .eq('id', penaltyId);

      if (error) throw error;

      await loadPenalties();
      setSelectedPenalty(null);
      setWaiveReason('');
    } catch (err: any) {
      logger.error('Error updating penalty status', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessing(null);
    }
  }

  function getStatusColor(status: PenaltyStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'waived':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getStatusLabel(status: PenaltyStatus): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'paid':
        return 'Pagada';
      case 'waived':
        return 'Perdonada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  }

  function formatDate(dateString: string | null): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('es-PY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const filteredPenalties = penalties.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver al Panel
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Multas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Multas aplicadas por no-pago de subastas ganadas
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Nota:</strong> Las multas se aplican automáticamente cuando un ganador de subasta no completa el pago después del período de gracia (48 horas por defecto). 
            El porcentaje de multa es del 5% del monto adjudicado (configurable).
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {(['pending', 'paid', 'waived', 'cancelled'] as PenaltyStatus[]).map((status) => {
            const count = penalties.filter((p) => p.status === status).length;
            const total = penalties
              .filter((p) => p.status === status)
              .reduce((sum, p) => sum + parseFloat(p.penalty_amount.toString() || '0'), 0);
            return (
              <div key={status} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">{getStatusLabel(status)}</p>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColor(status)}`}>
                    {count}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(total)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex gap-2 overflow-x-auto">
            {(['all', 'pending', 'paid', 'waived', 'cancelled'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {f === 'all' ? 'Todas' : getStatusLabel(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Subasta
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Monto Adjudicado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Multa (5%)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Membresía
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredPenalties.map((penalty) => {
                    const userName = penalty.user
                      ? `${penalty.user.first_name || ''} ${penalty.user.last_name || ''}`.trim() || penalty.user.email
                      : 'Usuario desconocido';
                    
                    return (
                      <tr key={penalty.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <User className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 p-2 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {userName}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {penalty.user?.email || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {penalty.auction?.title || 'Subasta #' + penalty.auction_id.substring(0, 8)}
                          </div>
                          <Link
                            href={`/auctions/${penalty.auction_id}`}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                          >
                            Ver subasta
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {formatCurrency(penalty.winning_bid_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {formatCurrency(penalty.penalty_amount)}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {penalty.penalty_percent}%
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(penalty.status)}`}>
                            {getStatusLabel(penalty.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {penalty.membership_cancelled ? (
                            <div>
                              <div className="text-red-600 dark:text-red-400 font-medium">
                                Cancelada
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {penalty.membership_level_before} → {penalty.membership_level_after}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-600 dark:text-gray-400">Activa</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          <div>Aplicada: {formatDate(penalty.applied_at)}</div>
                          {penalty.paid_at && (
                            <div className="text-xs">Pagada: {formatDate(penalty.paid_at)}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {penalty.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStatusChange(penalty.id, 'paid')}
                                disabled={processing === penalty.id}
                                className="text-green-600 hover:text-green-900 dark:text-green-400"
                                title="Marcar como pagada"
                              >
                                <CheckCircle className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => setSelectedPenalty(penalty)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400"
                                title="Perdonar multa"
                              >
                                <XCircle className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                          {penalty.status === 'paid' && (
                            <span className="text-green-600 dark:text-green-400">✓ Pagada</span>
                          )}
                          {penalty.status === 'waived' && (
                            <span className="text-blue-600 dark:text-blue-400">✓ Perdonada</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredPenalties.length === 0 && (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No se encontraron multas</p>
              </div>
            )}
          </div>
        )}

        {/* Modal para perdonar multa */}
        {selectedPenalty && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Perdonar Multa
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                ¿Estás seguro de perdonar esta multa de {formatCurrency(selectedPenalty.penalty_amount)}?
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Razón (opcional)
                </label>
                <textarea
                  value={waiveReason}
                  onChange={(e) => setWaiveReason(e.target.value)}
                  placeholder="Explica por qué se perdona esta multa..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setSelectedPenalty(null);
                    setWaiveReason('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleStatusChange(selectedPenalty.id, 'waived', waiveReason)}
                  disabled={processing === selectedPenalty.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing === selectedPenalty.id ? 'Procesando...' : 'Perdonar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


