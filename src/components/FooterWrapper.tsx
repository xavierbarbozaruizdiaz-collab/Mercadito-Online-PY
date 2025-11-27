// ============================================
// MERCADITO ONLINE PY - FOOTER WRAPPER
// Componente de servidor que obtiene los datos de configuración
// y los pasa al Footer
// ============================================

import { supabase } from '@/lib/supabaseServer';
import Footer from './Footer';

export default async function FooterWrapper() {
  // Obtener datos de configuración desde la base de datos
  let contactEmail = 'contacto@mercadito-online-py.com';
  let contactPhone = '+595 981 234 567';
  let location = 'Asunción, Paraguay';

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('key, value')
      .in('key', ['contact_email', 'contact_phone', 'location']);

    if (!error && data) {
      const settings: Record<string, any> = {};
      data.forEach((s: any) => {
        // El valor está almacenado como JSONB, puede ser string, number, array, etc.
        // Si es un string JSON (con comillas), parsearlo
        let parsedValue = s.value;
        if (typeof s.value === 'string' && s.value.startsWith('"') && s.value.endsWith('"')) {
          try {
            parsedValue = JSON.parse(s.value);
          } catch {
            // Si falla el parse, usar el valor original
            parsedValue = s.value;
          }
        }
        settings[s.key] = parsedValue;
      });

      if (settings.contact_email && typeof settings.contact_email === 'string') {
        contactEmail = settings.contact_email;
      }
      if (settings.contact_phone && typeof settings.contact_phone === 'string') {
        contactPhone = settings.contact_phone;
      }
      if (settings.location && typeof settings.location === 'string') {
        location = settings.location;
      }
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

