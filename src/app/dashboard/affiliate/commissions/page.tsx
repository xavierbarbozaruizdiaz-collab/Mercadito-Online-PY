'use client';

// ============================================
// MERCADITO ONLINE PY - DASHBOARD: COMISIONES DEL AFILIADO
// Panel de control de comisiones para afiliados
// ============================================

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUserAffiliate, type StoreAffiliate } from '@/lib/services/affiliateService';
import {
  getAffiliateCommissions,
  getAffiliateCommissionSummary,
  getCommissionDetail,
  type AffiliateCommission,
  type AffiliateCommissionSummary,
} from '@/lib/services/affiliateCommissionService';
import {
  DollarSign,
  Filter,
  Search,
  Download,
  Eye,
  Calendar,
  TrendingUp,
} from 'lucide-react';

function AffiliateCommissionsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<StoreAffiliate | null>(null);
  const [summary, setSummary] = useState<AffiliateCommissionSummary | null>(null);
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [totalCommissions, setTotalCommissions] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'available' | 'paid'>('all');
  const [filterPeriod, setFilterPeriod] = useState<'this_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'all'>('this_month');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCommission, setSelectedCommission] = useState<AffiliateCommission | null>(null);

  useEffect(() => {
    loadData();
  }, [page, filterStatus, filterPeriod]);

  async function loadData() {
    try {
      setLoading(true);

      const affiliateData = await getCurrentUserAffiliate();
      if (!affiliateData || affiliateData.status !== 'active') {
        router.push('/dashboard/affiliate');
        return;
      }

      setAffiliate(affiliateData);

      // Cargar resumen
      const summaryData = await getAffiliateCommissionSummary(affiliateData.id);
      setSummary(summaryData);

      // Calcular fechas según período
      const now = new Date();
      let startDate: string | undefined;
      const endDate: string | undefined = now.toISOString();

      if (filterPeriod === 'this_month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else if (filterPeriod === 'last_3_months') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString();
      } else if (filterPeriod === 'last_6_months') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1).toISOString();
      } else if (filterPeriod === 'this_year') {
        startDate = new Date(now.getFullYear(), 0, 1).toISOString();
      }

      // Cargar comisiones
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const { commissions: commData, total } = await getAffiliateCommissions(affiliateData.id, {
        status,
        startDate,
        endDate,
        page,
        limit: 50,
      });

      setCommissions(commData);
      setTotalCommissions(total);
    } catch (err: any) {
      console.error('Error cargando comisiones', err);
      alert(err.message || 'Error al cargar comisiones');
    } finally {
      setLoading(false);
    }
  }

  async function viewCommissionDetail(commissionId: string) {
    try {
      const detail = await getCommissionDetail(commissionId);
      if (detail) {
        setSelectedCommission(detail);
      }
    } catch (err: any) {
      alert(err.message || 'Error al cargar detalle');
    }
  }

  const filteredCommissions = commissions.filter((comm) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      comm.order_id.toLowerCase().includes(query) ||
      comm.product?.title?.toLowerCase().includes(query) ||
      comm.affiliate_id.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1A1A1A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!affiliate || !summary) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Mis Comisiones</h1>
          <p className="text-gray-400">Control y seguimiento de todas tus comisiones</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Pendiente</span>
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.pending_balance)}
            </div>
          </div>

          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Disponible</span>
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.available_balance)}
            </div>
          </div>

          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Ganado</span>
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.total_earnings)}
            </div>
          </div>

          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Este Mes</span>
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(summary.commissions_this_month)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#252525] rounded-lg p-4 mb-6 border border-gray-700 flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por orden o producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="available">Disponible</option>
            <option value="paid">Pagada</option>
          </select>

          <select
            value={filterPeriod}
            onChange={(e) => setFilterPeriod(e.target.value as any)}
            className="px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="this_month">Este mes</option>
            <option value="last_3_months">Últimos 3 meses</option>
            <option value="last_6_months">Últimos 6 meses</option>
            <option value="this_year">Este año</option>
            <option value="all">Todo</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            <Download className="w-5 h-5" />
            Exportar
          </button>
        </div>

        {/* Commissions Table */}
        <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1A1A1A] border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Orden</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Monto Venta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Comisión</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredCommissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                      No hay comisiones {filterStatus !== 'all' ? `con estado ${filterStatus}` : ''}
                    </td>
                  </tr>
                ) : (
                  filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(commission.created_at).toLocaleDateString('es-PY')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {commission.product?.cover_url && (
                            <img
                              src={commission.product.cover_url}
                              alt={commission.product.title}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <span className="text-sm text-white">{commission.product?.title || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300 font-mono">#{commission.order_id.slice(0, 8)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(commission.base_amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(commission.commission_amount)}
                        </div>
                        <div className="text-xs text-gray-400">{commission.commission_percent}%</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            commission.status === 'paid'
                              ? 'bg-green-900/30 text-green-400'
                              : commission.status === 'available'
                              ? 'bg-blue-900/30 text-blue-400'
                              : 'bg-yellow-900/30 text-yellow-400'
                          }`}
                        >
                          {commission.status === 'paid' ? 'Pagada' : commission.status === 'available' ? 'Disponible' : 'Pendiente'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => viewCommissionDetail(commission.id)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Ver detalle"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalCommissions > 50 && (
          <div className="mt-4 flex justify-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="px-4 py-2 text-gray-300">
              Página {page} de {Math.ceil(totalCommissions / 50)}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= Math.ceil(totalCommissions / 50)}
              className="px-4 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        )}

        {/* Detail Modal */}
        {selectedCommission && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedCommission(null)}>
            <div className="bg-[#252525] rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-white mb-4">Detalle de Comisión</h2>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Producto</label>
                    <p className="text-white">{selectedCommission.product?.title || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Orden</label>
                    <p className="text-white font-mono">#{selectedCommission.order_id.slice(0, 8)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Fecha</label>
                    <p className="text-white">{new Date(selectedCommission.created_at).toLocaleString('es-PY')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        selectedCommission.status === 'paid'
                          ? 'bg-green-900/30 text-green-400'
                          : selectedCommission.status === 'available'
                          ? 'bg-blue-900/30 text-blue-400'
                          : 'bg-yellow-900/30 text-yellow-400'
                      }`}
                    >
                      {selectedCommission.status === 'paid' ? 'Pagada' : selectedCommission.status === 'available' ? 'Disponible' : 'Pendiente'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-700 pt-4">
                  <h3 className="text-lg font-bold text-white mb-3">Desglose</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Monto de venta:</span>
                      <span className="text-white">
                        {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(selectedCommission.base_amount)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Comisión ({selectedCommission.commission_percent}%):</span>
                      <span className="text-white font-bold">
                        {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(selectedCommission.commission_amount)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCommission(null)}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AffiliateCommissionsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#1A1A1A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    }>
      <AffiliateCommissionsContent />
    </Suspense>
  );
}

