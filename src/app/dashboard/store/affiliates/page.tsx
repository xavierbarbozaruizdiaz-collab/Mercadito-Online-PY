'use client';

// ============================================
// MERCADITO ONLINE PY - DASHBOARD: GESTIÓN DE AFILIADOS
// Panel del dueño de tienda para gestionar vendedores afiliados
// ============================================

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
  getStoreAffiliates,
  inviteAffiliate,
  activateAffiliate,
  suspendAffiliate,
  type StoreAffiliate,
  type InviteAffiliateParams,
} from '@/lib/services/affiliateService';
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Pause,
  Eye,
  Search,
  Filter,
  TrendingUp,
  DollarSign,
  Calendar,
} from 'lucide-react';

export default function StoreAffiliatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [affiliates, setAffiliates] = useState<StoreAffiliate[]>([]);
  const [totalAffiliates, setTotalAffiliates] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'suspended'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    seller_email: '',
    commission_percent: 15,
    can_sell_all_products: false,
    commission_tiers: [] as Array<{ min_sales: number; percent: number }>,
  });

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    suspended: 0,
    total_sales: 0,
    total_commissions_paid: 0,
  });

  useEffect(() => {
    loadStoreAndAffiliates();
  }, [filterStatus]);

  async function loadStoreAndAffiliates() {
    try {
      setLoading(true);

      // Obtener tienda del usuario
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) {
        router.push('/');
        return;
      }

      const { data: storeData, error: storeError } = await (supabase as any)
        .from('stores')
        .select('id, name')
        .eq('seller_id', session.session.user.id)
        .maybeSingle();

      if (storeError || !storeData) {
        alert('No tienes una tienda. Crea una tienda primero.');
        router.push('/dashboard/store');
        return;
      }

      setStoreId(storeData.id);

      // Cargar afiliados
      const status = filterStatus === 'all' ? undefined : filterStatus;
      const { affiliates: affData, total } = await getStoreAffiliates(storeData.id, {
        status,
      });

      setAffiliates(affData);
      setTotalAffiliates(total);

      // Calcular stats
      const allAffiliates = await getStoreAffiliates(storeData.id);
      setStats({
        total: allAffiliates.total,
        active: allAffiliates.affiliates.filter(a => a.status === 'active').length,
        pending: allAffiliates.affiliates.filter(a => a.status === 'pending').length,
        suspended: allAffiliates.affiliates.filter(a => a.status === 'suspended').length,
        total_sales: allAffiliates.affiliates.reduce((sum, a) => sum + a.total_sales_count, 0),
        total_commissions_paid: allAffiliates.affiliates.reduce((sum, a) => sum + a.total_commissions_earned, 0),
      });
    } catch (err: any) {
      console.error('Error cargando afiliados', err);
      alert(err.message || 'Error al cargar afiliados');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!storeId || !inviteForm.seller_email) {
      alert('Por favor completa todos los campos');
      return;
    }

    try {
      setInviteLoading(true);

      const params: InviteAffiliateParams = {
        store_id: storeId,
        seller_email: inviteForm.seller_email,
        commission_percent: inviteForm.commission_percent,
        can_sell_all_products: inviteForm.can_sell_all_products,
        commission_tiers: inviteForm.commission_tiers,
      };

      await inviteAffiliate(params);
      alert('Invitación enviada exitosamente');
      setShowInviteModal(false);
      setInviteForm({
        seller_email: '',
        commission_percent: 15,
        can_sell_all_products: false,
        commission_tiers: [],
      });
      await loadStoreAndAffiliates();
    } catch (err: any) {
      alert(err.message || 'Error al enviar invitación');
    } finally {
      setInviteLoading(false);
    }
  }

  async function handleActivate(affiliateId: string) {
    if (!confirm('¿Activar este afiliado?')) return;

    try {
      await activateAffiliate(affiliateId);
      await loadStoreAndAffiliates();
    } catch (err: any) {
      alert(err.message || 'Error al activar afiliado');
    }
  }

  async function handleSuspend(affiliateId: string) {
    const reason = prompt('Razón de suspensión (opcional):');
    if (!confirm('¿Suspender este afiliado?')) return;

    try {
      await suspendAffiliate(affiliateId, reason || undefined);
      await loadStoreAndAffiliates();
    } catch (err: any) {
      alert(err.message || 'Error al suspender afiliado');
    }
  }

  const filteredAffiliates = affiliates.filter((aff) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      aff.affiliate_seller?.email?.toLowerCase().includes(query) ||
      aff.affiliate_code.toLowerCase().includes(query) ||
      aff.display_name?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1A1A1A]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Vendedores Afiliados</h1>
          <p className="text-gray-400">Gestiona tus vendedores comisionistas</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Afiliados</span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Activos</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.active}</div>
          </div>

          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Ventas</span>
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.total_sales}</div>
          </div>

          <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Comisiones Pagadas</span>
              <DollarSign className="w-5 h-5 text-yellow-500" />
            </div>
            <div className="text-2xl font-bold text-white">
              {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(stats.total_commissions_paid)}
            </div>
          </div>
        </div>

        {/* Actions Bar */}
        <div className="bg-[#252525] rounded-lg p-4 mb-6 border border-gray-700 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-4 items-center">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por email o código..."
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
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
            </select>
          </div>

          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Invitar Afiliado
          </button>
        </div>

        {/* Affiliates List */}
        <div className="bg-[#252525] rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1A1A1A] border-b border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Comisión</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Ventas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAffiliates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                      No hay afiliados {filterStatus !== 'all' ? `con status ${filterStatus}` : ''}
                    </td>
                  </tr>
                ) : (
                  filteredAffiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="hover:bg-[#1A1A1A] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-700 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-white">
                              {affiliate.affiliate_seller?.first_name} {affiliate.affiliate_seller?.last_name}
                            </div>
                            <div className="text-sm text-gray-400">{affiliate.affiliate_seller?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-300 font-mono">{affiliate.affiliate_code}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-white">{affiliate.commission_percent}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{affiliate.total_sales_count}</div>
                        <div className="text-xs text-gray-400">
                          {new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(affiliate.total_commissions_earned)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            affiliate.status === 'active'
                              ? 'bg-green-900/30 text-green-400'
                              : affiliate.status === 'pending'
                              ? 'bg-yellow-900/30 text-yellow-400'
                              : affiliate.status === 'suspended'
                              ? 'bg-red-900/30 text-red-400'
                              : 'bg-gray-900/30 text-gray-400'
                          }`}
                        >
                          {affiliate.status === 'active' ? 'Activo' : affiliate.status === 'pending' ? 'Pendiente' : affiliate.status === 'suspended' ? 'Suspendido' : affiliate.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/dashboard/store/affiliates/${affiliate.id}`)}
                            className="text-blue-400 hover:text-blue-300"
                            title="Ver detalles"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {affiliate.status === 'pending' && (
                            <button
                              onClick={() => handleActivate(affiliate.id)}
                              className="text-green-400 hover:text-green-300"
                              title="Activar"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          {affiliate.status === 'active' && (
                            <button
                              onClick={() => handleSuspend(affiliate.id)}
                              className="text-red-400 hover:text-red-300"
                              title="Suspender"
                            >
                              <Pause className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-[#252525] rounded-lg p-6 max-w-md w-full mx-4 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Invitar Nuevo Afiliado</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email del Vendedor</label>
                  <input
                    type="email"
                    value={inviteForm.seller_email}
                    onChange={(e) => setInviteForm({ ...inviteForm, seller_email: e.target.value })}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="vendedor@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Comisión (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={inviteForm.commission_percent}
                    onChange={(e) => setInviteForm({ ...inviteForm, commission_percent: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-[#1A1A1A] border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="can_sell_all"
                    checked={inviteForm.can_sell_all_products}
                    onChange={(e) => setInviteForm({ ...inviteForm, can_sell_all_products: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-[#1A1A1A] border-gray-700 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="can_sell_all" className="ml-2 text-sm text-gray-300">
                    Puede vender todos los productos
                  </label>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleInvite}
                  disabled={inviteLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {inviteLoading ? 'Enviando...' : 'Enviar Invitación'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




