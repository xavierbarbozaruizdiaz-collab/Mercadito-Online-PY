# 🚀 APLICAR: Migración Pendiente

**Migración:** `20251103000000_fix_hero_slides_table.sql`

**Estado:** ⚠️ **PENDIENTE** (no está aplicada en PROD)

---

## 📋 PASO 1: Abrir el Archivo

**Ruta:** `supabase/migrations/20251103000000_fix_hero_slides_table.sql`

**Abre el archivo y copia TODO su contenido.**

---

## 📋 PASO 2: Ejecutar en Supabase

1. **Ve a:** https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql

2. **Pega el contenido completo del archivo**

3. **Ejecuta (RUN o Ctrl+Enter)**

4. **Verifica:** Debe ejecutarse sin errores y mostrar resultados de los SELECT al final

---

## ✅ PASO 3: Verificar

**Ejecuta en Supabase:**
```sql
-- Verificar que la migración se aplicó
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE name = 'fix_hero_slides_table'
ORDER BY version DESC;
```

**Debe mostrar:** `20251103000000_fix_hero_slides_table`

---

## 🔄 ALTERNATIVA: Automático

**Si prefieres que el workflow lo haga automáticamente:**

El workflow `prod.yml` aplicará esta migración (y cualquier otra pendiente) automáticamente cuando hagas push a `main`.

**Solo necesitas:**
1. Hacer commit de los archivos
2. Push a `main`
3. El workflow aplicará las migraciones pendientes
4. Luego deployará en Vercel

---

## 📊 RESULTADO ESPERADO

**Después de aplicar:**
- ✅ Migraciones en repo: 100
- ✅ Migraciones aplicadas: 100
- ✅ Pendientes: 0

**Estado:** ✅ **TODO SINCRONIZADO**











