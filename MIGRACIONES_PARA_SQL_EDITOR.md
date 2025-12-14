# Migraciones para Aplicar en Supabase SQL Editor

## 📋 Instrucciones

1. Ve a **Supabase Dashboard** → **SQL Editor**
2. Aplica las migraciones **en orden cronológico** (de la más antigua a la más reciente)
3. Ejecuta cada archivo SQL completo en el editor
4. Verifica que cada migración se ejecute sin errores antes de continuar

## ⚠️ Importante

- **Aplica las migraciones en orden** (por timestamp)
- **No saltes ninguna migración**
- Si una migración falla, revisa el error antes de continuar
- Algunas migraciones pueden tardar varios minutos en ejecutarse

---

## 📅 Migraciones Pendientes (Orden Cronológico)

### Enero 2025

#### 30 de Enero
1. `20250130000001_auction_system.sql` - Sistema de subastas completo
2. `20250130000002_fix_product_delete.sql` - Fix para eliminar productos
3. `20250130000003_get_server_time.sql` - Función para obtener tiempo del servidor
4. `20250130000004_auction_security_enhancements.sql` - Mejoras de seguridad anti-trampa
5. `20250130000005_setup_scheduler.sql` - Configuración del scheduler
6. `20250130000006_auction_max_duration.sql` - Duración máxima de subastas
7. `20250130000007_scalability_security.sql` - Escalabilidad y seguridad
8. `20250130000008_final_optimizations.sql` - Optimizaciones finales
9. `20250130000009_audit_and_maintenance.sql` - Auditoría y mantenimiento
10. `20250130000010_backup_system.sql` - Sistema de backup
11. `20250130000011_fix_store_membership_expiration.sql` - ⚠️ **RENOMBRADA** (era duplicada)
12. `20250130000012_store_membership_notifications_reactivation.sql` - ⚠️ **RENOMBRADA** (era duplicada)

#### 31 de Enero
13. `20250131000001_approve_pending_membership.sql` - Aprobar membresía pendiente

### Febrero 2025

#### 1 de Febrero
14. `20250201000001_commission_system.sql` - Sistema de comisiones
15. `20250201000002_inventory_system.sql` - Sistema de inventario
16. `20250201000003_update_order_creation.sql` - Actualizar creación de órdenes
17. `20250201000004_raffle_winner_photos.sql` - Fotos de ganadores de sorteos
18. `20250201000005_fix_seller_balance_update.sql` - Fix actualización balance vendedor
19. `20250201000006_payout_system.sql` - Sistema de pagos
20. `20250201000007_order_cancellation_refund.sql` - Cancelación y reembolso de órdenes
21. `20250201000008_fix_stores_rls_for_admins.sql` - Fix RLS de tiendas para admins
22. `20250201000009_affiliate_system.sql` - Sistema de afiliados
23. `20250201000010_update_auction_close_with_commissions.sql` - ⚠️ **RENOMBRADA** (era duplicada)

#### 2 de Febrero
24. `20250202000001_influencer_system.sql` - Sistema de influencers
25. `20250202000002_membership_bid_validation.sql` - Validación de pujas por membresía
26. `20250202000003_penalty_system.sql` - Sistema de penalizaciones
27. `20250202000004_membership_plans_system.sql` - Sistema de planes de membresía
28. `20250202000005_seller_delivery_protection.sql` - Protección de entrega del vendedor
29. `20250202000006_create_auction_order_function.sql` - Función para crear orden de subasta
30. `20250202000007_publication_limits_membership.sql` - Límites de publicación por membresía
31. `20250202000008_product_expiration_handling.sql` - Manejo de expiración de productos
32. `20250202000009_fix_close_expired_race_condition_final.sql` - Fix condición de carrera al cerrar
33. `20250202000010_add_anti_sniping_limits.sql` - Límites anti-sniping
34. `20250202000011_centralize_bonus_time_config.sql` - Centralizar configuración de tiempo bonus
35. `20250202000012_place_bid_final_version.sql` - Versión final de place_bid

#### 3 de Febrero
36. `20250203000000_fix_products_structure_syntax.sql` - Fix sintaxis estructura productos
37. `20250203000001_marketing_system.sql` - Sistema de marketing
38. `20250203000002_store_marketing_integrations.sql` - Integraciones de marketing de tiendas

### Octubre 2025

39. `20251027185944_storage.sql` - Configuración de storage
40. `20251027194329_profiles_table.sql` - Tabla de perfiles
41. `20251027204301_categories_seed.sql` - Seed de categorías
42. `20251027213611_product_images_limit.sql` - Límite de imágenes de productos
43. `20251030_hero_carousel.sql` - Carousel hero

### Noviembre 2025

44. `202511021649_prod_align.sql` - Alineación con producción
45. `20251103000000_fix_hero_slides_table.sql` - Fix tabla hero slides
46. `20251103000001_fix_hero_slides_table.sql` - ⚠️ **RENOMBRADA** (era fix_hero_slides_table.sql sin timestamp)
47. `20251103232213_showcase_system.sql` - Sistema showcase
48. `20251103233120_store_favorites.sql` - Favoritos de tiendas
49. `20251104000000_wholesale_pricing.sql` - Precios mayoristas
50. `20251112170000_fix_product_audit_trigger.sql` - Fix trigger de auditoría de productos
51. `20251113000000_add_store_membership_plan.sql` - Agregar plan de membresía de tienda
52. `20251113010000_update_order_statuses.sql` - Actualizar estados de órdenes
53. `20251114093000_fix_is_user_store_owner.sql` - Fix función is_user_store_owner
54. `20251114094500_add_admin_profiles_policy.sql` - Agregar política de perfiles admin
55. `20251116010000_user_reputation_system.sql` - Sistema de reputación de usuarios
56. `20251116011000_user_reputation_triggers.sql` - Triggers de reputación de usuarios
57. `20251116012000_update_place_bid_with_reputation.sql` - Actualizar place_bid con reputación
58. `20251117000000_add_catalog_fields_to_products.sql` - Agregar campos de catálogo a productos
59. `20251117001000_create_store_ad_catalogs_tables.sql` - Crear tablas de catálogos de anuncios
60. `20251124000000_add_fallback_store_and_sourcing_orders.sql` - Agregar tienda fallback y órdenes de sourcing
61. `20251124120000_oauth_system.sql` - Sistema OAuth
62. `20251124120001_oauth_gpt_client_seed.sql` - Seed cliente OAuth GPT
63. `20251127000000_fix_site_settings_rls_and_show_title.sql` - Fix RLS de configuraciones y mostrar título
64. `20251127000002_fix_conversation_id_ambiguous.sql` - Fix ID de conversación ambiguo
65. `20251127000003_fix_footer_settings_rls.sql` - Fix RLS de configuraciones de footer
66. `20251127000004_fix_double_encoded_settings.sql` - Fix configuraciones doble codificadas
67. `20251127000005_add_public_rls_site_settings.sql` - Agregar RLS público a configuraciones
68. `20251127000006_add_site_description.sql` - Agregar descripción del sitio
69. `20251127000007_fix_contact_settings_verification.sql` - Fix verificación de configuraciones de contacto
70. `20251127000008_add_admin_delete_products_rls.sql` - Agregar RLS de eliminación de productos para admin
71. `20251130000003_fix_membership_levels.sql` - Fix niveles de membresía

### Diciembre 2025

72. `20251201174018_add_public_rls_bank_settings.sql` - Agregar RLS público a configuraciones bancarias
73. `20251201200001_add_profiles_updated_at_column.sql` - Agregar columna updated_at a perfiles
74. `20251202000001_fix_approve_pending_membership.sql` - Fix aprobar membresía pendiente

---

## 🔍 Verificación Post-Migración

Después de aplicar todas las migraciones, ejecuta este SQL para verificar:

```sql
-- Ver todas las migraciones aplicadas
SELECT version, name, inserted_at
FROM supabase_migrations.schema_migrations
ORDER BY version ASC;

-- Contar total de migraciones
SELECT COUNT(*) as total_migraciones
FROM supabase_migrations.schema_migrations;
```

Deberías ver **al menos 74 migraciones** aplicadas (más las que ya tenías antes).

---

## 📝 Notas Importantes

1. **Migraciones Renombradas**: Las siguientes migraciones fueron renombradas para evitar duplicados:
   - `20250130000011_fix_store_membership_expiration.sql` (era `20250130000001_fix_store_membership_expiration.sql`)
   - `20250130000012_store_membership_notifications_reactivation.sql` (era `20250130000002_store_membership_notifications_reactivation.sql`)
   - `20250201000010_update_auction_close_with_commissions.sql` (era `20250201000004_update_auction_close_with_commissions.sql`)
   - `20251103000001_fix_hero_slides_table.sql` (era `fix_hero_slides_table.sql` sin timestamp)

2. **Orden Crítico**: Algunas migraciones dependen de otras. Asegúrate de aplicarlas en el orden mostrado.

3. **Tiempo Estimado**: Aplicar todas las migraciones puede tomar **15-30 minutos** dependiendo del tamaño de tu base de datos.

---

## 🚨 Si Algo Sale Mal

Si una migración falla:
1. Lee el mensaje de error completo
2. Verifica si la migración ya fue aplicada parcialmente
3. Revisa las dependencias (tablas, funciones, etc.)
4. Consulta los logs de Supabase para más detalles
5. Si es necesario, contacta al equipo de desarrollo












