'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useFacebookPixel } from '@/lib/services/facebookPixelService';
import { useGoogleAnalytics } from '@/lib/services/googleAnalyticsService';

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

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const facebookPixel = useFacebookPixel();
  const googleAnalytics = useGoogleAnalytics();

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function loadOrder() {
    if (!orderId) return; // Ya está verificado en useEffect, pero TypeScript necesita esto
    try {
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
        .eq('id', orderId)
        .single();

      if (error) throw error;
      const orderData = data as unknown as Order;
      setOrder(orderData);

      // Track purchase
      if (orderData && orderData.order_items && orderData.order_items.length > 0) {
        const products = orderData.order_items.map(item => ({
          id: item.product.id,
          quantity: item.quantity,
          price: item.unit_price,
        }));

        facebookPixel.trackPurchase({
          orderId: orderData.id,
          products,
          total: orderData.total_amount,
          currency: 'PYG',
        });

        googleAnalytics.trackPurchase({
          transactionId: orderData.id,
          products: orderData.order_items.map(item => ({
            id: item.product.id,
            name: item.product.title,
            category: '',
            price: item.unit_price,
            quantity: item.quantity,
          })),
          total: orderData.total_amount,
          currency: 'PYG',
        });
      }
    } catch (err) {
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-4">Pedido no encontrado</h1>
          <p className="text-gray-600 mb-6">El pedido que buscas no existe o no tienes permisos para verlo.</p>
          <Link
            href="/"
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold mb-2">¡Pedido confirmado!</h1>
          <p className="text-gray-600">
            Tu pedido #{order.id.slice(0, 8)} ha sido procesado exitosamente
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Detalles del pedido</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Número de pedido:</span>
              <span className="font-mono">#{order.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Fecha:</span>
              <span>{new Date(order.created_at).toLocaleDateString('es-PY')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Estado:</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                {order.status === 'pending' ? 'Pendiente' : order.status}
              </span>
            </div>
            <div className="flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span>{order.total_amount.toLocaleString('es-PY')} Gs.</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Productos pedidos</h2>
          <div className="space-y-3">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <img
                  src={item.product.cover_url ?? 'https://placehold.co/60x60?text=Producto'}
                  alt={item.product.title}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1">
                  <h3 className="font-medium">{item.product.title}</h3>
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">¿Qué sigue?</h3>
          <ul className="text-blue-800 space-y-1 text-sm">
            <li>• Recibirás un email de confirmación con los detalles del pedido</li>
            <li>• El vendedor se pondrá en contacto contigo para coordinar la entrega</li>
            <li>• Puedes hacer seguimiento de tu pedido desde tu panel de usuario</li>
          </ul>
        </div>

        <div className="flex gap-4 justify-center">
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors"
          >
            Ver mis pedidos
          </Link>
          <Link
            href="/"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
          >
            Continuar comprando
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando información del pedido...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
