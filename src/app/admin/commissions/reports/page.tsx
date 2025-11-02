'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import Link from 'next/link';
import { ArrowLeft, Download, DollarSign, BarChart3, TrendingUp } from 'lucide-react';

type CommissionReport = {
  period: string;
  total_commissions: number;
  total_orders: number;
  direct_sales_commissions: number;
  auction_commissions: number;
  by_store: Array<{ store_id: string; store_name?: string; total: number }>;
  by_seller: Array<{ seller_id: string; seller_email?: string; total: number }>;
};

export default function CommissionReportsPage() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [report, setReport] = useState<CommissionReport | null>(null);

  useEffect(() => {
    loadReport();
  }, [period, customFrom, customTo]);

  async function loadReport() {
    setLoading(true);
    try {
      let fromDate: Date;
      let toDate = new Date();

      switch (period) {
        case 'today':
          fromDate = new Date();
          fromDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          fromDate = new Date();
          fromDate.setDate(fromDate.getDate() - 7);
          break;
        case 'month':
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 1);
          break;
        case 'year':
          fromDate = new Date();
          fromDate.setFullYear(fromDate.getFullYear() - 1);
          break;
        case 'custom':
          if (!customFrom || !customTo) {
            setLoading(false);
            return;
          }
          fromDate = new Date(customFrom);
          toDate = new Date(customTo);
          break;
        default:
          fromDate = new Date();
          fromDate.setMonth(fromDate.getMonth() - 1);
      }

      // Obtener comisiones del período
      const { data: fees } = await supabase
        .from('platform_fees')
        .select(`
          id,
          commission_amount,
          transaction_type,
          seller_id,
          store_id,
          order_id,
          created_at,
          store:stores(name),
          seller:profiles!platform_fees_seller_id_fkey(email)
        `)
        .in('status', ['confirmed', 'paid'])
        .gte('created_at', fromDate.toISOString())
        .lte('created_at', toDate.toISOString());

      if (!fees || fees.length === 0) {
        setReport({
          period: period === 'custom' ? `${customFrom} - ${customTo}` : period,
          total_commissions: 0,
          total_orders: 0,
          direct_sales_commissions: 0,
          auction_commissions: 0,
          by_store: [],
          by_seller: [],
        });
        setLoading(false);
        return;
      }

      // Calcular totales
      const totalCommissions = (fees || []).reduce((sum: number, f: any) => sum + (parseFloat(f.commission_amount || '0') || 0), 0);
      const directSales = (fees || []).filter((f: any) => (f.transaction_type as string) === 'direct_sale');
      const auctionSales = (fees || []).filter((f: any) => (f.transaction_type as string) === 'auction');

      const directCommissions = directSales.reduce((sum: number, f: any) => sum + (parseFloat(f.commission_amount || '0') || 0), 0);
      const auctionCommissions = auctionSales.reduce((sum: number, f: any) => sum + (parseFloat(f.commission_amount || '0') || 0), 0);

      // Agrupar por tienda
      const storeMap = new Map<string, { name?: string; total: number }>();
      (fees || []).forEach((f: any) => {
        if (f.store_id) {
          const storeId = f.store_id;
          const amount = parseFloat(f.commission_amount as any) || 0;
          const current = storeMap.get(storeId) || { total: 0 };
          current.name = f.store?.name;
          current.total += amount;
          storeMap.set(storeId, current);
        }
      });

      // Agrupar por vendedor
      const sellerMap = new Map<string, { email?: string; total: number }>();
      (fees || []).forEach((f: any) => {
        if (f.seller_id) {
          const sellerId = f.seller_id;
          const amount = parseFloat(f.commission_amount as any) || 0;
          const current = sellerMap.get(sellerId) || { total: 0 };
          current.email = (f.seller as any)?.email;
          current.total += amount;
          sellerMap.set(sellerId, current);
        }
      });

      const byStore = Array.from(storeMap.entries())
        .map(([store_id, data]) => ({ store_id, store_name: data.name, total: data.total }))
        .sort((a, b) => b.total - a.total);

      const bySeller = Array.from(sellerMap.entries())
        .map(([seller_id, data]) => ({ seller_id, seller_email: data.email, total: data.total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 20); // Top 20

      setReport({
        period: period === 'custom' ? `${customFrom} - ${customTo}` : period,
        total_commissions: totalCommissions,
        total_orders: new Set((fees || []).map((f: any) => f.order_id).filter(Boolean)).size,
        direct_sales_commissions: directCommissions,
        auction_commissions: auctionCommissions,
        by_store: byStore,
        by_seller: bySeller,
      });
    } catch (err) {
      logger.error('Error loading commission report', err);
    } finally {
      setLoading(false);
    }
  }

  function exportToCSV() {
    if (!report) return;

    const csv = [
      ['Período', 'Total Comisiones', 'Total Órdenes', 'Comisiones Directas', 'Comisiones Subastas'],
      [
        report.period,
        report.total_commissions.toString(),
        report.total_orders.toString(),
        report.direct_sales_commissions.toString(),
        report.auction_commissions.toString(),
      ],
      [],
      ['Top Vendedores'],
      ['Email', 'Total'],
      ...report.by_seller.map(s => [s.seller_email || s.seller_id, s.total.toString()]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comisiones_${report.period}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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
        <div className="mb-6">
          <Link
            href="/admin/commissions"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a comisiones</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Reportes de Comisiones</h1>
              <p className="text-gray-600 mt-2">Análisis detallado de comisiones cobradas</p>
            </div>
            {report && (
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Exportar CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Período</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="today">Hoy</option>
                <option value="week">Última Semana</option>
                <option value="month">Último Mes</option>
                <option value="year">Último Año</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">Desde</label>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Hasta</label>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Resumen */}
        {report && (
          <>
            <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Comisiones</p>
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {report.total_commissions.toLocaleString('es-PY')} Gs.
                </p>
                <p className="text-xs text-gray-500 mt-1">{report.total_orders} órdenes</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Ventas Directas</p>
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                </div>
                <p className="text-2xl font-bold text-blue-600">
                  {report.direct_sales_commissions.toLocaleString('es-PY')} Gs.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {report.total_commissions > 0 
                    ? ((report.direct_sales_commissions / report.total_commissions) * 100).toFixed(1)
                    : 0}% del total
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Subastas</p>
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  {report.auction_commissions.toLocaleString('es-PY')} Gs.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {report.total_commissions > 0 
                    ? ((report.auction_commissions / report.total_commissions) * 100).toFixed(1)
                    : 0}% del total
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Promedio por Orden</p>
                  <TrendingUp className="w-5 h-5 text-green-500" />
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {report.total_orders > 0 
                    ? (report.total_commissions / report.total_orders).toLocaleString('es-PY')
                    : 0} Gs.
                </p>
                <p className="text-xs text-gray-500 mt-1">Por orden</p>
              </div>
            </div>

            {/* Top Vendedores */}
            {report.by_seller.length > 0 && (
              <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">Top Vendedores</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendedor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Comisiones</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {report.by_seller.map((seller) => (
                        <tr key={seller.seller_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm font-medium text-gray-900">
                              {seller.seller_email || seller.seller_id}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {seller.total.toLocaleString('es-PY')} Gs.
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.total_commissions > 0 
                              ? ((seller.total / report.total_commissions) * 100).toFixed(2)
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Por Tienda */}
            {report.by_store.length > 0 && (
              <div className="mb-6 bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-lg font-semibold mb-4">Comisiones por Tienda</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tienda</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Comisiones</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% del Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {report.by_store.map((store) => (
                        <tr key={store.store_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <p className="text-sm font-medium text-gray-900">
                              {store.store_name || store.store_id.slice(0, 8)}
                            </p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {store.total.toLocaleString('es-PY')} Gs.
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {report.total_commissions > 0 
                              ? ((store.total / report.total_commissions) * 100).toFixed(2)
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

