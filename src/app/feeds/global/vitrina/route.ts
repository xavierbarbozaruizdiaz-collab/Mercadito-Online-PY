// ============================================
// MERCADITO ONLINE PY - FEED DE CATÁLOGO GLOBAL (VITRINA)
// Endpoint público para servir feed JSON del Catálogo General de Mercadito
// Compatible con Meta, TikTok, Google Shopping, etc.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { getGlobalCatalogProductsForWeb } from '@/lib/services/globalCatalogService';

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
  
  // Fallback final (producción)
  return 'https://mercadito-online-py.vercel.app';
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

export async function GET(request: NextRequest) {
  try {
    // Obtener parámetros de paginación opcionales de la query string
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '100', 10); // Default 100, máximo razonable para feeds

    // Validar parámetros
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(500, Math.max(1, pageSize)); // Máximo 500 productos por página

    // Obtener productos del catálogo global usando el servicio existente
    const catalogResponse = await getGlobalCatalogProductsForWeb({
      page: validPage,
      pageSize: validPageSize,
    });

    // Mapear productos al formato del feed
    const feedProducts: FeedProduct[] = catalogResponse.products
      .filter((product) => {
        // Filtrar solo productos válidos y activos
        return product && product.status === 'active' && product.id;
      })
      .map((product) => {
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
          // category: product.categories?.name,
          // gtin: product.gtin,
          // mpn: product.mpn,
        };
      });

    // Retornar JSON con headers apropiados para feeds
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
    console.error('[Feed] Error generating global catalog feed:', error);
    
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

