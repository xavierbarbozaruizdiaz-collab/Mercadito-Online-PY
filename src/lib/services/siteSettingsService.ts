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

  if (error) {
    // Si es error de acceso (RLS), retornar defaultValue silenciosamente (no lanzar error)
    // Esto evita errores 406 en consola cuando la política RLS no permite acceso
    if (error.code === 'PGRST301' || error.status === 406 || error.status === 403) {
      // No loggear ni lanzar - solo retornar defaultValue
      // El caller puede verificar si el valor es el default si necesita
      return defaultValue;
    }
    // Si es 404 o "no encontrado", retornar defaultValue (dato realmente no existe)
    if (error.code === 'PGRST116' || error.message?.includes('No rows') || error.message?.includes('not found')) {
      return defaultValue;
    }
    // Otros errores: loggear solo en desarrollo y retornar defaultValue
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[getSetting] Error fetching setting '${key}':`, error);
    }
    return defaultValue;
  }

  if (!data) {
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

/**
 * Normaliza un número de teléfono para WhatsApp (wa.me)
 * - Elimina espacios y caracteres no numéricos
 * - Si empieza con 0, lo convierte a 595 + resto
 * - Ejemplo: "0981 123 456" → "595981123456"
 */
export function normalizePhoneNumber(phone: string): string {
  // Eliminar espacios y caracteres no numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Si empieza con 0, convertir a formato internacional (595)
  if (cleaned.startsWith('0')) {
    cleaned = '595' + cleaned.substring(1);
  }
  
  // Si ya tiene código de país pero no empieza con 595, asegurar que tenga
  if (!cleaned.startsWith('595') && cleaned.length > 9) {
    // Si tiene código de país diferente, mantenerlo
    // Si no tiene código, agregar 595
    if (cleaned.length === 9) {
      cleaned = '595' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Obtiene el número de WhatsApp del sitio con fallback inteligente
 * Orden de prioridad: whatsapp_number -> contact_phone -> fallback hardcodeado
 * 
 * @returns Número de teléfono normalizado para WhatsApp (formato wa.me)
 */
export async function getWhatsappNumber(): Promise<string> {
  // 1. Intentar whatsapp_number
  try {
    const whatsapp = await getSetting('whatsapp_number', '');
    if (whatsapp && typeof whatsapp === 'string' && whatsapp.trim()) {
      return normalizePhoneNumber(whatsapp);
    }
  } catch (error) {
    console.warn('[getWhatsappNumber] Error leyendo whatsapp_number, intentando contact_phone', error);
  }

  // 2. Intentar contact_phone como fallback
  try {
    const contactPhone = await getSetting('contact_phone', '');
    if (contactPhone && typeof contactPhone === 'string' && contactPhone.trim()) {
      return normalizePhoneNumber(contactPhone);
    }
  } catch (error) {
    console.warn('[getWhatsappNumber] Error leyendo contact_phone, usando fallback', error);
  }

  // 3. Fallback hardcodeado (número temporal por defecto)
  return '595981123456';
}

