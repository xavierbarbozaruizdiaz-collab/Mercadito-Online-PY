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

  // Determinar qué scripts cargar
  const hasGA = !!trackingIds.gaId;
  const hasPixel = !!trackingIds.pixelId;
  const hasGTM = !!trackingIds.gtmId;

  // IDs globales (para multi-pixel)
  const globalPixelId = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID;
  const hasGlobalPixel = !!globalPixelId;

  return (
    <>
      {/* Google Analytics 4 */}
      {hasGA && (
        <>
          <Script
            id={`ga-${trackingIds.gaId}`}
            src={`https://www.googletagmanager.com/gtag/js?id=${trackingIds.gaId}`}
            strategy="afterInteractive"
          />
          <Script
            id={`ga-init-${trackingIds.gaId}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${trackingIds.gaId}', {
                  page_path: window.location.pathname,
                  send_page_view: true
                });
              `,
            }}
          />
        </>
      )}

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

      {/* Google Tag Manager */}
      {hasGTM && (
        <>
          <Script
            id={`gtm-${trackingIds.gtmId}`}
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${trackingIds.gtmId}');
              `,
            }}
          />
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${trackingIds.gtmId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        </>
      )}

      {children}
    </>
  );
}

