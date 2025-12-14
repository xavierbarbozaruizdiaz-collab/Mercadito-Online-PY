// ============================================
// MERCADITO ONLINE PY - SITE SETTINGS SERVER
// Funciones server-side para leer configuración del sitio
// SOLO para uso en Server Components (layout.tsx, FooterWrapper, etc.)
// NO importar en componentes cliente ('use client')
// ============================================

import { createServerClient } from '@/lib/supabase/server';

/**
 * Tipo para los settings del sitio que se exponen al frontend público
 */
export type SiteSettings = {
  siteName: string;
  siteDescription?: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  location?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  shippingCost?: number | null;
  freeShippingThreshold?: number | null;
  paymentMethods?: string[] | null;
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
 * Retorna valores por defecto seguros para SiteSettings
 * Estos valores se usan cuando la DB no está disponible o hay errores
 */
function getDefaultSiteSettings(): SiteSettings {
  // Defaults solo para cuando hay error de conexión a DB
  // NO para cuando los valores no existen (eso es un problema que debe resolverse)
  return {
    siteName: 'Mercadito Online PY',
    contactEmail: null, // No usar default - si no existe, es un problema
    contactPhone: null, // No usar default - si no existe, es un problema
    location: 'Asunción, Paraguay',
    primaryColor: null,
    secondaryColor: null,
    shippingCost: null,
    freeShippingThreshold: null,
    paymentMethods: null,
  };
}

/**
 * Obtiene los settings del sitio para uso en Server Components
 * Esta función usa el cliente de servidor de Supabase y está diseñada
 * para ser usada en Server Components como layout.tsx y FooterWrapper
 * 
 * @returns SiteSettings con valores desde la DB o defaults seguros
 */
export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabase = await createServerClient();

    // Primero intentar leer solo los contact settings para verificar RLS
    const { data: contactData, error: contactError } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['contact_email', 'contact_phone']);

    if (contactError) {
      console.error('[getSiteSettings] Error leyendo contact settings (verificación RLS):', contactError);
    } else {
      const contactKeys = (contactData || []).map((s: any) => s.key);
      console.log('[getSiteSettings] Contact settings encontrados:', contactKeys);
    }

    // Luego leer todos los settings necesarios
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', [
        'site_name',
        'site_description',
        'contact_email',
        'contact_phone',
        'location',
        'primary_color',
        'secondary_color',
        'shipping_cost',
        'free_shipping_threshold',
        'payment_methods'
      ]);

    if (error) {
      // Log discreto - no exponer errores al usuario
      console.error('[getSiteSettings] Error loading settings:', error);
      console.error('[getSiteSettings] Error details:', JSON.stringify(error, null, 2));
      // Retornar defaults seguros
      return getDefaultSiteSettings();
    }

    // Convertir array de {key, value} a objeto Record
    const settingsMap: Record<string, any> = {};
    const keysReceived: string[] = [];
    (data || []).forEach((s: any) => {
      settingsMap[s.key] = parseJsonbValue(s.value);
      keysReceived.push(s.key);
    });

    // Validar que los valores críticos existan
    if (!settingsMap.contact_email) {
      console.error('[getSiteSettings] contact_email no encontrado en DB.');
      console.error('[getSiteSettings] Keys recibidos de la consulta:', keysReceived);
      console.error('[getSiteSettings] Datos completos recibidos:', JSON.stringify(data, null, 2));
    }
    if (!settingsMap.contact_phone) {
      console.error('[getSiteSettings] contact_phone no encontrado en DB.');
      console.error('[getSiteSettings] Keys recibidos de la consulta:', keysReceived);
      console.error('[getSiteSettings] Datos completos recibidos:', JSON.stringify(data, null, 2));
    }

    // Mapear columnas de DB → campos del tipo SiteSettings
    // IMPORTANTE: Si los valores no existen, usar null en lugar de defaults que oculten el problema
    return {
      siteName: settingsMap.site_name ?? 'Mercadito Online PY',
      siteDescription: settingsMap.site_description ?? null,
      contactEmail: settingsMap.contact_email || null, // No usar default que oculte el problema
      contactPhone: settingsMap.contact_phone || null, // No usar default que oculte el problema
      location: settingsMap.location ?? 'Asunción, Paraguay',
      primaryColor: settingsMap.primary_color ?? null,
      secondaryColor: settingsMap.secondary_color ?? null,
      shippingCost: typeof settingsMap.shipping_cost === 'number' 
        ? settingsMap.shipping_cost 
        : (settingsMap.shipping_cost ? Number(settingsMap.shipping_cost) : null),
      freeShippingThreshold: typeof settingsMap.free_shipping_threshold === 'number'
        ? settingsMap.free_shipping_threshold
        : (settingsMap.free_shipping_threshold ? Number(settingsMap.free_shipping_threshold) : null),
      paymentMethods: Array.isArray(settingsMap.payment_methods) 
        ? settingsMap.payment_methods 
        : null,
    };
  } catch (error) {
    // Si hay cualquier error (DB no disponible, etc.), retornar defaults
    console.error('[getSiteSettings] Unexpected error:', error);
    return getDefaultSiteSettings();
  }
}

