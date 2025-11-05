# 🎯 GTM E-commerce - Guía de QA y Despliegue

**Mercadito Online PY**  
**Sitio:** mercaditonlinepy.com  
**GTM ID:** GTM-PQ8Q6JGW  
**GA4 Measurement ID:** G-52EMX80KW5  
**Moneda:** PYG

## 📦 Importación del Contenedor

### Paso 1: Preparar el archivo
- Localiza el archivo `/public/gtm-ecommerce-container.json` en tu proyecto
- Asegúrate de tener acceso a Google Tag Manager con permisos de administrador

### Paso 2: Importar en GTM
1. Accede a [Google Tag Manager](https://tagmanager.google.com)
2. Selecciona tu contenedor (o crea uno nuevo si no existe)
3. Ve a **Admin** → **Import Container**
4. Selecciona el archivo `gtm-ecommerce-container.json`
5. Elige **Workspace**: "Default Workspace"
6. Selecciona **Merge** (preservar configuración existente)
7. Haz clic en **Confirm**

### Paso 3: Configurar Consent Mode
1. Verifica que el tag **"Consent – Default Granted"** esté presente
2. Este tag inicializa el consentimiento por defecto como `granted` para `ad_storage` y `analytics_storage`
3. Puede ajustarse más adelante si implementas un CMP (Consent Management Platform)

### Paso 4: Configurar Facebook Pixel ID
1. Ve a **Variables** en el menú lateral
2. Busca la variable **{{FB Pixel ID}}**
3. Edita y agrega tu Pixel ID de Facebook (ej: `123456789012345`)
4. Si no usarás Facebook Pixel, déjala vacía (los tags de FB no se dispararán)

### Paso 5: Preview y Validación
1. Haz clic en **Preview** en la esquina superior derecha
2. Ingresa la URL de tu sitio (ej: `https://mercadito-online-py.vercel.app`)
3. Se abrirá una nueva pestaña con Tag Assistant

---

## 🧪 Pruebas de Eventos

### Test 1: View Item (Ver Producto)
**Acción:**
1. Abre cualquier página de producto (ej: `/products/[id]`)
2. Espera a que la página cargue completamente

**Verificación en Tag Assistant:**
- ✅ Debe aparecer el evento `view_item`
- ✅ Tag "GA4 – view_item" debe dispararse
- ✅ Tag "FB – ViewContent" debe dispararse (si {{FB Pixel ID}} está configurado)
- ✅ Revisar en la pestaña "Data Layer" que exista:
  ```javascript
  {
    event: "view_item",
    ecommerce: {
      currency: "PYG",
      value: [número],
      items: [{
        item_id: "[product-id]",
        item_name: "[product-title]",
        price: [número],
        quantity: 1
      }]
    }
  }
  ```

**Verificación en GA4 DebugView:**
1. Ve a Google Analytics 4 → **Admin** → **DebugView**
2. Conecta tu dispositivo/sesión (usando GA Debugger o extensiones)
3. Debe aparecer el evento `view_item` con parámetros:
   - `items` (array)
   - `value` (número)
   - `currency` ("PYG")

**Verificación en Facebook Events Manager:**
1. Ve a [Facebook Events Manager](https://business.facebook.com/events_manager2)
2. Selecciona tu Pixel
3. Ve a **Test Events**
4. Debe aparecer el evento `ViewContent` con:
   - `content_ids` (array)
   - `contents` (array)
   - `value` (número)
   - `currency` ("PYG")

---

### Test 2: Add to Cart (Agregar al Carrito)
**Acción:**
1. En una página de producto, haz clic en **"Agregar al carrito"**
2. Espera la confirmación

**Verificación en Tag Assistant:**
- ✅ Debe aparecer el evento `add_to_cart`
- ✅ Tag "GA4 – add_to_cart" debe dispararse
- ✅ Tag "FB – AddToCart" debe dispararse (si {{FB Pixel ID}} está configurado)
- ✅ Data Layer debe mostrar:
  ```javascript
  {
    event: "add_to_cart",
    ecommerce: {
      currency: "PYG",
      value: [precio * cantidad],
      items: [{
        item_id: "[product-id]",
        item_name: "[product-title]",
        price: [precio],
        quantity: [cantidad]
      }]
    }
  }
  ```

**Verificación en GA4 DebugView:**
- Evento `add_to_cart` con parámetros `items`, `value`, `currency`

**Verificación en Facebook Events Manager:**
- Evento `AddToCart` con `content_ids`, `contents`, `value`, `currency`

---

### Test 3: Begin Checkout (Iniciar Checkout)
**Acción:**
1. Agrega productos al carrito
2. Ve a `/checkout` (o haz clic en "Ir al checkout")

**Verificación en Tag Assistant:**
- ✅ Debe aparecer el evento `begin_checkout`
- ✅ Tag "GA4 – begin_checkout" debe dispararse
- ✅ Tag "FB – InitiateCheckout" debe dispararse (si {{FB Pixel ID}} está configurado)
- ✅ Data Layer debe mostrar todos los items del carrito:
  ```javascript
  {
    event: "begin_checkout",
    ecommerce: {
      currency: "PYG",
      value: [total],
      items: [
        { item_id: "...", item_name: "...", price: ..., quantity: ... },
        // ... más items
      ]
    }
  }
  ```

**Verificación en GA4 DebugView:**
- Evento `begin_checkout` con todos los items y el total

**Verificación en Facebook Events Manager:**
- Evento `InitiateCheckout` con `num_items` (cantidad de items)

---

### Test 4: Purchase (Compra Completada)
**Acción:**
1. Completa el proceso de checkout
2. Confirma el pago
3. Debe redirigir a `/checkout/success?orderId=[id]`

**Verificación en Tag Assistant:**
- ✅ Debe aparecer el evento `purchase`
- ✅ Tag "GA4 – purchase" debe dispararse
- ✅ Tag "FB – Purchase" debe dispararse (si {{FB Pixel ID}} está configurado)
- ✅ Data Layer debe mostrar:
  ```javascript
  {
    event: "purchase",
    ecommerce: {
      transaction_id: "[order-id]",
      currency: "PYG",
      value: [total],
      items: [
        // ... todos los items comprados
      ]
    }
  }
  ```

**Verificación en GA4 DebugView:**
- Evento `purchase` con `transaction_id`, `items`, `value`, `currency`

**Verificación en Facebook Events Manager:**
- Evento `Purchase` con `content_ids`, `contents`, `value`, `currency`

**Verificación en GA4 Reports:**
1. Ve a **Reports** → **Monetization** → **Ecommerce purchases**
2. Debe aparecer la transacción con el `transaction_id` correcto

---

## 🔍 Debugging y Troubleshooting

### Problema: Los eventos no aparecen en Tag Assistant
**Solución:**
1. Verifica que el contenedor GTM esté publicado
2. Verifica que la app esté emitiendo eventos al dataLayer (consola: `window.dataLayer`)
3. Asegúrate de que los triggers estén configurados correctamente
4. Revisa la consola del navegador por errores JavaScript

### Problema: Los eventos aparecen pero sin datos
**Solución:**
1. Verifica que las variables del Data Layer estén correctamente configuradas
2. Revisa que el path de las variables coincida (ej: `ecommerce.currency`)
3. Verifica que el dataLayer tenga la estructura exacta esperada

### Problema: Facebook Pixel no dispara
**Solución:**
1. Verifica que {{FB Pixel ID}} esté configurado y no esté vacío
2. Revisa que los tags de FB tengan el filtro "{{FB Pixel ID}} not empty"
3. Verifica en la consola que `fbq` esté disponible

### Problema: GA4 no recibe eventos
**Solución:**
1. Verifica que el Measurement ID sea correcto: `G-52EMX80KW5`
2. Revisa en GA4 DebugView que estés conectado correctamente
3. Verifica que el tag "GA4 – Configuration" se dispare en todas las páginas

---

## 📊 Verificación Post-Despliegue

### En Google Analytics 4
1. **Realtime Reports**: Debe mostrar eventos en tiempo real
2. **DebugView**: Todos los eventos deben aparecer con parámetros correctos
3. **Monetization Reports**: Las compras deben aparecer con `transaction_id`

### En Facebook Events Manager
1. **Test Events**: Debe mostrar eventos en tiempo real
2. **Events Overview**: Verificar que los eventos se estén recibiendo
3. **Conversions**: Verificar que los eventos de conversión se estén registrando

---

## ✅ Checklist de Validación

- [ ] Contenedor importado correctamente
- [ ] {{FB Pixel ID}} configurado (o vacío si no se usa)
- [ ] Preview activado y funcionando
- [ ] Evento `view_item` dispara correctamente
- [ ] Evento `add_to_cart` dispara correctamente
- [ ] Evento `begin_checkout` dispara correctamente
- [ ] Evento `purchase` dispara correctamente
- [ ] GA4 DebugView muestra todos los eventos
- [ ] Facebook Events Manager muestra eventos (si está configurado)
- [ ] Contenedor publicado en producción

---

## 📝 Notas Importantes

1. **Moneda fija**: Todos los eventos usan `PYG` como moneda
2. **Facebook Pixel opcional**: Si {{FB Pixel ID}} está vacío, los tags de FB no se disparan (comportamiento esperado)
3. **Data Layer Structure**: La app debe emitir eventos con la estructura exacta documentada
4. **Preview Mode**: Siempre prueba en Preview antes de publicar
5. **Production**: Publica el contenedor solo después de validar todos los eventos

---

## 🆘 Soporte

Si encuentras problemas:
1. Revisa la consola del navegador por errores
2. Usa Tag Assistant para ver qué tags se disparan
3. Verifica el dataLayer con `console.log(window.dataLayer)`
4. Revisa la documentación de GTM para eventos personalizados

