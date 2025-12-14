'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { getCommissionSettings, type CommissionSettings } from '@/lib/services/commissionService';
import Link from 'next/link';
import { ArrowLeft, Plus, Edit, Trash2, DollarSign, BarChart3, TrendingUp } from 'lucide-react';

type Store = { id: string; name: string };
type Seller = { id: string; email: string; first_name?: string; last_name?: string };

type CommissionStats = {
  total_commissions: number;
  today_commissions: number;
  month_commissions: number;
  total_orders: number;
  top_sellers: Array<{ seller_id: string; seller_email?: string; total: number }>;
};

export default function CommissionsAdminPage() {
  const [settings, setSettings] = useState<CommissionSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [formData, setFormData] = useState<Partial<CommissionSettings>>({
    scope_type: 'global',
    applies_to: 'both',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [settingsData, storesData, sellersData] = await Promise.all([
        getCommissionSettings(),
        supabase.from('stores').select('id, name').order('name'),
        supabase.from('profiles').select('id, email, first_name, last_name').order('email'),
      ]);

      setSettings(settingsData);
      
      // Verificar y manejar errores de stores silenciosamente
      if (storesData.error) {
        const isExpectedError = 
          storesData.error.code === 'PGRST116' || 
          storesData.error.message?.includes('400') ||
          storesData.error.message?.includes('401') ||
          storesData.error.status === 400 ||
          storesData.error.status === 401;
        
        if (!isExpectedError && process.env.NODE_ENV === 'development') {
          logger.warn('⚠️ Error loading stores (no crítico)', storesData.error);
        }
        console.error('Error loading stores:', storesData.error);
        setStores([]);
      } else {
        setStores((storesData.data || []) as Store[]);
        console.log('Stores loaded:', storesData.data?.length || 0);
      }
      
      // Verificar y loggear errores de sellers
      if (sellersData.error) {
        logger.error('Error loading sellers', sellersData.error);
        setSellers([]);
      } else {
        setSellers((sellersData.data || []) as Seller[]);
      }

      // Cargar estadísticas
      await loadStats();
    } catch (err) {
      logger.error('Error loading commission settings', err);
      console.error('Error in loadData:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      // Comisiones totales
      const { data: allFees } = await supabase
        .from('platform_fees')
        .select('commission_amount, status, created_at, seller_id')
        .in('status', ['confirmed', 'paid']);

      // Comisiones de hoy
      const { data: todayFees } = await supabase
        .from('platform_fees')
        .select('commission_amount')
        .in('status', ['confirmed', 'paid'])
        .gte('created_at', today.toISOString());

      // Comisiones del mes
      const { data: monthFees } = await supabase
        .from('platform_fees')
        .select('commission_amount')
        .in('status', ['confirmed', 'paid'])
        .gte('created_at', monthStart.toISOString());

      // Top vendedores por comisiones
      const { data: topSellersData } = await supabase
        .from('platform_fees')
        .select('seller_id, commission_amount')
        .in('status', ['confirmed', 'paid']);

      const totalCommissions = (allFees || []).reduce((sum: number, f: any) => sum + (parseFloat(f.commission_amount || '0') || 0), 0);
      const todayCommissions = (todayFees || []).reduce((sum: number, f: any) => sum + (parseFloat(f.commission_amount || '0') || 0), 0);
      const monthCommissions = (monthFees || []).reduce((sum: number, f: any) => sum + (parseFloat(f.commission_amount || '0') || 0), 0);

      // Agrupar por vendedor
      const sellerMap = new Map<string, number>();
      (topSellersData || []).forEach((f: any) => {
        const sellerId = f.seller_id;
        const amount = parseFloat(f.commission_amount) || 0;
        sellerMap.set(sellerId, (sellerMap.get(sellerId) || 0) + amount);
      });

      const topSellers = Array.from(sellerMap.entries())
        .map(([seller_id, total]) => ({ seller_id, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Obtener emails de vendedores
      const sellerIds = topSellers.map(s => s.seller_id);
      if (sellerIds.length > 0) {
        const { data: sellerProfiles } = await supabase
          .from('profiles')
          .select('id, email')
          .in('id', sellerIds);

        topSellers.forEach((seller: any) => {
          const profile: any = (sellerProfiles || []).find((p: any) => p.id === seller.seller_id);
          seller.seller_email = profile?.email;
        });
      }

      setStats({
        total_commissions: totalCommissions,
        today_commissions: todayCommissions,
        month_commissions: monthCommissions,
        total_orders: new Set((allFees || []).map(f => (f as any).order_id).filter(Boolean)).size,
        top_sellers: topSellers,
      });
    } catch (err) {
      logger.error('Error loading commission stats', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('No autenticado');
        return;
      }

      const payload: any = {
        ...formData,
        created_by: session.session.user.id,
      };

      // Validar según scope_type
      if (formData.scope_type === 'store' && !formData.store_id) {
        alert('Selecciona una tienda');
        return;
      }
      if (formData.scope_type === 'seller' && !formData.seller_id) {
        alert('Selecciona un vendedor');
        return;
      }

      if (editingId) {
        const { error } = await (supabase as any)
          .from('commission_settings')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('commission_settings')
          .insert([payload]);

        if (error) throw error;
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        scope_type: 'global',
        applies_to: 'both',
        is_active: true,
      });
      loadData();
    } catch (err: any) {
      logger.error('Error saving commission setting', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de eliminar esta configuración de comisión?')) return;

    try {
      const { error } = await supabase
        .from('commission_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (err: any) {
      logger.error('Error deleting commission setting', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    }
  }

  function handleEdit(setting: CommissionSettings) {
    setEditingId(setting.id);
    setFormData(setting);
    setShowForm(true);
  }

  function handleNew() {
    setEditingId(null);
    setFormData({
      scope_type: 'global',
      applies_to: 'both',
      is_active: true,
    });
    setShowForm(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/admin"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al panel</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Administración de Comisiones</h1>
            <p className="text-gray-600 mt-2">Gestiona las comisiones por alcance (global, tienda, vendedor)</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/commissions/reports"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BarChart3 className="w-5 h-5" />
              <span>Reportes</span>
            </Link>
            <button
              onClick={handleNew}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Nueva Configuración</span>
            </button>
          </div>
        </div>

        {/* Dashboard de Estadísticas */}
        {stats && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Total Comisiones</p>
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.total_commissions.toLocaleString('es-PY')} Gs.
              </p>
              <p className="text-xs text-gray-500 mt-1">{stats.total_orders} órdenes</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Hoy</p>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-green-600">
                {stats.today_commissions.toLocaleString('es-PY')} Gs.
              </p>
              <p className="text-xs text-gray-500 mt-1">Comisiones de hoy</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Este Mes</p>
                <BarChart3 className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {stats.month_commissions.toLocaleString('es-PY')} Gs.
              </p>
              <p className="text-xs text-gray-500 mt-1">Comisiones del mes</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">Top Vendedores</p>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-600">{stats.top_sellers.length}</p>
              <p className="text-xs text-gray-500 mt-1">Por comisiones</p>
            </div>
          </div>
        )}

        {/* Top Vendedores */}
        {stats && stats.top_sellers.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top 5 Vendedores por Comisiones
            </h2>
            <div className="space-y-3">
              {stats.top_sellers.map((seller, idx) => (
                <div key={seller.seller_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center font-bold text-purple-600">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {seller.seller_email || seller.seller_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-gray-500">ID: {seller.seller_id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <p className="font-bold text-purple-600">
                    {seller.total.toLocaleString('es-PY')} Gs.
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingId ? 'Editar Configuración' : 'Nueva Configuración'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Alcance *</label>
                <select
                  value={formData.scope_type || 'global'}
                  onChange={(e) => setFormData({ ...formData, scope_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="global">Global (por defecto)</option>
                  <option value="store">Por Tienda</option>
                  <option value="seller">Por Vendedor</option>
                </select>
              </div>

              {formData.scope_type === 'store' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Tienda *</label>
                  <select
                    value={formData.store_id || ''}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Seleccionar tienda</option>
                    {stores.length === 0 ? (
                      <option value="" disabled>No hay tiendas disponibles</option>
                    ) : (
                      stores.map((store) => (
                        <option key={store.id} value={store.id}>
                          {store.name}
                        </option>
                      ))
                    )}
                  </select>
                  {stores.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No hay tiendas registradas en el sistema
                    </p>
                  )}
                </div>
              )}

              {formData.scope_type === 'seller' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Vendedor *</label>
                  <select
                    value={formData.seller_id || ''}
                    onChange={(e) => setFormData({ ...formData, seller_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    required
                  >
                    <option value="">Seleccionar vendedor</option>
                    {sellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.email} {seller.first_name || seller.last_name ? `(${seller.first_name || ''} ${seller.last_name || ''})`.trim() : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Aplica a *</label>
                <select
                  value={formData.applies_to || 'both'}
                  onChange={(e) => setFormData({ ...formData, applies_to: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="both">Productos directos y subastas</option>
                  <option value="direct_only">Solo productos directos</option>
                  <option value="auction_only">Solo subastas</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Comisión Productos Directos (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.direct_sale_commission_percent || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      direct_sale_commission_percent: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 10.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Comisión Comprador Subastas (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.auction_buyer_commission_percent || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      auction_buyer_commission_percent: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 3.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Comisión Vendedor Subastas (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.auction_seller_commission_percent || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      auction_seller_commission_percent: e.target.value ? parseFloat(e.target.value) : undefined
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Ej: 5.00"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active ?? true}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_active" className="text-sm font-medium">
                  Activa
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  {editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      scope_type: 'global',
                      applies_to: 'both',
                      is_active: true,
                    });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Lista de configuraciones */}
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alcance</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplica a</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Directos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subasta Comprador</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subasta Vendedor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {settings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No hay configuraciones de comisión
                    </td>
                  </tr>
                ) : (
                  settings.map((setting) => (
                    <tr key={setting.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {setting.scope_type === 'global' && '🌐 Global'}
                          {setting.scope_type === 'store' && '🏪 Tienda'}
                          {setting.scope_type === 'seller' && '👤 Vendedor'}
                        </div>
                        {setting.scope_type === 'store' && setting.store_id && (
                          <div className="text-xs text-gray-500">
                            {stores.find(s => s.id === setting.store_id)?.name || setting.store_id}
                          </div>
                        )}
                        {setting.scope_type === 'seller' && setting.seller_id && (
                          <div className="text-xs text-gray-500">
                            {sellers.find(s => s.id === setting.seller_id)?.email || setting.seller_id}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {setting.applies_to === 'both' && 'Ambos'}
                        {setting.applies_to === 'direct_only' && 'Solo Directos'}
                        {setting.applies_to === 'auction_only' && 'Solo Subastas'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {setting.direct_sale_commission_percent ? (
                          <span className="font-medium">{setting.direct_sale_commission_percent}%</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {setting.auction_buyer_commission_percent ? (
                          <span className="font-medium">{setting.auction_buyer_commission_percent}%</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {setting.auction_seller_commission_percent ? (
                          <span className="font-medium">{setting.auction_seller_commission_percent}%</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          setting.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {setting.is_active ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(setting)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(setting.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

