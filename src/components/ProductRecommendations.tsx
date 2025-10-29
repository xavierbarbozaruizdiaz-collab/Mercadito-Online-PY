// src/components/ProductRecommendations.tsx
// Componente para mostrar productos recomendados

'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/types';
import { RecommendationService } from '@/lib/services/recommendationService';
import { useAuth } from '@/lib/hooks/useAuth';
import LoadingSpinner from './ui/LoadingSpinner';
import ProductCard from './ui/ProductCard';
import { Sparkles, Heart, TrendingUp } from 'lucide-react';

interface ProductRecommendationsProps {
  type?: 'personalized' | 'similar' | 'trending' | 'search-based';
  productId?: string;
  categoryId?: string;
  limit?: number;
  title?: string;
  showTitle?: boolean;
}

export default function ProductRecommendations({
  type = 'personalized',
  productId,
  categoryId,
  limit = 8,
  title,
  showTitle = true,
}: ProductRecommendationsProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecommendations = async () => {
      setLoading(true);
      try {
        let recommendations: Product[] = [];

        switch (type) {
          case 'personalized':
            if (user?.id) {
              recommendations =
                await RecommendationService.getPersonalizedRecommendations(
                  user.id,
                  limit
                );
            } else {
              recommendations = await RecommendationService.getTrendingProducts(
                limit
              );
            }
            break;

          case 'similar':
            if (productId) {
              recommendations = await RecommendationService.getSimilarProducts(
                productId,
                limit
              );
            }
            break;

          case 'trending':
            recommendations =
              await RecommendationService.getTrendingProducts(limit);
            break;

          case 'search-based':
            if (user?.id) {
              recommendations =
                await RecommendationService.getSearchBasedRecommendations(
                  user.id,
                  limit
                );
            } else {
              recommendations = await RecommendationService.getTrendingProducts(
                limit
              );
            }
            break;
        }

        setProducts(recommendations);
      } catch (error) {
        console.error('Error loading recommendations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRecommendations();
  }, [type, productId, categoryId, limit, user?.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const getTitle = () => {
    if (title) return title;

    switch (type) {
      case 'personalized':
        return 'Productos Recomendados para Ti';
      case 'similar':
        return 'Productos Similares';
      case 'trending':
        return 'Productos en Tendencia';
      case 'search-based':
        return 'Basado en tus Búsquedas';
      default:
        return 'Productos Recomendados';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'personalized':
        return <Sparkles className="w-5 h-5" />;
      case 'trending':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <Heart className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-4">
      {showTitle && (
        <div className="flex items-center gap-2 mb-6">
          {getIcon()}
          <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => {
          // Adaptar producto para ProductCard que requiere store
          const adaptedProduct = {
            ...product,
            store: (product as any).store || {
              name: 'Tienda',
              slug: 'tienda',
            },
          };
          return <ProductCard key={product.id} product={adaptedProduct} />;
        })}
      </div>
    </div>
  );
}

