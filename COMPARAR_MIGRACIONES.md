# 🔍 COMPARAR: Migraciones Repo vs Supabase PROD

**Fecha:** $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

---

## 📊 MIGRACIONES EN EL REPOSITORIO

### Total: **100 archivos SQL**

**Lista completa ordenada cronológicamente:**

1. `20250128000000_orders_system.sql`
2. `20250128000001_fix_products_structure.sql`
3. `20250128000002_products_table.sql`
4. `20250128000004_complete_references.sql`
5. `20250128000008_complete_setup.sql`
6. `20250128000009_add_categories.sql`
7. `20250128000010_add_sample_categories.sql`
8. `20250128000011_fix_categories_access.sql`
9. `20250128000012_debug_categories.sql`
10. `20250128000013_verify_categories.sql`
11. `20250128000014_enable_categories_rls.sql`
12. `20250128000015_fix_product_images.sql`
13. `20250128000016_final_fix_product_images.sql`
14. `20250128000017_fix_is_cover_column.sql`
15. `20250128000018_debug_categories.sql`
16. `20250128000019_fix_categories_rls.sql`
17. `20250128000020_final_categories_fix.sql`
18. `20250128000021_final_verification.sql`
19. `20250128000022_fix_profiles_recursion.sql`
20. `20250128000023_assign_admin_role.sql`
21. `20250128000024_admin_functions.sql`
22. `20250128000025_fix_profile_creation.sql`
23. `20250128000026_fix_sql_functions.sql`
24. `20250128000029_simple_schema_update.sql`
25. `20250128000032_chat_system_final.sql`
26. `20250128000034_analytics_system_fixed.sql`
27. `20250128000035_backup_system.sql`
28. `20250128000036_wishlist_system.sql`
29. `20250128000037_payment_system.sql`
30. `20250128000038_shipping_system.sql`
31. `20250128000039_push_notifications.sql`
32. `20250128000040_referral_system.sql`
33. `20250128000041_reviews_system.sql`
34. `20250128000042_coupons_system.sql`
35. `20250128000043_seller_analytics.sql`
36. `20250128000044_notifications_system.sql`
37. `20250128000045_marketplace_features.sql`
38. `20250128000046_security_audit_final.sql`
39. `20250128000047_fix_rls_recursion_final.sql`
40. `20250128000048_fix_recursion_urgent.sql`
41. `20250128000049_store_categories.sql`
42. `20250128000050_structured_location.sql`
43. `20250128000051_fix_stores_rls.sql`
44. `20250128000052_user_activity_tracking.sql`
45. `20250128000053_product_approval.sql`
46. `20250128000054_orders_disputes.sql`
47. `20250128000055_orders_admin_rls.sql`
48. `20250128000056_site_settings.sql`
49. `20250128000057_content_management.sql`
50. `20250128000058_banners_and_user_ban.sql`
51. `20250128000059_bulk_notifications_log.sql`
52. `20250128000060_categories_admin_rls.sql`
53. `20250128000061_add_categories_columns.sql`
54. `20250128000062_fix_category_slugs.sql`
55. `20250128000063_create_banners_bucket.sql`
56. `20250128000064_add_banner_fields_to_hero.sql`
57. `20250128000065_fix_hero_slides_rls.sql`
58. `20250128000066_prevent_own_product_cart.sql`
59. `20250128000067_add_product_attributes.sql`
60. `20250128000068_fix_product_images_storage_rls.sql`
61. `20250128000070_sync_store_names_with_profiles.sql`
62. `20250128000071_fix_price_history_rls.sql`
63. `20250128000072_fix_products_update_rls.sql`
64. `20250128000073_add_whatsapp_notification_trigger.sql`
65. `20250128000074_fix_orders_rls_for_buyers.sql`
66. `20250130000001_auction_system.sql`
67. `20250130000002_fix_product_delete.sql`
68. `20250130000003_get_server_time.sql`
69. `20250130000004_auction_security_enhancements.sql`
70. `20250130000005_setup_scheduler.sql`
71. `20250130000006_auction_max_duration.sql`
72. `20250130000007_scalability_security.sql`
73. `20250130000008_final_optimizations.sql`
74. `20250130000009_audit_and_maintenance.sql`
75. `20250130000010_backup_system.sql`
76. `20250201000001_commission_system.sql`
77. `20250201000002_inventory_system.sql`
78. `20250201000003_update_order_creation.sql`
79. `20250201000004_update_auction_close_with_commissions.sql`
80. `20250201000005_fix_seller_balance_update.sql`
81. `20250201000006_payout_system.sql`
82. `20250201000007_order_cancellation_refund.sql`
83. `20250201000008_fix_stores_rls_for_admins.sql`
84. `20250201000009_affiliate_system.sql`
85. `20250202000001_influencer_system.sql`
86. `20250202000002_membership_bid_validation.sql`
87. `20250202000003_penalty_system.sql`
88. `20250202000004_membership_plans_system.sql`
89. `20250202000005_seller_delivery_protection.sql`
90. `20250202000006_create_auction_order_function.sql`
91. `20250202000007_publication_limits_membership.sql`
92. `20250202000008_product_expiration_handling.sql`
93. `20250203000000_fix_products_structure_syntax.sql`
94. `20251027185944_storage.sql`
95. `20251027194329_profiles_table.sql`
96. `20251027204301_categories_seed.sql`
97. `20251027213611_product_images_limit.sql`
98. `20251030_hero_carousel.sql`
99. `202511021649_prod_align.sql`
100. `20251103000000_fix_hero_slides_table.sql` ⚠️ **NUEVA**

---

## 🔍 PASO 1: OBTENER MIGRACIONES APLICADAS EN PROD

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

**Copia TODOS los resultados** (debe ser una lista de ~90-100 migraciones).

---

## 📊 PASO 2: COMPARAR

### Método Manual:

1. **Toma la lista de arriba** (100 migraciones del repo)
2. **Toma el resultado del SQL** (migraciones aplicadas en PROD)
3. **Compara:**
   - Si una migración está en el repo pero NO en el resultado del SQL = **PENDIENTE**

### Método Automático:

**Usa Supabase CLI:**
```bash
supabase link --project-ref hqdatzhliaordlsqtjea
supabase db push --linked
```

Esto aplicará automáticamente todas las migraciones pendientes.

---

## ⚠️ MIGRACIONES PROBABLEMENTE PENDIENTES

**Recientes (noviembre 2025):**
- ⚠️ `20251103000000_fix_hero_slides_table.sql` - **MUY PROBABLE QUE FALTE**
- ⚠️ `202511021649_prod_align.sql` - **POSIBLE QUE FALTE**
- ⚠️ `20251030_hero_carousel.sql` - **POSIBLE QUE FALTE**

**Estas son las más recientes y probablemente no están aplicadas aún.**

---

## 🚀 SOLUCIÓN RÁPIDA

### Aplicar Todas las Pendientes Automáticamente:

**El workflow `prod.yml` lo hará automáticamente** cuando hagas push a `main`, PERO puedes aplicarlas manualmente ahora:

**Opción A: Supabase CLI**
```bash
supabase link --project-ref hqdatzhliaordlsqtjea
supabase db push --linked
```

**Opción B: Supabase Dashboard**
1. Abre cada migración pendiente
2. Copia el contenido
3. Pega en Supabase SQL Editor
4. Ejecuta

---

## 📝 REPORTE ESPERADO

**Después de ejecutar el SQL en Supabase, deberías ver:**

```
Total migraciones en repo: 100
Total migraciones aplicadas: [número del SQL]
Migraciones pendientes: [diferencia]

Migraciones pendientes identificadas:
- 20251103000000_fix_hero_slides_table.sql
- [otras si las hay]
```

---

## ✅ PRÓXIMO PASO

**Ejecuta el SQL en Supabase y compárteme el resultado** (o número total aplicado) y te diré exactamente cuáles faltan.


