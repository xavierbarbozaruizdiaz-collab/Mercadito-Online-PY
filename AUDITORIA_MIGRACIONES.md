# 🔍 AUDITORÍA DE MIGRACIONES - Supabase PROD

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## 📋 PASO 1: LISTAR MIGRACIONES EN EL REPO

### Archivos en `supabase/migrations/`:

**Total de migraciones:** ~100 archivos SQL

**Migraciones más recientes (ordenadas por fecha):**
1. `20251103000000_fix_hero_slides_table.sql` - ⚠️ NUEVA (sin aplicar aún)
2. `202511021649_prod_align.sql`
3. `20251030_hero_carousel.sql`
4. `20251027213611_product_images_limit.sql`
5. `20251027204301_categories_seed.sql`
6. `20251027194329_profiles_table.sql`
7. `20251027185944_storage.sql`

**Y ~93 migraciones anteriores** (desde `20250128000000_orders_system.sql`)

---

## 🔍 PASO 2: VERIFICAR MIGRACIONES APLICADAS EN PROD

### SQL para ejecutar en Supabase Dashboard:

```sql
-- Ver migraciones aplicadas
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC
LIMIT 50;
```

**Instrucciones:**
1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql
2. Copia y pega el SQL de arriba
3. Ejecuta (RUN)
4. Compara la lista con los archivos en `supabase/migrations/`

---

## 📊 PASO 3: COMPARAR REPO vs PROD

### Migraciones que DEBEN estar aplicadas:

**Migraciones críticas (si faltan, la app no funciona):**
- ✅ `20250128000000_orders_system.sql`
- ✅ `20250128000001_fix_products_structure.sql`
- ✅ `20250128000002_products_table.sql`
- ✅ `20251027185944_storage.sql`
- ✅ `20251027194329_profiles_table.sql`
- ✅ `20251027204301_categories_seed.sql`
- ✅ `20250128000032_chat_system_final.sql`
- ✅ `20250128000037_payment_system.sql`

**Migraciones nuevas (probablemente sin aplicar):**
- ⚠️ `20251103000000_fix_hero_slides_table.sql` - **NUEVA**
- ⚠️ `202511021649_prod_align.sql` - **NUEVA**

---

## 🚀 PASO 4: APLICAR MIGRACIONES PENDIENTES

### Opción A: Manualmente (Supabase Dashboard)

1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql
2. Para cada migración pendiente:
   - Abre el archivo SQL
   - Copia el contenido
   - Pega en Supabase SQL Editor
   - Ejecuta (RUN)

### Opción B: Automáticamente (Supabase CLI)

**Desde tu máquina local (solo esta vez):**

```bash
# Conectar a Supabase
supabase link --project-ref hqdatzhliaordlsqtjea
# Te pedirá el access token

# Aplicar migraciones pendientes
supabase db push --linked
```

**Resultado esperado:**
- Aplicará todas las migraciones pendientes
- Mostrará qué migraciones se aplicaron
- Si hay errores, los mostrará

---

## 📝 PASO 5: REPORTE DE RESULTADO

Después de aplicar migraciones, ejecuta este SQL para verificar:

```sql
-- Ver todas las migraciones aplicadas
SELECT 
  version,
  name,
  executed_at,
  execution_time_ms
FROM supabase_migrations.schema_migrations
ORDER BY executed_at DESC;
```

**Compara:**
- Lista de migraciones en repo (100 archivos)
- Lista de migraciones aplicadas en PROD

**Si faltan migraciones:**
- Las migraciones faltantes aparecerán en la diferencia
- Aplícalas manualmente o con `supabase db push`

---

## ⚠️ NOTA IMPORTANTE

**El archivo `fix_hero_slides_table.sql` fue renombrado a:**
- `20251103000000_fix_hero_slides_table.sql`

**Razón:** Las migraciones de Supabase deben tener timestamp para ordenarse correctamente.

---

## ✅ PRÓXIMOS PASOS

1. **Ejecutar SQL de verificación en Supabase**
2. **Comparar con archivos en repo**
3. **Aplicar migraciones pendientes** (si las hay)
4. **Verificar que todo funciona**
5. **El workflow `prod.yml` aplicará migraciones automáticamente en el futuro**

---

## 📊 FORMATO ESPERADO DE RESULTADO

Después de la auditoría, deberías tener:

```
Migraciones en repo: 100
Migraciones aplicadas en PROD: 98
Migraciones pendientes: 2
  - 20251103000000_fix_hero_slides_table.sql
  - 202511021649_prod_align.sql

Estado: ⚠️ 2 migraciones pendientes
```



