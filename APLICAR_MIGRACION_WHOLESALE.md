# Aplicar Migración: Sistema de Precios Mayoristas

## ⚠️ Error Actual
```
Could not find the 'wholesale_discount_percent' column of 'products' in the schema cache
```

## 🔧 Solución: Ejecutar Migración

### Opción 1: Usando Supabase CLI (Recomendado)

1. **Asegúrate de estar vinculado al proyecto:**
   ```bash
   supabase link --project-ref hqdatzhliaordlsqtjea
   ```
   (Usa tu token de acceso si te lo pide)

2. **Aplicar la migración:**
   ```bash
   supabase db push --linked
   ```

### Opción 2: Manualmente en Supabase Dashboard

1. Ve a tu proyecto en Supabase Dashboard: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea

2. Ve a **SQL Editor**

3. Copia y pega el contenido de `supabase/migrations/20251104000000_wholesale_pricing.sql`

4. Ejecuta el SQL

### Opción 3: Esperar a GitHub Actions

Si haces push a `main`, el workflow `Prod CI/CD` aplicará automáticamente las migraciones pendientes.

## ✅ Verificación

Después de ejecutar la migración, verifica que las columnas existan:

```sql
-- Verificar columnas en products
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'products' 
AND column_name LIKE 'wholesale%';

-- Verificar columnas en order_items
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'order_items' 
AND column_name LIKE 'wholesale%';
```

Deberías ver:
- `wholesale_enabled` (boolean)
- `wholesale_min_quantity` (integer)
- `wholesale_discount_percent` (decimal)
- `applied_wholesale` (boolean)
- `wholesale_discount_amount` (decimal)

## 🚀 Después de Aplicar

Una vez aplicada la migración, recarga la página del formulario de producto y el error debería desaparecer.

