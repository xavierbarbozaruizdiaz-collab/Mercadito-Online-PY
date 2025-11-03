// ============================================
// MERCADITO ONLINE PY - SERVICIO DE EXPIRACIÓN DE PRODUCTOS
// Manejo de productos cuando expiran membresías
// ============================================

import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/lib/utils/logger';

export interface ProductExpirationResult {
  products_paused: number;
  products_kept_active: number;
  message: string;
}

export interface ProductReactivationResult {
  products_reactivated: number;
  message: string;
}

/**
 * Pausa productos que exceden límites cuando expira la membresía
 */
export async function pauseProductsOnExpiration(
  userId: string
): Promise<ProductExpirationResult> {
  try {
    const { data, error } = await (supabase as any).rpc(
      'pause_products_on_membership_expiration',
      {
        p_user_id: userId,
      }
    );

    if (error) throw error;

    return data[0] as ProductExpirationResult;
  } catch (err) {
    logger.error('Error pausando productos por expiración', err);
    throw err;
  }
}

/**
 * Reactiva productos pausados cuando el usuario renueva su membresía
 */
export async function reactivatePausedProductsOnRenewal(
  userId: string
): Promise<ProductReactivationResult> {
  try {
    const { data, error } = await (supabase as any).rpc(
      'reactivate_paused_products_on_renewal',
      {
        p_user_id: userId,
      }
    );

    if (error) throw error;

    return data[0] as ProductReactivationResult;
  } catch (err) {
    logger.error('Error reactivando productos pausados', err);
    throw err;
  }
}




