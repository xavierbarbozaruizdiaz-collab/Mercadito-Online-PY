// src/lib/services/productComparisonService.ts
// Servicio para comparar productos

import { Product } from '@/types';

export interface ProductComparison {
  products: Product[];
  attributes: ComparisonAttribute[];
}

export interface ComparisonAttribute {
  name: string;
  label: string;
  getValue: (product: Product) => string | number | null;
  type: 'text' | 'number' | 'currency' | 'boolean';
}

export class ProductComparisonService {
  private static comparisonAttributes: ComparisonAttribute[] = [
    {
      name: 'price',
      label: 'Precio',
      getValue: (product) => product.price,
      type: 'currency',
    },
    {
      name: 'condition',
      label: 'Condición',
      getValue: (product) => product.condition,
      type: 'text',
    },
    {
      name: 'category',
      label: 'Categoría',
      getValue: (product) => (product as any).category?.name || '',
      type: 'text',
    },
    {
      name: 'stock',
      label: 'Stock Disponible',
      getValue: (product) => product.stock_quantity || 0,
      type: 'number',
    },
    {
      name: 'sale_type',
      label: 'Tipo de Venta',
      getValue: (product) => product.sale_type,
      type: 'text',
    },
    {
      name: 'rating',
      label: 'Calificación',
      getValue: (product) => (product as any).average_rating || 0,
      type: 'number',
    },
  ];

  /**
   * Compara múltiples productos
   */
  static compareProducts(products: Product[]): ProductComparison {
    return {
      products,
      attributes: this.comparisonAttributes,
    };
  }

  /**
   * Formatea un valor para mostrar en la comparación
   */
  static formatValue(
    value: string | number | null,
    type: ComparisonAttribute['type']
  ): string {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('es-PY', {
          style: 'currency',
          currency: 'PYG',
        }).format(Number(value));
      case 'number':
        return Number(value).toLocaleString('es-PY');
      case 'boolean':
        return value ? 'Sí' : 'No';
      case 'text':
      default:
        return String(value);
    }
  }

  /**
   * Obtiene un resumen de la comparación destacando diferencias
   */
  static getComparisonSummary(comparison: ProductComparison): string[] {
    const summaries: string[] = [];

    // Comparar precios
    const prices = comparison.products.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice !== maxPrice) {
      summaries.push(
        `Rango de precios: ${this.formatValue(minPrice, 'currency')} - ${this.formatValue(maxPrice, 'currency')}`
      );
    }

    // Comparar stock
    const stocks = comparison.products.map(
      (p) => p.stock_quantity || 0
    );
    const outOfStock = stocks.some((s) => s === 0);
    if (outOfStock) {
      summaries.push('Algunos productos están agotados');
    }

    return summaries;
  }
}

