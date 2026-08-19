// ============================================
// MERCADITO ONLINE PY - HEADER WRAPPER
// Componente de servidor que obtiene los datos de configuración
// y los pasa al Header
// ============================================

import { getSiteSettings } from '@/lib/services/siteSettingsServer';
import { Header } from './Header';
import { unstable_noStore as noStore } from 'next/cache';

// Deshabilitar cache para que siempre obtenga datos frescos
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HeaderWrapper() {
  // Forzar que no se cachee esta función
  noStore();
  
  // Obtener datos de configuración desde la base de datos usando la función centralizada
  const settings = await getSiteSettings();

  return <Header siteName={settings.siteName} />;
}


















