import ProductsListClient from '@/components/ProductsListClient';
import { Suspense } from 'react';
import HeroSlider from '@/components/hero/HeroSlider';
import { supabase } from '@/lib/supabase/client';

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
  storage_path?: string | null;
  public_url?: string | null;
  position: number;
};

export default async function Home() {
  let slides: HeroSlide[] = [];

  if (FEATURE_HERO) {
    try {
      const { data, error } = await supabase
        .from('hero_slides')
        .select(
          'id, title, subtitle, cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href, bg_type, bg_gradient_from, bg_gradient_to, storage_path, position, banner_position'
        )
        .eq('is_active', true)
        .order('position', { ascending: true });
      
      if (error) {
        console.error('Error loading hero slides:', error);
      } else if (data) {
        // Filtrar SOLO slides con banner_position = 'hero' o null (excluir 'footer', 'sidebar', 'top')
        const filteredBase = data.filter((s: any) => {
          const position = s.banner_position;
          return position === 'hero' || position === null || position === undefined || position === '';
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
        
        slides = filteredBase.map((s: any) => ({
          id: s.id as string,
          title: (s.title ?? null) as string | null,
          subtitle: (s.subtitle ?? null) as string | null,
          cta_primary_label: (s.cta_primary_label ?? null) as string | null,
          cta_primary_href: (s.cta_primary_href ?? null) as string | null,
          cta_secondary_label: (s.cta_secondary_label ?? null) as string | null,
          cta_secondary_href: (s.cta_secondary_href ?? null) as string | null,
          bg_type: (s.bg_type as any) || 'gradient',
          bg_gradient_from: (s.bg_gradient_from ?? null) as string | null,
          bg_gradient_to: (s.bg_gradient_to ?? null) as string | null,
          bg_image_url: (s.bg_image_url ?? null) as string | null,
          storage_path: (s.storage_path ?? null) as string | null,
          public_url: getPublicUrl(s.storage_path),
          position: (s.position as number) ?? 0,
        }));
      }
    } catch (err: any) {
      console.error('Error in Home component:', err?.message || err);
      slides = [];
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      {FEATURE_HERO && slides.length > 0 ? (
        <HeroSlider slides={slides} />
      ) : (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 text-center">
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-4">🛒 Mercadito Online PY</h1>
            <p className="text-lg sm:text-xl md:text-2xl mb-6 sm:mb-8 opacity-90 px-4">Encuentra los mejores productos en Paraguay</p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              <a href="#products" className="px-6 sm:px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors">Explorar productos</a>
              <a href="/dashboard" className="px-6 sm:px-8 py-3 border-2 border-white text-white rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors">Vender productos</a>
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      <div id="products" className="py-8 sm:py-12 px-4 sm:px-8">
        <Suspense fallback={<div className="flex justify-center items-center h-32"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}>
          <ProductsListClient />
        </Suspense>
      </div>
    </main>
  );
}
