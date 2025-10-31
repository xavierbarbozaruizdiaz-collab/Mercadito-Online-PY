-- ============================================
-- MERCADITO ONLINE PY - PRODUCT APPROVAL
-- Agregar campo de aprobación a productos
-- ============================================

-- Agregar campo de estado de aprobación
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_approved_at ON products(approved_at);

-- Actualizar productos existentes a 'approved' para no romper funcionalidad
UPDATE products 
SET approval_status = 'approved', approved_at = created_at 
WHERE approval_status IS NULL OR approval_status = 'pending';

-- Política RLS para que admins puedan actualizar approval_status
-- (Ya existe la política de UPDATE, pero necesitamos asegurar que admins puedan actualizar approval)

-- Función para verificar si usuario es admin (reutilizar si existe)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
DECLARE
  current_user_id UUID;
  user_role TEXT;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  SELECT role INTO user_role
  FROM public.profiles 
  WHERE id = current_user_id;
  
  RETURN COALESCE(user_role = 'admin', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Actualizar política RLS para permitir que admins actualicen approval_status
-- Primero eliminar política existente de UPDATE si existe una restrictiva
-- La política existente permite que vendedores actualicen sus productos
-- Necesitamos una política adicional para admins

DROP POLICY IF EXISTS "admins_can_update_products" ON products;
CREATE POLICY "admins_can_update_products" 
ON products FOR UPDATE 
TO authenticated 
USING (is_current_user_admin())
WITH CHECK (is_current_user_admin());

DO $$ BEGIN
  RAISE NOTICE '✅ Campo de aprobación de productos agregado';
END $$;

