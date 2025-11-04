# 🔍 REPORTE: Migraciones Pendientes

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## 📊 MIGRACIONES EN EL REPOSITORIO

### Total de Migraciones:
**100 archivos SQL** en `supabase/migrations/`

### Formatos:
- ✅ **Migraciones con timestamp:** Formato `YYYYMMDDHHMMSS_nombre.sql`
- ⚠️ **Migraciones sin timestamp:** Archivos que necesitan renombrarse

---

## 🔍 PASO 1: EJECUTAR EN SUPABASE

**Ve a:** https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql

**Ejecuta este SQL:**
```sql
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;
```

**O usa el archivo:** `supabase/verificar_migraciones_pendientes.sql`

**Copia el resultado completo** (todas las filas).

---

## 📋 PASO 2: COMPARAR

### Lista de Migraciones en Repo (ordenadas cronológicamente):

**Desde el inicio (enero 2025):**
1. `20250128000000_orders_system.sql`
2. `20250128000001_fix_products_structure.sql`
3. `20250128000002_products_table.sql`
4. ... (continúa hasta ~98 migraciones con timestamp)
5. `20251103000000_fix_hero_slides_table.sql` ⚠️ **NUEVA**

**Total esperado en PROD:** ~100 migraciones (o menos si faltan algunas)

---

## 🔍 PASO 3: IDENTIFICAR PENDIENTES

### Comparar manualmente:

1. **Toma el resultado del SQL de Supabase** (lista de versiones aplicadas)
2. **Compara con los archivos en `supabase/migrations/`**
3. **Las migraciones que están en el repo pero NO en la lista de Supabase = PENDIENTES**

### Migraciones Probablemente Pendientes:

**Recientes (noviembre 2025):**
- ⚠️ `20251103000000_fix_hero_slides_table.sql` - **MUY PROBABLE QUE FALTE**
- ⚠️ `202511021649_prod_align.sql` - **POSIBLE QUE FALTE**

**Antiguas (si hay alguna sin aplicar):**
- Depende del resultado del SQL en Supabase

---

## 🚀 PASO 4: APLICAR PENDIENTES

### Opción A: Manual (Supabase Dashboard)

Para cada migración pendiente:
1. Abre el archivo en `supabase/migrations/`
2. Copia TODO el contenido
3. Pega en Supabase SQL Editor
4. Ejecuta (RUN)

### Opción B: Automático (Supabase CLI)

```bash
# Conectar
supabase link --project-ref hqdatzhliaordlsqtjea

# Aplicar todas las pendientes
supabase db push --linked
```

### Opción C: Automático (Workflow GitHub Actions)

**Una vez configurados los secrets:**
- El workflow `prod.yml` aplicará automáticamente las migraciones pendientes en cada push
- No necesitas hacer nada manual

---

## 📊 RESULTADO ESPERADO

**Después de aplicar migraciones pendientes:**

```
Migraciones en repo: 100
Migraciones aplicadas en PROD: 100
Migraciones pendientes: 0

Estado: ✅ TODO SINCRONIZADO
```

---

## 🔗 ARCHIVOS ÚTILES

- **SQL de verificación:** `supabase/verificar_migraciones_pendientes.sql`
- **Migración hero_slides:** `supabase/migrations/20251103000000_fix_hero_slides_table.sql`
- **Workflow automático:** `.github/workflows/prod.yml`

---

## ⚠️ NOTA IMPORTANTE

**Para verificar correctamente:**
1. Ejecuta el SQL en Supabase
2. Compara manualmente con archivos en repo
3. O usa `supabase db push --linked` para aplicar todas las pendientes automáticamente




