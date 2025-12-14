-- ============================================
-- MERCADITO ONLINE PY - FIX APPROVAL_STATUS CONFLICT
-- Resuelve conflicto entre migraciones de approval_status
-- ============================================

-- PROBLEMA: 
-- Existen dos migraciones que crean approval_status con CHECK constraints diferentes:
-- 1. 20250128000053_product_approval.sql: ('pending', 'approved', 'rejected')
-- 2. 20250130000001_auction_approval_status.sql: ('pending_approval', 'approved', 'rejected', NULL)
--
-- SOLUCIÓN: Unificar el CHECK constraint para aceptar ambos valores

-- 1. Eliminar constraint existente (si existe con nombre específico)
ALTER TABLE public.products 
DROP CONSTRAINT IF EXISTS products_approval_status_check;

-- Intentar eliminar otros posibles nombres de constraints relacionados
-- Versión simplificada que funciona en todas las versiones de PostgreSQL
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Buscar y eliminar constraints relacionados con approval_status
  FOR constraint_name IN 
    SELECT conname::TEXT
    FROM pg_constraint 
    WHERE conrelid = 'public.products'::regclass::oid 
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%approval_status%'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

-- 2. Crear nuevo constraint unificado que acepta todos los valores necesarios
ALTER TABLE public.products
ADD CONSTRAINT products_approval_status_check 
CHECK (approval_status IN ('pending', 'pending_approval', 'approved', 'rejected') OR approval_status IS NULL);

-- 3. Actualizar comentario para documentar ambos usos
COMMENT ON COLUMN public.products.approval_status IS 
'Estado de aprobación. 
- "pending": Aprobación general de producto (antes de publicar)
- "pending_approval": Aprobación específica de subasta (cuando monto ganador < buy_now_price)
- "approved": Aprobado
- "rejected": Rechazado
- NULL: No requiere aprobación o aún no se ha evaluado';

-- Verificación
DO $$
BEGIN
  RAISE NOTICE '✅ Constraint de approval_status unificado correctamente';
  RAISE NOTICE '   Valores aceptados: pending, pending_approval, approved, rejected, NULL';
END $$;

