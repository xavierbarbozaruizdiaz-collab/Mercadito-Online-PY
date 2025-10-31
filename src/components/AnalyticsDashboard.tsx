'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  getAnalyticsReport,
  exportFullReport,
  type TimeRange,
  type AnalyticsReport,
} from '@/lib/services/analyticsAdminService';

export default function AnalyticsDashboard() {
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setError('Debes iniciar sesión para ver analytics');
        return;
      }

      // Verificar si es admin
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role')
        .eq('id', session.session.user.id)
        .single();

      if ((profile as any)?.role !== 'admin') {
        setError('Solo administradores pueden ver analytics');
        return;
      }

      const analyticsReport = await getAnalyticsReport(timeRange);
      if (!analyticsReport) {
        console.error('❌ getAnalyticsReport retornó null');
        setError('Error al generar el reporte. Ver consola para más detalles.');
        setLoading(false);
        return;
      }

      console.log('✅ Reporte cargado:', analyticsReport);
      setReport(analyticsReport);
    } catch (err: any) {
      console.error('❌ Error en loadAnalytics:', err);
      setError('Error al cargar analytics: ' + (err.message || 'Error desconocido'));
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await exportFullReport(timeRange);
    } catch (err: any) {
      alert('Error al exportar: ' + (err.message || 'Error desconocido'));
    } finally {
      setExporting(false);
    }
  }

  function SimpleBarChart({ data, height = 200, color = 'blue' }: { data: Array<{ label: string; value: number }>; height?: number; color?: string }) {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No hay datos</div>;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
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
          const barHeight = (d.value / maxValue) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end">
              <div className="relative w-full bg-gray-100 rounded-t" style={{ height: '200px' }}>
                <div
                  className={`${barColor} rounded-t transition-all hover:opacity-80 cursor-pointer`}
                  style={{ height: `${barHeight}%` }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
              <div className="text-xs text-gray-600 mt-1 text-center" style={{ writingMode: 'horizontal-tb' }}>
                {d.label.length > 6 ? d.label.substring(0, 6) : d.label}
              </div>
              <div className="text-xs font-medium text-gray-700 mt-1">{d.value}</div>
            </div>
          );
        })}
      </div>
    );
  }

  function LineChart({ data, height = 200, color = 'blue' }: { data: Array<{ date: string; value: number }>; height?: number; color?: string }) {
    if (!data || data.length === 0) return <div className="text-gray-400 text-center py-8">No hay datos</div>;

    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const colorClasses = {
      blue: 'text-blue-500',
      green: 'text-green-500',
      purple: 'text-purple-500',
      orange: 'text-orange-500',
    };
    const lineColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;
    const fillColor = lineColor.replace('text-', 'bg-').replace('-500', '-100');

    // Crear puntos para el SVG
    const points = data.map((d, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (d.value / maxValue) * 85;
      return { x, y, value: d.value, date: d.date };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${pathData} L 100 100 L 0 100 Z`;

    return (
      <div className="relative h-64">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Área sombreada */}
          <path d={areaPath} fill="currentColor" className={fillColor} opacity="0.3" />
          {/* Línea */}
          <path
            d={pathData}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={lineColor}
          />
          {/* Puntos */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.5"
              fill="currentColor"
              className={lineColor}
            />
          ))}
        </svg>
        {/* Leyenda con valores máximos */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-2">
          <span>0</span>
          <span>{Math.round(maxValue).toLocaleString()}</span>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!report) {
    if (!loading && !error) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">No se pudo cargar el reporte. Revisa la consola para más detalles.</p>
        </div>
      );
    }
    return null;
  }

  // Preparar datos para gráficos
  const salesChartData = report.sales_chart.slice(-14).map((d) => ({
    label: new Date(d.date).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }),
    value: d.orders,
    revenue: d.revenue,
  }));

  const revenueChartData = report.sales_chart.slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }),
    value: d.revenue,
  }));

  const userGrowthData = report.user_growth_chart.slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }),
    value: d.new_users,
  }));

  const categoryChartData = report.category_stats.slice(0, 8).map((cat) => ({
    label: cat.category_name.length > 12 ? cat.category_name.substring(0, 12) : cat.category_name,
    value: cat.total_revenue,
  }));

  return (
    <div className="space-y-6">
      {/* Controles superiores */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-2">
          {(['7d', '30d', '90d', '1y', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {range === '7d' && '7 días'}
              {range === '30d' && '30 días'}
              {range === '90d' && '90 días'}
              {range === '1y' && '1 año'}
              {range === 'all' && 'Todo'}
            </button>
          ))}
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          {exporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Exportando...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Exportar Reporte (CSV)</span>
            </>
          )}
        </button>
      </div>

      {/* Métricas principales con crecimiento */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">👥</span>
            </div>
            <span className={`text-sm font-medium ${
              report.growth_metrics.users.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {report.growth_metrics.users.growth_percentage >= 0 ? '↑' : '↓'} {Math.abs(report.growth_metrics.users.growth_percentage).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
          <p className="text-3xl font-bold text-gray-900">{report.total_users.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Período anterior: {report.growth_metrics.users.previous.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">🛒</span>
            </div>
            <span className={`text-sm font-medium ${
              report.growth_metrics.orders.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {report.growth_metrics.orders.growth_percentage >= 0 ? '↑' : '↓'} {Math.abs(report.growth_metrics.orders.growth_percentage).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Órdenes</p>
          <p className="text-3xl font-bold text-gray-900">{report.total_orders.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Período anterior: {report.growth_metrics.orders.previous.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <span className={`text-sm font-medium ${
              report.growth_metrics.revenue.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {report.growth_metrics.revenue.growth_percentage >= 0 ? '↑' : '↓'} {Math.abs(report.growth_metrics.revenue.growth_percentage).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
          <p className="text-3xl font-bold text-gray-900">₲ {report.total_revenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Período anterior: ₲ {report.growth_metrics.revenue.previous.toLocaleString()}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <span className={`text-sm font-medium ${
              report.growth_metrics.products.growth_percentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {report.growth_metrics.products.growth_percentage >= 0 ? '↑' : '↓'} {Math.abs(report.growth_metrics.products.growth_percentage).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Productos</p>
          <p className="text-3xl font-bold text-gray-900">{report.total_products.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Período anterior: {report.growth_metrics.products.previous.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de ventas diarias */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Órdenes Diarias (Últimas 2 semanas)</h3>
          <div className="h-64">
            <SimpleBarChart data={salesChartData} height={256} color="blue" />
          </div>
        </div>

        {/* Gráfico de ingresos */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Ingresos Diarios (Últimas 2 semanas)</h3>
          <div className="h-64">
            <LineChart data={revenueChartData} height={256} color="green" />
          </div>
        </div>

        {/* Gráfico de crecimiento de usuarios */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Nuevos Usuarios Diarios (Últimas 2 semanas)</h3>
          <div className="h-64">
            <LineChart data={userGrowthData} height={256} color="purple" />
          </div>
        </div>

        {/* Gráfico de categorías */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Ingresos por Categoría</h3>
          <div className="h-64">
            <SimpleBarChart data={categoryChartData} height={256} color="orange" />
          </div>
        </div>
      </div>

      {/* Top vendedores y categorías */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top vendedores */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Vendedores</h3>
          <div className="space-y-3">
            {report.top_sellers.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay datos de vendedores</p>
            ) : (
              report.top_sellers.map((seller, index) => (
                <div key={seller.seller_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium">{seller.seller_name}</div>
                      <div className="text-xs text-gray-500">{seller.seller_email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₲ {seller.total_revenue.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{seller.total_orders} órdenes</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Estadísticas por categoría */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4">Estadísticas por Categoría</h3>
          <div className="space-y-3">
            {report.category_stats.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No hay datos de categorías</p>
            ) : (
              report.category_stats.map((cat, index) => (
                <div key={cat.category_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{cat.category_name}</div>
                    <div className="text-xs text-gray-500">
                      {cat.total_products} productos • {cat.total_orders} órdenes
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">₲ {cat.total_revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Órdenes por estado */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">Órdenes por Estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(report.orders_by_status).map(([status, count]) => (
            <div key={status} className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 capitalize">{status}</div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-500">
                ₲ {Math.round((report.revenue_by_status[status] || 0)).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
