# 📊 Resumen de Configuración - GTM E-commerce

## 🎯 Información del Proyecto

- **Sitio:** mercaditonlinepy.com
- **GTM ID:** GTM-PQ8Q6JGW
- **GA4 Measurement ID:** G-52EMX80KW5
- **Moneda:** PYG (Guaraníes)
- **Framework:** Next.js (App Router)

---

## 📦 Contenido del Contenedor

### Variables (15 variables)

#### Data Layer Variables (6)
- `event` → Data Layer Variable: `event`
- `ecommerce` → Data Layer Variable: `ecommerce`
- `currency` → Data Layer Variable: `ecommerce.currency`
- `value` → Data Layer Variable: `ecommerce.value`
- `transaction_id` → Data Layer Variable: `ecommerce.transaction_id`
- `items` → Data Layer Variable: `ecommerce.items`

#### Custom JavaScript Variables (8)
- `JS – items_ids` → Extrae array de IDs desde items
- `JS – valueSafe` → Valida y convierte value a número (default: 0)
- `JS – currencySafe` → Valida currency (default: "PYG")
- `JS – contents` → Mapea items a formato Facebook: `[{id, quantity, item_price}]`
- `JS – content_type` → Retorna "product" o "product_group"
- `JS – num_items` → Cuenta items en el array
- `first_item_id` → ID del primer item (opcional)
- `first_item_name` → Nombre del primer item (opcional)

#### Constant Variable (1)
- `FB Pixel ID` → Pixel ID de Facebook (editable, vacío por defecto)

---

### Triggers (5 triggers)

1. **EV – All Pages** → Trigger tipo "All Pages"
2. **EV – view_item** → Custom Event: `view_item`
3. **EV – add_to_cart** → Custom Event: `add_to_cart`
4. **EV – begin_checkout** → Custom Event: `begin_checkout`
5. **EV – purchase** → Custom Event: `purchase`

---

### Tags (11 tags)

#### GA4 Tags (5)
1. **GA4 – Configuration**
   - Tipo: GA4 Configuration
   - Measurement ID: `G-52EMX80KW5`
   - Trigger: EV – All Pages
   - Envía page view automáticamente

2. **GA4 – view_item**
   - Tipo: GA4 Event
   - Event Name: `view_item`
   - Parámetros: `items`, `value` (JS – valueSafe), `currency` (JS – currencySafe)
   - Trigger: EV – view_item

3. **GA4 – add_to_cart**
   - Tipo: GA4 Event
   - Event Name: `add_to_cart`
   - Parámetros: `items`, `value`, `currency`
   - Trigger: EV – add_to_cart

4. **GA4 – begin_checkout**
   - Tipo: GA4 Event
   - Event Name: `begin_checkout`
   - Parámetros: `items`, `value`, `currency`
   - Trigger: EV – begin_checkout

5. **GA4 – purchase**
   - Tipo: GA4 Event
   - Event Name: `purchase`
   - Parámetros: `transaction_id`, `items`, `value`, `currency`
   - Trigger: EV – purchase

#### Facebook Pixel Tags (5)
6. **FB – Base (PageView)**
   - Tipo: Custom HTML
   - Inicializa Facebook Pixel y trackea PageView
   - Solo dispara si `{{FB Pixel ID}}` no está vacío
   - Trigger: EV – All Pages

7. **FB – ViewContent**
   - Tipo: Custom HTML
   - Event: `ViewContent`
   - Parámetros: `content_ids`, `contents`, `content_type`, `value`, `currency`
   - Trigger: EV – view_item

8. **FB – AddToCart**
   - Tipo: Custom HTML
   - Event: `AddToCart`
   - Parámetros: `content_ids`, `contents`, `content_type`, `value`, `currency`
   - Trigger: EV – add_to_cart

9. **FB – InitiateCheckout**
   - Tipo: Custom HTML
   - Event: `InitiateCheckout`
   - Parámetros: `content_ids`, `contents`, `num_items`, `value`, `currency`
   - Trigger: EV – begin_checkout

10. **FB – Purchase**
    - Tipo: Custom HTML
    - Event: `Purchase`
    - Parámetros: `content_ids`, `contents`, `value`, `currency`
    - Trigger: EV – purchase

#### Consent Mode (1)
11. **Consent – Default Granted**
    - Tipo: Consent Initialization
    - Configuración: `ad_storage=granted`, `analytics_storage=granted`
    - Trigger: EV – All Pages
    - Firing Option: ONCE_PER_LOAD

---

## 🔄 Flujo de Eventos

```
1. Usuario ve producto
   → App emite: { event: 'view_item', ecommerce: {...} }
   → GTM dispara: GA4 – view_item, FB – ViewContent

2. Usuario agrega al carrito
   → App emite: { event: 'add_to_cart', ecommerce: {...} }
   → GTM dispara: GA4 – add_to_cart, FB – AddToCart

3. Usuario inicia checkout
   → App emite: { event: 'begin_checkout', ecommerce: {...} }
   → GTM dispara: GA4 – begin_checkout, FB – InitiateCheckout

4. Usuario completa compra
   → App emite: { event: 'purchase', ecommerce: { transaction_id, ... } }
   → GTM dispara: GA4 – purchase, FB – Purchase
```

---

## 📋 Estructura de DataLayer

La app debe emitir eventos con esta estructura exacta:

```javascript
// view_item, add_to_cart, begin_checkout
window.dataLayer.push({
  event: 'view_item' | 'add_to_cart' | 'begin_checkout',
  ecommerce: {
    currency: 'PYG',
    value: 12345.67,
    items: [{
      item_id: 'product-uuid',
      item_name: 'Nombre del Producto',
      price: 12345.67,
      quantity: 1
    }]
  }
});

// purchase
window.dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'order-uuid',
    currency: 'PYG',
    value: 12345.67,
    items: [{
      item_id: 'product-uuid',
      item_name: 'Nombre del Producto',
      price: 12345.67,
      quantity: 1
    }]
  }
});
```

---

## ✅ Validaciones Implementadas

- ✅ Variables JavaScript con manejo de errores (try/catch)
- ✅ Valores por defecto seguros (PYG, 0)
- ✅ Facebook Pixel condicional (solo si ID está configurado)
- ✅ Consent Mode activado por defecto
- ✅ Formato estándar GA4 e-commerce
- ✅ Compatible con Facebook Pixel Events API

---

## 🚀 Pasos Post-Importación

1. **Configurar Facebook Pixel ID** (si aplica)
   - Variables → `{{FB Pixel ID}}` → Agregar tu Pixel ID

2. **Preview y Testing**
   - Activar Preview Mode
   - Probar cada evento en Tag Assistant
   - Verificar en GA4 DebugView
   - Verificar en Facebook Test Events

3. **Publicar**
   - Crear versión con notas
   - Publicar contenedor

---

## 📁 Archivos Entregados

1. ✅ `/public/gtm-ecommerce-container.json` - Contenedor exportable
2. ✅ `/docs/gtm-ecommerce-qa.md` - Guía completa de QA
3. ✅ `/docs/gtm-ecommerce-checklist.md` - Checklist de despliegue
4. ✅ `/docs/gtm-ecommerce-resumen.md` - Este resumen

---

## 🔗 Referencias

- **GTM:** https://tagmanager.google.com
- **GA4:** https://analytics.google.com
- **Facebook Events Manager:** https://business.facebook.com/events_manager2

---

**Versión:** 1.0  
**Fecha:** 2025-11-05  
**Estado:** ✅ Listo para importar

