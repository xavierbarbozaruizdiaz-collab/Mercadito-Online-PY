// ============================================
// MERCADITO ONLINE PY - SITE SETTINGS SERVICE
// Servicio para gestión de configuración del sitio
// ============================================

import { supabase } from '@/lib/supabase/client';

export type SiteSetting = {
  id: string;
  key: string;
  value: any;
  description: string | null;
  updated_at: string;
};

/**
 * Obtiene todas las configuraciones
 */
export async function getAllSettings(): Promise<Record<string, any>> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .order('key');

  if (error) {
    console.error('Error fetching settings:', error);
    return {};
  }

  const settings: Record<string, any> = {};
  (data || []).forEach((s: any) => {
    settings[s.key] = s.value;
  });

  return settings;
}

/**
 * Obtiene una configuración específica
 */
export async function getSetting(key: string, defaultValue: any = null): Promise<any> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error || !data) {
    return defaultValue;
  }

  return (data as any).value;
}

/**
 * Actualiza una configuración
 */
export async function updateSetting(key: string, value: any, adminId: string): Promise<void> {
  const { error } = await supabase
    .from('site_settings')
    .update({
      value: typeof value === 'string' ? JSON.parse(`"${value}"`) : value,
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key);

  if (error) {
    // Si no existe, crearlo
    const { error: insertError } = await supabase
      .from('site_settings')
      .insert({
        key,
        value: typeof value === 'string' ? JSON.parse(`"${value}"`) : value,
      });

    if (insertError) {
      console.error('Error updating/creating setting:', insertError);
      throw new Error(insertError.message);
    }
  }
}

/**
 * Actualiza múltiples configuraciones
 */
export async function updateSettings(settings: Record<string, any>, adminId: string): Promise<void> {
  for (const [key, value] of Object.entries(settings)) {
    await updateSetting(key, value, adminId);
  }
}

