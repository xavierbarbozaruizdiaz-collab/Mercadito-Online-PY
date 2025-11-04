# 🔧 INSTRUCCIONES: Aplicar Migración hero_slides

## 📋 OBJETIVO

Corregir la tabla `public.hero_slides` en Supabase (PRODUCCIÓN) para que:
1. Tenga todas las columnas necesarias
2. Tenga índices optimizados
3. Tenga RLS habilitado con política pública
4. Tenga al menos un slide activo de prueba

---

## 🚀 PASO 1: Aplicar SQL en Supabase

### Opción A: Desde Supabase Dashboard (RECOMENDADO)

1. **Ve a Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea
   ```

2. **Ve a SQL Editor:**
   - Clic en "SQL Editor" en el menú lateral
   - O ve directamente a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql

3. **Copia y pega el SQL:**
   - Abre el archivo: `supabase/migrations/fix_hero_slides_table.sql`
   - Copia TODO el contenido
   - Pega en el editor SQL de Supabase
   - Clic en "RUN" o presiona Ctrl+Enter

4. **Verifica los resultados:**
   - Deberías ver varios resultados de SELECT
   - Verifica que hay al menos un slide activo

### Opción B: Desde Supabase CLI

```bash
# Conectar a Supabase (si tienes CLI instalado)
supabase db push

# O ejecutar directamente:
supabase db execute -f supabase/migrations/fix_hero_slides_table.sql
```

---

## ✅ PASO 2: Verificar que se aplicó correctamente

### Verificar en Supabase Dashboard:

1. **Ve a Table Editor:**
   - Clic en "Table Editor" → `hero_slides`

2. **Verifica columnas:**
   - Debe tener: `title`, `subtitle`, `bg_type`, `image_url`, `is_active`, `position`, etc.

3. **Verifica datos:**
   - Debe haber al menos 1 fila con `is_active = true`
   - Debe tener `title` y `image_url` o `bg_image_url`

4. **Verifica RLS:**
   - Ve a "Authentication" → "Policies"
   - Busca tabla `hero_slides`
   - Debe existir política "Public read active slides"

---

## 🔍 PASO 3: Verificar en Código

El código usa estas columnas:
- ✅ `position` (para ordenamiento)
- ✅ `bg_gradient_from` y `bg_gradient_to` (para gradientes)
- ✅ `bg_image_url` (para imágenes)
- ✅ `storage_path` (para construir URLs públicas)
- ✅ `banner_position` (para filtrar slides del hero)

El SQL crea ambas versiones para compatibilidad:
- `sort_order` Y `position` (ambas existen)
- `gradient_from/to` Y `bg_gradient_from/to` (ambas existen)

---

## 🌐 PASO 4: Verificar Variable en Vercel

### Verificar NEXT_PUBLIC_FEATURE_HERO en Vercel:

1. **Ve a Vercel Dashboard:**
   ```
   https://vercel.com/dashboard
   ```

2. **Selecciona proyecto:** `mercadito-online-py`

3. **Ve a Settings → Environment Variables**

4. **Verifica o agrega:**
   ```
   NEXT_PUBLIC_FEATURE_HERO=true
   ```

5. **Si la agregaste o modificaste:**
   - Haz clic en "Redeploy" en el último deployment
   - O espera al próximo push (Vercel redeploy automático)

---

## ✅ PASO 5: Verificar en Producción

### Después de aplicar el SQL y redeploy:

1. **Abre producción:**
   ```
   https://mercadito-online-py.vercel.app
   ```

2. **Verifica que:**
   - ✅ El hero slider se muestra en la homepage
   - ✅ Tiene el slide "Bienvenido a Mercadito Online PY"
   - ✅ La imagen se carga correctamente
   - ✅ Los botones CTA funcionan

3. **Si no aparece:**
   - Abre DevTools (F12)
   - Revisa la consola por errores
   - Verifica que `NEXT_PUBLIC_FEATURE_HERO=true` en Network → Headers

---

## 🐛 TROUBLESHOOTING

### Error: "column already exists"
- ✅ **Es normal** - El `IF NOT EXISTS` previene este error
- Puedes ignorar este error si aparece

### Error: "policy already exists"
- ✅ **Es normal** - El código verifica antes de crear
- Puedes ignorar este error si aparece

### El hero no aparece en producción:
1. Verifica que `NEXT_PUBLIC_FEATURE_HERO=true` en Vercel
2. Verifica que hay slides con `is_active = true` en la tabla
3. Verifica que los slides tienen `banner_position = 'hero'` o `NULL`
4. Verifica la consola del navegador por errores
5. Haz redeploy en Vercel

### Slides no se ordenan correctamente:
- Verifica que `position` y `sort_order` tienen valores
- El código usa `position` para ordenamiento
- Asegúrate que `position` tiene valores incrementales (0, 1, 2, etc.)

---

## 📝 RESUMEN

**Archivo SQL creado:** `supabase/migrations/fix_hero_slides_table.sql`

**Contenido:**
- ✅ Agrega todas las columnas faltantes
- ✅ Crea índices optimizados
- ✅ Habilita RLS con política pública
- ✅ Inserta slide de prueba si no existe
- ✅ Sincroniza columnas para compatibilidad
- ✅ Incluye verificaciones al final

**Próximos pasos:**
1. Aplicar SQL en Supabase Dashboard
2. Verificar variable en Vercel
3. Verificar hero en producción

---

## ✅ CHECKLIST

- [ ] SQL aplicado en Supabase Dashboard
- [ ] Columnas verificadas en Table Editor
- [ ] Slide activo verificado
- [ ] RLS política verificada
- [ ] `NEXT_PUBLIC_FEATURE_HERO=true` en Vercel
- [ ] Redeploy en Vercel (si se modificó variable)
- [ ] Hero visible en producción
- [ ] Sin errores en consola del navegador




