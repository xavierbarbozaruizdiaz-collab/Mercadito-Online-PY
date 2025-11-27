// ============================================
// MERCADITO ONLINE PY - ANALYTICS PROVIDER
// Provider para tracking de page views vía GTM dataLayer
// ============================================
// GTM es la única fuente de verdad.
// Este provider solo trackea page views vía track() de dataLayer.ts.
// GTM maneja GA4, Facebook Pixel, y otros servicios.

'use client';

import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageview } from '@/lib/tracking/dataLayer';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

// Componente interno que usa useSearchParams
function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views vía GTM (dataLayer) - GTM maneja GA4 y Facebook Pixel
  useEffect(() => {
    // Trackear solo vía track() de dataLayer.ts
    // GTM captura este evento y lo distribuye a GA4, Facebook Pixel, etc.
    trackPageview(pathname, {
      page_path: pathname,
      page_title: typeof document !== 'undefined' ? document.title : '',
    });
  }, [pathname, searchParams]);

  return null;
}

// Componente principal con Suspense
export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  return (
    <>
      <Suspense fallback={null}>
        <AnalyticsTracker />
      </Suspense>
      {children}
    </>
  );
}
                 