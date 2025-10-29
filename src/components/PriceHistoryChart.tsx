// src/components/PriceHistoryChart.tsx
// Componente para mostrar historial de precios de un producto

'use client';

import { useState, useEffect } from 'react';
import { MarketplaceFeaturesService, PriceHistory } from '@/lib/services/marketplaceFeaturesService';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';
import LoadingSpinner from './ui/LoadingSpinner';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/index';

interface PriceHistoryChartProps {
  productId: string;
  currentPrice: number;
}

export default function PriceHistoryChart({
  productId,
  currentPrice,
}: PriceHistoryChartProps) {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [productId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await MarketplaceFeaturesService.getPriceHistory(productId, 30);
      setHistory(data);
    } catch (error) {
      console.error('Error loading price history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center p-8">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Precios</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            No hay historial de precios disponible para este producto.
          </p>
        </CardContent>
      </Card>
    );
  }

  const allPrices = [currentPrice, ...history.map((h) => h.price)];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  const getPriceChange = (index: number) => {
    if (index === 0) return null;
    const current = index === 0 ? currentPrice : history[index - 1].price;
    const previous = index === 0 ? history[0].price : history[index].price;
    return current - previous;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Precios (30 días)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Precio actual */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div>
              <span className="text-sm text-gray-600">Precio Actual</span>
              <div className="text-lg font-bold text-blue-600">
                {formatCurrency(currentPrice)}
              </div>
            </div>
            {history.length > 0 && (
              <div className="text-right">
                {getPriceChange(0) !== null && getPriceChange(0)! < 0 ? (
                  <TrendingDown className="w-6 h-6 text-green-600" />
                ) : getPriceChange(0)! > 0 ? (
                  <TrendingUp className="w-6 h-6 text-red-600" />
                ) : (
                  <Minus className="w-6 h-6 text-gray-400" />
                )}
              </div>
            )}
          </div>

          {/* Gráfico simple */}
          <div className="space-y-2">
            {history.slice(-14).reverse().map((entry, index) => {
              const height = priceRange > 0 ? ((entry.price - minPrice) / priceRange) * 100 : 50;
              const change = getPriceChange(history.length - index);

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-20 text-xs text-gray-600">
                    {entry.days_ago === 0 ? 'Hoy' : `Hace ${entry.days_ago}d`}
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden relative">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all"
                        style={{ width: `${height}%` }}
                      />
                    </div>
                    <div className="text-sm font-medium w-24 text-right">
                      {formatCurrency(entry.price)}
                    </div>
                    {change !== null && (
                      <div className={`text-xs ${
                        change < 0 ? 'text-green-600' : change > 0 ? 'text-red-600' : 'text-gray-400'
                      }`}>
                        {change < 0 ? '↓' : change > 0 ? '↑' : '—'} {Math.abs(change).toLocaleString('es-PY')}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

