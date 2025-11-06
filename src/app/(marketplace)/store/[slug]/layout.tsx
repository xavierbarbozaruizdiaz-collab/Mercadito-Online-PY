// ============================================
// STORE LAYOUT - MARKETING SCRIPTS INJECTION
// Inyecta scripts de tracking específicos de la tienda
// ============================================

import { Metadata } from 'next';
import Script from 'next/script';
import { getTrackingIdsForStore } from '@/lib/marketing/getTrackingIdsForStore';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: StoreLayoutProps): Promise<Metadata> {
  // Metadata básica, puede mejorarse después
  return {
    title: 'Tienda',
  };
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  // Feature flag check
  const featureEnabled = process.env.NEXT_PUBLIC_FEATURE_MARKETING === '1';
  
  if (!featureEnabled) {
    return <>{children}</>;
  }

  // Obtener params
  const { slug } = await params;
  
  // Obtener IDs de tracking para esta tienda
  const trackingIds = await getTrackingIdsForStore(slug);
  const globalGTMId = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-PQ8Q6JGW';

  // Determinar qué scripts cargar
  const hasPixel = !!trackingIds.pixelId;
  // Tracking centralizado en layout raíz (GTM global). No cargar GTM/GA aquí para evitar duplicados.
  // Si la tienda tiene gtmId y coincide con el global, NO inyectar nada nuevo (ya está en layout raíz)
  // const hasGA = !!trackingIds.gaId; // Deshabilitado: GA debe cargarse vía GTM en layout raíz
  // const hasGTM = !!trackingIds.gtmId && trackingIds.gtmId !== globalGTMId; // Solo si es diferente del global (pero NO inyectar)

  // IDs globales (para multi-pixel)
  const globalPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const hasGlobalPixel = !!globalPixelId;

  return (
    <>

      {/* Facebook Pixel - Global (si existe) */}
      {hasGlobalPixel && (
        <>
          <Script
            id="fb-pixel-global"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${globalPixelId}');
                fbq('track', 'PageView');
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${globalPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* Facebook Pixel - Store (si existe y es diferente del global) */}
      {hasPixel && trackingIds.pixelId !== globalPixelId && (
        <>
          <Script
            id="fb-pixel-store"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                if(typeof fbq !== 'undefined') {
                  fbq('init', '${trackingIds.pixelId}', {}, 'store');
                  fbq('track', 'PageView', {}, 'store');
                } else {
                  !function(f,b,e,v,n,t,s)
                  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                  n.queue=[];t=b.createElement(e);t.async=!0;
                  t.src=v;s=b.getElementsByTagName(e)[0];
                  s.parentNode.insertBefore(t,s)}(window, document,'script',
                  'https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init', '${trackingIds.pixelId}', {}, 'store');
                  fbq('track', 'PageView', {}, 'store');
                }
              `,
            }}
          />
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: 'none' }}
              src={`https://www.facebook.com/tr?id=${trackingIds.pixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {children}
    </>
  );
}

