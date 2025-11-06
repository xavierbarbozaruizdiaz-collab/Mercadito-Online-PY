# 📊 Guía de Integraciones de Marketing para Sellers

Esta guía te explica cómo configurar tus propios IDs de Facebook Pixel, Google Analytics y Google Tag Manager para tu tienda.

---

## 🎯 ¿Qué es esto?

Permite que cada tienda tenga sus propios IDs de tracking de marketing, además de los IDs globales de la plataforma. Esto te permite:

- Trackear eventos específicos de tu tienda
- Ver métricas separadas en tus dashboards de Facebook/Google
- Tener mayor control sobre tu marketing

---

## 📋 Cómo Obtener los IDs

### 1. Facebook Pixel ID

**Pasos:**
1. Ve a [Meta Business Manager](https://business.facebook.com/)
2. Ve a **Eventos** → **Píxeles**
3. Si no tienes un Pixel, crea uno nuevo
4. Copia el **ID del Pixel** (solo números, ej: `123456789012345`)

**Ubicación:** Meta Business Manager → Eventos → Configurar Pixel

---

### 2. Google Analytics 4 Measurement ID

**Pasos:**
1. Ve a [Google Analytics](https://analytics.google.com/)
2. Selecciona tu propiedad (o crea una nueva)
3. Ve a **Admin** (⚙️) → **Property** → **Data Streams**
4. Selecciona tu stream web
5. Copia el **Measurement ID** (formato: `G-XXXXXXXXXX`)

**Ubicación:** Google Analytics → Admin → Data Streams → Tu Stream

---

### 3. Google Tag Manager Container ID

**Pasos:**
1. Ve a [Google Tag Manager](https://tagmanager.google.com/)
2. Selecciona tu cuenta y contenedor (o crea uno nuevo)
3. En la parte superior verás el **Container ID** (formato: `GTM-XXXXXXX`)

**Ubicación:** Google Tag Manager → Tu Contenedor → Container ID (arriba)

---

## 🔧 Cómo Configurar en el Dashboard

1. **Ir al Dashboard de Seller**
   - URL: `/dashboard/seller`
   - O desde el menú lateral: **Seller Dashboard**

2. **Ir a Integraciones de Marketing**
   - URL: `/dashboard/seller/marketing`
   - O desde el dashboard principal, busca la sección de marketing

3. **Completar el Formulario**
   - **Facebook Pixel ID**: Pega tu Pixel ID (solo números)
   - **Google Analytics ID**: Pega tu Measurement ID (G-XXXXXXXXXX)
   - **Google Tag Manager ID**: Pega tu Container ID (GTM-XXXXXXX)

4. **Guardar**
   - Haz clic en **"Guardar Configuración"**
   - Los cambios se aplican inmediatamente

---

## ⚠️ Notas Importantes

### Prioridad de IDs

- **IDs de tienda tienen prioridad**: Si configurás un ID de tienda, se usará ese
- **Fallback a globales**: Si no configurás un ID, se usará el global (si existe)
- **Multi-pixel**: Para Facebook Pixel, si configurás un ID de tienda, AMBOS pixels (global + tienda) recibirán eventos

### Ejemplo

- Si configurás `fb_pixel_id = "123456789"` en tu tienda:
  - Tu Pixel (`123456789`) recibirá eventos
  - El Pixel global (si existe) también recibirá eventos
  - Ambos verán los mismos eventos

---

## 🧪 Cómo Probar

### Facebook Pixel Helper

1. Instala la extensión [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) en Chrome
2. Visita tu tienda: `/store/tu-tienda-slug`
3. Abre la extensión (ícono en la barra de herramientas)
4. Deberías ver:
   - Tu Pixel ID (si lo configuraste)
   - El Pixel global (si existe)
   - Eventos como `PageView`, `ViewContent`, etc.

### Google Analytics DebugView

1. Ve a Google Analytics → **Admin** → **DebugView**
2. Visita tu tienda
3. Deberías ver eventos en tiempo real:
   - `page_view`
   - `view_item` (cuando se ve un producto)
   - `add_to_cart` (cuando se agrega al carrito)
   - etc.

### Google Tag Assistant (GTM)

1. Instala [Tag Assistant Legacy](https://chrome.google.com/webstore/detail/tag-assistant-legacy-by-g/kejbdjndbnbjgmefkgdddjlbokphdefk) en Chrome
2. Visita tu tienda
3. Haz clic en el ícono de Tag Assistant
4. Deberías ver:
   - Google Tag Manager cargado
   - Tags configurados

---

## 📊 Verificación en Network Tab

Abre las **Developer Tools** (F12) → **Network** y verifica que se carguen:

- ✅ `https://connect.facebook.net/en_US/fbevents.js` (Facebook Pixel)
- ✅ `https://www.googletagmanager.com/gtag/js?id=G-...` (Google Analytics)
- ✅ `https://www.googletagmanager.com/gtm.js?id=GTM-...` (Google Tag Manager)

---

## ❓ Preguntas Frecuentes

**P: ¿Puedo dejar los campos vacíos?**
R: Sí. Si dejás un campo vacío, se usará el ID global (si existe). Si no hay global, ese tracking no se activará.

**P: ¿Puedo usar solo algunos IDs?**
R: Sí. Podés configurar solo Facebook Pixel, solo GA4, o cualquier combinación.

**P: ¿Los cambios se aplican inmediatamente?**
R: Sí. Una vez que guardás, los cambios se aplican en la próxima visita a tu tienda.

**P: ¿Qué pasa si pongo un ID inválido?**
R: El sistema validará el formato. Si es inválido, verás un error y no se guardará.

**P: ¿Puedo cambiar los IDs después?**
R: Sí, podés editarlos en cualquier momento desde el dashboard.

---

## 🆘 Soporte

Si tenés problemas:
1. Verifica que los IDs tengan el formato correcto
2. Usa las herramientas de debugging mencionadas arriba
3. Revisa la consola del navegador por errores
4. Contacta al equipo de desarrollo

---

**Última actualización:** 2025-01-30

