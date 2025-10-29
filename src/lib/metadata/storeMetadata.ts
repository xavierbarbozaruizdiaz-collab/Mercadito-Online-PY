// ============================================
// MERCADITO ONLINE PY - STORE METADATA
// Generador de metadatos para páginas de tienda
// ============================================

import { Metadata } from 'next';
import { supabase } from '@/lib/supabaseClient';

export async function generateStoreMetadata(slug: string): Promise<Metadata> {
  try {
    const { data: store } = await supabase
      .from('stores')
      .select(`
        name,
        description,
        location,
        logo_url,
        is_verified,
        rating,
        total_products,
        total_sales,
        created_at
      `)
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (!store) {
      return {
        title: 'Tienda no encontrada | Mercadito Online PY',
        description: 'La tienda que buscas no está disponible.',
      };
    }

    const rating = store.rating || 0;
    const totalProducts = store.total_products || 0;
    const totalSales = store.total_sales || 0;
    
    return {
      title: `${store.name} | Mercadito Online PY`,
      description: store.description || `Tienda ${store.name} en Mercadito Online PY. ${totalProducts} productos disponibles. Calificación: ${rating}/5 estrellas.`,
      keywords: [
        store.name,
        'tienda',
        'Paraguay',
        'productos',
        'comprar',
        'vender',
        store.location,
        'Mercadito Online PY',
        'marketplace'
      ],
      openGraph: {
        title: store.name,
        description: store.description || `Tienda ${store.name} con ${totalProducts} productos disponibles.`,
        images: store.logo_url ? [store.logo_url] : [],
        type: 'website',
        locale: 'es_PY',
        siteName: 'Mercadito Online PY',
      },
      twitter: {
        card: 'summary_large_image',
        title: store.name,
        description: store.description || `Tienda ${store.name} con ${totalProducts} productos disponibles.`,
        images: store.logo_url ? [store.logo_url] : [],
      },
      alternates: {
        canonical: `https://mercadito-online-py.vercel.app/store/${slug}`,
      },
    };
  } catch (error) {
    return {
      title: 'Error | Mercadito Online PY',
      description: 'Error al cargar la información de la tienda.',
    };
  }
}
