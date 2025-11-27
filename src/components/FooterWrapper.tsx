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

    if (!error && data && data.length > 0) {
      data.forEach((s: any) => {
        // El valor está almacenado como JSONB
        // Supabase puede devolverlo como string JSON o ya parseado
        let parsedValue = s.value;
        
        // Si es un string, intentar parsearlo
        if (typeof s.value === 'string') {
          try {
            // Si es un JSON string (ej: "contacto@email.com"), parsearlo
            parsedValue = JSON.parse(s.value);
          } catch {
            // Si no es JSON válido, usar el valor directamente
            parsedValue = s.value;
          }
        }
        
        // Asignar el valor parseado según la clave
        if (s.key === 'contact_email' && typeof parsedValue === 'string') {
          contactEmail = parsedValue;
        } else if (s.key === 'contact_phone' && typeof parsedValue === 'string') {
          contactPhone = parsedValue;
        } else if (s.key === 'location' && typeof parsedValue === 'string') {
          location = parsedValue;
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

