# Últimas Migraciones Pendientes (Relacionadas con el Último Problema)

## 🔍 Contexto del Último Problema

El último problema fue el **error de autenticación SASL** que impidió que `supabase db push` se ejecutara. Cuando el comando intentó ejecutarse con `--include-all`, detectó estas migraciones como pendientes:

## 📋 Migraciones Detectadas como Pendientes

Basándome en la salida del comando `db push --include-all` que se ejecutó anteriormente, estas fueron las migraciones que el CLI intentó aplicar antes de fallar por el error de conexión:

### Migraciones del 30 de Enero 2025 (que causaron el primer error de duplicados)
1. `20250130000011_fix_store_membership_expiration.sql` ⚠️ **RENOMBRADA** (era duplicada)
2. `20250130000012_store_membership_notifications_reactivation.sql` ⚠️ **RENOMBRADA** (era duplicada)

### Migraciones del 31 de Enero 2025
3. `20250131000001_approve_pending_membership.sql`

### Migraciones del 1 de Febrero 2025
4. `20250201000004_update_auction_close_with_commissions.sql` ⚠️ **RENOMBRADA** (era duplicada, ahora es `20250201000010_...`)

### Migraciones del 2 de Febrero 2025
5. `20250202000009_fix_close_expired_race_condition_final.sql`
6. `20250202000010_add_anti_sniping_limits.sql`
7. `20250202000011_centralize_bonus_time_config.sql`
8. `20250202000012_place_bid_final_version.sql`

### Migraciones del 3 de Febrero 2025
9. `20250203000001_marketing_system.sql`
10. `20250203000002_store_marketing_integrations.sql`

### Migraciones de Noviembre 2025 (Más Recientes)
11. `20251112170000_fix_product_audit_trigger.sql`
12. `20251113000000_add_store_membership_plan.sql`
13. `20251113010000_update_order_statuses.sql`
14. `20251114093000_fix_is_user_store_owner.sql`
15. `20251114094500_add_admin_profiles_policy.sql`
16. `20251116010000_user_reputation_system.sql`
17. `20251116011000_user_reputation_triggers.sql`
18. `20251116012000_update_place_bid_with_reputation.sql`
19. `20251117000000_add_catalog_fields_to_products.sql`
20. `20251117001000_create_store_ad_catalogs_tables.sql`
21. `20251124000000_add_fallback_store_and_sourcing_orders.sql`
22. `20251124120000_oauth_system.sql`
23. `20251124120001_oauth_gpt_client_seed.sql`
24. `20251127000000_fix_site_settings_rls_and_show_title.sql`
25. `20251127000002_fix_conversation_id_ambiguous.sql`
26. `20251127000003_fix_footer_settings_rls.sql`
27. `20251127000004_fix_double_encoded_settings.sql`
28. `20251127000005_add_public_rls_site_settings.sql`
29. `20251127000006_add_site_description.sql`
30. `20251127000007_fix_contact_settings_verification.sql`
31. `20251127000008_add_admin_delete_products_rls.sql`
32. `20251130000003_fix_membership_levels.sql`

### Migraciones de Diciembre 2025 (LAS MÁS RECIENTES)
33. `20251201174018_add_public_rls_bank_settings.sql`
34. `20251201200001_add_profiles_updated_at_column.sql`
35. `20251202000001_fix_approve_pending_membership.sql`

---

## 🎯 Las ÚLTIMAS 5 Migraciones (Más Recientes)

Estas son las migraciones más recientes que probablemente son las que realmente faltan:

1. **`20251202000001_fix_approve_pending_membership.sql`** - 2 de Diciembre 2025
2. **`20251201200001_add_profiles_updated_at_column.sql`** - 1 de Diciembre 2025
3. **`20251201174018_add_public_rls_bank_settings.sql`** - 1 de Diciembre 2025
4. **`20251130000003_fix_membership_levels.sql`** - 30 de Noviembre 2025
5. **`20251127000008_add_admin_delete_products_rls.sql`** - 27 de Noviembre 2025

---

## ⚠️ Importante

**Estas son las migraciones que el CLI detectó como pendientes**, pero **NO significa que todas realmente falten en producción**.

Para saber con certeza cuáles faltan, necesitas:

1. **Verificar en Supabase Dashboard → SQL Editor:**
   ```sql
   SELECT version, name 
   FROM supabase_migrations.schema_migrations 
   ORDER BY version DESC 
   LIMIT 50;
   ```

2. **Comparar con las locales** para ver cuáles realmente faltan

3. **Solo aplicar las que realmente falten**

---

## 📝 Nota sobre las Migraciones Renombradas

Las migraciones que fueron renombradas para corregir duplicados:
- `20250130000011_fix_store_membership_expiration.sql` (era `20250130000001_...`)
- `20250130000012_store_membership_notifications_reactivation.sql` (era `20250130000002_...`)
- `20250201000010_update_auction_close_with_commissions.sql` (era `20250201000004_...`)

Estas **pueden o no estar aplicadas** en producción con sus timestamps originales. Si ya están aplicadas con el timestamp original, estas versiones renombradas **NO deben aplicarse** (causarían error de duplicado).


