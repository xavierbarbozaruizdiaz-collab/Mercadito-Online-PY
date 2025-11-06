# 🚨 INSTRUCCIONES CRÍTICAS PARA VERCEL

## ❌ PROBLEMA IDENTIFICADO

**Las variables de entorno en `vercel.json` pueden NO estar siendo aplicadas por Vercel.**

Vercel requiere que las variables de entorno se configuren en el **Dashboard**, no solo en `vercel.json`.

## ✅ SOLUCIÓN INMEDIATA

### Paso 1: Ir a Vercel Dashboard
1. Ve a: https://vercel.com/dashboard
2. Selecciona el proyecto: `mercadito-online-py`
3. Ve a: **Settings** → **Environment Variables**

### Paso 2: Agregar Variable Crítica

**AGREGAR:**
- **Key:** `NEXT_PUBLIC_FEATURE_HERO`
- **Value:** `true`
- **Environment:** Seleccionar todas (Production, Preview, Development)

### Paso 3: Verificar Otras Variables

Asegúrate de que estas variables estén configuradas:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_ENV` = `production`

### Paso 4: Redeploy

Después de agregar las variables:
1. Ve a **Deployments**
2. Haz clic en los **3 puntos** del último deployment
3. Selecciona **Redeploy**

---

## 🔍 VERIFICACIÓN DE DASHBOARDS

Si los dashboards no aparecen, verifica:

### 1. Verificar que el usuario tiene rol correcto
- Ve a Supabase Dashboard
- Verifica que el usuario tiene `role = 'admin'` o `role = 'seller'` en la tabla `profiles`

### 2. Verificar RLS (Row Level Security)
- Las políticas RLS pueden estar bloqueando acceso
- Verifica que las políticas permiten leer `profiles`

### 3. Verificar rutas
- `/dashboard/admin` debe existir
- `/dashboard/seller` debe existir
- `/dashboard/affiliate` debe existir

---

## 🔍 VERIFICACIÓN DE HERO SLIDER

Si los slides no aparecen:

### 1. Verificar datos en Supabase
```sql
SELECT * FROM hero_slides WHERE is_active = true;
```

### 2. Verificar variable de entorno
- `NEXT_PUBLIC_FEATURE_HERO` debe ser `"true"` (string, no boolean)

### 3. Verificar consola del navegador
- Abre DevTools → Console
- Busca errores relacionados con `hero` o `slides`

---

## 📝 CHECKLIST COMPLETO

- [ ] `NEXT_PUBLIC_FEATURE_HERO=true` en Vercel Dashboard
- [ ] Todas las variables de Supabase configuradas
- [ ] Redeploy después de agregar variables
- [ ] Verificar datos en Supabase para hero_slides
- [ ] Verificar roles de usuario en profiles
- [ ] Verificar RLS no bloquea acceso
- [ ] Revisar console del navegador por errores

---

**IMPORTANTE:** `vercel.json` puede no ser suficiente. Vercel prioriza las variables configuradas en el Dashboard sobre `vercel.json`.

