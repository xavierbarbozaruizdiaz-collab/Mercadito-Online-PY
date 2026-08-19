# 🚀 COMANDO EXACTO PARA APLICAR MIGRACIONES DE CATÁLOGOS

**Senior DevOps LPMS - Mercadito Online PY**

---

## 📊 ESTADO ACTUAL DE MIGRACIONES

Según `npm run db:status`, las migraciones de catálogos están **PENDIENTES**:

- ✅ **Local:** `20251117000000_add_catalog_fields_to_products.sql`
- ❌ **Remote:** (vacío - no aplicada)
- ✅ **Local:** `20251117001000_create_store_ad_catalogs_tables.sql`
- ❌ **Remote:** (vacío - no aplicada)

**Nota:** Hay otras migraciones pendientes antes de estas, pero las de catálogos están al final de la lista.

---

## 🎯 COMANDO EXACTO PARA APLICAR

### ✅ OPCIÓN 1: Aplicar SOLO las migraciones nuevas (RECOMENDADO)

```bash
npm run db:push
```

**O directamente:**
```bash
npx supabase db push
```

**¿Qué hace?**
- Aplica solo las migraciones que están **después** de la última migración en remoto
- Incluye las dos migraciones de catálogos (`20251117000000` y `20251117001000`)
- **NO** intenta aplicar migraciones anteriores que puedan tener conflictos

**Salida esperada:**
```
Applying migration 20251117000000_add_catalog_fields_to_products.sql...
Applying migration 20251117001000_create_store_ad_catalogs_tables.sql...
Finished supabase db push.
```

---

### ⚠️ OPCIÓN 2: Aplicar TODAS las migraciones pendientes (si necesitas las anteriores también)

```bash
npm run db:push:all
```

**O directamente:**
```bash
npx supabase db push --include-all
```

**⚠️ ADVERTENCIA:** Este comando intentará aplicar TODAS las migraciones pendientes, incluyendo:
- `20250203000001_marketing_system.sql`
- `20250203000002_store_marketing_integrations.sql`
- `20251112170000_fix_product_audit_trigger.sql`
- Y otras...

Si alguna de estas ya está aplicada manualmente o tiene conflictos, puede fallar.

---

## ✅ PREREQUISITOS

### 1. Verificar que estás logueado
```bash
supabase login
```

Si no estás logueado, te abrirá el navegador para autenticarte.

### 2. Verificar que el proyecto está linkeado
```bash
supabase projects list
```

Si necesitas linkear:
```bash
supabase link --project-ref hqdatzhliaordlsqtjea
```

**Nota:** El project-ref puede variar. Verifica en tu Supabase Dashboard → Settings → General.

---

## 📝 SCRIPTS EN package.json

Los scripts ya están configurados correctamente:

```json
{
  "scripts": {
    "db:push": "npx supabase db push",                    // ✅ Aplicar migraciones nuevas
    "db:push:all": "npx supabase db push --include-all", // ⚠️ Aplicar todas (con conflictos potenciales)
    "db:migrate": "npx supabase db push",                 // Alias de db:push
    "db:status": "npx supabase migration list"           // Ver estado
  }
}
```

**No se requieren cambios en package.json** - todo está listo.

---

## 🔍 VERIFICACIÓN POST-APLICACIÓN

### 1. Verificar que se aplicaron
```bash
npm run db:status
```

Debes ver que las migraciones `20251117000000` y `20251117001000` ahora tienen valores en la columna "Remote".

### 2. Verificar en SQL (Supabase Dashboard → SQL Editor)

```sql
-- Verificar campos en products
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'products'
  AND column_name IN (
    'is_in_global_catalog',
    'catalog_valid_from',
    'catalog_valid_until',
    'catalog_priority',
    'exclude_from_store_catalog'
  );

-- Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products');
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Error: "Not logged in"
```bash
supabase login
```

### Error: "Project not linked"
```bash
supabase link --project-ref TU_PROJECT_REF
```

### Error: "Migration already applied"
Esto es normal. Supabase salta automáticamente las migraciones ya aplicadas.

### Error: "duplicate key value violates unique constraint"
Esto indica que hay una migración con el mismo timestamp que ya está aplicada. En este caso, usa la **OPCIÓN 2** (aplicar manualmente desde SQL Editor) o contacta al equipo.

---

## 📋 RESUMEN EJECUTIVO

**Comando a ejecutar:**
```bash
npm run db:push
```

**Prerequisitos:**
1. ✅ Supabase CLI (ya incluido en el proyecto, usa `npx`)
2. ✅ Logueado (`supabase login`)
3. ✅ Proyecto linkeado (`supabase link`)

**Verificación:**
- Ejecutar `npm run db:status` para confirmar aplicación
- O verificar en Supabase Dashboard → Database → Migrations

---

## 🎯 SIGUIENTE PASO DESPUÉS DE APLICAR

1. **Regenerar tipos TypeScript** (opcional pero recomendado):
   ```bash
   npm run typegen
   ```

2. **Probar el sistema:**
   - Acceder a `/dashboard/marketing/catalogo-mercadito`
   - Verificar que se pueden activar productos en catálogo
   - Verificar que aparecen en `/vitrina`

---

**✅ ¡Listo para aplicar las migraciones!**


