import ProductsListClient from '@/components/ProductsListClient';
import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase/client';

// Import dinámico sin SSR para evitar bloqueos en prod
const HeroSlider = dynamic(() => import('@/components/hero/HeroSlider'), {
  ssr: false,
});

// Forzar revalidación para evitar caché en producción
export const revalidate = 0;
export const dynamic = 'force-dynamic'; // Desactivar caché estático

const FEATURE_HERO = process.env.NEXT_PUBLIC_FEATURE_HERO === 'true';

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
  sort_order: number;
  created_at?: string | null;
};

export default async function Home() {
  let slides: HeroSlide[] = [];

  // Log feature flag en producción
  if (process.env.NODE_ENV === 'production') {
    console.log('[Hero] NEXT_PUBLIC_FEATURE_HERO:', process.env.NEXT_PUBLIC_FEATURE_HERO);
    console.log('[Hero] FEATURE_HERO enabled:', FEATURE_HERO);
  }

  if (FEATURE_HERO) {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select(
          'id, title, subtitle, cta_primary_label, cta_primary_href, bg_type, image_url, gradient_from, gradient_to, is_active, sort_order, created_at'
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      // Log en producción
      if (process.env.NODE_ENV === 'production') {
        console.log('[Hero] Query result - slides count:', data?.length || 0);
        console.log('[Hero] Query error:', error?.message || 'none');
      }
      
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
        
        const getPublicUrl = (path: string | null | undefined): string | null => {
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
          
          return {
            id: s.id as string,
            title: (s.title ?? null) as string | null,
            subtitle: (s.subtitle ?? null) as string | null,
            cta_primary_label: (s.cta_primary_label ?? null) as string | null,
            cta_primary_href: (s.cta_primary_href ?? null) as string | null,
            cta_secondary_label: null, // No se selecciona en la query
            cta_secondary_href: null, // No se selecciona en la query
            bg_type: bgType,
            // Para gradient: usar gradient_from/gradient_to
            bg_gradient_from: bgType === 'gradient' ? (s.gradient_from ?? '#6d28d9') : null,
            bg_gradient_to: bgType === 'gradient' ? (s.gradient_to ?? '#2563eb') : null,
            // Para image: usar image_url
            bg_image_url: bgType === 'image' ? (s.image_url ?? null) : null,
            image_url: s.image_url ?? null,
            gradient_from: s.gradient_from ?? null,
            gradient_to: s.gradient_to ?? null,
            storage_path: null, // No se selecciona en la query
            public_url: null, // Se calcula si hay storage_path
            sort_order: (s.sort_order as number) ?? 0,
            created_at: s.created_at ?? null,
          };
        });
        
        // Log en producción
        if (process.env.NODE_ENV === 'production') {
          console.log('[Hero] Processed slides count:', slides.length);
          if (slides.length === 0) {
            console.warn('[Hero] ⚠️ No slides found! Will show placeholder.');
          }
        }
      }
    } catch (err: any) {
      console.error('[Hero] Error in Home component:', err?.message || err);
      if (process.env.NODE_ENV === 'production') {
        console.error('[Hero] Full error:', err);
      }
      slides = [];
    }
  }

  // Log final en producción
  if (process.env.NODE_ENV === 'production') {
    console.log('[Hero] Final slides count:', slides.length);
    console.log('[Hero] Feature enabled:', FEATURE_HERO);
    console.log('[Hero] Will render:', FEATURE_HERO && slides.length > 0 ? 'HeroSlider' : 'Placeholder');
  }

  console.log('[HERO/DIAG]', Array.isArray(slides), slides?.length);
  console.log('Hero render in PROD', slides?.length);

  return (
    <main className="min-h-screen bg-gray-50">
      <div data-testid="hero-probe">HERO PROBE</div>
      
      {/* Asignar slides a window para acceso en cliente */}
      <script
        dangerouslySetInnerHTML={{
          __html: `if (typeof window !== 'undefined') { window.__HERO_SLIDES__ = ${JSON.stringify(slides || [])}; }`,
        }}
      />
      
      {/* HERO - componente real sin SSR */}
      {Array.isArray(slides) && slides.length > 0 ? (
        <HeroSlider slides={slides} data-testid="hero-slider" />
      ) : null}

      {/* Products Section */}
      <div id="products" className="py-8 sm:py-12 px-4 sm:px-8">
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
