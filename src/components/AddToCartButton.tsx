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
    setAdded(false);
    
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        alert('Error al verificar la sesión. Por favor, inicia sesión de nuevo.');
        return;
      }
      
      if (!session?.session?.user?.id) {
        alert('Debes iniciar sesión para agregar productos al carrito');
        return;
      }

      // Obtener información del producto - Incluir seller_id para validación
      let product: any = null;
      
      const tryWithStock = await (supabase as any)
        .from('products')
        .select('id, stock_quantity, title, status, seller_id')
        .eq('id', productId)
        .single();

      if (tryWithStock.error && tryWithStock.error.message?.includes('stock_quantity')) {
        // Si stock_quantity no existe, intentar sin él (pero mantener seller_id)
        console.warn('⚠️ stock_quantity no existe aún, asumiendo inventario ilimitado');
        const tryWithoutStock = await (supabase as any)
          .from('products')
          .select('id, title, status, seller_id')
          .eq('id', productId)
          .single();
        
        if (tryWithoutStock.error || !tryWithoutStock.data) {
          console.error('Error loading product:', tryWithoutStock.error);
          throw new Error('Producto no encontrado o no disponible');
        }
        
        // Agregar stock_quantity como undefined para que el código funcione
        product = {
          ...tryWithoutStock.data,
          stock_quantity: undefined, // Inventario ilimitado hasta que se ejecute el script SQL
        };
      } else if (tryWithStock.error || !tryWithStock.data) {
        console.error('Error loading product:', tryWithStock.error);
        throw new Error('Producto no encontrado o no disponible');
      } else {
        product = tryWithStock.data;
      }

      // Verificar que el producto esté activo
      if (product.status !== 'active' && product.status !== null) {
        throw new Error('Este producto no está disponible actualmente');
      }

      // ✅ VALIDACIÓN CRÍTICA: Verificar que el usuario NO sea el vendedor del producto
      if (product.seller_id === session.session.user.id) {
        throw new Error('No puedes agregar tus propios productos al carrito');
      }

      // Verificar si el producto ya está en el carrito
      const { data: existingItems, error: checkError } = await (supabase as any)
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', session.session.user.id)
        .eq('product_id', productId)
        .limit(1);

      if (checkError) {
        console.error('Error checking cart:', checkError);
        throw new Error(`Error al verificar el carrito: ${checkError.message}`);
      }

      const existingItem = existingItems?.[0];
      const currentCartQuantity = existingItem?.quantity || 0;
      const stockAvailable = product.stock_quantity ?? 9999; // Si es NULL o undefined, asumir ilimitado (9999)
      const requestedQuantity = currentCartQuantity + 1;

      // Verificar disponibilidad de stock
      if (stockAvailable < requestedQuantity) {
        const availableToAdd = Math.max(0, stockAvailable - currentCartQuantity);
        if (availableToAdd <= 0) {
          throw new Error(`Lo sentimos, no hay suficiente inventario. Solo hay ${stockAvailable} unidad${stockAvailable !== 1 ? 'es' : ''} disponible${stockAvailable !== 1 ? 's' : ''}.`);
        } else {
          throw new Error(`Solo puedes agregar ${availableToAdd} unidad${availableToAdd !== 1 ? 'es' : ''} más. Hay ${stockAvailable} disponible${stockAvailable !== 1 ? 's' : ''} en total y ya tienes ${currentCartQuantity} en tu carrito.`);
        }
      }

      if (existingItem) {
        // Incrementar cantidad si ya existe (y hay stock disponible)
        const { error: updateError } = await (supabase as any)
          .from('cart_items')
          .update({ quantity: existingItem.quantity + 1 })
          .eq('id', existingItem.id);

        if (updateError) {
          console.error('Error updating cart:', updateError);
          throw new Error(`Error al actualizar el carrito: ${updateError.message}`);
        }
      } else {
        // Agregar nuevo item
        const { error: insertError } = await (supabase as any)
          .from('cart_items')
          .insert({
            user_id: session.session.user.id,
            product_id: productId,
            quantity: 1
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting cart item:', insertError);
          // Si es error de duplicado, intentar actualizar
          if (insertError.code === '23505') {
            // UNIQUE constraint violation - el item ya existe, intentar actualizar
            const { data: existing, error: retryError } = await (supabase as any)
              .from('cart_items')
              .select('id, quantity')
              .eq('user_id', session.session.user.id)
              .eq('product_id', productId)
              .single();
            
            if (!retryError && existing) {
              const { error: finalUpdateError } = await (supabase as any)
                .from('cart_items')
                .update({ quantity: existing.quantity + 1 })
                .eq('id', existing.id);
              
              if (finalUpdateError) throw finalUpdateError;
            } else {
              throw insertError;
            }
          } else {
            throw new Error(`Error al agregar al carrito: ${insertError.message}`);
          }
        }
      }

      setAdded(true);
      // Recargar el carrito en el componente CartButton si está montado
      setTimeout(() => setAdded(false), 2000);

    } catch (err: any) {
      console.error('Error in addToCart:', err);
      const errorMessage = err?.message || 'Error desconocido al agregar al carrito';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={addToCart}
      disabled={loading}
      className={`mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
        added
          ? 'bg-green-500 text-white'
          : 'bg-black text-white hover:bg-gray-800'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? 'Agregando...' : added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
    </button>
  );
}
