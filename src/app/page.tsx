import ProductsListClient from '@/components/ProductsListClient';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseServer';
import HeroMountProbe from '@/components/hero/HeroMountProbe';
import HeroSliderClient from '@/components/hero/HeroSliderClient';
import { unstable_noStore as noStore } from 'next/cache';

// FORZAR RENDER DINÁMICO - NO GENERAR ESTÁTICAMENTE
// Usar TODAS las opciones posibles para prevenir generación estática
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
// Prevenir cualquier optimización estática
export const preferredRegion = 'auto';

// Feature flag para hero slider
const FEATURE_HERO = process.env.NEXT_PUBLIC_FEATURE_HERO === 'true' || false;

type HeroSlide = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_primary_label: string | null;
  cta_primary_href: string | null;
  cta_secondary_label: string | null;
  cta_secondary_href: string | null;
  bg_type: 'gradient' | 'image';
  bg_gradient_from?: string | null;
  bg_gradient_to?: string | null;
  bg_image_url?: string | null;
  image_url?: string | null;
  gradient_from?: string | null;
  gradient_to?: string | null;
  storage_path?: string | null;
  public_url?: string | null;
  link_url?: string | null;
  show_title?: boolean | null;
  sort_order: number;
  created_at?: string | null;
};

export default async function Home() {
  // Deshabilitar cache completamente - FORZA render dinámico
  noStore();
  
  // Forzar que esta página use timestamp dinámico para prevenir cache
  const timestamp = Date.now();
  const random = Math.random();
  
  // Log para verificar que se ejecuta en cada request
  console.log(`[DEBUG] Home page render at ${new Date().toISOString()}, timestamp: ${timestamp}, random: ${random}`);
  
  let slides: HeroSlide[] = [];

  // Log feature flag en producción
  if (process.env.NODE_ENV === 'production') {
    console.log('[Hero] NEXT_PUBLIC_FEATURE_HERO:', process.env.NEXT_PUBLIC_FEATURE_HERO);
    console.log('[Hero] FEATURE_HERO enabled:', FEATURE_HERO);
  }

  // ============================================
  // DEBUG AGRESIVO PARA PRODUCCIÓN
  // ============================================
  console.log('[DEBUG] FEATURE_HERO:', FEATURE_HERO);
  console.log('[DEBUG] NEXT_PUBLIC_FEATURE_HERO:', process.env.NEXT_PUBLIC_FEATURE_HERO);
  console.log('[DEBUG] NODE_ENV:', process.env.NODE_ENV);
  
  if (!FEATURE_HERO) {
    console.error('[ERROR] FEATURE_HERO está deshabilitado - Variable no configurada en Vercel Dashboard');
  }

  if (FEATURE_HERO) {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select(
          'id, title, subtitle, cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href, bg_type, image_url, bg_image_url, gradient_from, gradient_to, storage_path, link_url, show_title, is_active, sort_order, created_at'
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
             if (error) {
               console.error('[Hero] Error loading hero slides:', error);
             } else if (data) {
        // Ordenar por sort_order ASC y luego por created_at DESC (si existe)
        const sortedData = [...data].sort((a: any, b: any) => {
          if (a.sort_order !== b.sort_order) {
            return (a.sort_order || 0) - (b.sort_order || 0);
          }
          // Si sort_order es igual, ordenar por created_at DESC
          if (a.created_at && b.created_at) {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          }
          return 0;
        });
        
        // Función helper para construir URL pública desde storage_path (Server Component)
        const getPublicUrlFromPath = (path: string | null | undefined): string | null => {
          if (!path) return null;
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hqdatzhliaordlsqtjea.supabase.co';
            const bucketName = 'hero-banners';
            return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${path}`;
          } catch {
            return null;
          }
        };
        
        // Mapear según bg_type
        slides = sortedData.map((s: any) => {
          const bgType = (s.bg_type || 'gradient') as 'gradient' | 'image';
          
          // Construir URL de imagen: prioridad: bg_image_url > public_url desde storage_path > image_url
          let imageUrl: string | null = null;
          if (bgType === 'image') {
            if (s.bg_image_url) {
              imageUrl = s.bg_image_url;
            } else if (s.storage_path) {
              // Construir URL pública desde storage_path
              imageUrl = getPublicUrlFromPath(s.storage_path);
            } else if (s.image_url) {
              imageUrl = s.image_url;
            }
          }
          
          return {
            id: s.id as string,
            title: (s.title ?? null) as string | null,
            subtitle: (s.subtitle ?? null) as string | null,
            cta_primary_label: (s.cta_primary_label ?? null) as string | null,
            cta_primary_href: (s.cta_primary_href ?? null) as string | null,
            cta_secondary_label: (s.cta_secondary_label ?? null) as string | null,
            cta_secondary_href: (s.cta_secondary_href ?? null) as string | null,
            bg_type: bgType,
            // Para gradient: usar gradient_from/gradient_to
            bg_gradient_from: bgType === 'gradient' ? (s.gradient_from ?? '#6d28d9') : null,
            bg_gradient_to: bgType === 'gradient' ? (s.gradient_to ?? '#2563eb') : null,
            // Para image: usar la URL construida
            bg_image_url: imageUrl,
            image_url: s.image_url ?? null,
            gradient_from: s.gradient_from ?? null,
            gradient_to: s.gradient_to ?? null,
            storage_path: (s.storage_path ?? null) as string | null,
            public_url: s.storage_path ? getPublicUrlFromPath(s.storage_path) : null,
            link_url: (s.link_url ?? null) as string | null,
            show_title: s.show_title !== undefined ? (s.show_title ?? true) : true, // Por defecto true
            sort_order: (s.sort_order as number) ?? 0,
            created_at: s.created_at ?? null,
            // Añadir position para compatibilidad con HeroSlider
            position: (s.sort_order as number) ?? 0,
          };
        });
        
             }
           } catch (err: any) {
             console.error('[Hero] Error in Home component:', err?.message || err);
             slides = [];
           }
         }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Probe para asignar slides a window en cliente */}
      {Array.isArray(slides) && <HeroMountProbe slides={slides} />}
      
      {/* HERO - componente real sin SSR */}
      {FEATURE_HERO && Array.isArray(slides) && slides.length > 0 && (
        <div className="mb-2">
          <HeroSliderClient slides={slides} />
        </div>
      )}

      {/* Products Section */}
      <div id="products" className="pt-0 pb-4 sm:pt-2 sm:pb-6 px-4 sm:px-8">
        <Suspense fallback={
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gray-600">Cargando productos...</span>
          </div>
        }>
          <ProductsListClient />
        </Suspense>
      </div>
    </main>
  );
}
