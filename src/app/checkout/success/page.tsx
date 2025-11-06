'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

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

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  async function loadOrder() {
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
      setOrder(data as unknown as Order);
    } catch (err) {
      console.error('Error loading order:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando pedido...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Pedido no encontrado</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              El pedido que buscas no existe o no tienes permisos para verlo.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header de éxito */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">¡Pedido Confirmado!</h1>
          <p className="text-xl text-gray-600 mb-2">
            Tu pedido ha sido procesado exitosamente
          </p>
          <p className="text-lg font-mono text-gray-500">
            Número de pedido: #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        {/* Detalles del pedido */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Detalles del Pedido</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Fecha del pedido</p>
              <p className="font-semibold text-gray-900">
                {new Date(order.created_at).toLocaleDateString('es-PY', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Estado</p>
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${
                order.status === 'pending' 
                  ? 'bg-yellow-100 text-yellow-800' 
                  : order.status === 'confirmed'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {order.status === 'pending' ? '⏳ Pendiente' : order.status === 'confirmed' ? '✅ Confirmado' : order.status}
              </span>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 sm:col-span-2 border-2 border-green-200">
              <p className="text-sm text-green-700 font-semibold uppercase tracking-wide mb-1">Total del pedido</p>
              <p className="text-2xl font-bold text-green-900">
                {order.total_amount.toLocaleString('es-PY')} Gs.
              </p>
            </div>
          </div>
        </div>

        {/* Productos pedidos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Productos Pedidos</h2>
          </div>
          <div className="space-y-4">
            {order.order_items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="relative flex-shrink-0">
                  <img
                    src={item.product.cover_url ?? 'https://placehold.co/80x80?text=Producto'}
                    alt={item.product.title}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-400 transition-colors"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.product.id}`}>
                    <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {item.product.title}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-600">
                    Cantidad: <span className="font-semibold">{item.quantity}</span> • Precio unitario: <span className="font-semibold">{item.unit_price.toLocaleString('es-PY')} Gs.</span>
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xl font-bold text-green-600">
                    {item.total_price.toLocaleString('es-PY')} Gs.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Información de seguimiento */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 sm:p-8 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-blue-900 mb-4">¿Qué sigue?</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-blue-800">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">Recibirás un email de confirmación con los detalles del pedido</span>
                </li>
                <li className="flex items-start gap-3 text-blue-800">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-medium">El vendedor se pondrá en contacto contigo para coordinar la entrega</span>
                </li>
                <li className="flex items-start gap-3 text-blue-800">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Puedes hacer seguimiento de tu pedido desde tu panel de usuario</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/orders"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Ver mis pedidos
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
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
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando pedido...</p>
          </div>
        </div>
      </main>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
