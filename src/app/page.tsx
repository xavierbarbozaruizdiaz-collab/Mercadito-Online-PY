import ProductsListClient from '@/components/ProductsListClient';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabaseServer';
import HeroMountProbe from '@/components/hero/HeroMountProbe';
import HeroSliderClient from '@/components/hero/HeroSliderClient';
import CategoryButtons from '@/components/CategoryButtons';
import FeaturedCategories from '@/components/FeaturedCategories';
import StatsSection from '@/components/StatsSection';
import { unstable_noStore as noStore } from 'next/cache';

// FORZAR RENDER DINÁMICO - NO GENERAR ESTÁTICAMENTE
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const dynamicParams = true;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';

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
  sort_order: number;
  created_at?: string | null;
  position?: number;
};

export default async function Home() {
  // Deshabilitar cache completamente - FORZA render dinámico
  noStore();
  
  let slides: HeroSlide[] = [];

  // Cargar slides del hero si el feature está habilitado
  if (FEATURE_HERO) {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select(
          'id, title, subtitle, cta_primary_label, cta_primary_href, bg_type, image_url, gradient_from, gradient_to, is_active, sort_order, created_at'
        )
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) {
        console.error('[Hero] Error loading hero slides:', error);
      } else if (data) {
        // Ordenar por sort_order ASC y luego por created_at DESC
        const sortedData = [...data].sort((a: any, b: any) => {
          if (a.sort_order !== b.sort_order) {
            return (a.sort_order || 0) - (b.sort_order || 0);
          }
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
            cta_secondary_label: null,
            cta_secondary_href: null,
            bg_type: bgType,
            bg_gradient_from: bgType === 'gradient' ? (s.gradient_from ?? '#6d28d9') : null,
            bg_gradient_to: bgType === 'gradient' ? (s.gradient_to ?? '#2563eb') : null,
            bg_image_url: bgType === 'image' ? (s.image_url ?? null) : null,
            image_url: s.image_url ?? null,
            gradient_from: s.gradient_from ?? null,
            gradient_to: s.gradient_to ?? null,
            storage_path: null,
            public_url: null,
            sort_order: (s.sort_order as number) ?? 0,
            created_at: s.created_at ?? null,
            position: (s.sort_order as number) ?? 0,
          };
        });
      }
    } catch (err: any) {
      console.error('[Hero] Error in Home component:', err?.message || err);
      slides = [];
    }
  }

  // Si no hay hero slider, mostrar el hero estático por defecto
  const showStaticHero = !FEATURE_HERO || !Array.isArray(slides) || slides.length === 0;

  return (
    <main className="flex-1 bg-gray-50">
      {/* Probe para asignar slides a window en cliente */}
      {Array.isArray(slides) && slides.length > 0 && <HeroMountProbe slides={slides} />}
      
      {/* HERO SLIDER - dinámico desde BD */}
      {FEATURE_HERO && Array.isArray(slides) && slides.length > 0 && (
        <div className="mb-2">
          <HeroSliderClient slides={slides} />
        </div>
      )}

      {/* HERO ESTÁTICO - fallback si no hay slides */}
      {showStaticHero && (
        <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-purple-700 text-white py-16 sm:py-20 md:py-24 overflow-hidden">
          {/* Efectos decorativos de fondo */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 translate-y-1/2"></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-8 text-center z-10">
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 drop-shadow-lg">
                Mercadito Online PY
              </h1>
            </div>
            <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 opacity-95 px-4 max-w-3xl mx-auto">
              Encuentra los mejores productos en Paraguay. Compra y vende de forma segura.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <a
                href="#products"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Explorar productos
              </a>
              <a
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white hover:text-blue-600 transition-all shadow-lg hover:shadow-xl hover:scale-105"
              >
                Vender productos
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Categoría */}
      <div className="bg-white border-b border-gray-200">
        <CategoryButtons />
      </div>

      {/* Categorías Destacadas */}
      <FeaturedCategories />

      {/* Sección de Estadísticas */}
      <StatsSection />

      {/* Products Section */}
      <section id="products" className="py-8 sm:py-12 bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Título de la sección */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Productos Destacados
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Descubre los mejores productos disponibles en nuestro marketplace
            </p>
          </div>

          <Suspense fallback={
            <div className="flex flex-col justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <span className="text-gray-600 font-medium">Cargando productos...</span>
            </div>
          }>
            <ProductsListClient />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
