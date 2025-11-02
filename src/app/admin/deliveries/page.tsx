'use client';

// ============================================
// MERCADITO ONLINE PY - ADMIN: MONITOREO DE ENTREGAS
// Panel para monitorear entregas pendientes y aplicar multas
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';
import { ArrowLeft, Package, AlertTriangle, CheckCircle, Clock, DollarSign, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type DeliveryStatus = 'pending' | 'confirmed' | 'in_transit' | 'delivered' | 'failed' | 'refunded';

type OrderDelivery = {
  id: string;
  buyer_id: string;
  total_amount: number;
  delivery_status: DeliveryStatus;
  delivery_deadline: string | null;
  expected_delivery_date: string | null;
  delivery_warning_sent: boolean;
  delivery_penalty_applied: boolean;
  created_at: string;
  is_auction_order: boolean;
  auction_id: string | null;
  buyer?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
  seller?: {
    id: string;
    email: string;
  };
  product?: {
    id: string;
    title: string;
  };
};

export default function AdminDeliveriesPage() {
  const [orders, setOrders] = useState<OrderDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'penalized'>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    overdue: 0,
    penalized: 0,
  });

  useEffect(() => {
    loadOrders();
  }, [filter]);

  async function loadOrders() {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select(`
          id,
          buyer_id,
          total_amount,
          delivery_status,
          delivery_deadline,
          expected_delivery_date,
          delivery_warning_sent,
          delivery_penalty_applied,
          created_at,
          is_auction_order,
          auction_id,
          buyer:profiles!orders_buyer_id_fkey(id, email, first_name, last_name)
        `)
        .eq('status', 'paid')
        .eq('is_auction_order', true)
        .order('delivery_deadline', { ascending: true });

      // Aplicar filtros
      if (filter === 'pending') {
        query = query.in('delivery_status', ['pending', 'confirmed', 'in_transit'])
          .gte('delivery_deadline', new Date().toISOString());
      } else if (filter === 'overdue') {
        query = query.in('delivery_status', ['pending', 'confirmed', 'in_transit'])
          .lt('delivery_deadline', new Date().toISOString())
          .eq('delivery_penalty_applied', false);
      } else if (filter === 'penalized') {
        query = query.eq('delivery_penalty_applied', true);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Cargar información del vendedor y producto para cada orden
      const enrichedOrders = await Promise.all(
        (data || []).map(async (order: any) => {
          // Obtener seller_id desde order_items
          const { data: orderItem } = await supabase
            .from('order_items')
            .select('seller_id, product_id')
            .eq('order_id', order.id)
            .limit(1)
            .single();

          let sellerInfo = null;
          let productInfo = null;

          if (orderItem) {
            // Cargar vendedor
            const { data: seller } = await supabase
              .from('profiles')
              .select('id, email')
              .eq('id', (orderItem as any).seller_id)
              .single();

            sellerInfo = seller;

            // Cargar producto
            if (order.auction_id) {
              const { data: product } = await supabase
                .from('products')
                .select('id, title')
                .eq('id', order.auction_id)
                .single();

              productInfo = product;
            }
          }

          return {
            ...order,
            seller: sellerInfo,
            product: productInfo,
          };
        })
      );

      setOrders(enrichedOrders);

      // Calcular estadísticas
      const now = new Date();
      const pending = enrichedOrders.filter(
        o => o.delivery_status !== 'delivered' && 
        o.delivery_deadline && 
        new Date(o.delivery_deadline) > now
      ).length;
      
      const overdue = enrichedOrders.filter(
        o => o.delivery_status !== 'delivered' && 
        o.delivery_deadline && 
        new Date(o.delivery_deadline) <= now &&
        !o.delivery_penalty_applied
      ).length;

      const penalized = enrichedOrders.filter(o => o.delivery_penalty_applied).length;

      setStats({
        total: enrichedOrders.length,
        pending,
        overdue,
        penalized,
      });
    } catch (err: any) {
      logger.error('Error loading delivery orders', err);
      alert('Error: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(status: DeliveryStatus, deadline: string | null, penaltyApplied: boolean) {
    if (penaltyApplied) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Multa Aplicada</span>;
    }

    if (!deadline) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">Sin fecha límite</span>;
    }

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const isOverdue = deadlineDate < now;

    if (status === 'delivered') {
      return <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Entregado</span>;
    }

    if (isOverdue) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Vencido</span>;
    }

    const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 2) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Por vencer ({daysLeft}d)</span>;
    }

    return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Pendiente ({daysLeft}d)</span>;
  }

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Monitoreo de Entregas</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verifica entregas pendientes y aplica multas a vendedores que no cumplen
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Pendientes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Vencidas</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Multadas</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">{stats.penalized}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'pending' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'overdue' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Vencidas
            </button>
            <button
              onClick={() => setFilter('penalized')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'penalized' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Multadas
            </button>
          </div>
        </div>

        {/* Tabla de órdenes */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">Cargando entregas...</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Pedido</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vendedor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Comprador</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fecha Límite</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-sm">
                      <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        #{order.id.slice(0, 8)}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.product?.title || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.seller?.email ? (
                        <div>
                          <p className="font-medium">{order.seller.email}</p>
                          <Link
                            href={`/admin/sellers/${order.seller.id}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Ver perfil
                          </Link>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.buyer ? (
                        <div>
                          <p className="font-medium">
                            {order.buyer.first_name || order.buyer.last_name
                              ? `${order.buyer.first_name || ''} ${order.buyer.last_name || ''}`.trim()
                              : order.buyer.email}
                          </p>
                          <p className="text-xs text-gray-500">{order.buyer.email}</p>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold">
                      {formatCurrency(order.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {order.delivery_deadline ? (
                        <div>
                          <p>{new Date(order.delivery_deadline).toLocaleDateString('es-PY')}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(order.delivery_deadline).toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getStatusBadge(order.delivery_status, order.delivery_deadline, order.delivery_penalty_applied)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/orders/${order.id}`}
                          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                        >
                          Ver
                        </Link>
                        {order.delivery_penalty_applied && (
                          <Link
                            href={`/admin/deliveries/penalties?order=${order.id}`}
                            className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
                          >
                            Multa
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No hay entregas pendientes</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


