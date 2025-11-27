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
        settings[s.key] = s.value;
      });

      if (settings.contact_email) {
        contactEmail = settings.contact_email;
      }
      if (settings.contact_phone) {
        contactPhone = settings.contact_phone;
      }
      if (settings.location) {
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

