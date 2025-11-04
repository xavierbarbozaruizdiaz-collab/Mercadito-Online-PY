// ============================================
// MERCADITO ONLINE PY - SITEMAP
// Sitemap dinámico para SEO
// ============================================

import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://mercadito-online-py.vercel.app';
  
  // Páginas estáticas
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/stores`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/auth/sign-in`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
  ];

  try {
    // Obtener productos
    const { data: products } = await supabase
      .from('products')
      .select('id, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false });

    const productPages = (products || []).map((product: any) => ({
      url: `${baseUrl}/products/${product.id}`,
      lastModified: new Date(product.updated_at || product.created_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    // Obtener tiendas
    const { data: stores } = await supabase
      .from('stores')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    const storePages = (stores || []).map((store: any) => ({
      url: `${baseUrl}/store/${store.slug}`,
      lastModified: new Date(store.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));

    // Obtener subastas activas
    const { data: auctions } = await supabase
      .from('products')
      .select('id, updated_at, auction_end_at')
      .eq('sale_type', 'auction')
      .eq('auction_status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1000);

    const auctionPages = (auctions || []).map((auction: any) => ({
      url: `${baseUrl}/auctions/${auction.id}`,
      lastModified: new Date(auction.updated_at || auction.auction_end_at || new Date()),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }));

    // Obtener categorías
    const { data: categories } = await supabase
      .from('categories')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    const categoryPages = (categories || []).map((category: any) => ({
      url: `${baseUrl}/category/${category.slug}`,
      lastModified: new Date(category.updated_at || new Date()),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    // Páginas adicionales estáticas
    const additionalPages = [
      {
        url: `${baseUrl}/auctions`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/raffles`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      },
      {
        url: `${baseUrl}/vitrina`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.7,
      },
    ];

    return [...staticPages, ...additionalPages, ...categoryPages, ...productPages, ...storePages, ...auctionPages];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return staticPages;
  }
}
