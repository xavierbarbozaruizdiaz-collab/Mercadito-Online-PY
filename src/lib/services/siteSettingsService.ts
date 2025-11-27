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
 * Parsea un valor JSONB que puede estar en diferentes formatos
 */
function parseJsonbValue(value: any): any {
  if (value == null) return value;
  
  // Si ya es un objeto/array/número/boolean, devolverlo directamente
  if (typeof value !== 'string') {
    return value;
  }
  
  // Si es un string, intentar parsearlo
  try {
    // Si parece ser un JSON string (empieza y termina con comillas)
    if (value.startsWith('"') && value.endsWith('"')) {
      return JSON.parse(value);
    }
    // Si parece ser JSON (objeto o array)
    if (value.startsWith('{') || value.startsWith('[')) {
      return JSON.parse(value);
    }
    // Si no, devolver el string directamente
    return value;
  } catch {
    // Si falla el parse, devolver el valor original
    return value;
  }
}

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
    settings[s.key] = parseJsonbValue(s.value);
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

  return parseJsonbValue((data as any).value);
}

/**
 * Actualiza una configuración
 */
export async function updateSetting(key: string, value: any, adminId: string): Promise<void> {
  // Supabase JSONB maneja automáticamente la serialización
  // NO hacer JSON.stringify() manualmente - causa doble encoding
  // Simplemente pasar el valor directamente y Supabase lo convierte a JSONB
  
  // Using 'as any' to bypass Supabase strict type constraint for updates
  const { error } = await (supabase as any)
    .from('site_settings')
    .update({
      value: value, // Supabase maneja la conversión a JSONB automáticamente
      updated_by: adminId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key);

  if (error) {
    // Si no existe, crearlo
    // Using 'as any' to bypass Supabase strict type constraint for inserts
    const { error: insertError } = await (supabase as any)
      .from('site_settings')
      .insert({
        key,
        value: value, // Supabase maneja la conversión a JSONB automáticamente
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

