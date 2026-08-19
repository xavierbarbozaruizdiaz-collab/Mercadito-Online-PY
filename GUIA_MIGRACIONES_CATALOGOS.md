# 📚 GUÍA COMPLETA: MIGRACIONES DE CATÁLOGOS
**Documentación DevOps para aplicar migraciones del sistema de catálogos**

---

## 🎯 COMANDO EXACTO PARA APLICAR MIGRACIONES

### ✅ Comando Principal (RECOMENDADO)
```bash
npm run db:push
```

**O directamente:**
```bash
npx supabase db push
```

---

## 📦 SCRIPTS DISPONIBLES EN package.json

Después de la actualización, tienes estos scripts:

```json
{
  "scripts": {
    "db:push": "npx supabase db push",              // Aplicar migraciones pendientes
    "db:push:all": "npx supabase db push --include-all",  // Aplicar todas (incluyendo nuevas)
    "db:migrate": "npx supabase db push",            // Alias de db:push
    "db:status": "npx supabase migration list"      // Ver estado de migraciones
  }
}
```

---

## ✅ PREREQUISITOS

### 1. Supabase CLI instalado
```bash
# Verificar
supabase --version

# Si no está instalado
npm install -g supabase
# o usar npx (ya incluido en el proyecto)
```

### 2. Autenticado en Supabase
```bash
supabase login
```

Esto abrirá el navegador para autenticarte.

### 3. Proyecto linkeado
```bash
# Ver proyectos disponibles
supabase projects list

# Si necesitas linkear
supabase link --project-ref hqdatzhliaordlsqtjea
```

**Nota:** Reemplaza `hqdatzhliaordlsqtjea` con tu project-ref real.

---

## 🚀 PROCESO COMPLETO

### Paso 1: Verificar estado actual
```bash
npm run db:status
```

Esto mostrará qué migraciones están aplicadas y cuáles pendientes.

### Paso 2: Aplicar migraciones
```bash
npm run db:push
```

**Salida esperada:**
```
Applying migration 20251117000000_add_catalog_fields_to_products.sql...
Applying migration 20251117001000_create_store_ad_catalogs_tables.sql...
Finished supabase db push.
```

### Paso 3: Verificar aplicación
```bash
# Opción 1: Ver estado nuevamente
npm run db:status

# Opción 2: Verificar en Supabase Dashboard
# https://supabase.com/dashboard/project/TU_PROJECT_REF/database/migrations
```

---

## 🔍 VERIFICACIÓN EN SQL

Después de aplicar, ejecuta en Supabase SQL Editor:

```sql
-- 1. Verificar campos en products
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

-- 2. Verificar tablas creadas
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('store_ad_catalogs', 'store_ad_catalog_products');

-- 3. Verificar migraciones aplicadas
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
WHERE version IN (
  '20251117000000',
  '20251117001000'
)
ORDER BY inserted_at DESC;
```

---

## 📝 CAMBIOS EN package.json

Se agregaron estos scripts nuevos:

```json
"db:migrate": "npx supabase db push",        // Alias para db:push
"db:status": "npx supabase migration list"  // Ver estado de migraciones
```

**Scripts existentes (sin cambios):**
- `db:push` - Ya existía, sigue funcionando igual
- `db:push:all` - Ya existía, sigue funcionando igual

---

## ⚠️ NOTAS IMPORTANTES

1. **Idempotencia:** Las migraciones usan `IF NOT EXISTS`, así que puedes ejecutarlas múltiples veces sin problemas.

2. **Orden:** Las migraciones se aplican en orden cronológico automáticamente.

3. **Rollback:** Supabase no tiene rollback automático. Si necesitas revertir, crea una migración nueva.

4. **Producción:** Para producción, el comando es el mismo, pero asegúrate de estar linkeado al proyecto correcto.

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### Problema: "command not found: supabase"
**Solución:**
```bash
# Usar npx (recomendado)
npx supabase db push

# O instalar globalmente
npm install -g supabase
```

### Problema: "Not logged in"
**Solución:**
```bash
supabase login
```

### Problema: "Project not linked"
**Solución:**
```bash
# Ver proyectos disponibles
supabase projects list

# Linkear proyecto
supabase link --project-ref TU_PROJECT_REF
```

### Problema: "Migration already applied"
**Solución:** Esto es normal. Supabase salta migraciones ya aplicadas automáticamente.

---

## 📊 RESUMEN EJECUTIVO

**Comando a ejecutar:**
```bash
npm run db:push
```

**Prerequisitos:**
1. ✅ Supabase CLI (o usar `npx`)
2. ✅ Logueado (`supabase login`)
3. ✅ Proyecto linkeado (`supabase link`)

**Verificación:**
- Ejecutar `npm run db:status` para ver estado
- O verificar en Supabase Dashboard → Database → Migrations

---

**¡Listo para aplicar las migraciones!**



