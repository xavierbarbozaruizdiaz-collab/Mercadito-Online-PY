# DIAGNOSTICO_FINAL

## Resumen ejecutivo
- **P0**: Automatizaciones de QA remotas siguen bloqueadas (401 Unauthorized) porque el preview protegido no acepta requests sin header de bypass; esto impide validar GTM, íconos y manifest en staging.
- **P1**: Documentación y componentes enlazan a `/products` sin una landing garantizada; al habilitar catálogos se debería controlar con feature flag o verificación de API para evitar experiencias 404.

## GTM / dataLayer
- El layout raíz inicializa `window.dataLayer` con `beforeInteractive`, carga un único script GTM con `afterInteractive`, y mantiene el `<noscript>` con el mismo ID en el `<body>`. ```119:175:src/app/layout.tsx
        <Script id="gtm-dl" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
          `}
        </Script>

        <Script
          id="gtm-src"
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtm.js?id=${process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-PQ8Q6JGW'}`}
        />
...
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-PQ8Q6JGW'}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
```
- El layout de tiendas solo inyecta Facebook Pixel por tienda; no agrega GTM/GA adicionales. ```22:114:src/app/(marketplace)/store/[slug]/layout.tsx
      {hasGlobalPixel && (
        <>
          <Script id="fb-pixel-global" ... />
...
      {storePixelIsDifferent && (
        <>
          <Script id="fb-pixel-store" ... />
```
- `git grep -n "googletagmanager.com"` confirma que fuera de documentación/scripts solo `src/app/layout.tsx` contiene el dominio, por lo que el riesgo de duplicado es bajo. Con el guardia de `window.dataLayer`, el error *Cannot set properties of undefined (setting 'l')* queda mitigado.

## Íconos / manifest / layout
- El directorio `public/icons/` contiene los PNG requeridos (16x16, 32x32, 96x96) junto con tamaños mayores (listado verificado vía `list_dir`).
- El manifest referencia favicon-16, favicon-32 e icon-96 y conserva íconos maskable. ```22:84:src/app/manifest.ts
    icons: [
      {
        src: '/icons/icon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
      },
      {
        src: '/icons/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        src: '/icons/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
      {
        src: '/icons/icon-72x72.png',
        sizes: '72x72',
        type: 'image/png',
        purpose: 'maskable',
      },
      ...
```
- El layout añade `<link rel="icon">` para 16x16 y 32x32. ```133:134:src/app/layout.tsx
<link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
```

## Referencias a `/products`
- Se añade la bandera `NEXT_PUBLIC_ENABLE_PRODUCTS_API` para evitar rutas inexistentes: ```12:17:src/components/CategoryButtons.tsx
  const enableProductsApi = process.env.NEXT_PUBLIC_ENABLE_PRODUCTS_API === 'true';
  const vitrinaHref = enableProductsApi ? '/products?showcase=true' : '/vitrina';
```
- El Footer ahora reutiliza la misma bandera para apuntar a `/vitrina` cuando la API está deshabilitada: ```12:20:src/components/Footer.tsx
  const enableProductsApi = process.env.NEXT_PUBLIC_ENABLE_PRODUCTS_API === 'true';
  const productsHref = enableProductsApi ? '/products' : '/vitrina';
```
- Las categorías destacadas también emplean la bandera antes de generar enlaces dinámicos: ```20:104:src/components/FeaturedCategories.tsx
            const categoryHref = enableProductsApi ? `/products?category=${category.id}` : '/vitrina';
```

## Middleware
- El matcher actual excluye `_next/`, `icons/`, `favicon.ico`, `manifest.webmanifest`, `robots.txt`, `sitemap.xml`, `images/` y `api/`, alineado con lo requerido. ```113:118:src/middleware.ts
export const config = {
  matcher: [
    '/((?!_next/|icons/|favicon.ico|manifest.webmanifest|robots.txt|sitemap.xml|images/|api/).*)',
  ],
};
```

## CSP
- La política incluye dominios de GTM, GA, Facebook y ahora `https://vercel.live` en las directivas relevantes. ```73:84:next.config.ts
"script-src 'self' 'unsafe-inline' 'unsafe-eval' ... https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net"
"img-src 'self' data: https: blob: https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net"
"connect-src 'self' ... https://www.google-analytics.com https://region1.google-analytics.com"
"frame-src 'self' https://www.googletagmanager.com https://connect.facebook.net https://vercel.live"
```


## Salida del script
```
$ node scripts/diagnostico-tracking.mjs
ICONS_MISSING: NONE
PRODUCTS_REFS: src/components/Footer.tsx
```

## Plan de fix (sugerido)
1. **P0 – QA remota**: Obtener y aplicar el header `x-vercel-protection-bypass` (automation bypass) en `scripts/qa-tracking.mjs`/CI para validar previews protegidos sin desactivar el firewall.
2. **P1 – CSP preview**: Incluir `https://vercel.live` en `frame-src` dentro de la CSP para que el overlay de preview funcione tras el bypass.
3. **P1 – Landing `/products`**: Mapear los puntos que enlazan a `/products` y preparar una bandera (`NEXT_PUBLIC_ENABLE_PRODUCTS_API`) antes de exponer catálogos públicos, evitando 404 si la API está deshabilitada.

## Cierre P0/P1
- **CSP**: Actualizado `frame-src` para permitir `https://vercel.live` junto con GTM y Facebook. ```73:84:next.config.ts
"frame-src 'self' https://www.googletagmanager.com https://connect.facebook.net https://vercel.live"
```
- **Guardas `/products`**: Footer, CategoryButtons y FeaturedCategories ahora dependen de `NEXT_PUBLIC_ENABLE_PRODUCTS_API` antes de generar enlaces; cuando la bandera es `false`, apuntan a `/vitrina` sin modificar el layout. ```12:20:src/components/Footer.tsx```, ```12:18:src/components/CategoryButtons.tsx```, ```20:104:src/components/FeaturedCategories.tsx```.
- **QA automática**:
  - `npm run qa:preview` (sin header) →
    ```
    QA_PREVIEW_RESULTS
    / -> 401 FAIL
    /manifest.webmanifest -> 401 FAIL
    /icons/favicon-16x16.png -> 401 FAIL
    /icons/favicon-32x32.png -> 401 FAIL
    /icons/icon-96x96.png -> 401 FAIL
    ```
    *(Pendiente ejecutar con `x-vercel-protection-bypass` cuando esté disponible).* 
  - `node scripts/qa-tracking.mjs --base="https://mercadito-online-py-git-fix-gtm-minimal-icons-wa-barboza.vercel.app"` →
    ```
    {
      "rootStatus": 401,
      "icons": [{"status": 401}, ...],
      "manifestStatus": 401,
      "whatsApp": [
        {"input": "0981988714", "output": "https://wa.me/595981988714"},
        {"input": "981988714", "output": "https://wa.me/595981988714"},
        {"input": "+595981988714", "output": "https://wa.me/595981988714"},
        {"input": "098198871", "output": null }
      ]
    }
    ```
