'use client';

import { useState, useEffect } from 'react';
import { calculateWholesalePrice, getUnitsToWholesale } from '@/lib/utils/wholesalePrice';
import WholesalePriceBadge from '@/components/WholesalePriceBadge';
import { Plus, Minus } from 'lucide-react';

interface ProductWithWholesale {
  id: string;
  price: number;
  wholesale_enabled?: boolean;
  wholesale_min_quantity?: number | null;
  wholesale_discount_percent?: number | null;
  stock_quantity?: number | null;
  stock_management_enabled?: boolean;
}

interface ProductQuantitySelectorProps {
  product: ProductWithWholesale;
  initialQuantity?: number;
  onQuantityChange?: (quantity: number) => void;
}

export default function ProductQuantitySelector({
  product,
  initialQuantity = 1,
  onQuantityChange,
}: ProductQuantitySelectorProps) {
  const [quantity, setQuantity] = useState(initialQuantity);
  const [cartQuantity, setCartQuantity] = useState(0);

  // Cargar cantidad actual del carrito
  useEffect(() => {
    const loadCartQuantity = async () => {
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.user?.id) return;

        const { data: cartItem } = await supabase
          .from('cart_items')
          .select('quantity')
          .eq('user_id', session.session.user.id)
          .eq('product_id', product.id)
          .maybeSingle();

        if (cartItem) {
          setCartQuantity(cartItem.quantity);
          const newQuantity = cartItem.quantity;
          setQuantity(newQuantity);
          if (onQuantityChange) {
            onQuantityChange(newQuantity);
          }
        }
      } catch (err) {
        console.error('Error loading cart quantity:', err);
      }
    };

    loadCartQuantity();
  }, [product.id, onQuantityChange]);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) {
      setQuantity(1);
      if (onQuantityChange) {
        onQuantityChange(1);
      }
      return;
    }

    // Validar stock si está habilitado
    if (
      product.stock_management_enabled === true &&
      product.stock_quantity !== null &&
      product.stock_quantity !== undefined &&
      typeof product.stock_quantity === 'number'
    ) {
      const maxAvailable = product.stock_quantity;
      // Considerar cantidad en carrito + cantidad nueva
      const totalRequested = cartQuantity + newQuantity;
      const availableToAdd = Math.max(0, maxAvailable - cartQuantity);
      
      if (totalRequested > maxAvailable) {
        if (availableToAdd <= 0) {
          alert(`Lo sentimos, no hay suficiente inventario. Solo hay ${maxAvailable} unidad${maxAvailable !== 1 ? 'es' : ''} disponible${maxAvailable !== 1 ? 's' : ''} y ya tienes ${cartQuantity} en tu carrito.`);
          // Ajustar a la cantidad máxima disponible (o 1 si no hay nada disponible)
          const adjustedQuantity = Math.max(1, availableToAdd);
          setQuantity(adjustedQuantity);
          if (onQuantityChange) {
            onQuantityChange(adjustedQuantity);
          }
          return;
        } else {
          alert(`Solo puedes agregar ${availableToAdd} unidad${availableToAdd !== 1 ? 'es' : ''} más. Hay ${maxAvailable} disponible${maxAvailable !== 1 ? 's' : ''} en total y ya tienes ${cartQuantity} en tu carrito. Se ajustará la cantidad automáticamente.`);
          // Ajustar la cantidad al máximo disponible
          const adjustedQuantity = Math.min(newQuantity, availableToAdd);
          setQuantity(adjustedQuantity);
          if (onQuantityChange) {
            onQuantityChange(adjustedQuantity);
          }
          return;
        }
      }
      
      // Si la cantidad nueva es válida pero mayor a lo disponible sin carrito, limitar
      if (newQuantity > availableToAdd) {
        const adjustedQuantity = Math.min(newQuantity, availableToAdd);
        setQuantity(adjustedQuantity);
        if (onQuantityChange) {
          onQuantityChange(adjustedQuantity);
        }
        return;
      }
    }

    setQuantity(newQuantity);
    // Notificar al componente padre sobre el cambio de cantidad
    if (onQuantityChange) {
      onQuantityChange(newQuantity);
    }
  };

  const priceCalc = calculateWholesalePrice(product, quantity);
  const unitsNeeded = getUnitsToWholesale(product, quantity);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Selector de cantidad */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Cantidad
        </label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>
          <input
            type="number"
            min="1"
            max={
              product.stock_management_enabled === true &&
              product.stock_quantity !== null &&
              product.stock_quantity !== undefined &&
              typeof product.stock_quantity === 'number'
                ? Math.max(1, product.stock_quantity - cartQuantity)
                : undefined
            }
            value={quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              if (isNaN(val) || val < 1) {
                return;
              }
              handleQuantityChange(val);
            }}
            onBlur={(e) => {
              // Validar al perder el foco y ajustar si es necesario
              const val = parseInt(e.target.value);
              if (isNaN(val) || val < 1) {
                setQuantity(1);
                if (onQuantityChange) {
                  onQuantityChange(1);
                }
                return;
              }
              handleQuantityChange(val);
            }}
            className="w-20 text-center border border-gray-300 rounded-lg py-2 font-medium"
          />
          <button
            type="button"
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={
              product.stock_management_enabled === true &&
              product.stock_quantity !== null &&
              product.stock_quantity !== undefined &&
              typeof product.stock_quantity === 'number' &&
              (cartQuantity + quantity + 1) > product.stock_quantity
            }
            className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title={
              product.stock_management_enabled === true &&
              product.stock_quantity !== null &&
              product.stock_quantity !== undefined &&
              typeof product.stock_quantity === 'number' &&
              (cartQuantity + quantity + 1) > product.stock_quantity
                ? `Solo hay ${product.stock_quantity} disponible${product.stock_quantity !== 1 ? 's' : ''} y ya tienes ${cartQuantity} en tu carrito`
                : 'Aumentar cantidad'
            }
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {product.stock_management_enabled === true && 
         product.stock_quantity !== null && 
         product.stock_quantity !== undefined && (
          <p className="text-xs text-gray-500 mt-1">
            {(() => {
              const availableToAdd = Math.max(0, product.stock_quantity - cartQuantity);
              if (cartQuantity > 0) {
                return `${availableToAdd} disponible${availableToAdd !== 1 ? 's' : ''} (${product.stock_quantity} total${product.stock_quantity !== 1 ? 'es' : ''}, ${cartQuantity} en tu carrito)`;
              }
              return `${product.stock_quantity} disponible${product.stock_quantity !== 1 ? 's' : ''}`;
            })()}
          </p>
        )}
      </div>

      {/* Precio calculado */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Precio unitario:</span>
          <span className={`text-lg font-semibold ${
            priceCalc.isWholesale ? 'text-green-600' : 'text-gray-900'
          }`}>
            {formatCurrency(priceCalc.unitPrice)}
          </span>
        </div>
        {priceCalc.isWholesale && (
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Precio normal:</span>
            <span className="line-through">{formatCurrency(priceCalc.originalPrice)}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Total ({quantity} {quantity === 1 ? 'unidad' : 'unidades'}):</span>
          <span className="text-xl font-bold text-blue-600">
            {formatCurrency(priceCalc.totalPrice)}
          </span>
        </div>
        {priceCalc.isWholesale && (
          <p className="text-xs text-green-600 mt-2 font-medium">
            ✓ Ahorras {formatCurrency(priceCalc.savings)} con precio mayorista
          </p>
        )}
      </div>

      {/* Badge de precio mayorista */}
      {product.wholesale_enabled && (
        <WholesalePriceBadge
          product={product}
          currentQuantity={quantity}
          showDetailed={true}
        />
      )}

      {/* Mensaje si falta poco para precio mayorista */}
      {unitsNeeded && unitsNeeded > 0 && unitsNeeded <= 3 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            💡 Agrega {unitsNeeded} {unitsNeeded === 1 ? 'unidad más' : 'unidades más'} para obtener precio mayorista
          </p>
        </div>
      )}
    </div>
  );
}

