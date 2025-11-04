// ============================================
// MERCADITO ONLINE PY - UTILIDADES DE PRECIO MAYORISTA
// Funciones para calcular precios mayoristas
// ============================================

export interface ProductWithWholesale {
  id: string;
  price: number;
  wholesale_enabled?: boolean;
  wholesale_min_quantity?: number | null;
  wholesale_discount_percent?: number | null;
}

export interface WholesalePriceResult {
  unitPrice: number;
  totalPrice: number;
  isWholesale: boolean;
  discountAmount: number;
  originalPrice: number;
  savings: number; // Ahorro total
}

/**
 * Calcula el precio aplicando descuentos mayoristas si corresponde
 */
export function calculateWholesalePrice(
  product: ProductWithWholesale,
  quantity: number
): WholesalePriceResult {
  const originalPrice = product.price;
  
  // Verificar si se aplica precio mayorista
  const shouldApplyWholesale =
    product.wholesale_enabled === true &&
    product.wholesale_min_quantity !== null &&
    product.wholesale_min_quantity !== undefined &&
    product.wholesale_discount_percent !== null &&
    product.wholesale_discount_percent !== undefined &&
    quantity >= product.wholesale_min_quantity;

  if (shouldApplyWholesale) {
    // Calcular precio mayorista
    const discount = (product.wholesale_discount_percent || 0) / 100;
    const unitPrice = originalPrice * (1 - discount);
    const totalPrice = unitPrice * quantity;
    const discountAmount = originalPrice - unitPrice;
    const savings = discountAmount * quantity;

    return {
      unitPrice,
      totalPrice,
      isWholesale: true,
      discountAmount,
      originalPrice,
      savings,
    };
  }

  // Precio normal
  const totalPrice = originalPrice * quantity;

  return {
    unitPrice: originalPrice,
    totalPrice,
    isWholesale: false,
    discountAmount: 0,
    originalPrice,
    savings: 0,
  };
}

/**
 * Calcula cuántas unidades faltan para alcanzar precio mayorista
 */
export function getUnitsToWholesale(
  product: ProductWithWholesale,
  currentQuantity: number
): number | null {
  if (
    !product.wholesale_enabled ||
    !product.wholesale_min_quantity ||
    currentQuantity >= product.wholesale_min_quantity
  ) {
    return null;
  }

  return product.wholesale_min_quantity - currentQuantity;
}

/**
 * Obtiene el precio mayorista (sin calcular si aplica)
 */
export function getWholesalePrice(
  product: ProductWithWholesale
): number | null {
  if (
    !product.wholesale_enabled ||
    !product.wholesale_discount_percent
  ) {
    return null;
  }

  const discount = product.wholesale_discount_percent / 100;
  return product.price * (1 - discount);
}

/**
 * Formatea el mensaje de precio mayorista
 */
export function formatWholesaleMessage(
  product: ProductWithWholesale
): string | null {
  if (
    !product.wholesale_enabled ||
    !product.wholesale_min_quantity ||
    !product.wholesale_discount_percent
  ) {
    return null;
  }

  const wholesalePrice = getWholesalePrice(product);
  if (!wholesalePrice) return null;

  return `A partir de ${product.wholesale_min_quantity} unidades: ${product.wholesale_discount_percent}% descuento (${formatCurrency(wholesalePrice)} c/u)`;
}

/**
 * Formatea moneda (helper)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

