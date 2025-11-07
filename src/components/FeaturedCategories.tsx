'use client';

// ============================================
// MERCADITO ONLINE PY - FEATURED CATEGORIES
// Sección de categorías destacadas
// ============================================

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { ShoppingBag, TrendingUp, Sparkles } from 'lucide-react';

type Category = {
  id: string;
  name: string;
  product_count?: number;
};

export default function FeaturedCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const enableProductsApi = process.env.NEXT_PUBLIC_ENABLE_PRODUCTS_API === 'true';

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      // Obtener categorías con más productos
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .limit(6)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error loading categories:', error);
        return;
      }

      // Contar productos por categoría
      const categoriesWithCount = await Promise.all(
        (data || []).map(async (cat) => {
          const { count } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('category_id', cat.id);
          
          return {
            ...cat,
            product_count: count || 0,
          };
        })
      );

      // Ordenar por cantidad de productos
      const sorted = categoriesWithCount.sort((a, b) => (b.product_count || 0) - (a.product_count || 0));
      setCategories(sorted.slice(0, 6));
    } catch (error) {
      console.error('Error loading featured categories:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  const icons = [ShoppingBag, TrendingUp, Sparkles, ShoppingBag, TrendingUp, Sparkles];

  return (
    <section className="py-8 sm:py-12 bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 mb-6">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Categorías Destacadas
          </h2>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category, index) => {
            const Icon = icons[index % icons.length];
            const categoryHref = enableProductsApi ? `/products?category=${category.id}` : '/vitrina';
            return (
              <Link
                key={category.id}
                href={categoryHref}
                prefetch={enableProductsApi}
                aria-disabled={!enableProductsApi}
                className="group relative flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all duration-300 hover:scale-105"
              >
                <div className="mb-3 p-3 bg-white rounded-full shadow-sm group-hover:shadow-md transition-shadow">
                  <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 text-center mb-1 group-hover:text-purple-600 transition-colors">
                  {category.name}
                </h3>
                {category.product_count !== undefined && category.product_count > 0 && (
                  <p className="text-xs text-gray-500">
                    {category.product_count} producto{category.product_count !== 1 ? 's' : ''}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

