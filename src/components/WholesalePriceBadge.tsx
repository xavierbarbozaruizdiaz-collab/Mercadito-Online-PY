'use client';

import { calculateWholesalePrice, getUnitsToWholesale, getWholesalePrice } from '@/lib/utils/wholesalePrice';
import { Tag, TrendingDown } from 'lucide-react';

interface ProductWithWholesale {
  id: string;
  price: number;
  wholesale_enabled?: boolean;
  wholesale_min_quantity?: number | null;
  wholesale_discount_percent?: number | null;
}

interface WholesalePriceBadgeProps {
  product: ProductWithWholesale;
  currentQuantity?: number;
  showDetailed?: boolean;
}

export default function WholesalePriceBadge({
  product,
  currentQuantity = 1,
  showDetailed = false,
}: WholesalePriceBadgeProps) {
  if (!product.wholesale_enabled || !product.wholesale_min_quantity || !product.wholesale_discount_percent) {
    return null;
  }

  const wholesalePrice = getWholesalePrice(product);
  const unitsNeeded = getUnitsToWholesale(product, currentQuantity);
  const priceCalc = calculateWholesalePrice(product, currentQuantity);

  if (!wholesalePrice) return null;

  const discountPercent = product.wholesale_discount_percent;
  const minQuantity = product.wholesale_min_quantity;

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Si ya aplica precio mayorista
  if (priceCalc.isWholesale) {
    return (
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
        <div className="flex-shrink-0">
          <Tag className="w-5 h-5 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">
            ✓ Precio Mayorista Aplicado
          </p>
          <p className="text-xs text-green-700 mt-0.5">
            {formatCurrency(priceCalc.unitPrice)} c/u ({discountPercent}% descuento)
            {showDetailed && (
              <span className="block mt-1">
                Ahorras {formatCurrency(priceCalc.savings)} en total
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  // Si no aplica aún, mostrar cuánto falta
  if (unitsNeeded && unitsNeeded > 0) {
    return (
      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
        <div className="flex-shrink-0">
          <TrendingDown className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-900">
            Precio Mayorista Disponible
          </p>
          <p className="text-xs text-blue-700 mt-0.5">
            Agrega {unitsNeeded} {unitsNeeded === 1 ? 'unidad más' : 'unidades más'} para precio mayorista: {formatCurrency(wholesalePrice)} c/u ({discountPercent}% descuento)
          </p>
        </div>
      </div>
    );
  }

  // Mostrar información básica
  return (
    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg p-2">
      <Tag className="w-4 h-4 text-blue-600" />
      <p className="text-xs text-blue-800">
        A partir de {minQuantity} unidades: {formatCurrency(wholesalePrice)} c/u ({discountPercent}% desc.)
      </p>
    </div>
  );
}

