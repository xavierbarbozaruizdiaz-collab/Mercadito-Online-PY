// ============================================
// GET TRACKING IDS FOR STORE
// Resuelve los IDs de tracking para una tienda específica
// Mergea con los IDs globales (globals como fallback)
// ============================================

import { supabase } from '@/lib/supabase/server';
import { cache } from 'react';
import { logger } from '@/lib/utils/logger';

interface TrackingIds {
  gaId?: string;
  pixelId?: string;
  gtmId?: string;
}

/**
 * Obtiene los IDs de tracking para una tienda específica
 * Si la tienda tiene IDs propios, los usa; si no, usa los globales
 * 
 * @param slug - Slug de la tienda
 * @returns Objeto con los IDs de tracking (store primero, luego global como fallback)
 */
export const getTrackingIdsForStore = cache(async (slug: string): Promise<TrackingIds> => {
  try {
    // Obtener IDs de la tienda
    const { data: store, error } = await supabase
      .from('stores')
      .select('fb_pixel_id, ga_measurement_id, gtm_id')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error || !store) {
      logger.warn('Store not found for tracking IDs', { slug, error });
      // Si no encuentra la tienda, retornar solo globals
      return {
        gaId: process.env.NEXT_PUBLIC_GA_ID,
        pixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID,
        gtmId: process.env.NEXT_PUBLIC_GTM_ID,
      };
    }

    // Mergear: store IDs primero, globals como fallback
    return {
      gaId: store.ga_measurement_id || process.env.NEXT_PUBLIC_GA_ID,
      pixelId: store.fb_pixel_id || process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID,
      gtmId: store.gtm_id || process.env.NEXT_PUBLIC_GTM_ID,
    };
  } catch (error) {
    logger.error('Error getting tracking IDs for store', { slug, error });
    // En caso de error, retornar solo globals
    return {
      gaId: process.env.NEXT_PUBLIC_GA_ID,
      pixelId: process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID,
      gtmId: process.env.NEXT_PUBLIC_GTM_ID,
    };
  }
});

