# 📊 PLAN DE IMPLEMENTACIÓN - MARKETING Y CRECIMIENTO
## Mercadito Online PY

---

## 📋 RESUMEN EJECUTIVO

Este plan detalla la implementación completa de:
1. **Publicidad centralizada e individual** (Meta Business)
2. **Integraciones de redes sociales** (Meta, TikTok)
3. **SEO y posicionamiento** (Google Search Console, Analytics, GTM)
4. **Mensajería y notificaciones** (WhatsApp Cloud API, Email Marketing)
5. **Análisis de datos** (PostHog/Plausible, Analytics por tienda)

---

## 🎯 1. PUBLICIDAD CENTRALIZADA E INDIVIDUAL

### 1.1 Meta Business API - Configuración Base

**Objetivo:** Administrar campañas desde cuenta principal de Meta Business

**Implementación necesaria:**

#### A. Configuración de Meta Business API
- [ ] Crear aplicación en Meta Developers
- [ ] Configurar Meta Business Manager
- [ ] Obtener tokens de acceso (Access Tokens)
- [ ] Configurar permisos necesarios:
  - `ads_read`
  - `ads_management`
  - `business_management`
  - `catalog_management`
  - `pages_read_engagement`

#### B. Servicio de Meta Business (`src/lib/services/metaBusinessService.ts`)
```typescript
// Funcionalidades a implementar:
- createCampaign() // Crear campaña desde el dashboard
- updateCampaign() // Actualizar campaña existente
- getCampaigns() // Listar todas las campañas
- getCampaignMetrics() // Obtener métricas de campaña
- createAdSet() // Crear conjunto de anuncios
- createAdCreative() // Crear creativo de anuncio
- getAdAccounts() // Obtener cuentas de anuncios
```

#### C. Tipos de Campañas
1. **Campañas generales** (desde cuenta principal):
   - "Tiendas destacadas"
   - "Subastas activas"
   - "Ofertas locales"
   - Tráfico dirigido a `mercaditopy.com`

2. **Campañas individuales** (por tienda):
   - Presupuesto propio de la tienda
   - Segmentación a productos específicos
   - Métricas individuales

#### D. Base de datos
```sql
-- Tabla: marketing_campaigns
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  campaign_type VARCHAR(50) NOT NULL, -- 'general' | 'individual'
  meta_campaign_id VARCHAR(255), -- ID de la campaña en Meta
  name VARCHAR(255) NOT NULL,
  objective VARCHAR(50), -- 'traffic', 'conversions', 'engagement'
  budget_amount DECIMAL(10,2),
  budget_type VARCHAR(20), -- 'daily' | 'lifetime'
  status VARCHAR(20) DEFAULT 'draft', -- 'draft' | 'active' | 'paused' | 'archived'
  target_url TEXT NOT NULL, -- Siempre mercaditopy.com
  ad_set_id VARCHAR(255),
  creative_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Tabla: campaign_metrics
CREATE TABLE campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr DECIMAL(5,4), -- Click-through rate
  cpc DECIMAL(10,4), -- Cost per click
  cpm DECIMAL(10,4), -- Cost per mille
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- Tabla: campaign_targeting
CREATE TABLE campaign_targeting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  age_min INTEGER,
  age_max INTEGER,
  genders JSONB, -- ['male', 'female']
  locations JSONB, -- ['Asunción', 'Ciudad del Este']
  interests JSONB, -- ['shopping', 'ecommerce']
  behaviors JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### E. API Routes
```typescript
// src/app/api/marketing/campaigns/route.ts
- GET /api/marketing/campaigns (listar todas)
- POST /api/marketing/campaigns (crear nueva)
- GET /api/marketing/campaigns/[id] (detalles)
- PATCH /api/marketing/campaigns/[id] (actualizar)
- DELETE /api/marketing/campaigns/[id] (eliminar)
- GET /api/marketing/campaigns/[id]/metrics (métricas)

// src/app/api/marketing/campaigns/store/[storeId]/route.ts
- GET /api/marketing/campaigns/store/[storeId] (campañas de una tienda)
- POST /api/marketing/campaigns/store/[storeId] (crear campaña para tienda)
```

#### F. Componentes UI
```typescript
// src/components/marketing/CampaignManager.tsx
- Lista de campañas
- Formulario de creación/edición
- Filtros por tipo (general/individual)
- Métricas en tiempo real

// src/components/marketing/CampaignMetrics.tsx
- Gráficos de rendimiento
- Comparación de métricas
- Exportar datos

// src/app/dashboard/marketing/page.tsx
- Dashboard principal de marketing
- Acceso a campañas generales e individuales
```

#### G. Variables de entorno
```env
# Meta Business API
META_APP_ID=your_app_id
META_APP_SECRET=your_app_secret
META_ACCESS_TOKEN=your_access_token
META_BUSINESS_ID=your_business_id
META_AD_ACCOUNT_ID=your_ad_account_id
META_PIXEL_ID=your_pixel_id
```

---

### 1.2 Facebook Pixel - Implementación Completa

**Objetivo:** Tracking de conversiones y optimización de anuncios

**Implementación necesaria:**

#### A. Facebook Pixel SDK
```typescript
// src/lib/services/facebookPixelService.ts
- initialize() // Inicializar pixel
- trackPageView() // Vista de página
- trackViewContent(product) // Vista de producto
- trackAddToCart(product) // Agregar al carrito
- trackInitiateCheckout() // Iniciar checkout
- trackPurchase(order) // Compra completada
- trackSearch(query) // Búsqueda
- trackLead() // Lead generado
```

#### B. Integración en componentes
```typescript
// src/app/layout.tsx - Agregar script de Facebook Pixel
// src/components/ProductsListClient.tsx - Track product views
// src/app/checkout/page.tsx - Track purchase events
// src/components/Cart.tsx - Track add to cart
```

#### C. Eventos personalizados
- `StoreView` - Vista de tienda
- `AuctionView` - Vista de subasta
- `RaffleParticipate` - Participación en sorteo
- `StoreFollow` - Seguir tienda

---

## 🌐 2. REDES SOCIALES - INTEGRACIONES

### 2.1 Catálogo Global de Productos

**Objetivo:** Sincronizar productos con Meta y TikTok para mostrar en tiendas sociales

**Implementación necesaria:**

#### A. Servicio de Catálogo (`src/lib/services/productCatalogService.ts`)
```typescript
// Sincronización con Meta Commerce
- syncProductsToMeta() // Sincronizar productos a Meta Catalog
- updateProductInMeta() // Actualizar producto individual
- deleteProductFromMeta() // Eliminar producto
- syncProductsToTikTok() // Sincronizar a TikTok Shop
- getCatalogStatus() // Estado de sincronización
```

#### B. Formato de Catálogo (Meta Commerce)
```json
{
  "retailer_id": "product_id",
  "name": "Título del producto",
  "description": "Descripción",
  "availability": "in stock",
  "condition": "new",
  "price": "50000 PYG",
  "currency": "PYG",
  "image_url": "https://...",
  "category": "Electronics",
  "brand": "Marca",
  "url": "https://mercaditopy.com/products/{id}",
  "store": {
    "name": "Nombre de la tienda",
    "url": "https://mercaditopy.com/store/{slug}"
  }
}
```

#### C. Sincronización automática
```typescript
// src/app/api/catalog/sync/route.ts
- POST /api/catalog/sync (sincronización manual)
- GET /api/catalog/status (estado de catálogo)

// Webhook para sincronización automática
// src/app/api/webhooks/product-updated/route.ts
- Cuando se crea/actualiza producto, sincronizar automáticamente
```

#### D. Base de datos
```sql
-- Tabla: product_catalog_sync
CREATE TABLE product_catalog_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'meta', 'tiktok', 'instagram'
  external_id VARCHAR(255), -- ID en la plataforma externa
  sync_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'synced' | 'error'
  last_synced_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, platform)
);
```

---

### 2.2 Facebook/Instagram Shop

**Objetivo:** Activar tienda en Facebook e Instagram

**Implementación necesaria:**

#### A. Configuración de Commerce Account
- Crear Commerce Account en Meta Business
- Configurar tienda física/virtual
- Conectar catálogo de productos
- Configurar políticas de envío y devolución

#### B. API Integration
```typescript
// src/lib/services/metaCommerceService.ts
- createShop() // Crear tienda en Facebook
- connectCatalog() // Conectar catálogo
- getShopStatus() // Estado de la tienda
- updateShopSettings() // Actualizar configuración
```

#### C. Componente de sincronización
```typescript
// src/components/marketing/MetaShopSync.tsx
- Estado de sincronización
- Botón para activar tienda
- Lista de productos sincronizados
```

---

### 2.3 TikTok Shop

**Objetivo:** Integrar con TikTok Shop para ventas

**Implementación necesaria:**

#### A. TikTok Shop API
```typescript
// src/lib/services/tikTokShopService.ts
- authenticate() // Autenticación OAuth
- createProduct() // Crear producto en TikTok
- updateProduct() // Actualizar producto
- syncCatalog() // Sincronizar catálogo completo
- getOrders() // Obtener pedidos de TikTok
```

#### B. Variables de entorno
```env
TIKTOK_SHOP_APP_KEY=your_app_key
TIKTOK_SHOP_APP_SECRET=your_app_secret
TIKTOK_SHOP_ACCESS_TOKEN=your_access_token
TIKTOK_SHOP_SHOP_ID=your_shop_id
```

#### C. Webhook para pedidos
```typescript
// src/app/api/webhooks/tiktok/orders/route.ts
- Recibir notificaciones de pedidos de TikTok
- Crear pedido en sistema interno
- Notificar al vendedor
```

---

## 🔍 3. SEO Y POSICIONAMIENTO

### 3.1 Google Search Console

**Objetivo:** Indexar automáticamente tiendas, productos y subastas

**Implementación necesaria:**

#### A. Sitemap mejorado
```typescript
// src/app/sitemap.ts - MEJORAR
- Agregar todas las tiendas
- Agregar todas las subastas activas
- Agregar categorías
- Prioridades y frecuencias optimizadas
- Sitemap index para grandes volúmenes
```

#### B. Google Search Console API
```typescript
// src/lib/services/googleSearchConsoleService.ts
- submitSitemap() // Enviar sitemap
- getIndexStatus() // Estado de indexación
- getSearchAnalytics() // Analytics de búsqueda
- getQueries() // Consultas de búsqueda
- getPages() // Páginas indexadas
```

#### C. Variables de entorno
```env
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret
GOOGLE_SEARCH_CONSOLE_REFRESH_TOKEN=your_refresh_token
GOOGLE_SEARCH_CONSOLE_SITE_URL=https://mercaditopy.com
```

#### D. Verificación de dominio
```html
<!-- Agregar meta tag de verificación en layout.tsx -->
<meta name="google-site-verification" content="your-verification-code" />
```

---

### 3.2 Google Analytics 4 (GA4) - Implementación Completa

**Objetivo:** Medir visitas, búsquedas y conversiones

**Implementación necesaria:**

#### A. GA4 SDK Completo
```typescript
// src/lib/services/googleAnalyticsService.ts
- initialize() // Inicializar GA4
- trackPageView() // Vista de página
- trackEvent() // Eventos personalizados
- trackEcommerce() // Eventos de ecommerce
- setUserProperties() // Propiedades de usuario
- trackConversion() // Conversiones
```

#### B. Eventos de Ecommerce
```typescript
// Eventos implementados:
- view_item (vista de producto)
- add_to_cart (agregar al carrito)
- begin_checkout (iniciar checkout)
- purchase (compra)
- view_item_list (vista de lista)
- search (búsqueda)
- select_item (seleccionar producto)
```

#### C. Configuración en layout.tsx
```typescript
// Agregar script de GA4
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
```

#### D. Variables de entorno
```env
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

### 3.3 Google Tag Manager (GTM)

**Objetivo:** Gestionar tags sin modificar código

**Implementación necesaria:**

#### A. GTM Container
```typescript
// src/app/layout.tsx
- Agregar script de GTM (noscript y script)
- Configurar dataLayer
```

#### B. DataLayer Events
```typescript
// Eventos a enviar al dataLayer:
- page_view
- product_view
- add_to_cart
- purchase
- search
- store_view
- auction_view
```

#### C. Variables de entorno
```env
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
```

---

### 3.4 Metadatos y JSON-LD Mejorados

**Objetivo:** Mejor visibilidad en resultados de búsqueda

**Implementación necesaria:**

#### A. Mejorar structured data existente
```typescript
// src/lib/structuredData.ts - MEJORAR
- ProductStructuredData: Agregar más campos
- StoreStructuredData: Agregar más campos
- AuctionStructuredData: NUEVO
- FAQStructuredData: Implementar
- ReviewStructuredData: NUEVO
- BreadcrumbStructuredData: Ya existe
```

#### B. Open Graph mejorado
```typescript
// En todas las páginas:
- og:title
- og:description
- og:image (1200x630px)
- og:url
- og:type
- og:site_name
- og:locale
```

#### C. Twitter Cards
```typescript
- twitter:card
- twitter:site
- twitter:title
- twitter:description
- twitter:image
```

---

## 💬 4. MENSAJERÍA Y NOTIFICACIONES

### 4.1 WhatsApp Cloud API

**Objetivo:** Envío automático de mensajes y Click-to-Chat

**Implementación necesaria:**

#### A. WhatsApp Cloud API Service
```typescript
// src/lib/services/whatsAppCloudService.ts
- initialize() // Inicializar API
- sendMessage() // Enviar mensaje
- sendTemplate() // Enviar plantilla
- markAsRead() // Marcar como leído
- getConversations() // Obtener conversaciones
- sendMedia() // Enviar imagen/video
```

#### B. Plantillas de mensajes
```typescript
// Templates pre-aprobados:
- order_confirmation (confirmación de pedido)
- order_shipped (pedido enviado)
- order_delivered (pedido entregado)
- auction_ending (subasta por terminar)
- raffle_winner (ganador de sorteo)
- payment_reminder (recordatorio de pago)
```

#### C. Click-to-Chat
```typescript
// Componente mejorado
// src/components/WhatsAppButton.tsx
- Botón flotante
- Click abre WhatsApp con mensaje predefinido
- Integración en páginas de producto/tienda
```

#### D. Webhook para recibir mensajes
```typescript
// src/app/api/webhooks/whatsapp/route.ts
- Verificar webhook (Meta requiere)
- Recibir mensajes entrantes
- Procesar y responder automáticamente
```

#### E. Variables de entorno
```env
WHATSAPP_CLOUD_API_TOKEN=your_token
WHATSAPP_CLOUD_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID=your_business_account_id
WHATSAPP_CLOUD_VERIFY_TOKEN=your_verify_token
```

---

### 4.2 Email Marketing con Resend

**Objetivo:** Campañas de email marketing y notificaciones programadas

**Implementación necesaria:**

#### A. Servicio de Email Marketing
```typescript
// src/lib/services/emailMarketingService.ts
- sendCampaign() // Enviar campaña masiva
- scheduleEmail() // Programar email
- sendToSegment() // Enviar a segmento
- trackEmailOpen() // Tracking de aperturas
- trackEmailClick() // Tracking de clics
- unsubscribe() // Desuscribir
```

#### B. Templates de marketing
```typescript
// src/lib/templates/email/marketing/
- weeklyNewsletter.ts // Newsletter semanal
- productRecommendations.ts // Recomendaciones
- abandonedCart.ts // Carrito abandonado
- storePromotion.ts // Promoción de tienda
- auctionReminder.ts // Recordatorio de subasta
```

#### C. Segmentación de usuarios
```typescript
// src/lib/services/emailSegmentationService.ts
- getActiveBuyers() // Compradores activos
- getInactiveUsers() // Usuarios inactivos
- getStoreFollowers() // Seguidores de tienda
- getAuctionBidders() // Pujadores en subastas
```

#### D. Sistema de programación
```typescript
// src/app/api/cron/send-scheduled-emails/route.ts
- Cron job para enviar emails programados
- Verificar emails pendientes
- Enviar en lotes
```

---

## 🧠 5. ANÁLISIS DE DATOS Y RENDIMIENTO

### 5.1 PostHog o Plausible

**Objetivo:** Estadísticas de uso y comportamiento de usuarios

**Implementación necesaria:**

#### A. PostHog Integration
```typescript
// src/lib/services/postHogService.ts
- initialize() // Inicializar PostHog
- trackEvent() // Trackear eventos
- identifyUser() // Identificar usuario
- setUserProperties() // Propiedades de usuario
- captureException() // Capturar errores
```

#### B. Variables de entorno
```env
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

#### C. Alternativa: Plausible
```env
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=mercaditopy.com
NEXT_PUBLIC_PLAUSIBLE_API_KEY=your_api_key
```

---

### 5.2 Panel de Analytics por Tienda

**Objetivo:** Dashboard de analytics individual para cada tienda

**Implementación necesaria:**

#### A. Base de datos
```sql
-- Tabla: store_analytics (ya existe analytics_events, mejorar)
-- Agregar índices y optimizaciones

-- Vistas para analytics rápido:
CREATE VIEW store_daily_metrics AS
SELECT 
  store_id,
  DATE(created_at) as date,
  COUNT(*) as views,
  COUNT(DISTINCT user_id) as unique_visitors,
  COUNT(DISTINCT session_id) as sessions
FROM analytics_events
WHERE event_type = 'store_view'
GROUP BY store_id, DATE(created_at);

CREATE VIEW product_analytics_by_store AS
SELECT 
  p.store_id,
  p.id as product_id,
  COUNT(*) as views,
  COUNT(DISTINCT ae.user_id) as unique_views,
  SUM(CASE WHEN ae.event_type = 'add_to_cart' THEN 1 ELSE 0 END) as add_to_cart_count
FROM products p
LEFT JOIN analytics_events ae ON ae.event_data->>'product_id' = p.id::text
GROUP BY p.store_id, p.id;
```

#### B. Servicio de Analytics por Tienda
```typescript
// src/lib/services/storeAnalyticsService.ts
- getStoreMetrics() // Métricas generales
- getProductPerformance() // Rendimiento de productos
- getTrafficSources() // Fuentes de tráfico
- getConversionFunnel() // Embudo de conversión
- getCustomerBehavior() // Comportamiento de clientes
- getRevenueMetrics() // Métricas de ingresos
```

#### C. Componente de Dashboard
```typescript
// src/components/store/StoreAnalyticsDashboard.tsx
- Gráficos de visitas
- Productos más vistos
- Fuentes de tráfico
- Conversiones
- Comparación de períodos
- Exportar reportes
```

#### D. Rutas
```typescript
// src/app/dashboard/store/analytics/page.tsx
- Dashboard completo de analytics
- Filtros por fecha
- Gráficos interactivos
- Tablas de datos
```

---

## 📦 DEPENDENCIAS NECESARIAS

### Nuevas dependencias
```json
{
  "dependencies": {
    "@posthog/posthog-js": "^1.0.0", // O usar Plausible
    "facebook-nodejs-business-sdk": "^19.0.0", // Meta Business API
    "tiktok-business-sdk": "^1.0.0", // TikTok Shop API
    "googleapis": "^126.0.0", // Google APIs (Search Console, Analytics)
    "@google-cloud/storage": "^7.0.0", // Si se necesita
    "node-cron": "^3.0.0" // Para cron jobs
  }
}
```

---

## 🔄 FLUJOS DE TRABAJO

### Flujo 1: Crear Campaña de Publicidad
1. Admin/Vendedor accede a `/dashboard/marketing`
2. Clic en "Crear Campaña"
3. Selecciona tipo (general o individual)
4. Configura presupuesto, targeting, creativos
5. Sistema crea campaña en Meta Business API
6. Campaña se activa y se trackean métricas

### Flujo 2: Sincronizar Producto a Redes Sociales
1. Vendedor crea/actualiza producto
2. Webhook detecta cambio
3. Sistema sincroniza a Meta Catalog
4. Sistema sincroniza a TikTok Shop (si está configurado)
5. Producto aparece en Facebook/Instagram Shop
6. Estado de sincronización visible en dashboard

### Flujo 3: Notificación Automática de Pedido
1. Cliente completa compra
2. Sistema envía email de confirmación (Resend)
3. Sistema envía WhatsApp al vendedor (WhatsApp Cloud API)
4. Sistema trackea evento en GA4, Facebook Pixel, PostHog
5. Sistema actualiza métricas de conversión

### Flujo 4: Analytics en Tiempo Real
1. Usuario visita tienda/producto
2. Evento se registra en `analytics_events`
3. Evento se envía a GA4, Facebook Pixel, PostHog
4. Dashboard de analytics se actualiza
5. Vendedor puede ver métricas en tiempo real

---

## ⚙️ CONFIGURACIÓN INICIAL

### Pasos de configuración:

1. **Meta Business:**
   - Crear cuenta en Meta Business Manager
   - Crear aplicación en Meta Developers
   - Obtener tokens y configurar variables de entorno
   - Configurar Facebook Pixel
   - Crear Commerce Account

2. **Google Services:**
   - Crear proyecto en Google Cloud Console
   - Habilitar Google Analytics 4, Search Console API
   - Configurar OAuth 2.0
   - Obtener credenciales y configurar variables de entorno
   - Verificar propiedad en Search Console
   - Configurar Google Tag Manager

3. **TikTok Shop:**
   - Crear cuenta de desarrollador
   - Obtener API keys
   - Configurar webhooks

4. **WhatsApp Cloud API:**
   - Solicitar acceso a WhatsApp Cloud API (Meta)
   - Configurar número de teléfono
   - Obtener tokens y configurar webhook

5. **PostHog/Plausible:**
   - Crear cuenta
   - Obtener API keys
   - Configurar variables de entorno

---

## 📊 MÉTRICAS Y KPIs

### Métricas a trackear:

1. **Publicidad:**
   - Impresiones
   - Clics
   - CTR (Click-Through Rate)
   - CPC (Cost Per Click)
   - CPM (Cost Per Mille)
   - Conversiones
   - ROAS (Return on Ad Spend)

2. **SEO:**
   - Páginas indexadas
   - Consultas de búsqueda
   - Impresiones en búsqueda
   - Clics desde búsqueda
   - CTR promedio
   - Posición promedio

3. **Redes Sociales:**
   - Productos sincronizados
   - Vistas desde redes sociales
   - Conversiones desde redes sociales
   - Engagement rate

4. **Email Marketing:**
   - Tasa de apertura
   - Tasa de clics
   - Tasa de conversión
   - Tasa de rebote
   - Desuscripciones

5. **Analytics por Tienda:**
   - Visitas diarias
   - Visitantes únicos
   - Productos más vistos
   - Tasa de conversión
   - Ingresos
   - Fuentes de tráfico

---

## 🚀 PRIORIZACIÓN DE IMPLEMENTACIÓN

### Fase 1 (Crítico - 2 semanas):
1. ✅ Facebook Pixel completo
2. ✅ Google Analytics 4 completo
3. ✅ Google Tag Manager
4. ✅ Mejorar sitemap y Search Console
5. ✅ WhatsApp Cloud API básico

### Fase 2 (Importante - 3 semanas):
1. ✅ Meta Business API - Campañas
2. ✅ Catálogo de productos para Meta
3. ✅ Email Marketing avanzado
4. ✅ PostHog/Plausible
5. ✅ Panel de analytics por tienda

### Fase 3 (Nice to have - 2 semanas):
1. ✅ TikTok Shop
2. ✅ Instagram Shop completo
3. ✅ Analytics avanzados
4. ✅ Automatizaciones de marketing

---

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Privacidad y GDPR:**
   - Consentimiento de cookies
   - Política de privacidad actualizada
   - Opción de opt-out de tracking

2. **Rate Limits:**
   - Respetar límites de APIs
   - Implementar retry logic
   - Queue system para sincronizaciones

3. **Costo:**
   - Meta Business API: Gratis (pagos por anuncios)
   - WhatsApp Cloud API: Costo por mensaje
   - Google APIs: Gratis hasta cierto límite
   - PostHog: Plan gratuito disponible

4. **Seguridad:**
   - Guardar tokens en variables de entorno
   - No exponer credenciales en frontend
   - Validar webhooks
   - Rate limiting en APIs

---

## 📝 NOTAS ADICIONALES

- Todas las URLs deben redirigir a `mercaditopy.com` (no permitir salir)
- Mantener coherencia de marca en todas las campañas
- Tracking unificado: todos los eventos deben ir a múltiples plataformas
- Sincronización automática: productos deben sincronizarse sin intervención manual
- Dashboard unificado: todas las métricas en un solo lugar

---

**Fecha de creación:** 2025-01-30
**Última actualización:** 2025-01-30
**Estado:** Pendiente de aprobación

