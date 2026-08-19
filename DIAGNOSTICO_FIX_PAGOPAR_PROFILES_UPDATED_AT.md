# DIAGNÓSTICO Y FIX: Error Pagopar - `profiles.updated_at does not exist`

## 🔴 PROBLEMA IDENTIFICADO

Cuando un usuario intenta pagar una membresía con Pagopar, el sistema falla con el error:

```
column "updated_at" of relation "profiles" does not exist
```

**Error 400 (Bad Request)** en el endpoint `activate_membership_subscription`

### Errores en consola:
- `Error al procesar el pedido: column "updated_at" of relation "profiles" does not exist`
- `Error al activar membresía: column "updated_at" of relation "profiles" does not exist`

## 🔍 CAUSA RAÍZ

La tabla `profiles` fue creada en la migración `20251027194329_profiles_table.sql` **SIN** la columna `updated_at`:

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'buyer',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
  -- ❌ NO hay columna updated_at
);
```

Sin embargo, **múltiples funciones SQL** intentan actualizar `profiles.updated_at`:

1. ✅ `activate_membership_subscription()` - línea 265
2. ✅ `check_and_expire_memberships()` - línea 329 (y versión en 20250130000001, línea 79)
3. ✅ `reactivate_store_on_membership_renewal()` - línea 136
4. ✅ `approve_pending_membership_subscription()` - línea 77

## ✅ SOLUCIÓN APLICADA

**Migración creada:** `supabase/migrations/20251201200000_fix_profiles_updated_at_error.sql`

### Cambios realizados:

#### 1. `activate_membership_subscription()`
**Antes:**
```sql
UPDATE profiles
SET 
  membership_level = v_plan.level,
  membership_expires_at = v_expires_at,
  updated_at = NOW()  -- ❌ Columna no existe
WHERE id = p_user_id;
```

**Después:**
```sql
UPDATE profiles
SET 
  membership_level = v_plan.level,
  membership_expires_at = v_expires_at
  -- ✅ Removido updated_at
WHERE id = p_user_id;
```

#### 2. `check_and_expire_memberships()`
**Antes:**
```sql
UPDATE profiles p
SET 
  membership_level = 'free',
  membership_expires_at = NULL,
  updated_at = NOW()  -- ❌ Columna no existe
FROM membership_subscriptions ms
WHERE p.id = ms.user_id
  AND ms.status = 'expired'
  AND p.membership_level != 'free';
```

**Después:**
```sql
UPDATE profiles p
SET 
  membership_level = 'free',
  membership_expires_at = NULL
  -- ✅ Removido updated_at
FROM membership_subscriptions ms
WHERE p.id = ms.user_id
  AND ms.status = 'expired'
  AND p.membership_level != 'free';
```

#### 3. `reactivate_store_on_membership_renewal()`
**Antes:**
```sql
UPDATE profiles
SET 
  membership_level = 'store',
  membership_expires_at = NEW.expires_at,
  updated_at = NOW()  -- ❌ Columna no existe
WHERE id = NEW.user_id;
```

**Después:**
```sql
UPDATE profiles
SET 
  membership_level = 'store',
  membership_expires_at = NEW.expires_at
  -- ✅ Removido updated_at
WHERE id = NEW.user_id;
```

#### 4. `approve_pending_membership_subscription()`
**Antes:**
```sql
UPDATE profiles
SET 
  membership_level = v_plan.level,
  membership_expires_at = v_expires_at,
  updated_at = NOW()  -- ❌ Columna no existe
WHERE id = v_subscription.user_id;
```

**Después:**
```sql
UPDATE profiles
SET 
  membership_level = v_plan.level,
  membership_expires_at = v_expires_at
  -- ✅ Removido updated_at
WHERE id = v_subscription.user_id;
```

## 📋 FUNCIONES CORREGIDAS

✅ `activate_membership_subscription()` - Removida referencia a `profiles.updated_at`
✅ `check_and_expire_memberships()` - Removida referencia a `profiles.updated_at` (mantiene lógica de desactivación de tiendas)
✅ `reactivate_store_on_membership_renewal()` - Removida referencia a `profiles.updated_at`
✅ `approve_pending_membership_subscription()` - Removida referencia a `profiles.updated_at`

## 🚀 APLICAR FIX

Para aplicar esta migración a producción:

```bash
# Conectarse a la base de datos de producción de Supabase
supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"

# O usando el CLI de Supabase (recomendado)
supabase link --project-ref [PROJECT_REF]
supabase db push
```

## ✅ VERIFICACIÓN POST-FIX

Después de aplicar la migración:

1. ✅ Probar el flujo completo de Pagopar con una membresía
2. ✅ Verificar que no aparezcan errores 400 en consola
3. ✅ Confirmar que la membresía se active correctamente
4. ✅ Verificar que el perfil del usuario se actualice con `membership_level` y `membership_expires_at`

## 📝 NOTAS ADICIONALES

- El webhook de Pagopar (`src/app/api/webhooks/pagopar/route.ts`) ya tenía un comentario indicando que `profiles` no tiene `updated_at` (línea 261), y correctamente NO intenta actualizarlo.
- La tabla `profiles` solo tiene `created_at`, no `updated_at`, por diseño.
- Las otras tablas (como `membership_subscriptions`, `stores`, etc.) SÍ tienen `updated_at`, y esas referencias se mantienen intactas.

## 🔗 ARCHIVOS MODIFICADOS

- ✅ `supabase/migrations/20251201200000_fix_profiles_updated_at_error.sql` (NUEVO)
- ✅ Todas las funciones SQL corregidas vía `CREATE OR REPLACE FUNCTION`

## 📊 IMPACTO

- **Severidad:** 🔴 CRÍTICO - Bloquea completamente el flujo de pago con Pagopar para membresías
- **Usuarios afectados:** Todos los usuarios que intenten pagar una membresía con Pagopar
- **Solución:** ✅ Migración SQL que corrige todas las funciones afectadas














