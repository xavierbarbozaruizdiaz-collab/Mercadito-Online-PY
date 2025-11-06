'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    title: string;
    price: number;
    cover_url: string | null;
  };
};

export default function CartButton() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCartItems();
  }, []);

  async function loadCartItems() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setCartItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          created_at,
          updated_at,
          product:products!inner(
            id,
            title,
            price,
            cover_url
          )
        `)
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartItems((data as unknown as CartItem[]) || []);
    } catch (err) {
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  if (loading) {
    return (
      <div className="relative">
        <button className="p-2 text-gray-600 hover:text-gray-800">
          🛒
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Link
        href="/cart"
        className="flex items-center gap-2 p-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <span className="text-xl">🛒</span>
        {totalItems > 0 && (
          <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
            {totalItems}
          </span>
        )}
      </Link>
    </div>
  );
}

export function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadCartItems();
  }, []);

  async function loadCartItems() {
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        setCartItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select(`
          id,
          product_id,
          quantity,
          created_at,
          updated_at,
          product:products!inner(
            id,
            title,
            price,
            cover_url
          )
        `)
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCartItems((data as unknown as CartItem[]) || []);
    } catch (err) {
      console.error('Error loading cart:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(cartItemId: string, newQuantity: number) {
    if (newQuantity < 1) {
      await removeFromCart(cartItemId);
      return;
    }

    setUpdating(cartItemId);
    try {
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;
      await loadCartItems();
    } catch (err) {
      console.error('Error updating quantity:', err);
    } finally {
      setUpdating(null);
    }
  }

  async function removeFromCart(cartItemId: string) {
    setUpdating(cartItemId);
    try {
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', cartItemId);

      if (error) throw error;
      await loadCartItems();
    } catch (err) {
      console.error('Error removing item:', err);
    } finally {
      setUpdating(null);
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
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Carrito de Compras
              </h1>
              <p className="text-gray-600">
                {totalItems > 0 ? `${totalItems} producto${totalItems !== 1 ? 's' : ''} en tu carrito` : 'Tu carrito está vacío'}
              </p>
            </div>
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Continuar comprando
            </Link>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 sm:p-16 text-center border border-gray-200">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Tu carrito está vacío</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Agrega algunos productos increíbles a tu carrito para comenzar tu compra
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Items del carrito */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-md border border-gray-200 p-5 sm:p-6 hover:shadow-lg transition-all group">
                  <div className="flex gap-4 sm:gap-6">
                    <div className="relative flex-shrink-0">
                      <img
                        src={item.product.cover_url ?? 'https://placehold.co/100x100?text=Producto'}
                        alt={item.product.title}
                        className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border border-gray-200 group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${item.product.id}`}>
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 text-gray-900 group-hover:text-blue-600 transition-colors">
                          {item.product.title}
                        </h3>
                      </Link>
                      <p className="text-gray-600 text-sm mb-4">
                        {item.product.price.toLocaleString('es-PY')} Gs. c/u
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={updating === item.id}
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors rounded-l-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="px-4 py-1 min-w-[50px] text-center font-semibold text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={updating === item.id}
                            className="w-9 h-9 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 transition-colors rounded-r-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          disabled={updating === item.id}
                          className="inline-flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors font-medium text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {(item.product.price * item.quantity).toLocaleString('es-PY')} Gs.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen del pedido */}
            <div className="lg:col-span-1">
              <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-6 text-gray-900">Resumen del pedido</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-gray-700">
                    <span>Productos ({totalItems})</span>
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
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Proceder al pago
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
