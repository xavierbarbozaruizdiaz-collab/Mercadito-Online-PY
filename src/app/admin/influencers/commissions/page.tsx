'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: COMISIONES DE INFLUENCERS
// Gestión de comisiones pendientes y pagos
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getPendingCommissionsByInfluencer,
  markCommissionsAsPaid,
  getInfluencerCommissions,
  type InfluencerCommission,
} from '@/lib/services/influencerService';
import { logger } from '@/lib/utils/logger';
import {
  ArrowLeft,
  DollarSign,
  CheckCircle,
  Calendar,
  Filter,
  Download,
  Search,
} from 'lucide-react';

type PendingCommissionGroup = {
  influencer_id: string;
  influencer_name: string;
  influencer_code: string;
  total_pending: number;
  commission_count: number;
};

export default function InfluencerCommissionsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<PendingCommissionGroup[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<InfluencerCommission[]>([]);
  const [selectedCommissions, setSelectedCommissions] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<'pending' | 'all'>('pending');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedInfluencer) {
      loadCommissions();
    }
  }, [selectedInfluencer, filterStatus]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await getPendingCommissionsByInfluencer();
      setGroups(data);
    } catch (err) {
      logger.error('Error loading pending commissions', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCommissions() {
    if (!selectedInfluencer) return;

    try {
      const data = await getInfluencerCommissions(selectedInfluencer, {
        status: filterStatus === 'pending' ? 'pending' : undefined,
      });
      setCommissions(data);
    } catch (err) {
      logger.error('Error loading commissions', err);
    }
  }

  async function handleMarkAsPaid() {
    if (selectedCommissions.size === 0) {
      alert('Selecciona al menos una comisión');
      return;
    }

    if (!confirm(`¿Marcar ${selectedCommissions.size} comisión(es) como pagada(s)?`)) return;

    try {
      await markCommissionsAsPaid(Array.from(selectedCommissions));
      setSelectedCommissions(new Set());
      await loadData();
      if (selectedInfluencer) {
        await loadCommissions();
      }
    } catch (err: any) {
      logger.error('Error marking commissions as paid', err);
      alert(err.message || 'Error al procesar pagos');
    }
  }

  function toggleCommission(id: string) {
    const newSet = new Set(selectedCommissions);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCommissions(newSet);
  }

  const totalPending = groups.reduce((sum, g) => sum + g.total_pending, 0);
  const selectedTotal = commissions
    .filter((c) => selectedCommissions.has(c.id))
    .reduce((sum, c) => sum + c.commission_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/influencers"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Comisiones de Influencers
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Gestiona comisiones pendientes y pagos
              </p>
            </div>
            {selectedCommissions.size > 0 && (
              <button
                onClick={handleMarkAsPaid}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                <CheckCircle className="h-5 w-5" />
                Marcar como Pagado ({selectedCommissions.size})
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Pendiente</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG',
                    minimumFractionDigits: 0,
                  }).format(totalPending)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Influencers</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {groups.length}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Seleccionado</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat('es-PY', {
                    style: 'currency',
                    currency: 'PYG',
                    minimumFractionDigits: 0,
                  }).format(selectedTotal)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Lista de influencers */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Influencers con Comisiones
              </h2>
              {loading ? (
                <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
              ) : groups.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">
                  No hay comisiones pendientes
                </p>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <button
                      key={group.influencer_id}
                      onClick={() => setSelectedInfluencer(group.influencer_id)}
                      className={`w-full text-left p-3 rounded-lg transition ${
                        selectedInfluencer === group.influencer_id
                          ? 'bg-blue-50 dark:bg-blue-900 border-2 border-blue-500'
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">
                        {group.influencer_name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {group.commission_count} comisión(es)
                      </div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
                        {new Intl.NumberFormat('es-PY', {
                          style: 'currency',
                          currency: 'PYG',
                          minimumFractionDigits: 0,
                        }).format(group.total_pending)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Comisiones del influencer seleccionado */}
          <div className="lg:col-span-2">
            {selectedInfluencer ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Comisiones
                  </h2>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="pending">Pendientes</option>
                    <option value="all">Todas</option>
                  </select>
                </div>

                {commissions.length === 0 ? (
                  <p className="text-gray-600 dark:text-gray-400">
                    No hay comisiones para este influencer
                  </p>
                ) : (
                  <div className="space-y-2">
                    {commissions.map((commission) => (
                      <div
                        key={commission.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border-2 ${
                          selectedCommissions.has(commission.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900'
                            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCommissions.has(commission.id)}
                          onChange={() => toggleCommission(commission.id)}
                          className="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                Orden #{commission.order_id.slice(0, 8)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(commission.created_at).toLocaleDateString('es-PY', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {new Intl.NumberFormat('es-PY', {
                                  style: 'currency',
                                  currency: 'PYG',
                                  minimumFractionDigits: 0,
                                }).format(commission.commission_amount)}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {commission.status}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  Selecciona un influencer para ver sus comisiones
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





