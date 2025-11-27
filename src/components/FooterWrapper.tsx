// ============================================
// MERCADITO ONLINE PY - FOOTER WRAPPER
// Componente de servidor que obtiene los datos de configuración
// y los pasa al Footer
// ============================================

import { supabase } from '@/lib/supabaseServer';
import Footer from './Footer';
import { unstable_noStore as noStore } from 'next/cache';

// Deshabilitar cache para que siempre obtenga datos frescos
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FooterWrapper() {
  // Forzar que no se cachee esta función
  noStore();
  // Obtener datos de configuración desde la base de datos
  let contactEmail = 'contacto@mercadito-online-py.com';
  let contactPhone = '+595 981 234 567';
  let location = 'Asunción, Paraguay';

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['contact_email', 'contact_phone', 'location']);

    if (error) {
      console.error('[FooterWrapper] Error fetching settings:', error);
    } else if (data && data.length > 0) {
      console.log('[FooterWrapper] Settings data received:', data);
      data.forEach((s: any) => {
        // El valor está almacenado como JSONB
        // Supabase puede devolverlo de diferentes formas:
        // 1. Como string JSON: '"contacto@email.com"'
        // 2. Como string directo: 'contacto@email.com'
        // 3. Ya parseado: 'contacto@email.com'
        let parsedValue = s.value;
        
        // Si es null o undefined, saltar
        if (parsedValue == null) {
          console.log(`[FooterWrapper] Skipping ${s.key}: value is null/undefined`);
          return;
        }
        
        console.log(`[FooterWrapper] Processing ${s.key}:`, { type: typeof parsedValue, value: parsedValue });
        
        // Si es un string, intentar parsearlo como JSON
        if (typeof parsedValue === 'string') {
          // Si el string parece ser un JSON string (empieza y termina con comillas)
          if (parsedValue.startsWith('"') && parsedValue.endsWith('"')) {
            try {
              parsedValue = JSON.parse(parsedValue);
              console.log(`[FooterWrapper] Parsed ${s.key} from JSON string:`, parsedValue);
            } catch {
              // Si falla, quitar las comillas manualmente
              parsedValue = parsedValue.slice(1, -1);
              console.log(`[FooterWrapper] Manually removed quotes from ${s.key}:`, parsedValue);
            }
          }
          // Si no tiene comillas, usar el valor directamente
        }
        
        // Asignar el valor parseado según la clave
        if (s.key === 'contact_email' && typeof parsedValue === 'string' && parsedValue.trim()) {
          contactEmail = parsedValue.trim();
          console.log(`[FooterWrapper] Set contactEmail to:`, contactEmail);
        } else if (s.key === 'contact_phone' && typeof parsedValue === 'string' && parsedValue.trim()) {
          contactPhone = parsedValue.trim();
          console.log(`[FooterWrapper] Set contactPhone to:`, contactPhone);
        } else if (s.key === 'location' && typeof parsedValue === 'string' && parsedValue.trim()) {
          location = parsedValue.trim();
          console.log(`[FooterWrapper] Set location to:`, location);
        }
      });
    } else {
      console.log('[FooterWrapper] No settings data found, using defaults');
    }
  } catch (error) {
    // Si hay error, usar valores por defecto
    console.error('Error loading footer settings:', error);
  }

  return (
    <Footer 
      contactEmail={contactEmail}
      contactPhone={contactPhone}
      location={location}
    />
  );
}

