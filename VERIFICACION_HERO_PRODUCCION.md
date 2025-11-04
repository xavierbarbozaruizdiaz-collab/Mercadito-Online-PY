# 🔍 VERIFICACIÓN: Hero en Producción

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## ✅ Commit y Push Completados

**Commit:** `76ef588` - "fix: corrige Hero component - query, cache y logs para producción"
**Archivos modificados:**
- ✅ `src/app/page.tsx`
- ✅ `src/components/hero/HeroSlider.tsx`

---

## 📋 CHECKLIST DE VERIFICACIÓN

### 1. ✅ Verificar Variable en Vercel

**Pasos:**
1. Ve a: https://vercel.com/dashboard
2. Selecciona el proyecto: `mercadito-online-py`
3. Ve a: **Settings** → **Environment Variables**
4. Busca: `NEXT_PUBLIC_FEATURE_HERO`
5. **Debe estar:** `NEXT_PUBLIC_FEATURE_HERO = true`

**Si falta o está en `false`:**
- Edita y cambia a `true`
- Guarda
- Procede al redeploy

---

### 2. 🚀 Redeploy en Vercel

**Pasos:**
1. Ve a: **Deployments** en Vercel
2. Encuentra el último deployment (o haz clic en **"Redeploy"**)
3. En la ventana de redeploy:
   - ✅ **DESMARCAR** "Use existing Build Cache"
   - ✅ Click en **"Redeploy"**

**Esperar:** ~2-5 minutos para que complete

---

### 3. 📊 Verificar Migración en Supabase PROD

**Pasos:**
1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea
2. Ve a: **SQL Editor**
3. Ejecuta:

```sql
-- Verificar que la migración esté aplicada
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE name = 'fix_hero_slides_table'
ORDER BY version DESC;
```

**Resultado esperado:**
- Debe mostrar: `20251103000000_fix_hero_slides_table`

**Si NO aparece:**
- Abre: `supabase/migrations/20251103000000_fix_hero_slides_table.sql`
- Copia TODO el contenido
- Pégalo en SQL Editor
- Ejecuta (RUN)

---

### 4. 🔍 Verificar en Browser (Producción)

**URL:** https://mercadito-online-py.vercel.app

**Pasos:**

#### A. Abrir Console del Browser (F12)
1. Presiona `F12` o clic derecho → "Inspeccionar"
2. Ve a la pestaña **"Console"**
3. Recarga la página (Ctrl+F5 o Cmd+Shift+R para forzar refresh)

**Logs esperados:**
```
[Hero] NEXT_PUBLIC_FEATURE_HERO: true
[Hero] FEATURE_HERO enabled: true
[Hero] Query result - slides count: X
[Hero] Processed slides count: X
[Hero] Final slides count: X
[Hero] Will render: HeroSlider (o Placeholder)
```

**Captura estos logs** 📸

#### B. Verificar Network Tab
1. En DevTools, ve a la pestaña **"Network"**
2. Recarga la página
3. Busca la request: `hero_slides` o filtra por `/rest/v1/`
4. Debe haber una request como: `/rest/v1/hero_slides?select=...&is_active=eq.true&order=sort_order.asc`

**Click en la request y verifica:**
- **Status:** `200 OK` ✅
- **Response:** Debe ser un array JSON
- **Array length:** Debe ser `> 0` si hay slides activos

**Captura la request** 📸

---

## 📝 TEMPLATE PARA EL REPORTE

Copia este template y completa con las capturas:

```markdown
# 📊 REPORTE: Hero en Producción

**Fecha:** [FECHA]
**Commit:** 76ef588

---

## ✅ Verificaciones

### 1. Variable en Vercel
- [ ] `NEXT_PUBLIC_FEATURE_HERO=true` ✅ confirmado

### 2. Redeploy
- [ ] Redeploy completado sin caché ✅
- [ ] Build exitoso ✅

### 3. Migración en Supabase
- [ ] Migración `20251103000000_fix_hero_slides_table.sql` aplicada ✅

---

## 📊 Logs en Console

**Feature Flag:**
```
[Hero] NEXT_PUBLIC_FEATURE_HERO: [VALOR]
[Hero] FEATURE_HERO enabled: [true/false]
```

**Cantidad de Slides:**
```
[Hero] Query result - slides count: [NÚMERO]
[Hero] Processed slides count: [NÚMERO]
[Hero] Final slides count: [NÚMERO]
```

**Render:**
```
[Hero] Will render: [HeroSlider/Placeholder]
```

**Captura de Console:** [PEGAR CAPTURA AQUÍ]

---

## 🌐 Network Request

**Request URL:**
```
/rest/v1/hero_slides?select=...&is_active=eq.true&order=sort_order.asc
```

**Status:** [200 OK / ERROR]
**Response Type:** [application/json]
**Response Length:** [NÚMERO] slides

**Response Body (primeros caracteres):**
```json
[PEGAR PRIMEROS CARACTERES DEL JSON AQUÍ]
```

**Captura de Network:** [PEGAR CAPTURA AQUÍ]

---

## 🎨 Visual

- [ ] Hero se muestra correctamente ✅
- [ ] Hero NO se muestra ❌
- [ ] Placeholder se muestra (sin slides) ⚠️

**Primer error encontrado (si hay):**
```
[PEGAR ERROR AQUÍ]
```

---

## ✅ Resumen Final

- **Estado:** [FUNCIONANDO / CON ERRORES / PLACEHOLDER]
- **Slides encontrados:** [NÚMERO]
- **Feature flag:** [ACTIVO/INACTIVO]
- **Próxima acción:** [QUÉ HACER]
```

---

## 🔗 Links Útiles

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Supabase Dashboard:** https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea
- **Producción:** https://mercadito-online-py.vercel.app

---

**Siguiente paso:** Ejecuta las verificaciones y completa el reporte con las capturas.



