'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Clock,
  Percent,
  Target,
  BarChart3,
  Star,
  TrendingDown,
  ArrowUp,
  X,
  Heart,
  Eye,
  Users,
  Repeat,
  AlertCircle
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface DashboardStats {
  totalProducts: number;
  activeProducts: number;
  totalOrders: number;
  pendingOrders: number;
  monthlyRevenue: number;
  totalRevenue: number;
  totalCustomers: number;
  pendingBalance: number;
  availableBalance: number;
  totalEarnings: number;
  totalCommissionsPaid: number;
  conversionRate: number;
  averageOrderValue: number;
  salesTrend: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{ id: string; title: string; cover_url: string | null; sold?: number; total_sold?: number; revenue: number }>;
  notifications: Array<{ message: string; link?: string; priority: 'high' | 'medium' | 'low' }>;
}

interface ExtendedStats extends DashboardStats {
  storeFavorites: number;
  storeVisits: number;
  mostViewedProducts: Array<{ id: string; title: string; cover_url: string | null; views: number }>;
  recurringCustomers: number;
  abandonmentRate: number;
}

interface StatsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  stats: DashboardStats | null;
  sellerId: string;
  storeId: string | null;
}

export default function StatsPanel({ isOpen, onClose, stats, sellerId, storeId }: StatsPanelProps) {
  const [extendedStats, setExtendedStats] = useState<ExtendedStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && stats && storeId) {
      loadExtendedStats();
    }
  }, [isOpen, stats, storeId]);

  async function loadExtendedStats() {
    if (!stats || !storeId) return;

    setLoading(true);
    try {
      // 1. Contar favoritos de la tienda
      const { count: favoritesCount } = await supabase
        .from('store_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', storeId);

      // 2. Contar visitas de la tienda (desde analytics_events si existe)
      let visitsCount = 0;
      try {
        const { count: visits } = await supabase
          .from('analytics_events')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'store_view')
          .eq('event_data->>store_id', storeId);
        visitsCount = visits || 0;
      } catch (e) {
        // Si no existe la tabla o el evento, usar 0
        console.warn('No se pudo obtener visitas:', e);
      }

      // 3. Productos más vistos (desde analytics_events)
      let mostViewed: Array<{ id: string; title: string; cover_url: string | null; views: number }> = [];
      try {
        const { data: viewEvents } = await supabase
          .from('analytics_events')
          .select('event_data')
          .eq('event_type', 'product_view')
          .contains('event_data', { seller_id: sellerId });

        if (viewEvents) {
          const viewCounts = new Map<string, number>();
          viewEvents.forEach(event => {
            const productId = (event.event_data as any)?.product_id;
            if (productId) {
              viewCounts.set(productId, (viewCounts.get(productId) || 0) + 1);
            }
          });

          // Obtener detalles de productos más vistos
          const topProductIds = Array.from(viewCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);

          if (topProductIds.length > 0) {
            const { data: products } = await supabase
              .from('products')
              .select('id, title, cover_url')
              .in('id', topProductIds)
              .eq('seller_id', sellerId);

            if (products) {
              mostViewed = products.map(p => ({
                id: p.id,
                title: p.title,
                cover_url: p.cover_url,
                views: viewCounts.get(p.id) || 0
              })).sort((a, b) => b.views - a.views);
            }
          }
        }
      } catch (e) {
        console.warn('No se pudieron obtener productos más vistos:', e);
      }

      // 4. Clientes recurrentes (usuarios que compraron más de una vez)
      let recurringCustomers = 0;
      try {
        const { data: orders } = await supabase
          .from('order_items')
          .select('order:orders(buyer_id)')
          .eq('seller_id', sellerId);

        if (orders) {
          const customerOrders = new Map<string, number>();
          orders.forEach((item: any) => {
            const buyerId = item.order?.buyer_id;
            if (buyerId) {
              customerOrders.set(buyerId, (customerOrders.get(buyerId) || 0) + 1);
            }
          });
          recurringCustomers = Array.from(customerOrders.values()).filter(count => count > 1).length;
        }
      } catch (e) {
        console.warn('No se pudieron obtener clientes recurrentes:', e);
      }

      // 5. Tasa de abandono (simplificado: visitas sin compra)
      const abandonmentRate = stats.totalOrders > 0 && visitsCount > 0
        ? ((visitsCount - stats.totalOrders) / visitsCount * 100)
        : 0;

      setExtendedStats({
        ...stats,
        storeFavorites: favoritesCount || 0,
        storeVisits: visitsCount,
        mostViewedProducts: mostViewed,
        recurringCustomers,
        abandonmentRate: Math.max(0, Math.min(100, abandonmentRate))
      });
    } catch (err: any) {
      console.error('Error cargando estadísticas extendidas:', err);
      // Usar stats básicos si falla
      setExtendedStats({
        ...stats,
        storeFavorites: 0,
        storeVisits: 0,
        mostViewedProducts: [],
        recurringCustomers: 0,
        abandonmentRate: 0
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  const displayStats = extendedStats || stats;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#1A1A1A] rounded-lg border border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#252525] border-b border-gray-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold text-white">Estadísticas y Métricas</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && !extendedStats ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : displayStats ? (
            <>
              {/* Estadísticas Principales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Productos</p>
                      <p className="text-2xl font-bold text-gray-200">{displayStats.totalProducts}</p>
                      <p className="text-xs text-gray-500 mt-1">{displayStats.activeProducts} activos</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Órdenes</p>
                      <p className="text-2xl font-bold text-gray-200">{displayStats.totalOrders}</p>
                      {displayStats.pendingOrders > 0 && (
                        <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {displayStats.pendingOrders} pendientes
                        </p>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Este mes</p>
                      <p className="text-xl font-bold text-gray-200">
                        {displayStats.monthlyRevenue.toLocaleString('es-PY')} Gs.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Ingresos del mes</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Ingresos Total</p>
                      <p className="text-xl font-bold text-emerald-400">
                        {displayStats.totalRevenue.toLocaleString('es-PY')} Gs.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{displayStats.totalCustomers} clientes</p>
                    </div>
                    <div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Nuevas Métricas */}
              {extendedStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-pink-900/30 to-pink-800/20 rounded-lg border border-pink-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-pink-300">Favoritos</p>
                      <Heart className="w-5 h-5 text-pink-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-200 mb-1">
                      {extendedStats.storeFavorites}
                    </p>
                    <p className="text-xs text-pink-400">Usuarios que guardaron tu tienda</p>
                  </div>

                  <div className="bg-gradient-to-br from-cyan-900/30 to-cyan-800/20 rounded-lg border border-cyan-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-cyan-300">Visitas</p>
                      <Eye className="w-5 h-5 text-cyan-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-200 mb-1">
                      {extendedStats.storeVisits}
                    </p>
                    <p className="text-xs text-cyan-400">Visitas a tu tienda</p>
                  </div>

                  <div className="bg-gradient-to-br from-indigo-900/30 to-indigo-800/20 rounded-lg border border-indigo-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-indigo-300">Clientes Recurrentes</p>
                      <Repeat className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-200 mb-1">
                      {extendedStats.recurringCustomers}
                    </p>
                    <p className="text-xs text-indigo-400">Clientes que compraron más de una vez</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-lg border border-orange-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-orange-300">Tasa de Abandono</p>
                      <TrendingDown className="w-5 h-5 text-orange-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-200 mb-1">
                      {extendedStats.abandonmentRate.toFixed(1)}%
                    </p>
                    <p className="text-xs text-orange-400">Visitas sin compra</p>
                  </div>
                </div>
              )}

              {/* Balances y Ganancias */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-lg border border-yellow-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-yellow-300">Pendiente</p>
                    <Clock className="w-5 h-5 text-yellow-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-200 mb-1">
                    {displayStats.pendingBalance.toLocaleString('es-PY')} Gs.
                  </p>
                  <p className="text-xs text-yellow-400">En escolta (esperando entrega)</p>
                </div>

                <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-lg border border-green-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-300">Disponible</p>
                    <DollarSign className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-2xl font-bold text-green-400 mb-1">
                    {displayStats.availableBalance.toLocaleString('es-PY')} Gs.
                  </p>
                  <p className="text-xs text-green-400">Listo para retiro</p>
                </div>

                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg border border-blue-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-300">Ganancias Totales</p>
                    <TrendingUp className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-200 mb-1">
                    {displayStats.totalEarnings.toLocaleString('es-PY')} Gs.
                  </p>
                  <p className="text-xs text-blue-400">Histórico de ingresos</p>
                </div>

                <div className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-lg border border-red-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-red-300">Comisiones Pagadas</p>
                    <Percent className="w-5 h-5 text-red-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-200 mb-1">
                    {displayStats.totalCommissionsPaid.toLocaleString('es-PY')} Gs.
                  </p>
                  <p className="text-xs text-red-400">Total de comisiones cobradas</p>
                </div>
              </div>

              {/* Métricas de Rendimiento */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/20 rounded-lg border border-blue-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-blue-300">Tasa de Conversión</p>
                    <Target className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-gray-200">
                      {displayStats.conversionRate.toFixed(1)}%
                    </p>
                    <div className={`flex items-center gap-1 text-xs ${
                      displayStats.conversionRate > 10 ? 'text-green-400' :
                      displayStats.conversionRate > 5 ? 'text-blue-400' :
                      'text-red-400'
                    }`}>
                      {displayStats.conversionRate > 10 ? (
                        <>
                          <ArrowUp className="w-3 h-3" />
                          <span>Excelente</span>
                        </>
                      ) : displayStats.conversionRate > 5 ? (
                        <>
                          <TrendingUp className="w-3 h-3" />
                          <span>Bueno</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="w-3 h-3" />
                          <span>Mejorar</span>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-blue-400 mt-1">
                    {displayStats.totalOrders} ventas / {displayStats.activeProducts} productos activos
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/20 rounded-lg border border-purple-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-purple-300">Ticket Promedio</p>
                    <BarChart3 className="w-5 h-5 text-purple-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-200 mb-1">
                    {displayStats.averageOrderValue.toLocaleString('es-PY')} Gs.
                  </p>
                  <p className="text-xs text-purple-400">
                    Por orden realizada
                  </p>
                </div>

                <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-800/20 rounded-lg border border-emerald-700 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-emerald-300">Crecimiento Mensual</p>
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-2xl font-bold text-gray-200 mb-1">
                    {displayStats.monthlyRevenue > 0 
                      ? ((displayStats.monthlyRevenue / Math.max(displayStats.totalRevenue - displayStats.monthlyRevenue, 1)) * 100).toFixed(0)
                      : '0'}%
                  </p>
                  <p className="text-xs text-emerald-400">
                    {displayStats.monthlyRevenue.toLocaleString('es-PY')} Gs. este mes
                  </p>
                </div>
              </div>

              {/* Productos Más Vistos */}
              {extendedStats && extendedStats.mostViewedProducts.length > 0 && (
                <div className="bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-cyan-400" />
                      Productos Más Vistos
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {extendedStats.mostViewedProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="bg-[#1A1A1A] rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <div className="relative w-full h-32 bg-gray-700">
                          {product.cover_url ? (
                            <Image
                              src={product.cover_url}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-gray-300 truncate mb-1">{product.title}</p>
                          <p className="text-xs text-cyan-400">{product.views} vistas</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Gráfico de Tendencias de Ventas */}
              {displayStats.salesTrend.length > 0 && (
                <div className="bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-gray-400" />
                      Tendencia de Ventas (Últimos 30 días)
                    </h3>
                  </div>
                  <div className="h-48 flex items-end justify-between gap-1">
                    {displayStats.salesTrend.slice(-14).map((day, idx) => {
                      const maxRevenue = Math.max(...displayStats.salesTrend.map(d => d.revenue), 1);
                      const height = (day.revenue / maxRevenue) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          <div className="relative w-full flex flex-col items-center justify-end" style={{ height: '100%' }}>
                            <div
                              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t transition-all hover:from-blue-600 hover:to-blue-500 cursor-pointer"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`${new Date(day.date).toLocaleDateString('es-PY')}: ${day.revenue.toLocaleString('es-PY')} Gs.`}
                            />
                          </div>
                          <p className="text-xs text-gray-400 transform -rotate-45 origin-top-left whitespace-nowrap mt-2" style={{ writingMode: 'vertical-rl' }}>
                            {new Date(day.date).getDate()}/{new Date(day.date).getMonth() + 1}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                        <span>Ingresos (Gs.)</span>
                      </div>
                    </div>
                    <p>Total: {displayStats.salesTrend.reduce((sum, day) => sum + day.revenue, 0).toLocaleString('es-PY')} Gs.</p>
                  </div>
                </div>
              )}

              {/* Productos Más Vendidos */}
              {displayStats.topProducts.length > 0 && (
                <div className="bg-[#252525] rounded-lg border border-gray-700 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500" />
                      Productos Más Vendidos
                    </h3>
                    <Link
                      href="/dashboard"
                      className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Ver todos →
                    </Link>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {displayStats.topProducts.map((product) => (
                      <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="bg-[#1A1A1A] rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                      >
                        <div className="relative w-full h-32 bg-gray-700">
                          {product.cover_url ? (
                            <Image
                              src={product.cover_url}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-500" />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded">
                            {product.sold || product.total_sold || 0}
                          </div>
                        </div>
                        <div className="p-2">
                          <p className="text-xs text-gray-300 truncate mb-1">{product.title}</p>
                          <p className="text-xs text-green-400">{product.revenue.toLocaleString('es-PY')} Gs.</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No hay estadísticas disponibles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

