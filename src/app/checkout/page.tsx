'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CouponInput from '@/components/CouponInput';
import { CouponValidationResult } from '@/lib/services/couponService';

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
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);

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

      // Primero obtener cart items básicos
      const { data: cartData, error } = await (supabase as any)
        .from('cart_items')
        .select('id, product_id, quantity')
        .eq('user_id', session.session.user.id);

      if (error) throw error;
      if (!cartData || cartData.length === 0) {
        router.push('/cart');
        return;
      }

      // Obtener productos en paralelo
      const productIds = (cartData as Array<{ product_id: string | null | undefined }>)
        .map((item) => item.product_id)
        .filter(Boolean) as string[];
      const { data: productsData } = await (supabase as any)
        .from('products')
        .select('id, title, price, cover_url')
        .in('id', productIds);

      // Combinar cart items con productos
      const productsMap = new Map();
      if (productsData) {
        (productsData as Array<any>).forEach((product: any) => productsMap.set(product.id, product));
      }

      const enrichedCartItems = (cartData as any[]).map((item: any) => ({
        ...item,
        product: productsMap.get(item.product_id) || { id: item.product_id, title: 'Producto no encontrado', price: 0, cover_url: null },
      }));

      setCartItems(enrichedCartItems as CartItem[]);
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

      console.log('🛒 Creando pedido...', {
        buyer_id: session.session.user.id,
        cartItems: cartItems.length,
        total: totalPrice
      });

      // Crear orden usando la función de la base de datos
      const buyerId = session.session.user.id;
      console.log('📝 Datos del pedido a crear:', {
        buyer_id: buyerId,
        buyer_email: session.session.user.email,
        cartItems_count: cartItems.length,
        total: totalPrice,
        address: address.fullName,
        payment_method: paymentMethod
      });

      const { data: orderId, error } = await (supabase as any).rpc('create_order_from_cart', {
        p_buyer_id: buyerId,
        p_shipping_address: address,
        p_payment_method: paymentMethod,
        p_notes: notes.trim() || null
      });

      if (error) {
        console.error('❌ Error creando pedido:', {
          error,
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          buyer_id: buyerId
        });
        throw error;
      }

      console.log('✅ Pedido creado exitosamente:', {
        orderId,
        buyer_id: buyerId,
        timestamp: new Date().toISOString()
      });

      // Verificar que el pedido se creó correctamente con el buyer_id correcto
      const { data: verifyOrder, error: verifyError } = await supabase
        .from('orders')
        .select('id, buyer_id, total_amount, status, created_at')
        .eq('id', orderId)
        .single();

      if (verifyError) {
        console.error('⚠️ No se pudo verificar el pedido creado:', verifyError);
      } else {
        type OrderVerify = { id: string; buyer_id: string; total_amount: number; status: string; created_at: string };
        const orderTyped = verifyOrder as OrderVerify | null;
        
        console.log('✅ Verificación del pedido:', {
          orderId: orderTyped?.id,
          buyer_id_in_db: orderTyped?.buyer_id,
          buyer_id_expected: buyerId,
          match: orderTyped?.buyer_id === buyerId,
          total: orderTyped?.total_amount,
          status: orderTyped?.status
        });

        if (orderTyped?.buyer_id !== buyerId) {
          console.error('❌ PROBLEMA CRÍTICO: El buyer_id en la BD no coincide con el usuario actual!');
          alert('Se creó el pedido pero hay un problema con la asociación. Contacta al administrador.');
        }
      }

      // Obtener información del pedido para notificaciones
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id,
          total_amount,
          order_items (
            product:products (
              title,
              seller_id
            ),
            seller_id
          )
        `)
        .eq('id', orderId)
        .single();

      console.log('📋 Datos del pedido creado:', orderData);

      // Enviar email de confirmación (en segundo plano, no bloquea)
      if (session.session.user.email) {
        fetch('/api/email/order-confirmation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: session.session.user.email,
            orderNumber: orderId,
            orderDetails: {
              items: cartItems.map(item => ({
                name: item.product.title,
                quantity: item.quantity,
                price: item.product.price * item.quantity,
              })),
              total: totalPrice,
              shippingAddress: address,
            },
          }),
        }).catch(err => console.error('Error enviando email:', err));
      }

      // Enviar notificaciones de WhatsApp a los vendedores (en segundo plano, no bloquea)
      type OrderDataWithItems = { id: string; total_amount: number; order_items?: Array<{ seller_id: string; product?: { title: string; seller_id: string } }> };
      const orderTyped = orderData as OrderDataWithItems | null;
      
      if (orderTyped?.order_items && orderTyped.order_items.length > 0) {
        // Obtener sellers únicos del pedido
        const sellerIds = [...new Set(
          orderTyped.order_items
            .map((item) => item.seller_id)
            .filter(Boolean)
        )];

        console.log('📱 Enviando notificaciones WhatsApp a vendedores:', sellerIds);

        // Enviar notificación a cada vendedor
        for (const sellerId of sellerIds) {
          fetch('/api/whatsapp/notify-seller', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sellerId,
              orderId,
              orderData: orderData,
              buyerPhone: address.phone,
              buyerName: address.fullName,
            }),
          })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              console.log(`✅ Notificación WhatsApp preparada para vendedor ${sellerId}:`, data.whatsapp_url);
              // Opcional: En producción, puedes configurar una API de WhatsApp para envío automático
            } else {
              console.warn(`⚠️ No se pudo enviar WhatsApp a vendedor ${sellerId}:`, data.error);
            }
          })
          .catch(err => console.error(`❌ Error enviando WhatsApp a vendedor ${sellerId}:`, err));
        }
      }

      // Redirigir a página de éxito
      router.push(`/checkout/success?orderId=${orderId}`);

    } catch (err: any) {
      alert('Error al procesar el pedido: ' + (err.message || 'Error desconocido'));
    } finally {
      setProcessing(false);
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const discountAmount = appliedCoupon?.valid ? appliedCoupon.discount_amount : 0;
  const totalPrice = Math.max(0, subtotal - discountAmount);

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
    <main className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Finalizar Compra</h1>
          <Link href="/cart" className="underline text-sm">← Volver al carrito</Link>
        </div>

        <form onSubmit={handleSubmit} className="grid lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Formulario de dirección */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Información de envío</h2>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>

            {/* Método de pago */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Método de pago</h2>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <span>Efectivo contra entrega</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="transfer"
                    checked={paymentMethod === 'transfer'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <span>Transferencia bancaria</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="mr-3"
                  />
                  <span>Tarjeta de crédito/débito</span>
                </label>
              </div>
            </div>

            {/* Notas adicionales */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Notas adicionales</h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Instrucciones especiales para la entrega..."
              />
            </div>
          </div>

          {/* Resumen del pedido */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
              <h2 className="text-xl font-semibold mb-4">Resumen del pedido</h2>
              <div className="space-y-3 mb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product.title} x{item.quantity}</span>
                    <span>{(item.product.price * item.quantity).toLocaleString('es-PY')} Gs.</span>
                  </div>
                ))}
                <hr />
                <div className="flex justify-between">
                  <span>Subtotal ({totalItems} productos)</span>
                  <span>{subtotal.toLocaleString('es-PY')} Gs.</span>
                </div>
                
                {/* Cupón de descuento */}
                <div className="space-y-2">
                  <CouponInput
                    orderAmount={subtotal}
                    onCouponApplied={setAppliedCoupon}
                    onCouponRemoved={() => setAppliedCoupon(null)}
                    appliedCoupon={appliedCoupon}
                  />
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Descuento</span>
                    <span>-{discountAmount.toLocaleString('es-PY')} Gs.</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Envío</span>
                  <span className="text-green-600">Gratis</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{totalPrice.toLocaleString('es-PY')} Gs.</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={processing}
                className="w-full mt-6 bg-black text-white py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Procesando...' : 'Confirmar pedido'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
