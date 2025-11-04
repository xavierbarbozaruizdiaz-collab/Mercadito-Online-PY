'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getSellerAnalyticsReport, type TimeRange, type SellerAnalyticsReport } from '@/lib/services/sellerAnalyticsService';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  TrendingDown,
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/lib/hooks/useToast';
import Breadcrumbs from '@/components/Breadcrumbs';

export default function SellerAnalyticsPage() {
  const [report, setReport] = useState<SellerAnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [sellerId, setSellerId] = useState<string | null>(null);

  const toast = useToast();

  useEffect(() => {
    loadSellerId();
  }, []);

  useEffect(() => {
    if (sellerId) {
      loadAnalytics();
    }
  }, [sellerId, timeRange]);

  async function loadSellerId() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id) {
        setSellerId(session.session.user.id);
      } else {
        setError('Debes iniciar sesión para ver analytics');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error loading seller ID:', err);
      setError('Error al cargar datos del vendedor');
      setLoading(false);
    }
  }

  async function loadAnalytics() {
    if (!sellerId) return;

    try {
      setLoading(true);
      setError(null);

      const analyticsReport = await getSellerAnalyticsReport(sellerId, timeRange);
      
      if (!analyticsReport) {
        setError('Error al generar el reporte. Intenta nuevamente.');
        return;
      }

      setReport(analyticsReport);
    } catch (err: any) {
      console.error('Error loading analytics:', err);
      setError('Error al cargar analytics: ' + (err.message || 'Error desconocido'));
      toast.error('Error al cargar analytics');
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  function formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  }

  function SimpleBarChart({ data, height = 200, color = 'blue' }: { 
    data: Array<{ date: string; revenue: number }>; 
    height?: number; 
    color?: string 
  }) {
    if (!data || data.length === 0) {
      return (
        <div className="text-gray-400 text-center py-8">
          No hay datos para este período
        </div>
      );
    }

    const maxValue = Math.max(...data.map(d => d.revenue), 1);
    const colorClasses = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
    };
    const barColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

    return (
      <div className="h-64 flex items-end justify-between gap-1">
        {data.map((d, i) => {
          const barHeight = (d.revenue / maxValue) * 100;
          const date = new Date(d.date);
          const dayLabel = date.toLocaleDateString('es-PY', { day: 'numeric', month: 'short' });
          
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-t" style={{ height: `${height}px` }}>
                <div
                  className={`${barColor} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                  style={{ height: `${barHeight}%` }}
                  title={`${dayLabel}: ${formatCurrency(d.revenue)}`}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 transform -rotate-45 origin-left">
                {dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-4 sm:p-8">
        <Breadcrumbs items={[{ label: 'Analytics' }]} className="mb-6 text-gray-300" />
        <PageSkeleton />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] p-4 sm:p-8">
        <Breadcrumbs items={[{ label: 'Analytics' }]} className="mb-6 text-gray-300" />
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg">
          <p className="font-semibold">Error</p>
          <p>{error || 'No se pudo cargar el reporte'}</p>
          <button
            onClick={loadAnalytics}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1A1A1A] p-4 sm:p-8">
      <Breadcrumbs items={[{ label: 'Analytics' }]} className="mb-6 text-gray-300" />

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Analytics de Ventas</h1>
          <p className="text-gray-400">Métricas y estadísticas de tu tienda</p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-4 py-2 bg-[#252525] border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Últimos 7 días</option>
            <option value="30d">Últimos 30 días</option>
            <option value="90d">Últimos 90 días</option>
            <option value="1y">Último año</option>
            <option value="all">Todo el tiempo</option>
          </select>
          <button
            onClick={loadAnalytics}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Resumen con comparación */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            {report.comparison.revenueChangePercent !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${
                report.comparison.revenueChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {report.comparison.revenueChangePercent >= 0 ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {formatPercent(report.comparison.revenueChangePercent)}
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(report.summary.totalRevenue)}</p>
          <p className="text-sm text-gray-400">Ingresos totales</p>
        </div>

        <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            {report.comparison.ordersChangePercent !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${
                report.comparison.ordersChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {report.comparison.ordersChangePercent >= 0 ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {formatPercent(report.comparison.ordersChangePercent)}
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{report.summary.totalOrders}</p>
          <p className="text-sm text-gray-400">Órdenes totales</p>
        </div>

        <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-purple-500" />
            {report.comparison.customersChangePercent !== 0 && (
              <div className={`flex items-center gap-1 text-sm ${
                report.comparison.customersChangePercent >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {report.comparison.customersChangePercent >= 0 ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <ArrowDown className="w-4 h-4" />
                )}
                {formatPercent(report.comparison.customersChangePercent)}
              </div>
            )}
          </div>
          <p className="text-2xl font-bold text-white">{report.summary.totalCustomers}</p>
          <p className="text-sm text-gray-400">Clientes únicos</p>
        </div>

        <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <Package className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold text-white">{report.summary.activeProducts}</p>
          <p className="text-sm text-gray-400">Productos activos</p>
        </div>
      </div>

      {/* Gráfico de tendencias */}
      <div className="bg-[#252525] rounded-lg p-6 border border-gray-700 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Tendencias de Ventas
        </h2>
        <SimpleBarChart 
          data={report.salesTrend.map(t => ({ date: t.date, revenue: t.revenue }))} 
          color="blue"
        />
      </div>

      {/* Grid de información adicional */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Productos más vendidos */}
        <div className="bg-[#252525] rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Productos Más Vendidos</h2>
          <div className="space-y-3">
            {report.topProducts.length > 0 ? (
              report.topProducts.slice(0, 5).map((product, index) => (
                <div key={product.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center text-gray-400">
                    {product.cover_url ? (
                      <img src={product.cover_url} alt={product.title} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <Package className="w-6 h-6" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{product.title}</p>
                    <p className="text-sm text-gray-400">
                      {product.total_sold} vendidos • {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">No hay productos vendidos en este período</p>
            )}
          </div>
        </div>

        {/* Órdenes por estado */}
        <div className="bg-[#252525] rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Órdenes por Estado</h2>
          <div className="space-y-3">
            {Object.entries(report.ordersByStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-gray-300 capitalize">{status}</span>
                <span className="text-white font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Métricas adicionales */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Ticket promedio</p>
          <p className="text-xl font-bold text-white">{formatCurrency(report.summary.averageOrderValue)}</p>
        </div>
        <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Tasa de conversión</p>
          <p className="text-xl font-bold text-white">{report.summary.conversionRate.toFixed(1)}%</p>
        </div>
        <div className="bg-[#252525] rounded-lg p-4 border border-gray-700">
          <p className="text-sm text-gray-400 mb-1">Clientes recurrentes</p>
          <p className="text-xl font-bold text-white">{report.summary.returningCustomers}</p>
        </div>
      </div>
    </div>
  );
}

