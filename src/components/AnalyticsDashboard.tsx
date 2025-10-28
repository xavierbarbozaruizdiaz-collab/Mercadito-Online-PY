'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AnalyticsData {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  recentOrders: Array<{
    id: string;
    buyer_name: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
  topProducts: Array<{
    id: string;
    title: string;
    total_sales: number;
    revenue: number;
  }>;
}

export default function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setError('Debes iniciar sesión para ver analytics');
        return;
      }

      // Verificar si es admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.session.user.id)
        .single();

      if (profile?.role !== 'admin') {
        setError('Solo administradores pueden ver analytics');
        return;
      }

      // Cargar métricas básicas
      const [
        { count: totalProducts },
        { count: totalOrders },
        { data: ordersData },
        { data: productsData }
      ] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase
          .from('orders')
          .select(`
            id,
            buyer_name,
            total_amount,
            status,
            created_at
          `)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('products')
          .select(`
            id,
            title,
            price
          `)
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Calcular revenue total
      const { data: revenueData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'completed');

      const totalRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;

      // Calcular ventas por producto
      const { data: salesData } = await supabase
        .from('order_items')
        .select(`
          product_id,
          quantity,
          price,
          products!inner(title)
        `);

      const productSales = new Map();
      salesData?.forEach(item => {
        const productId = item.product_id;
        if (!productSales.has(productId)) {
          productSales.set(productId, {
            id: productId,
            title: item.products.title,
            total_sales: 0,
            revenue: 0
          });
        }
        const product = productSales.get(productId);
        product.total_sales += item.quantity;
        product.revenue += item.quantity * item.price;
      });

      const topProducts = Array.from(productSales.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setAnalytics({
        totalProducts: totalProducts || 0,
        totalOrders: totalOrders || 0,
        totalRevenue,
        recentOrders: ordersData || [],
        topProducts
      });

    } catch (err: any) {
      setError('Error al cargar analytics: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
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

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Métricas principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">📦</span>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-sm font-medium text-gray-600">Total Productos</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {analytics.totalProducts.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">🛒</span>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-sm font-medium text-gray-600">Total Órdenes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {analytics.totalOrders.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-sm font-medium text-gray-600">Revenue Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                {analytics.totalRevenue.toLocaleString('es-PY')} Gs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Órdenes recientes */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Órdenes Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Cliente</th>
                <th className="text-left py-2">Monto</th>
                <th className="text-left py-2">Estado</th>
                <th className="text-left py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {analytics.recentOrders.map((order) => (
                <tr key={order.id} className="border-b">
                  <td className="py-2">{order.buyer_name}</td>
                  <td className="py-2">{order.total_amount.toLocaleString('es-PY')} Gs.</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      order.status === 'completed' ? 'bg-green-100 text-green-800' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-2">
                    {new Date(order.created_at).toLocaleDateString('es-PY')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Productos más vendidos */}
      <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Productos Más Vendidos</h2>
        <div className="space-y-3">
          {analytics.topProducts.map((product, index) => (
            <div key={product.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                  {index + 1}
                </span>
                <span className="font-medium">{product.title}</span>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{product.total_sales} vendidos</p>
                <p className="font-semibold">{product.revenue.toLocaleString('es-PY')} Gs.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
