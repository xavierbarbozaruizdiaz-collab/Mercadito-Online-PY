'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    product: {
      id: string;
      title: string;
      cover_url: string | null;
    };
  }[];
};

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) return;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          status,
          total_amount,
          created_at,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            product:products (
              id,
              title,
              cover_url
            )
          )
        `)
        .eq('buyer_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data as unknown as Order[]) || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'shipped': return 'bg-purple-100 text-purple-800 border border-purple-200';
      case 'delivered': return 'bg-green-100 text-green-800 border border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border border-red-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmado';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregado';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando pedidos...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis Pedidos</h1>
                <p className="text-gray-600 mt-1">Gestiona y revisa todos tus pedidos</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al dashboard
            </Link>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 sm:p-16 text-center border border-gray-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">No tienes pedidos aún</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Cuando hagas tu primera compra, aparecerá aquí para que puedas hacer seguimiento
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow">
                {/* Header del pedido */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                          Pedido #{order.id.slice(0, 8).toUpperCase()}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(order.created_at).toLocaleDateString('es-PY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-3">
                      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 px-4 py-2 rounded-lg border-2 border-green-200">
                        <p className="text-xs text-green-700 font-semibold uppercase tracking-wide mb-1">Total</p>
                        <p className="text-lg font-bold text-green-900">
                          {order.total_amount.toLocaleString('es-PY')} Gs.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Items del pedido */}
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Productos del pedido</h4>
                  <div className="space-y-4">
                    {order.order_items.map((item) => (
                      <Link
                        key={item.id}
                        href={`/products/${item.product.id}`}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                      >
                        <div className="relative flex-shrink-0">
                          <img
                            src={item.product.cover_url ?? 'https://placehold.co/80x80?text=Producto'}
                            alt={item.product.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                            {item.product.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Cantidad: <span className="font-semibold">{item.quantity}</span> • Precio unitario: <span className="font-semibold">{item.unit_price.toLocaleString('es-PY')} Gs.</span>
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-bold text-green-600">
                            {item.total_price.toLocaleString('es-PY')} Gs.
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
