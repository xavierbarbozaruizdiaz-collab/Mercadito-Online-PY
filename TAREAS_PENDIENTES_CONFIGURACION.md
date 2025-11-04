# 📋 TAREAS PENDIENTES - CONFIGURACIÓN EXTERNA

## ⚠️ IMPORTANTE: Estas tareas requieren configuración en plataformas externas

---

## 1. 🔵 META BUSINESS API

### Configuración necesaria:
- [ ] Crear aplicación en [Meta Developers](https://developers.facebook.com/)
- [ ] Configurar Meta Business Manager
- [ ] Obtener `META_APP_ID` y `META_APP_SECRET`
- [ ] Generar Access Token con permisos:
  - `ads_read`
  - `ads_management`
  - `business_management`
  - `catalog_management`
  - `pages_read_engagement`
- [ ] Obtener `META_BUSINESS_ID`
- [ ] Obtener `META_AD_ACCOUNT_ID`
- [ ] Crear Facebook Pixel y obtener `META_PIXEL_ID` (o `NEXT_PUBLIC_FACEBOOK_PIXEL_ID`)
- [ ] Configurar Commerce Account en Meta Business
- [ ] Crear Catálogo de Productos y obtener `META_CATALOG_ID`

### URLs de configuración:
- Meta Developers: https://developers.facebook.com/
- Meta Business Manager: https://business.facebook.com/
- Documentación API: https://developers.facebook.com/docs/marketing-apis

---

## 2. 📱 WHATSAPP CLOUD API

### Configuración necesaria:
- [ ] Solicitar acceso a WhatsApp Cloud API en Meta Business
- [ ] Configurar número de teléfono de WhatsApp Business
- [ ] Obtener `WHATSAPP_CLOUD_PHONE_NUMBER_ID`
- [ ] Generar Access Token y obtener `WHATSAPP_CLOUD_API_TOKEN`
- [ ] Obtener `WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID`
- [ ] Crear `WHATSAPP_CLOUD_VERIFY_TOKEN` (para webhook)
- [ ] Configurar webhook en Meta Developers:
  - URL: `https://mercaditopy.com/api/webhooks/whatsapp`
  - Verificar token
- [ ] Crear plantillas de mensajes en Meta Business (requieren aprobación):
  - `order_confirmation`
  - `order_shipped`
  - `order_delivered`
  - `auction_ending`
  - `raffle_winner`
  - `payment_reminder`

### URLs de configuración:
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api
- Meta Business Manager: https://business.facebook.com/

---

## 3. 🔍 GOOGLE SEARCH CONSOLE

### Configuración necesaria:
- [ ] Crear proyecto en [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Habilitar Google Search Console API
- [ ] Configurar OAuth 2.0 credentials
- [ ] Obtener `GOOGLE_SEARCH_CONSOLE_CLIENT_ID`
- [ ] Obtener `GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET`
- [ ] Generar Refresh Token
- [ ] Verificar propiedad del sitio en [Google Search Console](https://search.google.com/search-console)
- [ ] Agregar `GOOGLE_SEARCH_CONSOLE_SITE_URL`
- [ ] Enviar sitemap: `https://mercaditopy.com/sitemap.xml`

### URLs de configuración:
- Google Cloud Console: https://console.cloud.google.com/
- Google Search Console: https://search.google.com/search-console
- Documentación API: https://developers.google.com/webmaster-tools

---

## 4. 📊 GOOGLE ANALYTICS 4

### Configuración necesaria:
- [ ] Crear propiedad en [Google Analytics](https://analytics.google.com/)
- [ ] Obtener Measurement ID (formato: `G-XXXXXXXXXX`)
- [ ] Configurar `NEXT_PUBLIC_GA_ID` en variables de entorno
- [ ] Configurar eventos de conversión
- [ ] Configurar objetivos de ecommerce
- [ ] Conectar con Google Ads (opcional)

### URLs de configuración:
- Google Analytics: https://analytics.google.com/
- Documentación GA4: https://developers.google.com/analytics/devguides/collection/ga4

---

## 5. 🏷️ GOOGLE TAG MANAGER

### Configuración necesaria:
- [ ] Crear cuenta en [Google Tag Manager](https://tagmanager.google.com/)
- [ ] Crear contenedor
- [ ] Obtener Container ID (formato: `GTM-XXXXXXX`)
- [ ] Configurar `NEXT_PUBLIC_GTM_ID` en variables de entorno
- [ ] Configurar tags en GTM:
  - Facebook Pixel
  - Google Analytics 4
  - Conversiones
  - Eventos personalizados

### URLs de configuración:
- Google Tag Manager: https://tagmanager.google.com/
- Documentación: https://developers.google.com/tag-manager

---

## 6. 🎵 TIKTOK SHOP

### Configuración necesaria:
- [ ] Crear cuenta de desarrollador en [TikTok Developers](https://developers.tiktok.com/)
- [ ] Crear aplicación
- [ ] Obtener `TIKTOK_SHOP_APP_KEY` y `TIKTOK_SHOP_APP_SECRET`
- [ ] Configurar OAuth y obtener Access Token
- [ ] Crear tienda en TikTok Shop
- [ ] Obtener `TIKTOK_SHOP_SHOP_ID`
- [ ] Configurar webhook para pedidos:
  - URL: `https://mercaditopy.com/api/webhooks/tiktok/orders`
- [ ] Sincronizar catálogo de productos

### URLs de configuración:
- TikTok Developers: https://developers.tiktok.com/
- TikTok Shop: https://shop.tiktok.com/

---

## 7. 📈 POSTHOG O PLAUSIBLE

### Opción A: PostHog
- [ ] Crear cuenta en [PostHog](https://posthog.com/)
- [ ] Obtener Project API Key
- [ ] Configurar `NEXT_PUBLIC_POSTHOG_KEY`
- [ ] Configurar `NEXT_PUBLIC_POSTHOG_HOST`

### Opción B: Plausible
- [ ] Crear cuenta en [Plausible](https://plausible.io/)
- [ ] Agregar dominio
- [ ] Configurar `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`
- [ ] Obtener API Key y configurar `NEXT_PUBLIC_PLAUSIBLE_API_KEY`

### URLs de configuración:
- PostHog: https://posthog.com/
- Plausible: https://plausible.io/

---

## 8. 🔄 WEBHOOKS

### Configuración necesaria:
- [ ] Configurar webhook de WhatsApp en Meta Developers
  - URL: `https://mercaditopy.com/api/webhooks/whatsapp`
  - Verificar token
- [ ] Configurar webhook de TikTok Shop
  - URL: `https://mercaditopy.com/api/webhooks/tiktok/orders`
- [ ] Configurar webhook de Meta (para actualizaciones de campañas)
  - URL: `https://mercaditopy.com/api/webhooks/meta`

### Requisitos:
- Certificado SSL válido (HTTPS)
- Endpoints públicos accesibles
- Verificación de tokens

---

## 9. 📝 VARIABLES DE ENTORNO

### Agregar en Vercel/Producción:

```env
# Meta Business API
META_APP_ID=tu_app_id
META_APP_SECRET=tu_app_secret
META_ACCESS_TOKEN=tu_access_token
META_BUSINESS_ID=tu_business_id
META_AD_ACCOUNT_ID=tu_ad_account_id
META_CATALOG_ID=tu_catalog_id

# Facebook Pixel
NEXT_PUBLIC_FACEBOOK_PIXEL_ID=tu_pixel_id

# WhatsApp Cloud API
WHATSAPP_CLOUD_PHONE_NUMBER_ID=tu_phone_number_id
WHATSAPP_CLOUD_API_TOKEN=tu_api_token
WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID=tu_business_account_id
WHATSAPP_CLOUD_VERIFY_TOKEN=tu_verify_token

# Google Services
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=tu_client_id
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=tu_client_secret
GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=tu_refresh_token
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://mercaditopy.com

# TikTok Shop
TIKTOK_SHOP_APP_KEY=tu_app_key
TIKTOK_SHOP_APP_SECRET=tu_app_secret
TIKTOK_SHOP_ACCESS_TOKEN=tu_access_token
TIKTOK_SHOP_SHOP_ID=tu_shop_id

# Analytics alternativos
NEXT_PUBLIC_POSTHOG_KEY=tu_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
# O
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=mercaditopy.com
NEXT_PUBLIC_PLAUSIBLE_API_KEY=tu_plausible_api_key
```

---

## 10. ✅ VERIFICACIONES POST-CONFIGURACIÓN

### Después de configurar cada servicio:

- [ ] **Facebook Pixel:**
  - [ ] Verificar que se carga en página
  - [ ] Verificar eventos en Facebook Events Manager
  - [ ] Probar eventos de prueba

- [ ] **Google Analytics:**
  - [ ] Verificar que se carga en página
  - [ ] Verificar eventos en tiempo real
  - [ ] Configurar vistas y filtros

- [ ] **Google Tag Manager:**
  - [ ] Verificar que se carga
  - [ ] Probar tags en modo preview
  - [ ] Verificar dataLayer

- [ ] **WhatsApp Cloud API:**
  - [ ] Verificar webhook
  - [ ] Enviar mensaje de prueba
  - [ ] Verificar plantillas aprobadas

- [ ] **Meta Business API:**
  - [ ] Crear campaña de prueba
  - [ ] Verificar métricas
  - [ ] Probar sincronización de catálogo

- [ ] **Sitemap:**
  - [ ] Verificar que `https://mercaditopy.com/sitemap.xml` es accesible
  - [ ] Enviar a Google Search Console
  - [ ] Verificar indexación

---

## 📌 NOTAS IMPORTANTES

1. **Tokens de acceso:**
   - Los tokens de Meta pueden expirar. Necesitarás implementar refresh token.
   - Los tokens de Google también pueden expirar. Implementar OAuth refresh.

2. **Rate Limits:**
   - Meta API tiene límites de rate. Implementar retry logic y queue.
   - Google APIs también tienen límites.

3. **Costos:**
   - Meta Business API: Gratis (pagos por anuncios)
   - WhatsApp Cloud API: Costo por mensaje (ver tarifas)
   - Google APIs: Gratis hasta cierto límite
   - PostHog: Plan gratuito disponible
   - Plausible: Plan gratuito limitado

4. **Seguridad:**
   - Nunca exponer tokens en frontend
   - Guardar todos los tokens en variables de entorno
   - Validar webhooks con tokens de verificación

---

## 🚀 ORDEN RECOMENDADO DE IMPLEMENTACIÓN

1. **Primero:** Google Analytics 4 y Google Tag Manager (más simple)
2. **Segundo:** Facebook Pixel (requiere Meta Business)
3. **Tercero:** Meta Business API completa
4. **Cuarto:** WhatsApp Cloud API
5. **Quinto:** TikTok Shop
6. **Sexto:** PostHog/Plausible (opcional)

---

**Fecha de creación:** 2025-01-30
**Última actualización:** 2025-01-30

