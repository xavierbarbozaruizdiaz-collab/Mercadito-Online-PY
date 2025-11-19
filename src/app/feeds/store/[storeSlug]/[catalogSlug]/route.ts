// ============================================
// MERCADITO ONLINE PY - FEED DE CATÁLOGO DE ANUNCIOS
// Endpoint público para servir feeds JSON de catálogos de tienda
// Compatible con Meta, TikTok, Google Shopping, etc.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getStoreBySlug } from '@/lib/services/storeService';
import { getStoreAdCatalogBySlug } from '@/lib/services/storeAdCatalogService';
import { SITE_URL } from '@/lib/config/site';

// ============================================
// TIPOS
// ============================================

interface FeedProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  link: string;
  image_link: string;
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'used' | 'refurbished';
  brand?: string;
  category?: string;
  gtin?: string;
  mpn?: string;
}

// ============================================
// HELPER: Obtener URL base de la aplicación
// ============================================

function getBaseUrl(): string {
  // Prioridad 1: Variable de entorno explícita (producción)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, ''); // Remover trailing slash
  }
  
  // Prioridad 2: Vercel URL (producción automática)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Prioridad 3: Vercel Preview URL (para previews)
  if (process.env.VERCEL_BRANCH_URL) {
    return `https://${process.env.VERCEL_BRANCH_URL}`;
  }
  
  // Fallback final (usa SITE_URL configurado: producción o desarrollo)
  return SITE_URL;
}

// ============================================
// HELPER: Mapear condición del producto
// ============================================

function mapCondition(condition: string | null | undefined): 'new' | 'used' | 'refurbished' {
  if (!condition) return 'new';
  
  const normalized = condition.toLowerCase();
  if (normalized.includes('nuevo') || normalized === 'new') {
    return 'new';
  }
  if (normalized.includes('usado') || normalized === 'used') {
    return 'used';
  }
  if (normalized.includes('refurbished') || normalized.includes('reacondicionado')) {
    return 'refurbished';
  }
  return 'new'; // Default
}

// ============================================
// HELPER: Mapear disponibilidad
// ============================================

function mapAvailability(status: string | null | undefined, stockQuantity?: number | null): 'in stock' | 'out of stock' | 'preorder' {
  if (status !== 'active') {
    return 'out of stock';
  }
  
  // Si hay stock_quantity definido, usarlo
  if (stockQuantity !== null && stockQuantity !== undefined) {
    return stockQuantity > 0 ? 'in stock' : 'out of stock';
  }
  
  // Por defecto, asumir que está en stock si está activo
  return 'in stock';
}

// ============================================
// HELPER: Formatear descripción
// ============================================

function formatDescription(description: string | null | undefined, maxLength: number = 5000): string {
  if (!description) return '';
  
  // Limpiar HTML básico si existe
  const cleaned = description
    .replace(/<[^>]*>/g, '') // Remover tags HTML
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
  
  // Truncar si es muy largo
  if (cleaned.length > maxLength) {
    return cleaned.substring(0, maxLength - 3) + '...';
  }
  
  return cleaned;
}

// ============================================
// HELPER: Construir link del producto
// ============================================

function buildProductLink(productId: string): string {
  const baseUrl = getBaseUrl();
  // Usar ID directamente (el slug puede no estar disponible)
  return `${baseUrl}/products/${productId}`;
}

// ============================================
// HELPER: Obtener imagen del producto
// ============================================

function getProductImage(coverUrl: string | null | undefined): string {
  if (!coverUrl) {
    // Imagen placeholder por defecto
    return `${getBaseUrl()}/placeholder-product.jpg`;
  }
  
  // Si ya es una URL completa, retornarla
  if (coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) {
    return coverUrl;
  }
  
  // Si es una ruta relativa de Supabase Storage, construir URL completa
  if (coverUrl.startsWith('/storage/')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
    return `${supabaseUrl}/storage/v1/object/public${coverUrl}`;
  }
  
  // Si es solo el path, asumir que es de Supabase Storage
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co'}/storage/v1/object/public/product-images/${coverUrl}`;
}

// ============================================
// ENDPOINT GET
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storeSlug: string; catalogSlug: string }> }
) {
  try {
    const { storeSlug, catalogSlug } = await params;

    // 1. Validar y obtener la tienda por slug
    const store = await getStoreBySlug(storeSlug, false); // false = solo tiendas activas

    if (!store) {
      return NextResponse.json(
        { error: 'Store not found or inactive' },
        { status: 404 }
      );
    }

    // 2. Validar que el storeSlug coincida con la tienda real
    if (store.slug !== storeSlug) {
      return NextResponse.json(
        { error: 'Store slug mismatch' },
        { status: 404 }
      );
    }

    // 3. Validar y obtener el catálogo por slug
    const catalog = await getStoreAdCatalogBySlug(catalogSlug, store.id);

    if (!catalog) {
      return NextResponse.json(
        { error: 'Catalog not found or inactive' },
        { status: 404 }
      );
    }

    // 4. Validar que el catálogo esté activo (ya se valida en getStoreAdCatalogBySlug, pero por seguridad)
    if (!catalog.is_active) {
      return NextResponse.json(
        { error: 'Catalog is not active' },
        { status: 404 }
      );
    }

    // 5. Mapear productos al formato del feed
    const feedProducts: FeedProduct[] = catalog.products
      .filter((cp) => {
        // Filtrar solo productos válidos y activos
        const product = cp.product as any;
        return product && product.status === 'active' && product.id;
      })
      .map((cp) => {
        const product = cp.product as any;
        
        return {
          id: product.id,
          title: product.title || 'Sin título',
          description: formatDescription(product.description),
          price: Number(product.price) || 0,
          currency: 'PYG',
          link: buildProductLink(product.id),
          image_link: getProductImage(product.cover_url),
          availability: mapAvailability(product.status, product.stock_quantity),
          condition: mapCondition(product.condition),
          // Campos opcionales (pueden agregarse después si están disponibles)
          // brand: product.brand,
          // category: product.category?.name,
          // gtin: product.gtin,
          // mpn: product.mpn,
        };
      });

    // 4. Retornar JSON con headers apropiados para feeds
    return NextResponse.json(feedProducts, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600', // Cache 5 min, stale 10 min
        'Access-Control-Allow-Origin': '*', // Permitir CORS para plataformas externas
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error: any) {
    console.error('[Feed] Error generating catalog feed:', error);
    
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// OPTIONS (para CORS preflight)
// ============================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

