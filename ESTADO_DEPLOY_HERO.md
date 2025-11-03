# ✅ DEPLOY HERO - Estado Actual

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## ✅ Commit y Push Completados

**Commit:** `76ef588`
**Mensaje:** "fix: corrige Hero component - query, cache y logs para producción"

**Archivos modificados:**
- ✅ `src/app/page.tsx` - Query corregida, caché desactivado, logs agregados
- ✅ `src/components/hero/HeroSlider.tsx` - Soporte mejorado para image_url y gradient

**Branch:** `main`
**Estado:** ✅ Pushed a `origin/main`

---

## 🚀 Próximos Pasos

### 1. Verificar Variable en Vercel (2 min)

1. **Ir a:** https://vercel.com/dashboard
2. **Proyecto:** `mercadito-online-py`
3. **Settings** → **Environment Variables**
4. **Verificar:** `NEXT_PUBLIC_FEATURE_HERO = true`

**Si falta o está en `false`:**
- Editar → Cambiar a `true` → Guardar

---

### 2. Redeploy en Vercel (5 min)

1. **Deployments** → Último deployment
2. **"Redeploy"** (menú de 3 puntos)
3. **⚠️ IMPORTANTE:** Desmarcar **"Use existing Build Cache"**
4. **Redeploy**

**Esperar:** Build completo (~2-5 minutos)

---

### 3. Verificar Migración en Supabase (2 min)

**SQL a ejecutar:**
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE name = 'fix_hero_slides_table'
ORDER BY version DESC;
```

**Si NO aparece:**
1. Abrir: `supabase/migrations/20251103000000_fix_hero_slides_table.sql`
2. Copiar TODO
3. Pegar en Supabase SQL Editor
4. Ejecutar (RUN)

---

### 4. Verificar en Producción (5 min)

**URL:** https://mercadito-online-py.vercel.app

#### A. Console (F12)
**Logs esperados:**
```
[Hero] NEXT_PUBLIC_FEATURE_HERO: true
[Hero] FEATURE_HERO enabled: true
[Hero] Query result - slides count: X
[Hero] Processed slides count: X
[Hero] Final slides count: X
[Hero] Will render: HeroSlider
```

#### B. Network Tab
- Buscar: `hero_slides`
- Status: `200 OK`
- Response: Array JSON con slides

---

## 📊 Template de Reporte

**Usar:** `REPORTE_HERO_PRODUCCION_TEMPLATE.md`

**Completar con:**
1. Captura de logs en Console
2. Captura de Network request
3. Descripción visual del Hero
4. Estado final (✅ Funcionando / ⚠️ Placeholder / ❌ Error)

---

## 📁 Archivos Creados

1. ✅ `VERIFICACION_HERO_PRODUCCION.md` - Guía completa de verificación
2. ✅ `REPORTE_HERO_PRODUCCION_TEMPLATE.md` - Template para el reporte final

---

## 🔗 Links Útiles

- **Vercel:** https://vercel.com/dashboard
- **Supabase:** https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea
- **Producción:** https://mercadito-online-py.vercel.app

---

**Siguiente acción:** Verificar variable en Vercel → Redeploy → Revisar Console y Network → Completar reporte


