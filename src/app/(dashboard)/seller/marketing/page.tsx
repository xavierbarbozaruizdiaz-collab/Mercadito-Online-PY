// ============================================
// SELLER MARKETING INTEGRATIONS PAGE
// Página para que sellers configuren sus IDs de marketing
// ============================================

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import MarketingForm from './_components/MarketingForm';
import { Database } from '@/types/database';

type StoreRow = Database['public']['Tables']['stores']['Row'];

// Feature flag check
const featureEnabled = process.env.NEXT_PUBLIC_FEATURE_MARKETING === '1';

export default async function SellerMarketingPage() {
  // Feature flag gate
  if (!featureEnabled) {
    redirect('/dashboard');
  }

  const supabase = await createServerClient();

  // Obtener usuario actual
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session?.user?.id) {
    redirect('/auth/sign-in');
  }

  const userId = session.session.user.id;

  // Obtener tienda del usuario
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, name, slug, fb_pixel_id, ga_measurement_id, gtm_id')
    .eq('seller_id', userId)
    .eq('is_active', true)
    .single<Pick<StoreRow, 'id' | 'name' | 'slug' | 'fb_pixel_id' | 'ga_measurement_id' | 'gtm_id'>>();

  if (error || !store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No tienes una tienda activa</h2>
          <p className="text-gray-600 mb-4">Crea una tienda primero para configurar marketing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Integraciones de Marketing</h1>
          <p className="text-gray-600 mt-1">
            Configura tus IDs de Facebook Pixel, Google Analytics y Google Tag Manager para trackear eventos de tu tienda
          </p>
        </div>

        <MarketingForm
          storeId={store.id}
          storeName={store.name}
          initialData={{
            fb_pixel_id: store.fb_pixel_id || '',
            ga_measurement_id: store.ga_measurement_id || '',
            gtm_id: store.gtm_id || '',
          }}
        />
      </div>
    </div>
  );
}

