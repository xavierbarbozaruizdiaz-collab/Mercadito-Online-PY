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
      data.forEach((s: any) => {
        // Función helper para parsear valores JSONB
        const parseValue = (val: any): string | null => {
          if (val == null) return null;
          if (typeof val !== 'string') return String(val);
          
          // Si es un string JSON con comillas, parsearlo
          if (val.startsWith('"') && val.endsWith('"')) {
            try {
              return JSON.parse(val);
            } catch {
              // Si falla, quitar las comillas manualmente
              return val.slice(1, -1);
            }
          }
          return val;
        };
        
        const parsedValue = parseValue(s.value);
        
        // Asignar el valor parseado según la clave
        if (s.key === 'contact_email' && parsedValue && typeof parsedValue === 'string') {
          contactEmail = parsedValue.trim();
        } else if (s.key === 'contact_phone' && parsedValue && typeof parsedValue === 'string') {
          contactPhone = parsedValue.trim();
        } else if (s.key === 'location' && parsedValue && typeof parsedValue === 'string') {
          location = parsedValue.trim();
        }
      });
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


