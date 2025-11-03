# 🚨 SOLUCIÓN CRÍTICA - POR QUÉ NO FUNCIONA EN PRODUCCIÓN

## ❌ PROBLEMA REAL

**Vercel IGNORA `vercel.json` para variables de entorno en muchos casos.**

Las variables de entorno **DEBEN** estar configuradas en el **Vercel Dashboard**, no solo en `vercel.json`.

---

## ✅ SOLUCIÓN INMEDIATA (HACER AHORA)

### 1. Configurar Variables en Vercel Dashboard

1. Ve a: https://vercel.com/dashboard
2. Selecciona proyecto: `mercadito-online-py`
3. Ve a: **Settings** → **Environment Variables**
4. **AGREGA estas variables:**

#### Variable CRÍTICA para Hero:
- **Key:** `NEXT_PUBLIC_FEATURE_HERO`
- **Value:** `true` (string, no boolean)
- **Environment:** ✅ Production ✅ Preview ✅ Development

#### Variables de Supabase (si no están):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_ENV` = `production`

### 2. Redeploy DESPUÉS de agregar variables

1. Ve a **Deployments**
2. Último deployment → **3 puntos** → **Redeploy**
3. **IMPORTANTE:** Selecciona "Use existing Build Cache" = **OFF**

---

## 🔍 VERIFICACIÓN DE DASHBOARDS

### Si los dashboards no aparecen:

#### 1. Verificar que el usuario tiene rol en Supabase
```sql
-- En Supabase SQL Editor
SELECT id, email, role FROM profiles WHERE email = 'tu-email@ejemplo.com';
```

Si no tiene `role`, actualízalo:
```sql
UPDATE profiles SET role = 'admin' WHERE email = 'tu-email@ejemplo.com';
```

#### 2. Verificar RLS (Row Level Security)
```sql
-- Verificar políticas de profiles
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

Si no hay políticas, crea una:
```sql
-- Permitir que usuarios lean su propio perfil
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);
```

#### 3. Verificar que las rutas existen
- ✅ `/dashboard/admin` → `src/app/(dashboard)/admin/page.tsx`
- ✅ `/dashboard/seller` → `src/app/(dashboard)/seller/page.tsx`
- ✅ `/dashboard/affiliate` → `src/app/dashboard/affiliate/page.tsx`

---

## 🔍 VERIFICACIÓN DE HERO SLIDES

### Si los slides no aparecen:

#### 1. Verificar datos en Supabase
```sql
SELECT * FROM hero_slides WHERE is_active = true;
```

Si no hay slides:
- Ve a `/dashboard/admin/hero` (si eres admin)
- Crea slides con `is_active = true`

#### 2. Verificar variable de entorno
- Abre DevTools → Console en producción
- Busca: `[DEBUG] NEXT_PUBLIC_FEATURE_HERO`
- Debe decir: `true`
- Si dice `undefined`, la variable NO está configurada en Vercel Dashboard

#### 3. Verificar consola por errores
- Abre DevTools → Console
- Busca errores relacionados con:
  - `hero_slides`
  - `FEATURE_HERO`
  - `supabase`

---

## 🐛 DEBUG EN PRODUCCIÓN

He agregado logs de debug que aparecerán en la consola del navegador:

### Para Hero:
- `[DEBUG] FEATURE_HERO:` - Debe ser `true`
- `[DEBUG] NEXT_PUBLIC_FEATURE_HERO:` - Debe ser `"true"`
- `[ERROR] FEATURE_HERO está deshabilitado` - Variable no configurada
- `[WARN] No hay slides activos` - No hay datos en BD

### Para Dashboard:
- `[DEBUG/DASHBOARD] session:` - Debe ser "existe"
- `[DEBUG/DASHBOARD] profile:` - Debe mostrar el perfil
- `[DEBUG/DASHBOARD] role:` - Debe mostrar el rol
- `[ERROR/DASHBOARD] No hay sesión` - Usuario no autenticado
- `[ERROR/DASHBOARD] No hay perfil` - Perfil no existe en BD

---

## 📋 CHECKLIST COMPLETO

- [ ] `NEXT_PUBLIC_FEATURE_HERO=true` en Vercel Dashboard (Settings → Environment Variables)
- [ ] Todas las variables de Supabase configuradas en Vercel Dashboard
- [ ] Redeploy después de agregar variables (sin cache)
- [ ] Verificar que hay slides en `hero_slides` con `is_active=true`
- [ ] Verificar que el usuario tiene `role` en `profiles`
- [ ] Verificar RLS no bloquea acceso a `profiles`
- [ ] Revisar console del navegador por errores
- [ ] Verificar que no hay errores en Network tab

---

## ⚠️ ERRORES COMUNES

### 1. "FEATURE_HERO está deshabilitado"
**Causa:** Variable no está en Vercel Dashboard
**Solución:** Agregar en Dashboard, no solo en vercel.json

### 2. "No hay slides activos"
**Causa:** No hay datos en `hero_slides` o `is_active=false`
**Solución:** Crear slides en Supabase o cambiar `is_active=true`

### 3. "No hay perfil"
**Causa:** Usuario no tiene registro en `profiles`
**Solución:** Ejecutar `ensure_user_profile()` o crear manualmente

### 4. "No tiene acceso"
**Causa:** Usuario no tiene el `role` correcto
**Solución:** Actualizar `role` en `profiles` a `'admin'`, `'seller'`, etc.

---

## 🎯 ACCIÓN INMEDIATA

**LO MÁS IMPORTANTE:**
1. Ve al Vercel Dashboard
2. Agrega `NEXT_PUBLIC_FEATURE_HERO=true` en Environment Variables
3. Redeploy sin cache
4. Revisa la consola del navegador en producción

**Si aún no funciona después de esto, el problema es:**
- Datos no existen en la base de datos
- RLS bloquea acceso
- Errores de JavaScript que rompen el render

---

**Última actualización:** $(date)

