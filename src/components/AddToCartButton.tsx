'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

interface AddToCartButtonProps {
  productId: string;
}

export default function AddToCartButton({ productId }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  async function addToCart() {
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user?.id) {
        alert('Debes iniciar sesión para agregar productos al carrito');
        return;
      }

      // Verificar si el producto ya está en el carrito
      const { data: existingItem } = await supabase
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', session.session.user.id)
        .eq('product_id', productId)
        .single();

      if (existingItem) {
        // Incrementar cantidad
        const { error } = await supabase
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (error) throw error;
      } else {
        // Agregar nuevo item
        const { error } = await supabase
          .from('cart_items')
          .insert({
            user_id: session.session.user.id,
            product_id: productId,
            quantity: 1
          });

        if (error) throw error;
      }

      setAdded(true);
      setTimeout(() => setAdded(false), 2000);

    } catch (err: any) {
      alert('Error al agregar al carrito: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={addToCart}
      disabled={loading}
      className={`mt-6 px-6 py-3 rounded-lg font-medium transition-colors ${
        added
          ? 'bg-green-500 text-white'
          : 'bg-black text-white hover:bg-gray-800'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? 'Agregando...' : added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
    </button>
  );
}
