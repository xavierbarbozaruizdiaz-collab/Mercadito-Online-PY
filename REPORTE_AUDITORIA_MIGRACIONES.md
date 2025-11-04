# 📊 REPORTE DE AUDITORÍA: Migraciones Supabase

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**Proyecto:** Mercadito Online PY
**Supabase Project Ref:** `hqdatzhliaordlsqtjea`

---

## 📋 ESTADO ACTUAL DEL REPO

### Migraciones en el Repositorio:

**Total:** 100 archivos SQL en `supabase/migrations/`

**Desglose:**
- ✅ **98 migraciones** con formato timestamp correcto (`YYYYMMDDHHMMSS_nombre.sql`)
- ✅ **2 migraciones** sin timestamp (ya renombradas o manejadas)

**Últimas migraciones creadas:**
1. `202511022129_fix_hero_slides_table.sql` - **NUEVA** ⚠️
2. `202511021649_prod_align.sql`
3. `20251030_hero_carousel.sql`

---

## 🔍 PASO 1: VERIFICAR EN SUPABASE PROD

### SQL a Ejecutar:

1. **Ve a Supabase Dashboard:**
   ```
   https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql
   ```

2. **Ejecuta este SQL:**
   ```sql
   SELECT 
     version,
     name,
     executed_at
   FROM supabase_migrations.schema_migrations
   ORDER BY executed_at DESC
   LIMIT 50;
   ```

3. **Compara con los archivos en el repo:**
   - Archivos en repo: Lista completa en `AUDITORIA_MIGRACIONES.md`
   - Migraciones aplicadas: Resultado del SQL anterior

---

## 📊 PASO 2: IDENTIFICAR MIGRACIONES PENDIENTES

### Migraciones que probablemente faltan en PROD:

**Recientes (noviembre 2025):**
- ⚠️ `202511022129_fix_hero_slides_table.sql` - **MUY PROBABLE QUE FALTE**
- ⚠️ `202511021649_prod_align.sql` - **POSIBLE QUE FALTE**

**Antes de aplicar:**
1. Ejecuta el SQL de verificación arriba
2. Compara la lista con archivos en repo
3. Identifica cuáles faltan

---

## 🚀 PASO 3: APLICAR MIGRACIONES PENDIENTES

### Opción A: Manual (Recomendado para la primera vez)

**Para `202511022129_fix_hero_slides_table.sql`:**

1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql
2. Abre el archivo: `supabase/migrations/202511022129_fix_hero_slides_table.sql`
3. Copia TODO el contenido
4. Pega en Supabase SQL Editor
5. Ejecuta (RUN o Ctrl+Enter)
6. Verifica que no hay errores

**Repite para cada migración pendiente.**

### Opción B: Automático (Supabase CLI)

**Desde tu máquina local:**

```bash
# Conectar a proyecto
supabase link --project-ref hqdatzhliaordlsqtjea
# Te pedirá: SUPABASE_ACCESS_TOKEN

# Aplicar todas las migraciones pendientes
supabase db push --linked
```

**Resultado esperado:**
```
Applying migration 202511022129_fix_hero_slides_table.sql... OK
Applying migration 202511021649_prod_align.sql... OK
```

---

## ✅ PASO 4: VERIFICAR APLICACIÓN

### Después de aplicar migraciones:

**Ejecuta este SQL en Supabase:**

```sql
-- Verificar que las migraciones se aplicaron
SELECT 
  version,
  name,
  executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%hero%' OR version LIKE '20251102%'
ORDER BY executed_at DESC;
```

**Debe mostrar:**
- `202511022129_fix_hero_slides_table` con `executed_at` reciente
- `202511021649_prod_align` con `executed_at` reciente

---

## 🔄 FLUJO AUTOMÁTICO FUTURO

**Una vez configurado el workflow `prod.yml`:**

1. **Push a `main`** → GitHub Actions se ejecuta
2. **Job `migrate-db`** → Aplica migraciones pendientes automáticamente
3. **Si migraciones OK** → Job `deploy-vercel` → Dispara deployment en Vercel
4. **Si migraciones fallan** → Deployment NO se ejecuta

---

## 📝 CHECKLIST COMPLETO

### Antes de continuar:

- [ ] Ejecutar SQL de verificación en Supabase
- [ ] Identificar migraciones pendientes
- [ ] Aplicar migraciones pendientes (manual o CLI)
- [ ] Verificar que se aplicaron correctamente
- [ ] Configurar secrets en GitHub (ver `SECRETS_CONFIGURACION.md`)
- [ ] Crear deploy hook en Vercel (opcional)
- [ ] Hacer push a `main` para probar workflow

### Después del primer push:

- [ ] Verificar que workflow `Prod CI/CD` se ejecutó
- [ ] Verificar que job `migrate-db` fue exitoso
- [ ] Verificar que job `deploy-vercel` se ejecutó
- [ ] Verificar que deployment en Vercel fue exitoso
- [ ] Verificar que hero slider funciona en producción

---

## 🔗 ENLACES ÚTILES

- **Supabase Dashboard:** https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea
- **Supabase SQL Editor:** https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql
- **GitHub Secrets:** https://github.com/xavierbarbozaruizdiaz-collab/Mercadito-Online-PY/settings/secrets/actions
- **Vercel Deploy Hooks:** https://vercel.com/dashboard/project/mercadito-online-py/settings/deploy-hooks

---

## 📊 RESULTADO ESPERADO

Después de completar la auditoría:

```
✅ Total migraciones en repo: 100
✅ Total migraciones aplicadas en PROD: 100
✅ Migraciones pendientes: 0

Estado: ✅ TODO SINCRONIZADO
```

---

## 🚨 TROUBLESHOOTING

### Error: "migration already applied"
- ✅ **Es normal** - Significa que la migración ya estaba aplicada
- Puedes ignorar este mensaje

### Error: "column already exists"
- ✅ **Puede ser normal** - El SQL usa `IF NOT EXISTS`
- Revisa si el error es crítico o solo una advertencia

### Migraciones no se aplican automáticamente:
- Verifica que `SUPABASE_ACCESS_TOKEN` está configurado
- Verifica que el workflow tiene permisos para ejecutar
- Revisa los logs del workflow en GitHub Actions



