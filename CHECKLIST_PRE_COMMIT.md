# ✅ CHECKLIST PRE-COMMIT

## 🚨 CRÍTICO - Revisar antes de commit

### 1. Errores de Linting/TypeScript ✅
- ✅ **CORREGIDO**: `src/app/checkout/success/page.tsx` - Errores de TypeScript corregidos
- ✅ Verificado: No hay más errores de linting

### 2. Archivos Sensibles ⚠️
- ⚠️ `.env.local` existe pero está en `.gitignore` ✅ (está bien)
- ✅ Verificar que NO se agregue `.env.local` al commit

### 3. Migraciones SQL ⏳
- ✅ `20250203000001_marketing_system.sql` - Ya aplicada
- ⏳ `20250203000002_store_marketing_integrations.sql` - **PENDIENTE** (SQL copiado al portapapeles)
  - **ACCIÓN**: Aplicar en Supabase Dashboard antes de hacer push

### 4. Variables de Entorno ⏳
- ⏳ `NEXT_PUBLIC_FEATURE_MARKETING=1` - Agregar en Vercel
- ⏳ `NEXT_PUBLIC_FACEBOOK_PIXEL_ID` - Agregar en Vercel (si existe)
- ⏳ `NEXT_PUBLIC_GA_ID` - Agregar en Vercel (si existe)
- ⏳ `NEXT_PUBLIC_GTM_ID` - Agregar en Vercel (opcional)

### 5. Feature Flag ⚠️
- ✅ Código está gated por `NEXT_PUBLIC_FEATURE_MARKETING`
- ⚠️ **IMPORTANTE**: Sin esta variable, el sistema per-store NO funcionará
- ✅ El tracking global seguirá funcionando sin esta variable

### 6. Console.logs ⚠️
- ✅ Verificado: No hay `console.log` en código nuevo de marketing
- ✅ Los servicios usan `logger` correctamente

### 7. Seguridad ✅
- ✅ RLS policies configuradas
- ✅ Validación Zod en API
- ✅ AuthZ en API route (solo owner puede actualizar)

---

## 📋 CHECKLIST FINAL

### Antes de `git add`:
- [x] Errores de TypeScript corregidos
- [x] No hay console.logs en código nuevo
- [x] `.env.local` no está en staging
- [x] Feature flag documentado
- [ ] **OPCIONAL**: Aplicar migración SQL primero (recomendado)

### Antes de `git commit`:
- [ ] Verificar que `.env.local` NO esté en `git add`
- [ ] Revisar mensaje de commit descriptivo
- [ ] Considerar hacer commit separado para docs vs código

### Antes de `git push`:
- [ ] **RECOMENDADO**: Aplicar migración SQL en Supabase
- [ ] Verificar que no haya secrets en el código
- [ ] Considerar hacer push a branch de desarrollo primero

---

## 🎯 RECOMENDACIONES

### Opción 1: Commit Incremental (Recomendado)
```bash
# 1. Commit de migraciones SQL
git add supabase/migrations/20250203000002_store_marketing_integrations.sql
git commit -m "feat: add per-store marketing integrations migration"

# 2. Commit de código core
git add src/lib/marketing/ src/app/api/stores/ src/app/(marketplace)/store/
git commit -m "feat: implement per-store marketing tracking system"

# 3. Commit de UI
git add src/app/(dashboard)/seller/marketing/ src/app/dashboard/marketing/
git commit -m "feat: add marketing dashboard UI for sellers"

# 4. Commit de servicios
git add src/lib/services/*Pixel* src/lib/services/*Analytics*
git commit -m "feat: add Facebook Pixel and GA4 services"

# 5. Commit de docs
git add *.md docs/
git commit -m "docs: add marketing system documentation"
```

### Opción 2: Commit Único
```bash
git add .
git commit -m "feat: implement complete marketing system (global + per-store tracking)"
```

---

## ⚠️ ADVERTENCIAS

1. **Migración SQL**: Si haces push sin aplicar la migración, el sistema per-store NO funcionará hasta que se aplique.

2. **Feature Flag**: Sin `NEXT_PUBLIC_FEATURE_MARKETING=1`, el sistema per-store está deshabilitado (seguro, pero no funcionará).

3. **Variables de Entorno**: El tracking global necesita las variables en Vercel para funcionar.

---

## ✅ ESTADO ACTUAL

- ✅ **Código**: Listo para commit
- ✅ **Linting**: Sin errores
- ✅ **TypeScript**: Sin errores
- ⏳ **Migración SQL**: Pendiente aplicar
- ⏳ **Variables de entorno**: Pendiente configurar en Vercel

---

**Conclusión**: ✅ **LISTO PARA COMMIT** (solo falta aplicar migración SQL y configurar variables, pero eso es post-deploy)

