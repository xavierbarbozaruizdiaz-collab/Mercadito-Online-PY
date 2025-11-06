'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    cover_url: string | null;
  };
};

type ShippingAddress = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  department: string;
  zipCode: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    fullName: '',
    phone: '',
    address: '',
    city: '',
    department: '',
    zipCode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'card'>('cash');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadCartItems();
  }, []);

  async function loadCartItems() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          product:products!inner(
            id,
            title,
            price,
            cover_url
          )
        `)
        .eq('user_id', session.session.user.id);

      if (error) throw error;
      setCartItems((data as unknown as CartItem[]) || []);

      if (data?.length === 0) {
        router.push('/cart');
      }
    } catch (err) {
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProcessing(true);

    try {
      // Validar dirección
      if (!address.fullName.trim() || !address.phone.trim() || !address.address.trim()) {
        alert('Por favor completa todos los campos obligatorios');
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        router.push('/auth/sign-in');
        return;
      }

      // Crear orden usando la función de la base de datos
      const { data, error } = await supabase.rpc('create_order_from_cart', {
        p_buyer_id: session.session.user.id,
        p_shipping_address: address,
        p_payment_method: paymentMethod,
        p_notes: notes.trim() || null
      });

      if (error) throw error;

      // Redirigir a página de éxito
      router.push(`/checkout/success?orderId=${data}`);

    } catch (err: any) {
      alert('Error al procesar el pedido: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessing(false);
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Header mejorado */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Finalizar Compra
              </h1>
              <p className="text-gray-600">Completa la información para finalizar tu pedido</p>
            </div>
            <Link 
              href="/cart" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al carrito
            </Link>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Formulario de dirección */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Información de envío</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.fullName}
                    onChange={(e) => setAddress(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    required
                    value={address.phone}
                    onChange={(e) => setAddress(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="0981 123 456"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección *
                  </label>
                  <input
                    type="text"
                    required
                    value={address.address}
                    onChange={(e) => setAddress(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Av. Mariscal López 1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={address.city}
                    onChange={(e) => setAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="Asunción"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Departamento
                  </label>
                  <select
                    value={address.department}
                    onChange={(e) => setAddress(prev => ({ ...prev, department: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Asunción">Asunción</option>
                    <option value="Central">Central</option>
                    <option value="Alto Paraná">Alto Paraná</option>
                    <option value="Itapúa">Itapúa</option>
                    <option value="Caaguazú">Caaguazú</option>
                    <option value="San Pedro">San Pedro</option>
                    <option value="Cordillera">Cordillera</option>
                    <option value="Guairá">Guairá</option>
                    <option value="Caazapá">Caazapá</option>
                    <option value="Paraguarí">Paraguarí</option>
                    <option value="Misiones">Misiones</option>
                    <option value="Ñeembucú">Ñeembucú</option>
                    <option value="Amambay">Amambay</option>
                    <option value="Canindeyú">Canindeyú</option>
                    <option value="Presidente Hayes">Presidente Hayes</option>
                    <option value="Boquerón">Boquerón</option>
                    <option value="Alto Paraguay">Alto Paraguay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código postal
                  </label>
                  <input
                    type="text"
                    value={address.zipCode}
                    onChange={(e) => setAddress(prev => ({ ...prev, zipCode: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            {/* Método de pago */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Método de pago</h2>
              </div>
              <div className="space-y-4">
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'cash' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">Efectivo contra entrega</span>
                    <p className="text-sm text-gray-600">Paga cuando recibas tu producto</p>
                  </div>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </label>
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'transfer' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="transfer"
                    checked={paymentMethod === 'transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">Transferencia bancaria</span>
                    <p className="text-sm text-gray-600">Realiza una transferencia bancaria</p>
                  </div>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </label>
                <label className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-5 h-5 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-gray-900">Tarjeta de crédito/débito</span>
                    <p className="text-sm text-gray-600">Pago seguro con tarjeta</p>
                  </div>
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </label>
              </div>
            </div>

            {/* Notas adicionales */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Notas adicionales</h2>
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                rows={4}
                placeholder="Instrucciones especiales para la entrega, horarios preferidos, etc..."
              />
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4">
              <h2 className="text-xl font-bold mb-6 text-gray-900">Resumen del pedido</h2>
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0">
                    <img
                      src={item.product.cover_url ?? 'https://placehold.co/50x50?text=Producto'}
                      alt={item.product.title}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product.title}</p>
                      <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-shrink-0">
                      {(item.product.price * item.quantity).toLocaleString('es-PY')} Gs.
                    </p>
                  </div>
                ))}
                <div className="pt-4 space-y-3">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal ({totalItems} productos)</span>
                    <span className="font-semibold">{totalPrice.toLocaleString('es-PY')} Gs.</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>Envío</span>
                    <span className="font-semibold text-green-600">Gratis</span>
                  </div>
                  <div className="border-t border-gray-300 pt-4">
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total</span>
                      <span className="text-green-600">{totalPrice.toLocaleString('es-PY')} Gs.</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirmar pedido
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
