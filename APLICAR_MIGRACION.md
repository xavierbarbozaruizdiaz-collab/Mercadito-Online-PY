# 🔧 Aplicar Migración: Función delete_user_product

## ❗ IMPORTANTE: Esta migración debe aplicarse para solucionar el problema de eliminación de productos

El problema es que RLS (Row Level Security) está bloqueando los DELETE incluso cuando el usuario es el dueño del producto.

## 📋 INSTRUCCIONES

### Opción 1: Supabase Dashboard (Recomendado)

1. Ve a tu **Supabase Dashboard**
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (menú lateral izquierdo)
4. Haz clic en **"New query"**
5. **Copia y pega** el siguiente SQL:

```sql
-- ============================================
-- Función para eliminar productos con verificación de RLS
-- ============================================

-- Crear función que permite eliminar productos verificando que el usuario es el dueño
CREATE OR REPLACE FUNCTION delete_user_product(product_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_seller_id UUID;
  current_user_id UUID;
BEGIN
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que hay un usuario autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado';
  END IF;
  
  -- Obtener el seller_id del producto
  SELECT seller_id INTO product_seller_id
  FROM products
  WHERE id = product_id_to_delete;
  
  -- Verificar que el producto existe
  IF product_seller_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  
  -- Verificar que el usuario es el dueño
  IF product_seller_id != current_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar este producto';
  END IF;
  
  -- Eliminar el producto
  DELETE FROM products WHERE id = product_id_to_delete;
  
  -- Verificar que se eliminó
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- Dar permisos a usuarios autenticados para usar esta función
GRANT EXECUTE ON FUNCTION delete_user_product(UUID) TO authenticated;

-- Comentario
COMMENT ON FUNCTION delete_user_product IS 'Elimina un producto verificando que el usuario autenticado es el dueño';
```

6. Haz clic en **"Run"** (o presiona `Ctrl+Enter`)
7. Deberías ver un mensaje de éxito

### Opción 2: Desde el archivo de migración

1. Abre el archivo: `supabase/migrations/20250130000002_fix_product_delete.sql`
2. Copia todo su contenido
3. Pégalo en Supabase Dashboard → SQL Editor
4. Ejecuta

## ✅ Verificación

Después de aplicar la migración, el código intentará:
1. Primero usar el DELETE normal
2. Si falla (count: 0), automáticamente usará la función SQL `delete_user_product`

## 🔍 URL Directa (si tienes acceso)

Si tu proyecto ID es `hqdatzhliaordlsqtjea`, ve directamente a:
**https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new**

---

**Una vez aplicada la migración, intenta eliminar un producto nuevamente. Debería funcionar correctamente.**

