-- ============================================
-- MERCADITO ONLINE PY - FALLBACK STORE & SOURCING ORDERS
-- Migración: Agregar flag de tienda fallback y tabla sourcing_orders
-- Fecha: 2024-11-24
-- ============================================

-- ============================================
-- AGREGAR COLUMNA is_fallback_store A STORES
-- ============================================

ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS is_fallback_store BOOLEAN NOT NULL DEFAULT false;

-- Índice para búsqueda rápida de tiendas fallback
CREATE INDEX IF NOT EXISTS idx_stores_fallback ON public.stores(is_fallback_store) WHERE is_fallback_store = true;

-- ============================================
-- CREAR TABLA sourcing_orders
-- ============================================

CREATE TABLE IF NOT EXISTS public.sourcing_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
  raw_query TEXT NOT NULL,
  normalized JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending_sourcing',
  source TEXT NOT NULL DEFAULT 'unknown',
  channel TEXT DEFAULT NULL,
  language TEXT DEFAULT 'es-PY',
  -- Campos para agentes externos (base futura)
  agent_source TEXT DEFAULT NULL,
  agent_session_id TEXT DEFAULT NULL,
  agent_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ÍNDICES PARA sourcing_orders
-- ============================================

CREATE INDEX IF NOT EXISTS idx_sourcing_orders_user_id ON public.sourcing_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_orders_assigned_store_id ON public.sourcing_orders(assigned_store_id);
CREATE INDEX IF NOT EXISTS idx_sourcing_orders_status ON public.sourcing_orders(status);
CREATE INDEX IF NOT EXISTS idx_sourcing_orders_created_at ON public.sourcing_orders(created_at DESC);

-- ============================================
-- HABILITAR RLS EN sourcing_orders
-- ============================================

ALTER TABLE public.sourcing_orders ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS PARA sourcing_orders
-- ============================================

-- Eliminar políticas existentes si existen (para hacer la migración idempotente)
DROP POLICY IF EXISTS "Users can view own sourcing orders" ON public.sourcing_orders;
DROP POLICY IF EXISTS "Store owners can view assigned sourcing orders" ON public.sourcing_orders;
DROP POLICY IF EXISTS "Authenticated users can create sourcing orders" ON public.sourcing_orders;
DROP POLICY IF EXISTS "Users can update own sourcing orders" ON public.sourcing_orders;
DROP POLICY IF EXISTS "Store owners can update assigned sourcing orders" ON public.sourcing_orders;

-- SELECT: Usuarios pueden ver sus propios sourcing_orders
CREATE POLICY "Users can view own sourcing orders" ON public.sourcing_orders
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- SELECT: Owners/admins de tienda pueden ver sourcing_orders asignados a sus tiendas
CREATE POLICY "Store owners can view assigned sourcing orders" ON public.sourcing_orders
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourcing_orders.assigned_store_id
    AND s.seller_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- INSERT: Usuarios autenticados pueden crear sourcing_orders
CREATE POLICY "Authenticated users can create sourcing orders" ON public.sourcing_orders
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Usuarios pueden actualizar sus propios sourcing_orders
CREATE POLICY "Users can update own sourcing orders" ON public.sourcing_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- UPDATE: Owners de tienda pueden actualizar sourcing_orders asignados a sus tiendas
CREATE POLICY "Store owners can update assigned sourcing orders" ON public.sourcing_orders
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourcing_orders.assigned_store_id
    AND s.seller_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id = sourcing_orders.assigned_store_id
    AND s.seller_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- ============================================
-- TRIGGER PARA updated_at
-- ============================================

-- Asegurar que la función update_updated_at_column existe
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para sourcing_orders
DROP TRIGGER IF EXISTS update_sourcing_orders_updated_at ON public.sourcing_orders;
CREATE TRIGGER update_sourcing_orders_updated_at
  BEFORE UPDATE ON public.sourcing_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
    column_exists BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Verificar columna is_fallback_store
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stores'
        AND column_name = 'is_fallback_store'
    ) INTO column_exists;
    
    -- Verificar tabla sourcing_orders
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sourcing_orders'
    ) INTO table_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✅ Columna is_fallback_store agregada a stores';
    ELSE
        RAISE WARNING '⚠️ Columna is_fallback_store no encontrada';
    END IF;
    
    IF table_exists THEN
        RAISE NOTICE '✅ Tabla sourcing_orders creada';
    ELSE
        RAISE WARNING '⚠️ Tabla sourcing_orders no encontrada';
    END IF;
    
    RAISE NOTICE '✅ RLS habilitado en sourcing_orders';
    RAISE NOTICE '✅ Políticas de seguridad aplicadas';
    RAISE NOTICE '✅ Índices creados para optimización';
    RAISE NOTICE '✅ Trigger de updated_at configurado';
END $$;



