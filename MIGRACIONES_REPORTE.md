# Reporte de Migraciones - Supabase

## Estado Actual

**Total de migraciones locales:** 141

## Problema Detectado

El comando `supabase db push` está fallando porque:

1. **Migraciones duplicadas con mismo timestamp:**
   - `20250130000001_auction_system.sql`
   - `20250130000001_fix_store_membership_expiration.sql` ⚠️ DUPLICADO
   - `20250130000002_fix_product_delete.sql`
   - `20250130000002_store_membership_notifications_reactivation.sql` ⚠️ DUPLICADO
   - `20250201000004_raffle_winner_photos.sql`
   - `20250201000004_update_auction_close_with_commissions.sql` ⚠️ DUPLICADO

2. **Migración con nombre inválido:**
   - `fix_hero_slides_table.sql` (no sigue el patrón `timestamp_nombre.sql`)

3. **Error al ejecutar:**
   ```
   ERROR: duplicate key value violates unique constraint "schema_migrations_pkey"
   Key (version)=(20250130000001) already exists.
   ```

## Soluciones Posibles

### Opción 1: Aplicar migraciones manualmente en Supabase Dashboard
1. Ve a Supabase Dashboard → SQL Editor
2. Copia y ejecuta cada migración pendiente manualmente
3. Usa el script: `npm run db:marketing` para copiar SQL al portapapeles

### Opción 2: Corregir timestamps duplicados
Renombrar las migraciones duplicadas con timestamps únicos antes de aplicar.

### Opción 3: Verificar estado remoto primero
Ejecutar en Supabase Dashboard SQL Editor:
```sql
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;
```

Luego comparar con las locales para ver cuáles realmente faltan.

## Últimas 10 Migraciones (más recientes)

1. `fix_hero_slides_table.sql` ⚠️ (nombre inválido)
2. `20251202000001_fix_approve_pending_membership.sql`
3. `20251201200001_add_profiles_updated_at_column.sql`
4. `20251201174018_add_public_rls_bank_settings.sql`
5. `20251130000003_fix_membership_levels.sql`
6. `20251127000008_add_admin_delete_products_rls.sql`
7. `20251127000007_fix_contact_settings_verification.sql`
8. `20251127000006_add_site_description.sql`
9. `20251127000005_add_public_rls_site_settings.sql`
10. `20251127000004_fix_double_encoded_settings.sql`

## Comandos Disponibles

- `npm run db:push` - Aplicar migraciones (falla por duplicados)
- `npm run db:push:all` - Aplicar todas incluyendo las que están antes de la última remota
- `npm run verify:migrations` - Ver lista de migraciones locales
- `npm run compare:migrations` - Comparar con producción












