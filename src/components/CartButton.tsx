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
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Carrito de Compras</h1>
          <Link href="/" className="underline text-sm">← Continuar comprando</Link>
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-xl font-medium text-gray-600 mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-500 mb-6">Agrega algunos productos para comenzar</p>
            <Link
              href="/"
              className="px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Items del carrito */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm border p-4">
                  <div className="flex gap-4">
                    <img
                      src={item.product.cover_url ?? 'https://placehold.co/100x100?text=Producto'}
                      alt={item.product.title}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{item.product.title}</h3>
                      <p className="text-gray-600">
                        {item.product.price.toLocaleString('es-PY')} Gs. c/u
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id}
                          className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                        >
                          -
                        </button>
                        <span className="px-3 py-1 border rounded min-w-[40px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id}
                          className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-gray-100 disabled:opacity-50"
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          disabled={updating === item.id}
                          className="ml-4 text-red-500 hover:text-red-700 disabled:opacity-50"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">
                        {(item.product.price * item.quantity).toLocaleString('es-PY')} Gs.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen del pedido */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-4">
                <h2 className="text-xl font-semibold mb-4">Resumen del pedido</h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Productos ({totalItems})</span>
                    <span>{totalPrice.toLocaleString('es-PY')} Gs.</span>
                  </div>
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
                <Link
                  href="/checkout"
                  className="w-full mt-6 bg-black text-white py-3 rounded-lg text-center hover:bg-gray-800 transition-colors block"
                >
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
