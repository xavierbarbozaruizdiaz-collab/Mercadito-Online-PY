# QA_RESULT_PR17

## Resumen de verificación
- Rama: `fix/gtm-minimal-icons-wa`
- PR: #17
- Fecha: 2025-11-06

## Build
- `npm run build` → ✅ (solo warnings conocidos de prisma/opentelemetry)

## Inspecciones en repo
```
$ git grep -n "googletagmanager.com" src
src/app/layout.tsx:130:          src={`https://www.googletagmanager.com/gtm.js?id=${process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-PQ8Q6JGW'}`}
src/app/layout.tsx:171:            src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID ?? 'GTM-PQ8Q6JGW'}`}
```
```
$ git grep -n "gtag.js" src
src/components/AnalyticsProvider.tsx:28:      // Solo usar gtag si ya existe (de GTM), nunca cargar gtag.js directamente
src/lib/services/googleAnalyticsService.ts:34:   * NOTA: NO carga gtag.js directamente. Solo usa gtag si ya existe (cargado por GTM).
src/lib/services/googleAnalyticsService.ts:44:      return; // Usar la instancia de GTM, NO cargar gtag.js directamente
```
```
$ git grep -n "dataLayer" src/app/layout.tsx
src/app/layout.tsx:122:            window.dataLayer = window.dataLayer || [];
src/app/layout.tsx:123:            window.dataLayer.push({'gtm.start': new Date().getTime(), event: 'gtm.js'});
```
```
$ git grep -n "formatPhoneForWhatsApp" src
src/app/(marketplace)/seller/[id]/page.tsx:329:    const formattedPhone = formatPhoneForWhatsApp(profile.phone);
src/app/(marketplace)/store/[slug]/page.tsx:407:    const wa = formatPhoneForWhatsApp(store?.contact_phone ?? null);
src/app/api/whatsapp/notify-seller/route.ts:114:    const formattedPhone = formatPhoneForWhatsApp(sellerPhone);
```

## QA automatizada (scripts/qa-tracking.mjs)
```
$ node scripts/qa-tracking.mjs --base="https://mercadito-online-py-git-fix-gtm-minimal-icons-wa-barboza.vercel.app"
{
  "base": "https://mercadito-online-py-git-fix-gtm-minimal-icons-wa-barboza.vercel.app",
  "rootStatus": 401,
  "containsGtmScript": false,
  "containsGtmIframe": false,
  "containsGtmId": false,
  "containsGtagJs": false,
  "icons": [
    { "path": "/icons/favicon-16x16.png", "status": 401, "ok": false },
    { "path": "/icons/favicon-32x32.png", "status": 401, "ok": false },
    { "path": "/icons/icon-96x96.png", "status": 401, "ok": false }
  ],
  "manifestStatus": 401,
  "manifestIcons": null,
  "whatsApp": [
    { "input": "0981988714", "output": "https://wa.me/595981988714" },
    { "input": "981988714", "output": "https://wa.me/595981988714" },
    { "input": "+595981988714", "output": "https://wa.me/595981988714" },
    { "input": "098198871", "output": null }
  ]
}
```
- El preview responde **401 (Unauthorized)** para `/`, `/icons/*` y `/manifest.webmanifest`; no se pudo validar la presencia del snippet en HTML ni el estado HTTP de los iconos. Probablemente causado por el Firewall 24h activo en el proyecto Vercel.

## Hallazgos
1. ❌ **WhatsApp duplicado (regresión funcional)**
   - `src/app/(marketplace)/seller/[id]/page.tsx` y `src/app/api/whatsapp/notify-seller/route.ts` siguen esperando que `formatPhoneForWhatsApp` retorne solo dígitos, por lo que generan URLs del tipo `https://wa.me/https://wa.me/<...>`. Impacto: botón y notificaciones no funcionan.
2. ⚠️ **Validaciones en preview bloqueadas por 401**
   - No se pudo comprobar automáticamente la entrega de iconos ni del manifest debido al Firewall; se requiere desactivar temporalmente la protección o facilitar credenciales para concluir la revisión.

## Conclusión
**FAIL** — No mergeado. Se requieren ajustes:
- Actualizar los consumidores de `formatPhoneForWhatsApp` que aún agregan manualmente `https://wa.me/`.
- Facilitar acceso al preview (o desactivar firewall) para confirmar íconos/manifest y snippet GTM.
