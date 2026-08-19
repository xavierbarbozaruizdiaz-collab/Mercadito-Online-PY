// ============================================
// MERCADITO ONLINE PY - FOOTER WRAPPER
// Componente de servidor que obtiene los datos de configuración
// y los pasa al Footer
// ============================================

import { getSiteSettings } from '@/lib/services/siteSettingsServer';
import Footer from './Footer';
import { unstable_noStore as noStore } from 'next/cache';

// Deshabilitar cache para que siempre obtenga datos frescos
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function FooterWrapper() {
  // Forzar que no se cachee esta función
  noStore();
  
  // Obtener datos de configuración desde la base de datos usando la función centralizada
  const settings = await getSiteSettings();

  return (
    <Footer 
      siteName={settings.siteName}
      contactEmail={settings.contactEmail}
      contactPhone={settings.contactPhone}
      location={settings.location}
    />
  );
}


