# 🔍 AUDITORÍA: CONFIGURACIÓN DEL SITIO - MERCADITO ONLINE PY

**Fecha:** 2025-01-27  
**Auditor:** Sistema de Diagnóstico  
**Objetivo:** Diagnosticar por qué las configuraciones del Admin `/admin/settings` NO se reflejan en el frontend público

---

## RESUMEN_GENERAL

### ¿La configuración del Admin se guarda correctamente en la DB?
**SI** - La configuración se guarda correctamente en la tabla `site_settings` de Supabase.

**Explicación:**
- La página `/admin/settings` usa `siteSettingsService.updateSettings()` que guarda en la tabla `site_settings`
- La tabla existe y tiene la estructura correcta (key, value JSONB, description, updated_by, updated_at)
- El servicio maneja correctamente la serialización JSONB (evitando doble encoding)

### ¿El frontend (footer, header, layout) está leyendo esa configuración?
**PARCIALMENTE** - Solo el Footer lee algunos valores, pero NO todos los componentes.

**Dónde:**
- ✅ **FooterWrapper.tsx** (Server Component) lee `contact_email`, `contact_phone`, `location` desde `site_settings`
- ❌ **Footer.tsx** tiene valores hardcodeados como fallback: `contacto@mercadito-online-py.com`, `+595 981 234 567`
- ❌ **layout.tsx** (metadata) tiene valores hardcodeados: `'Mercadito Online PY'`, descripciones fijas
- ❌ **NO hay uso de colores** (`primary_color`, `secondary_color`) en ningún componente del frontend
- ❌ **NO hay uso de `shipping_cost` o `free_shipping_threshold`** en checkout o servicios de envío
- ❌ **NO hay uso de `payment_methods`** desde settings (aunque existe política RLS para lectura pública)

### ¿Existen valores hardcodeados que ignoran la configuración dinámica?
**SI** - Múltiples valores hardcodeados encontrados.

**Lista resumida:**
1. **Footer.tsx** (líneas 18-20): `contactEmail = 'contacto@mercadito-online-py.com'`, `contactPhone = '+595 981 234 567'`, `location = 'Asunción, Paraguay'`
2. **layout.tsx** (líneas 33-55): Metadata completa hardcodeada: `'Mercadito Online PY'`, descripciones, keywords, authors, creator, publisher
3. **layout.tsx** (líneas 72-73): OpenGraph `siteName: 'Mercadito Online PY'`, `title: 'Mercadito Online PY - Marketplace de Paraguay'`
4. **Footer.tsx** (línea 32): Título hardcodeado `"Mercadito Online PY"` en el footer
5. **Footer.tsx** (línea 171): Copyright hardcodeado `"© {year} Mercadito Online PY"`
6. **NO se usan colores** (`primary_color`, `secondary_color`) en ningún lugar del frontend
7. **NO se usa `shipping_cost`** ni `free_shipping_threshold` desde settings (no encontrado en checkout ni shippingService)
8. **NO se usa `payment_methods`** desde settings (aunque existe en DB y tiene RLS público)

### ¿Hay endpoint o server action para LEER la configuración global?
**SI** - Existe función pero NO se usa en el frontend público.

**Ruta/Función:**
- ✅ `src/lib/services/siteSettingsService.ts`:
  - `getAllSettings()`: Lee todas las configuraciones
  - `getSetting(key, defaultValue)`: Lee una configuración específica
- ❌ **NO hay API route** (`/api/site-settings` o similar)
- ❌ **NO se usa en layout.tsx** para metadata dinámica
- ❌ **NO se usa en componentes** para colores, shipping, payment methods
- ✅ **Solo se usa en FooterWrapper.tsx** (parcialmente, solo 3 campos)

### ¿Hay posibles problemas de permisos / RLS para lectura pública?
**SI** - RLS está parcialmente configurado, pero faltan políticas para algunos campos.

**Detalle:**
- ✅ **Política existente:** `public_can_read_contact_settings` permite lectura pública de `contact_email`, `contact_phone`, `location`
- ✅ **Política existente:** `public_can_read_payment_methods` permite lectura pública de `payment_methods`
- ❌ **NO hay política pública** para: `site_name`, `primary_color`, `secondary_color`, `shipping_cost`, `free_shipping_threshold`
- ⚠️ **Política restrictiva original:** `admins_can_view_site_settings` solo permite lectura a admins autenticados
- **Conclusión:** El frontend público NO puede leer `site_name`, colores, ni costos de envío porque no hay políticas RLS públicas para esos campos.

---

## MAPA_DE_ARCHIVOS_CRÍTICOS

### Archivos de Configuración y Servicios
- `src/app/admin/settings/page.tsx` – Formulario de configuración del sitio (Admin)
- `src/lib/services/siteSettingsService.ts` – Servicio para leer/guardar settings (usado solo en admin)
- `src/lib/config/site.ts` – Configuración estática (solo URL del sitio)

### Componentes Frontend
- `src/components/Footer.tsx` – Footer con valores hardcodeados como props por defecto
- `src/components/FooterWrapper.tsx` – Server Component que lee 3 campos de settings y los pasa al Footer
- `src/app/layout.tsx` – Layout principal con metadata hardcodeada completa

### Base de Datos
- `supabase/migrations/20250128000056_site_settings.sql` – Creación de tabla `site_settings` con RLS restrictivo
- `supabase/migrations/20251127000003_fix_footer_settings_rls.sql` – Política RLS para `contact_email`, `contact_phone`, `location`
- `supabase/migrations/20251127000000_fix_site_settings_rls_and_show_title.sql` – Política RLS para `payment_methods`

### Tipos y Validaciones
- `src/types/index.ts` – Interface `AppSettings` (líneas 493-507)
- `src/lib/utils/validations.ts` – Schema `appSettingsSchema` (líneas 190-202)

### Archivos que NO usan settings (pero deberían)
- `src/app/checkout/page.tsx` – NO lee `shipping_cost` ni `free_shipping_threshold` desde settings
- `src/lib/services/shippingService.ts` – NO lee costos de envío desde settings
- `src/components/ui/ToastProvider.tsx` – NO usa colores dinámicos
- `src/app/manifest.ts` – NO usa `site_name` dinámico

---

## PROBLEMAS_DETECTADOS

### 1) Footer tiene valores hardcodeados como fallback
**Archivo:** `src/components/Footer.tsx` (líneas 18-20)  
**Problema:** Props por defecto con valores fijos que ignoran la configuración:
```typescript
contactEmail = 'contacto@mercadito-online-py.com',
contactPhone = '+595 981 234 567',
location = 'Asunción, Paraguay'
```
**Impacto:** Si FooterWrapper falla al leer settings, se muestran valores incorrectos.

### 2) Layout metadata completamente hardcodeada
**Archivo:** `src/app/layout.tsx` (líneas 31-89)  
**Problema:** Metadata de Next.js (title, description, keywords, OpenGraph, Twitter) estática:
- `title.default: 'Mercadito Online PY - Marketplace de Paraguay'`
- `description: 'El mejor marketplace de Paraguay...'`
- `siteName: 'Mercadito Online PY'`
- `authors: [{ name: 'Mercadito Online PY' }]`
**Impacto:** SEO y redes sociales muestran información que no se actualiza desde el admin.

### 3) Colores del sitio NO se usan en el frontend
**Problema:** `primary_color` y `secondary_color` se guardan en DB pero NO se aplican en ningún componente.
**Archivos afectados:** Todos los componentes que usan colores (botones, links, temas)
**Impacto:** Los colores configurados en admin no tienen efecto visual.

### 4) Costos de envío NO se leen desde settings
**Problema:** `shipping_cost` y `free_shipping_threshold` existen en DB pero NO se usan en:
- `src/app/checkout/page.tsx`
- `src/lib/services/shippingService.ts`
**Impacto:** Los costos de envío configurados en admin no se aplican.

### 5) Métodos de pago NO se leen desde settings
**Problema:** `payment_methods` existe en DB con RLS público, pero NO se usa en checkout.
**Archivo:** `src/app/checkout/page.tsx` (línea 69) tiene método hardcodeado: `'cash' | 'transfer' | 'card' | 'pagopar'`
**Impacto:** Los métodos de pago configurados en admin no se reflejan en checkout.

### 6) RLS bloquea lectura pública de campos importantes
**Problema:** No hay políticas RLS públicas para:
- `site_name`
- `primary_color`
- `secondary_color`
- `shipping_cost`
- `free_shipping_threshold`
**Archivo:** `supabase/migrations/20250128000056_site_settings.sql` (líneas 23-37)
**Impacto:** El frontend público (sin autenticación) NO puede leer estos valores aunque se implemente la lectura.

### 7) No existe función centralizada para obtener settings en Server Components
**Problema:** `siteSettingsService.getAllSettings()` es cliente-side (`'use client'` implícito por usar `supabase/client`).
**Impacto:** No se puede usar en Server Components como `layout.tsx` sin crear una versión server-side.

### 8) FooterWrapper solo lee 3 campos de muchos disponibles
**Archivo:** `src/components/FooterWrapper.tsx` (línea 27)  
**Problema:** Solo consulta `['contact_email', 'contact_phone', 'location']` pero hay más campos en settings.
**Impacto:** Otros campos como `site_name` no se usan aunque estén disponibles.

### 9) No hay manejo de errores robusto en FooterWrapper
**Archivo:** `src/components/FooterWrapper.tsx` (líneas 29-31)  
**Problema:** Si hay error, solo loguea pero usa valores hardcodeados incorrectos.
**Impacto:** Usuario ve datos incorrectos sin saber que hay un error.

### 10) No existe API route para lectura pública de settings
**Problema:** No hay `/api/site-settings` o similar para que componentes cliente lean settings.
**Impacto:** Componentes cliente no pueden leer settings fácilmente sin duplicar lógica.

---

## RECOMENDACIÓN_DE_SIGUIENTE_PROMPT

### Opción 1: Refactorización Completa (Recomendada)
**Prompt sugerido:**
```
Refactorizar el sistema de configuración del sitio para que el frontend público lea dinámicamente desde site_settings:

1. Crear función server-side getSiteSettings() en lib/services/siteSettingsService.ts que use supabaseServer
2. Actualizar políticas RLS para permitir lectura pública de: site_name, primary_color, secondary_color, shipping_cost, free_shipping_threshold, payment_methods
3. Modificar src/app/layout.tsx para usar getSiteSettings() y generar metadata dinámica
4. Modificar src/components/FooterWrapper.tsx para leer todos los campos necesarios (site_name incluido)
5. Crear hook useSiteSettings() para componentes cliente
6. Actualizar src/app/checkout/page.tsx para leer shipping_cost, free_shipping_threshold y payment_methods desde settings
7. Aplicar colores dinámicos (primary_color, secondary_color) usando CSS variables en layout.tsx
8. Eliminar valores hardcodeados de Footer.tsx (mantener solo como último fallback si DB falla)
```

### Opción 2: Solución Incremental (Más Segura)
**Prompt sugerido:**
```
Fase 1: Habilitar lectura pública de settings y crear función server-side

1. Crear migración SQL para agregar políticas RLS públicas para site_name, primary_color, secondary_color, shipping_cost, free_shipping_threshold
2. Crear función getSiteSettingsServer() en lib/services/siteSettingsService.ts usando supabaseServer (para Server Components)
3. Actualizar FooterWrapper.tsx para leer site_name además de los 3 campos actuales
4. Actualizar layout.tsx metadata para usar site_name dinámico (mantener descripción hardcodeada por ahora)
```

### Opción 3: API Route + Cliente (Alternativa)
**Prompt sugerido:**
```
Crear API route para lectura pública de settings y refactorizar componentes cliente:

1. Crear /api/site-settings/route.ts que lea desde site_settings con permisos públicos
2. Crear hook useSiteSettings() que consuma /api/site-settings
3. Actualizar Footer.tsx para usar useSiteSettings() en lugar de props hardcodeadas
4. Actualizar checkout para leer shipping y payment methods desde API
5. Mantener layout.tsx con metadata estática por ahora (Next.js metadata es compleja de hacer dinámica)
```

---

## NOTAS_ADICIONALES

- La tabla `site_settings` usa JSONB para valores, lo cual es correcto pero requiere parsing cuidadoso (ya manejado en `siteSettingsService.ts`)
- Existe migración `20251127000004_fix_double_encoded_settings.sql` que corrige doble encoding, indicando que hubo problemas previos
- El servicio `siteSettingsService.ts` ya maneja correctamente el parsing de JSONB (función `parseJsonbValue`)
- FooterWrapper.tsx ya tiene lógica de parsing para valores JSONB con comillas, pero es redundante con `parseJsonbValue` del servicio

---

**FIN DEL INFORME**



















