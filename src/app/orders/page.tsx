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
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Mis Pedidos</h1>
          <Link href="/dashboard" className="underline text-sm">← Volver al dashboard</Link>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">No tienes pedidos aún</h2>
            <p className="text-gray-500 mb-6">Cuando hagas tu primera compra, aparecerá aquí</p>
            <Link
              href="/"
              className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Pedido #{order.id.slice(0, 8)}
                    </h3>
                    <p className="text-gray-600">
                      {new Date(order.created_at).toLocaleDateString('es-PY')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                    <p className="text-lg font-semibold mt-2">
                      {order.total_amount.toLocaleString('es-PY')} Gs.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-b-0">
                      <img
                        src={item.product.cover_url ?? 'https://placehold.co/60x60?text=Producto'}
                        alt={item.product.title}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product.title}</h4>
                        <p className="text-sm text-gray-600">
                          {item.quantity} x {item.unit_price.toLocaleString('es-PY')} Gs.
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {item.total_price.toLocaleString('es-PY')} Gs.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
