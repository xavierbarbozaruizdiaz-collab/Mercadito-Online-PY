'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/lib/hooks/useToast';

interface AddToCartButtonProps {
  productId: string;
  quantity?: number; // Cantidad a agregar (por defecto 1)
}

export default function AddToCartButton({ productId, quantity = 1 }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);
  const toast = useToast();

  async function addToCart() {
    setLoading(true);
    setAdded(false);
    
    // Validar cantidad
    const qtyToAdd = Math.max(1, Math.floor(quantity || 1));
    if (qtyToAdd <= 0) {
      setLoading(false);
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }
    
    // Timeout de seguridad: si después de 15 segundos no hay respuesta, resetear
    const timeoutId = setTimeout(() => {
      setLoading(false);
      toast.error('⏱️ Tiempo de espera agotado. Por favor intenta nuevamente.');
    }, 15000);
    
    try {
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        clearTimeout(timeoutId);
        console.error('Session error:', sessionError);
        toast.error('Error al verificar la sesión. Por favor, inicia sesión de nuevo.');
        setLoading(false);
        return;
      }
      
      if (!session?.session?.user?.id) {
        clearTimeout(timeoutId);
        toast.error('Debes iniciar sesión para agregar productos al carrito');
        setLoading(false);
        return;
      }

      // Obtener información del producto - Incluir seller_id para validación
      // Usar Promise.race con timeout para evitar que se cuelgue
      let product: any = null;
      
      const productQueryPromise = (supabase as any)
        .from('products')
        .select('id, stock_quantity, title, status, seller_id')
        .eq('id', productId)
        .single();
      
      const productTimeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout cargando producto')), 5000)
      );
      
      let tryWithStock: any;
      try {
        tryWithStock = await Promise.race([productQueryPromise, productTimeoutPromise]);
      } catch (timeoutError) {
        // Si hay timeout, intentar query más simple
        console.warn('⚠️ Timeout en query completa, intentando query simple');
        const simpleQueryPromise = (supabase as any)
          .from('products')
          .select('id, title, status, seller_id, stock_quantity, stock_management_enabled')
          .eq('id', productId)
          .single();
        
        const simpleTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        );
        
        try {
          tryWithStock = await Promise.race([simpleQueryPromise, simpleTimeoutPromise]);
          tryWithStock.error = null; // Simular éxito
          tryWithStock.data = { ...tryWithStock.data, stock_quantity: undefined };
        } catch {
          throw new Error('No se pudo cargar el producto. Por favor intenta nuevamente.');
        }
      }

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
          stock_management_enabled: false,
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

      // Verificar si el producto ya está en el carrito con timeout
      const cartCheckPromise = (supabase as any)
        .from('cart_items')
        .select('id, quantity')
        .eq('user_id', session.session.user.id)
        .eq('product_id', productId)
        .limit(1);
      
      const cartCheckTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout verificando carrito')), 5000)
      );
      
      let existingItems: any[] = [];
      let checkError: any = null;
      
      try {
        const result = await Promise.race([cartCheckPromise, cartCheckTimeout]) as any;
        existingItems = result.data || [];
        checkError = result.error;
      } catch (timeoutErr) {
        console.warn('⚠️ Timeout verificando carrito, continuando sin verificar cantidad existente');
        // Continuar sin verificar cantidad existente si hay timeout
        existingItems = [];
        checkError = null;
      }

      if (checkError && !checkError.message?.includes('Timeout')) {
        console.error('Error checking cart:', checkError);
        throw new Error(`Error al verificar el carrito: ${checkError.message}`);
      }

      const existingItem = existingItems?.[0];
      const currentCartQuantity = existingItem?.quantity || 0;
      const requestedQuantity = currentCartQuantity + qtyToAdd;

      // Validar stock disponible considerando cantidad en carrito + cantidad a agregar
      // Solo validar si stock_management_enabled está activo Y stock_quantity tiene un valor
      if (
        product.stock_management_enabled === true && 
        product.stock_quantity !== null && 
        product.stock_quantity !== undefined &&
        typeof product.stock_quantity === 'number'
      ) {
        const stockAvailable = product.stock_quantity;
        
        if (stockAvailable < requestedQuantity) {
          const availableToAdd = Math.max(0, stockAvailable - currentCartQuantity);
          if (availableToAdd <= 0) {
            throw new Error(`Lo sentimos, no hay suficiente inventario. Solo hay ${stockAvailable} unidad${stockAvailable !== 1 ? 'es' : ''} disponible${stockAvailable !== 1 ? 's' : ''} y ya tienes ${currentCartQuantity} en tu carrito.`);
          } else {
            throw new Error(`Solo puedes agregar ${availableToAdd} unidad${availableToAdd !== 1 ? 'es' : ''} más. Hay ${stockAvailable} disponible${stockAvailable !== 1 ? 's' : ''} en total y ya tienes ${currentCartQuantity} en tu carrito.`);
          }
        }
      }

      // Operaciones de carrito con timeout
      const cartOperationTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout en operación de carrito')), 8000)
      );

      if (existingItem) {
        // Incrementar cantidad si ya existe (y hay stock disponible)
        const updatePromise = (supabase as any)
          .from('cart_items')
          .update({ quantity: existingItem.quantity + qtyToAdd })
          .eq('id', existingItem.id);
        
        try {
          const result = await Promise.race([updatePromise, cartOperationTimeout]) as any;
          if (result.error) {
            throw result.error;
          }
        } catch (err: any) {
          if (err.message?.includes('Timeout')) {
            throw new Error('La operación está tardando demasiado. Por favor intenta nuevamente.');
          }
          console.error('Error updating cart:', err);
          throw new Error(`Error al actualizar el carrito: ${err.message || 'Error desconocido'}`);
        }
      } else {
        // Agregar nuevo item con la cantidad especificada
        const insertPromise = (supabase as any)
          .from('cart_items')
          .insert({
            user_id: session.session.user.id,
            product_id: productId,
            quantity: qtyToAdd
          })
          .select()
          .single();
        
        try {
          const result = await Promise.race([insertPromise, cartOperationTimeout]) as any;
          
          // Verificar si hay error en la respuesta
          if (result?.error) {
            // Si es error de duplicado, intentar actualizar
            if (result.error.code === '23505') {
              // UNIQUE constraint violation - el item ya existe, intentar actualizar
              const existingPromise = (supabase as any)
                .from('cart_items')
                .select('id, quantity')
                .eq('user_id', session.session.user.id)
                .eq('product_id', productId)
                .single();
              
              try {
                const existingResult = await Promise.race([existingPromise, cartOperationTimeout]) as any;
                if (!existingResult?.error && existingResult?.data) {
                  const updatePromise = (supabase as any)
                    .from('cart_items')
                    .update({ quantity: existingResult.data.quantity + qtyToAdd })
                    .eq('id', existingResult.data.id);
                  
                  const updateResult = await Promise.race([updatePromise, cartOperationTimeout]) as any;
                  if (updateResult?.error) {
                    throw updateResult.error;
                  }
                  // Éxito en la actualización - continuar al final para limpiar timeout y mostrar éxito
                } else {
                  throw result.error;
                }
              } catch (retryErr: any) {
                if (retryErr?.message?.includes('Timeout')) {
                  throw new Error('La operación está tardando demasiado. Por favor intenta nuevamente.');
                }
                throw result.error;
              }
            } else {
              throw new Error(`Error al agregar al carrito: ${result.error.message || 'Error desconocido'}`);
            }
          }
          // Si no hay error, la inserción fue exitosa - continuar al final
        } catch (err: any) {
          if (err?.message?.includes('Timeout')) {
            throw new Error('La operación está tardando demasiado. Por favor intenta nuevamente.');
          }
          console.error('Error inserting cart item:', err);
          throw err;
        }
      }

      clearTimeout(timeoutId);
      setLoading(false);
      setAdded(true);
      toast.success(`✅ ${qtyToAdd} ${qtyToAdd === 1 ? 'unidad agregada' : 'unidades agregadas'} al carrito`);
      // Recargar el carrito en el componente CartButton si está montado
      setTimeout(() => setAdded(false), 2000);

    } catch (err: any) {
      clearTimeout(timeoutId);
      setLoading(false);
      console.error('Error in addToCart:', err);
      const errorMessage = err?.message || 'Error desconocido al agregar al carrito';
      toast.error(`Error: ${errorMessage}`);
    }
  }

  return (
    true && (
      <button
        onClick={addToCart}
        disabled={loading}
        className={`mt-4 sm:mt-6 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base ${
          added
            ? 'bg-green-500 text-white'
            : 'bg-black text-white hover:bg-gray-800'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        data-testid="primary-btn"
      >
        {loading ? 'Agregando...' : added ? '✓ Agregado al carrito' : 'Agregar al carrito'}
      </button>
    )
  );
}
