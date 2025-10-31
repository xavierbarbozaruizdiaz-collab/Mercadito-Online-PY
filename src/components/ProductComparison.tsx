// src/components/ProductComparison.tsx
// Componente para comparar productos lado a lado

'use client';

import { Product } from '@/types';
import {
  ProductComparisonService,
  type ProductComparison,
} from '@/lib/services/productComparisonService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import Button from './ui/Button';
import { X, ShoppingCart } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import AddToCartButton from './AddToCartButton';
import { useState, useEffect } from 'react';

interface ProductComparisonProps {
  products: Product[];
  maxProducts?: number;
  onRemove?: (productId: string) => void;
}

export default function ProductComparison({
  products,
  maxProducts = 4,
  onRemove,
}: ProductComparisonProps) {
  const [comparison, setComparison] = useState<ProductComparison | null>(null);

  useEffect(() => {
    if (products.length > 0) {
      setComparison(ProductComparisonService.compareProducts(products));
    }
  }, [products]);

  if (!comparison || products.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">
            Selecciona productos para comparar (máximo {maxProducts})
          </p>
        </CardContent>
      </Card>
    );
  }

  const summary = ProductComparisonService.getComparisonSummary(comparison);

  return (
    <div className="space-y-6">
      {summary.length > 0 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Resumen de Comparación</h3>
            <ul className="list-disc list-inside text-sm text-blue-800">
              {summary.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Comparación de Productos ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b">Atributo</th>
                  {comparison.products.map((product) => (
                    <th
                      key={product.id}
                      className="text-center p-2 border-b min-w-[200px]"
                    >
                      <div className="flex flex-col items-center">
                        <div className="relative w-24 h-24 mb-2">
                          <Image
                            src={
                              product.cover_url || '/placeholder-product.png'
                            }
                            alt={product.title}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                        <Link
                          href={`/products/${product.id}`}
                          className="text-sm font-semibold hover:text-blue-600 line-clamp-2 mb-2"
                        >
                          {product.title}
                        </Link>
                        {onRemove && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemove(product.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.attributes.map((attr) => (
                  <tr key={attr.name} className="border-b">
                    <td className="p-2 font-medium">{attr.label}</td>
                    {comparison.products.map((product) => (
                      <td key={product.id} className="p-2 text-center">
                        {ProductComparisonService.formatValue(
                          attr.getValue(product),
                          attr.type
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-gray-50">
                  <td className="p-2 font-medium">Acciones</td>
                  {comparison.products.map((product) => (
                    <td key={product.id} className="p-2 text-center">
                      <div className="flex flex-col gap-2 items-center">
                        <AddToCartButton
                          productId={product.id}
                        />
                        <Link href={`/products/${product.id}`}>
                          <Button variant="outline" size="sm" className="w-full">
                            Ver Detalles
                          </Button>
                        </Link>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

