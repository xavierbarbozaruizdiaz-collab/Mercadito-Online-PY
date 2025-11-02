# 🔧 Instrucciones para Aplicar Migraciones de Comisiones

## ⚠️ Problema Detectado

La tabla `commission_settings` no existe en la base de datos, lo que causa el error:
```
Could not find the table 'public.commission_settings' in the schema cache
```

## ✅ Solución

Necesitas aplicar las migraciones SQL que crean el sistema de comisiones e inventario.

## 📋 Opción 1: Usando Supabase Dashboard (Recomendado)

1. **Ve a tu proyecto en Supabase Dashboard**
   - URL: https://supabase.com/dashboard/project/[TU_PROJECT_ID]

2. **Navega a SQL Editor**
   - Menú lateral → SQL Editor

3. **Copia y ejecuta las migraciones en orden:**

   a. **Primera migración** (Sistema de Comisiones):
      - Abre el archivo: `supabase/migrations/20250201000001_commission_system.sql`
      - Copia TODO el contenido
      - Pégalo en SQL Editor
      - Haz clic en "Run"

   b. **Segunda migración** (Sistema de Inventario):
      - Archivo: `supabase/migrations/20250201000002_inventory_system.sql`
      - Copia y ejecuta

   c. **Tercera migración** (Actualizar creación de órdenes):
      - Archivo: `supabase/migrations/20250201000003_update_order_creation.sql`
      - Copia y ejecuta

   d. **Cuarta migración** (Subastas con comisiones):
      - Archivo: `supabase/migrations/20250201000004_update_auction_close_with_commissions.sql`
      - Copia y ejecuta

   e. **Quinta migración** (Fix balance vendedor):
      - Archivo: `supabase/migrations/20250201000005_fix_seller_balance_update.sql`
      - Copia y ejecuta

   f. **Sexta migración** (Sistema de Retiros):
      - Archivo: `supabase/migrations/20250201000006_payout_system.sql`
      - Copia y ejecuta

   g. **Séptima migración** (Cancelaciones):
      - Archivo: `supabase/migrations/20250201000007_order_cancellation_refund.sql`
      - Copia y ejecuta

## 📋 Opción 2: Usando Supabase CLI

Si tienes Supabase CLI instalado:

```bash
# Asegúrate de estar enlazado a tu proyecto
npx supabase link --project-ref [TU_PROJECT_REF]

# Aplicar todas las migraciones pendientes
npm run db:push

# O manualmente
npx supabase db push
```

## ✅ Verificación

Después de aplicar las migraciones, verifica que las tablas existan:

```sql
-- En SQL Editor de Supabase, ejecuta:
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'commission_settings',
  'platform_fees',
  'seller_balance',
  'cart_reservations',
  'stock_movements',
  'stock_alerts',
  'payout_requests'
);
```

Deberías ver las 7 tablas listadas.

## 🐛 Si hay errores

Si alguna migración falla:

1. **Revisa el error** en la consola de Supabase
2. **Verifica dependencias**: Algunas migraciones requieren que otras se ejecuten primero
3. **Verifica permisos**: Asegúrate de tener permisos de administrador
4. **Rollback**: Si es necesario, puedes revertir manualmente ejecutando:
   ```sql
   DROP TABLE IF EXISTS [nombre_tabla] CASCADE;
   ```

## 📝 Notas Importantes

- ⚠️ **NO** ejecutes las migraciones si ya existen las tablas (usar `CREATE TABLE IF NOT EXISTS` previene duplicados)
- ⚠️ Las migraciones deben ejecutarse **en orden** (por fecha en el nombre)
- ⚠️ Algunas funciones SQL pueden requerir permisos especiales

## 🔄 Después de Aplicar

1. **Refresca la página** de administración de comisiones
2. **Verifica** que ya no aparezcan errores en la consola
3. **Crea una configuración** de comisión global para probar

---

Si necesitas ayuda adicional, comparte el error específico que recibes al ejecutar las migraciones.



