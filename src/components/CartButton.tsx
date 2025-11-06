'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft, Package, Truck, CreditCard, AlertCircle, Eye } from 'lucide-react';

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
    status?: string;
    stock_quantity?: number;
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
        setLoading(false);
        return;
      }

      // Primero obtener cart items básicos
      const { data: cartData, error } = await (supabase as any)
        .from('cart_items')
        .select('id, product_id, quantity, created_at, updated_at')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!cartData || cartData.length === 0) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Obtener productos en paralelo (solo activos para el contador)
      const productIds = (cartData as Array<{ product_id: string | null | undefined }>).
        map((item) => item.product_id).filter(Boolean) as string[];
      const { data: productsData } = await (supabase as any)
        .from('products')
        .select('id, title, price, cover_url, status')
        .in('id', productIds);

      // Combinar cart items con productos (solo mostrar activos)
      const productsMap = new Map();
      if (productsData) {
        (productsData as any[]).forEach((product: any) => {
          const status = product.status || 'active';
          if (status === 'active') {
            productsMap.set(product.id, product);
          }
        });
      }

      // Solo contar productos activos
      const enrichedCartItems = (cartData as any[])
        .filter((item: any) => {
          const product = productsMap.get(item.product_id);
          return product && (product.status || 'active') === 'active';
        })
        .map((item: any) => ({
          ...item,
          product: productsMap.get(item.product_id)!,
        }));

      setCartItems(enrichedCartItems as CartItem[]);
    } catch (err) {
      console.error('Error loading cart:', err);
      setCartItems([]);
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
        className="flex items-center gap-2 p-2 sm:p-2 min-h-[44px] sm:min-h-0 text-gray-600 hover:text-gray-800 transition-colors"
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
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadCartItems();
  }, []);

  async function loadCartItems() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: session, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError('Error al obtener la sesión. Por favor, inicia sesión de nuevo.');
        setCartItems([]);
        setLoading(false);
        return;
      }
      
      if (!session?.session?.user?.id) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Primero obtener cart items básicos
      const { data: cartData, error: cartError } = await (supabase as any)
        .from('cart_items')
        .select('id, product_id, quantity, created_at, updated_at')
        .eq('user_id', session.session.user.id)
        .order('created_at', { ascending: false });

      if (cartError) {
        console.error('Error loading cart items:', cartError);
        setError(`Error al cargar el carrito: ${cartError.message}`);
        setCartItems([]);
        setLoading(false);
        return;
      }

      if (!cartData || cartData.length === 0) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Obtener productos en paralelo
      const productIds = (cartData as Array<{ product_id: string | null | undefined }>).
        map((item) => item.product_id).filter(Boolean) as string[];
      
      if (productIds.length === 0) {
        setError('No se encontraron productos en el carrito.');
        setCartItems([]);
        setLoading(false);
        return;
      }

      // Cargar productos - Incluir campos de precio mayorista
      console.log('🛒 Cargando productos del carrito:', { 
        productIds, 
        count: productIds.length,
        userId: session.session.user.id 
      });
      
      const { data: productsDataRaw, error: productsError } = await (supabase as any)
        .from('products')
        .select('id, title, price, cover_url, status, wholesale_enabled, wholesale_min_quantity, wholesale_discount_percent')
        .in('id', productIds);

      let productsData: any[] | null = null;

      if (productsError) {
        console.error('❌ Error cargando productos:', {
          error: productsError,
          code: productsError.code,
          message: productsError.message,
          details: productsError.details,
          hint: productsError.hint,
          productIds
        });
        
        // Intentar con menos campos si falla
        const { data: simpleProducts, error: simpleError } = await (supabase as any)
          .from('products')
          .select('id, title, price, cover_url')
          .in('id', productIds);
        
        if (simpleError) {
          console.error('❌ Error en query simple también:', simpleError);
          setError(`Error al cargar los productos: ${simpleError.message || 'Error desconocido'}. Por favor, intenta recargar la página.`);
          setCartItems([]);
          setLoading(false);
          return;
        }
        
        productsData = ((simpleProducts || []) as any[]).map((p: any) => ({
          ...p,
          status: 'active',
          stock_quantity: undefined,
        }));
      } else {
        // Agregar stock_quantity como undefined para que el código funcione
        productsData = ((productsDataRaw || []) as any[]).map((p: any) => ({
          ...p,
          stock_quantity: undefined,
        }));
      }
      
      console.log('✅ Productos cargados del carrito:', {
        count: productsData?.length || 0,
        products: productsData?.map((p: any) => ({ id: p.id, title: p.title, price: p.price }))
      });

      // Combinar cart items con productos
      const productsMap = new Map();
      const unavailableProducts: string[] = [];
      
      if (productsData && productsData.length > 0) {
        productsData.forEach(product => {
          productsMap.set(product.id, product);
          // Verificar si el producto está disponible
          const status = product.status || 'active';
          if (status !== 'active') {
            unavailableProducts.push(product.id);
          }
        });
      }

      // Filtrar items del carrito que tienen productos válidos y disponibles
      // Agrupar por product_id para evitar duplicados
      const itemsMap = new Map<string, CartItem>();
      
      (cartData as any[]).forEach((item: any) => {
        const product = productsMap.get(item.product_id);
        
        if (!product) {
          // Producto no existe - marcar para eliminar del carrito
          unavailableProducts.push(item.product_id);
          return;
        }
        
        const status = product.status || 'active';
        if (status !== 'active') {
          // Producto no disponible - marcar para eliminar del carrito
          unavailableProducts.push(item.product_id);
          return;
        }
        
        // Si ya existe un item con el mismo product_id, sumar las cantidades
        const existingItem = itemsMap.get(item.product_id);
        if (existingItem) {
          existingItem.quantity += item.quantity;
        } else {
          itemsMap.set(item.product_id, {
            id: item.id, // Usar el ID más reciente
            product_id: item.product_id,
            quantity: item.quantity,
            created_at: item.created_at,
            updated_at: item.updated_at,
            product: {
              id: product.id,
              title: product.title,
              price: product.price || 0, // Asegurar que siempre tenga precio
              cover_url: product.cover_url,
              status: status,
              stock_quantity: product.stock_quantity ?? undefined,
            },
          });
        }
      });
      
      const enrichedCartItems = Array.from(itemsMap.values());

      // Eliminar automáticamente productos no disponibles del carrito
      if (unavailableProducts.length > 0) {
        console.log('Eliminando productos no disponibles del carrito:', unavailableProducts);
        try {
          const { error: deleteError } = await (supabase as any)
            .from('cart_items')
            .delete()
            .in('product_id', unavailableProducts)
            .eq('user_id', session.session.user.id);
          
          if (deleteError) {
            console.error('Error eliminando productos no disponibles:', deleteError);
          }
        } catch (err) {
          console.error('Error al limpiar carrito:', err);
        }
      }

      setCartItems(enrichedCartItems as CartItem[]);
    } catch (err: any) {
      console.error('Error loading cart:', err);
      setError(`Error inesperado: ${err?.message || 'Error desconocido'}`);
      setCartItems([]);
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
      // Encontrar el item del carrito para obtener el product_id y verificar stock
      const cartItem = cartItems.find(item => item.id === cartItemId);
      if (cartItem) {
        const stockAvailable = cartItem.product.stock_quantity ?? 9999;
        
        // Verificar que no se exceda el stock disponible
        if (newQuantity > stockAvailable) {
          setError(`No hay suficiente inventario. Solo hay ${stockAvailable} unidad${stockAvailable !== 1 ? 'es' : ''} disponible${stockAvailable !== 1 ? 's' : ''}.`);
          setUpdating(null);
          return;
        }
      }

      const { error } = await (supabase as any)
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', cartItemId);

      if (error) throw error;
      setError(null); // Limpiar error si todo está bien
      await loadCartItems();
    } catch (err: any) {
      console.error('Error updating quantity:', err);
      setError(err?.message || 'Error al actualizar la cantidad');
      setTimeout(() => setError(null), 5000); // Limpiar error después de 5 segundos
    } finally {
      setUpdating(null);
    }
  }

  async function removeFromCart(cartItemId: string) {
    setUpdating(cartItemId);
    try {
      const { error } = await (supabase as any)
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

  // Calcular totales de forma segura, evitando duplicados y valores inválidos
  // Usar precios mayoristas si aplican
  const totalItems = cartItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    return sum + quantity;
  }, 0);
  
  const totalPrice = cartItems.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    // Calcular precio considerando descuentos mayoristas
    const { calculateWholesalePrice } = require('@/lib/utils/wholesalePrice');
    const priceCalc = calculateWholesalePrice(item.product as any, quantity);
    return sum + priceCalc.totalPrice;
  }, 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col justify-center items-center h-96 gap-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
              <ShoppingCart className="absolute inset-0 m-auto w-6 h-6 text-blue-600" />
            </div>
            <p className="text-gray-600 font-medium">Cargando tu carrito...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <ShoppingCart className="w-8 h-8 text-blue-600" />
              Carrito de Compras
            </h1>
            <p className="text-gray-600 text-sm sm:text-base">
              {totalItems > 0 ? `${totalItems} ${totalItems === 1 ? 'producto' : 'productos'} en tu carrito` : 'Tu carrito está vacío'}
            </p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuar comprando
          </Link>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-semibold mb-1">Error al cargar el carrito</p>
                <p className="text-red-700 text-sm mb-3">{error}</p>
                <button
                  onClick={() => loadCartItems()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium shadow-sm"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        )}

        {cartItems.length === 0 && !loading && !error ? (
          <div className="text-center py-16 sm:py-24">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
              <ShoppingCart className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">Agrega algunos productos increíbles a tu carrito para comenzar</p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" />
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Items del carrito */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-200 overflow-hidden transition-all duration-200">
                  <div className="flex gap-4 p-4 sm:p-5">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                      {item.product.cover_url ? (
                        <Image
                          src={item.product.cover_url}
                          alt={item.product.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 96px, 112px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                          <Package className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/products/${item.product.id}`}
                        className="block group"
                      >
                        <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-1 line-clamp-2 group-hover:text-blue-600 transition-colors cursor-pointer">
                          {item.product.title}
                        </h3>
                      </Link>
                      <Link
                        href={`/products/${item.product.id}`}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <Eye className="w-3 h-3" />
                        Ver detalles del producto
                      </Link>
                      <div className="mb-3">
                        {(() => {
                          // Calcular precio mayorista si aplica
                          const { calculateWholesalePrice } = require('@/lib/utils/wholesalePrice');
                          const priceCalc = calculateWholesalePrice(item.product as any, item.quantity);
                          return (
                            <>
                              <p className="text-gray-600 text-sm">
                                {priceCalc.isWholesale ? (
                                  <>
                                    <span className="line-through text-gray-400">
                                      {item.product.price.toLocaleString('es-PY')} Gs.
                                    </span>{' '}
                                    <span className="text-green-600 font-semibold">
                                      {priceCalc.unitPrice.toLocaleString('es-PY')} Gs. c/u
                                    </span>
                                    <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                      Mayorista
                                    </span>
                                  </>
                                ) : (
                                  `${item.product.price.toLocaleString('es-PY')} Gs. c/u`
                                )}
                              </p>
                              {priceCalc.isWholesale && (
                                <p className="text-xs text-green-600 mt-1">
                                  Ahorras {priceCalc.savings.toLocaleString('es-PY')} Gs. en total
                                </p>
                              )}
                              {item.product.stock_quantity !== undefined && (
                                <p className={`text-xs mt-1 ${
                                  item.quantity >= item.product.stock_quantity
                                    ? 'text-red-600 font-medium'
                                    : item.product.stock_quantity <= 5
                                    ? 'text-orange-600'
                                    : 'text-gray-500'
                                }`}>
                                  {item.quantity >= item.product.stock_quantity
                                    ? `⚠️ Sin stock disponible`
                                    : item.product.stock_quantity <= 5
                                    ? `⚡ Solo ${item.product.stock_quantity} disponible${item.product.stock_quantity !== 1 ? 's' : ''}`
                                    : `${item.product.stock_quantity} disponible${item.product.stock_quantity !== 1 ? 's' : ''}`
                                  }
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={updating === item.id}
                            className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus className="w-4 h-4 text-gray-700" />
                          </button>
                          <span className="px-4 py-2 min-w-[48px] text-center font-medium text-gray-900 bg-white border-x border-gray-300">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={
                              updating === item.id || 
                              (item.product.stock_quantity !== undefined && item.quantity >= item.product.stock_quantity)
                            }
                            className="p-2 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Aumentar cantidad"
                            title={
                              item.product.stock_quantity !== undefined && item.quantity >= item.product.stock_quantity
                                ? `Solo hay ${item.product.stock_quantity} disponible${item.product.stock_quantity !== 1 ? 's' : ''}`
                                : 'Aumentar cantidad'
                            }
                          >
                            <Plus className="w-4 h-4 text-gray-700" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          disabled={updating === item.id}
                          className="flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </button>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {(() => {
                        // Calcular precio mayorista si aplica
                        const { calculateWholesalePrice } = require('@/lib/utils/wholesalePrice');
                        const priceCalc = calculateWholesalePrice(item.product as any, item.quantity);
                        return (
                          <>
                            <p className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                              {priceCalc.totalPrice.toLocaleString('es-PY')} Gs.
                            </p>
                            {priceCalc.isWholesale && (
                              <p className="text-xs text-green-600 mb-1">
                                Ahorras {priceCalc.savings.toLocaleString('es-PY')} Gs.
                              </p>
                            )}
                            <p className="text-xs text-gray-500">Subtotal</p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen del pedido */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-4">
                <div className="flex items-center gap-2 mb-6">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-bold text-gray-900">Resumen del pedido</h2>
                </div>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-gray-600">Productos ({totalItems})</span>
                    <span className="font-semibold text-gray-900">{totalPrice.toLocaleString('es-PY')} Gs.</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Truck className="w-4 h-4" />
                      <span>Envío</span>
                    </div>
                    <span className="text-green-600 font-semibold">Gratis</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-lg font-bold text-gray-900">Total</span>
                    <span className="text-xl font-bold text-blue-600">{totalPrice.toLocaleString('es-PY')} Gs.</span>
                  </div>
                </div>
                <Link
                  href="/checkout"
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-lg text-center hover:bg-blue-700 transition-all font-semibold shadow-md hover:shadow-lg"
                >
                  <CreditCard className="w-5 h-5" />
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
