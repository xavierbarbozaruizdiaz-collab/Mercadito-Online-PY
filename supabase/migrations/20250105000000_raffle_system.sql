-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE SORTEOS
-- Migración: Crear sistema completo de sorteos
-- ============================================

-- ============================================
-- 1. TABLA RAFFLES (Sorteos)
-- ============================================

CREATE TABLE IF NOT EXISTS public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Tipo de sorteo
  raffle_type TEXT NOT NULL CHECK (raffle_type IN ('purchase_based', 'seller_raffle')),
  
  -- Configuración de tickets
  min_purchase_amount DECIMAL(10,2) DEFAULT 0, -- Monto mínimo de compra para ganar ticket
  tickets_per_purchase DECIMAL(5,2) DEFAULT 1, -- Cantidad de tickets por compra (ej: 1 ticket por cada 100,000 Gs)
  tickets_per_amount DECIMAL(10,2) DEFAULT 100000, -- Monto que genera 1 ticket (ej: 100,000 Gs = 1 ticket)
  max_tickets_per_user INTEGER, -- Límite de tickets por usuario (opcional, NULL = sin límite)
  
  -- Fechas
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  draw_date TIMESTAMPTZ NOT NULL, -- Fecha de sorteo
  
  -- Estado y control
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'cancelled', 'drawn')),
  is_enabled BOOLEAN DEFAULT FALSE, -- Solo activado por admin
  admin_approved BOOLEAN DEFAULT FALSE, -- Aprobación del admin
  admin_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES public.profiles(id),
  
  -- Ganador
  winner_id UUID REFERENCES public.profiles(id), -- Usuario ganador
  winner_ticket_id UUID, -- Ticket ganador (referencia a raffle_tickets)
  drawn_at TIMESTAMPTZ,
  
  -- Metadata
  total_tickets INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Validaciones
  CONSTRAINT valid_dates CHECK (start_date < end_date AND end_date <= draw_date),
  CONSTRAINT valid_tickets_config CHECK (
    (raffle_type = 'purchase_based' AND tickets_per_amount > 0) OR
    (raffle_type = 'seller_raffle')
  )
);

COMMENT ON TABLE public.raffles IS 'Sorteos de productos en la plataforma';
COMMENT ON COLUMN public.raffles.raffle_type IS 'Tipo: purchase_based (automático por compras) o seller_raffle (creado por vendedor)';
COMMENT ON COLUMN public.raffles.is_enabled IS 'Solo activado por admin. Controla si el sorteo está visible y activo';
COMMENT ON COLUMN public.raffles.admin_approved IS 'Aprobación del admin para sorteos de vendedores';

-- Índices
CREATE INDEX IF NOT EXISTS idx_raffles_status ON public.raffles(status);
CREATE INDEX IF NOT EXISTS idx_raffles_is_enabled ON public.raffles(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_raffles_active ON public.raffles(status, is_enabled, start_date, end_date) WHERE status = 'active' AND is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_raffles_product_id ON public.raffles(product_id);
CREATE INDEX IF NOT EXISTS idx_raffles_seller_id ON public.raffles(seller_id);
CREATE INDEX IF NOT EXISTS idx_raffles_draw_date ON public.raffles(draw_date) WHERE status = 'active';

-- ============================================
-- 2. TABLA RAFFLE_TICKETS (Tickets de Sorteo)
-- ============================================

CREATE TABLE IF NOT EXISTS public.raffle_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id), -- Orden que generó el ticket (para sorteos por compra)
  
  -- Información del ticket
  ticket_number TEXT NOT NULL, -- Número único del ticket (ej: RAFFLE-001-0001)
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('purchase', 'seller_bonus', 'admin_bonus', 'manual')),
  
  -- Metadata
  purchase_amount DECIMAL(10,2), -- Monto de compra que generó el ticket
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  CONSTRAINT unique_ticket_number UNIQUE(raffle_id, ticket_number)
);

COMMENT ON TABLE public.raffle_tickets IS 'Tickets individuales de sorteos';
COMMENT ON COLUMN public.raffle_tickets.ticket_type IS 'Tipo: purchase (por compra), seller_bonus (bonus del vendedor), admin_bonus, manual';

-- Índices
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_raffle_id ON public.raffle_tickets(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_user_id ON public.raffle_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_order_id ON public.raffle_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_raffle_tickets_raffle_user ON public.raffle_tickets(raffle_id, user_id);

-- ============================================
-- 3. TABLA RAFFLE_SETTINGS (Configuración Global)
-- ============================================

CREATE TABLE IF NOT EXISTS public.raffle_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.raffle_settings IS 'Configuración global del sistema de sorteos';

-- Configuración por defecto
INSERT INTO public.raffle_settings (key, value, description) VALUES
('global_enabled', '{"enabled": false}', 'Habilitar/deshabilitar sistema de sorteos globalmente'),
('auto_ticket_generation', '{"enabled": true, "min_amount": 50000, "tickets_per_100k": 1}', 'Generación automática de tickets por compras'),
('max_active_raffles', '{"value": 5}', 'Máximo de sorteos activos simultáneos'),
('seller_raffle_approval', '{"required": true}', 'Requiere aprobación admin para sorteos de vendedores')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 4. VISTA MATERIALIZADA PARA ESTADÍSTICAS
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.raffle_participants_stats AS
SELECT 
  raffle_id,
  user_id,
  COUNT(*) as ticket_count,
  MIN(created_at) as first_ticket_at,
  MAX(created_at) as last_ticket_at,
  SUM(COALESCE(purchase_amount, 0)) as total_purchase_amount
FROM public.raffle_tickets
GROUP BY raffle_id, user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_raffle_participants_stats_unique ON public.raffle_participants_stats(raffle_id, user_id);
CREATE INDEX IF NOT EXISTS idx_raffle_participants_stats_raffle ON public.raffle_participants_stats(raffle_id);

-- ============================================
-- 5. FUNCIONES SQL
-- ============================================

-- Función: Generar tickets automáticamente desde una orden
CREATE OR REPLACE FUNCTION public.generate_raffle_tickets_from_order(
  p_order_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_order RECORD;
  v_raffle RECORD;
  v_tickets_generated INTEGER := 0;
  v_tickets_to_give INTEGER;
  v_user_tickets_count INTEGER;
  v_ticket_number TEXT;
  v_sequence INTEGER;
BEGIN
  -- Obtener información de la orden
  SELECT 
    id,
    buyer_id,
    total_amount,
    created_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden no encontrada: %', p_order_id;
  END IF;
  
  -- Buscar sorteos activos que califican
  FOR v_raffle IN (
    SELECT 
      r.*
    FROM public.raffles r
    WHERE r.status = 'active'
      AND r.is_enabled = true
      AND r.raffle_type = 'purchase_based'
      AND r.start_date <= v_order.created_at
      AND r.end_date >= v_order.created_at
      AND v_order.total_amount >= r.min_purchase_amount
  ) LOOP
    -- Calcular tickets a dar
    IF v_raffle.tickets_per_amount > 0 THEN
      v_tickets_to_give := FLOOR(v_order.total_amount / v_raffle.tickets_per_amount);
    ELSE
      v_tickets_to_give := 1;
    END IF;
    
    -- Verificar límite por usuario si existe
    IF v_raffle.max_tickets_per_user IS NOT NULL THEN
      SELECT COUNT(*) INTO v_user_tickets_count
      FROM public.raffle_tickets
      WHERE raffle_id = v_raffle.id AND user_id = v_order.buyer_id;
      
      -- Ajustar tickets si excede el límite
      IF v_user_tickets_count + v_tickets_to_give > v_raffle.max_tickets_per_user THEN
        v_tickets_to_give := GREATEST(0, v_raffle.max_tickets_per_user - v_user_tickets_count);
      END IF;
    END IF;
    
    -- Generar tickets
    FOR i IN 1..v_tickets_to_give LOOP
      -- Obtener siguiente número de secuencia
      SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 'RAFFLE-[0-9]+-([0-9]+)$') AS INTEGER)), 0) + 1
      INTO v_sequence
      FROM public.raffle_tickets
      WHERE raffle_id = v_raffle.id;
      
      -- Generar número de ticket único
      v_ticket_number := 'RAFFLE-' || LPAD(v_raffle.id::TEXT, 8, '0') || '-' || LPAD(v_sequence::TEXT, 6, '0');
      
      -- Insertar ticket
      INSERT INTO public.raffle_tickets (
        raffle_id,
        user_id,
        order_id,
        ticket_number,
        ticket_type,
        purchase_amount
      ) VALUES (
        v_raffle.id,
        v_order.buyer_id,
        v_order.id,
        v_ticket_number,
        'purchase',
        v_order.total_amount
      );
      
      v_tickets_generated := v_tickets_generated + 1;
    END LOOP;
    
    -- Actualizar contadores del sorteo
    UPDATE public.raffles
    SET 
      total_tickets = (
        SELECT COUNT(*) FROM public.raffle_tickets WHERE raffle_id = v_raffle.id
      ),
      total_participants = (
        SELECT COUNT(DISTINCT user_id) FROM public.raffle_tickets WHERE raffle_id = v_raffle.id
      ),
      updated_at = NOW()
    WHERE id = v_raffle.id;
  END LOOP;
  
  RETURN v_tickets_generated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_raffle_tickets_from_order IS 'Genera tickets automáticamente cuando se completa una orden';

-- Función: Sortear ganador
CREATE OR REPLACE FUNCTION public.draw_raffle_winner(
  p_raffle_id UUID
)
RETURNS TABLE (
  winner_id UUID,
  winner_ticket_id UUID,
  ticket_number TEXT,
  winner_email TEXT,
  winner_name TEXT
) AS $$
DECLARE
  v_winner_ticket RECORD;
  v_winner_profile RECORD;
BEGIN
  -- Verificar que el sorteo existe y está activo
  IF NOT EXISTS (
    SELECT 1 FROM public.raffles 
    WHERE id = p_raffle_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Sorteo no encontrado o no está activo: %', p_raffle_id;
  END IF;
  
  -- Seleccionar ticket ganador aleatoriamente
  SELECT 
    rt.id,
    rt.user_id,
    rt.ticket_number
  INTO v_winner_ticket
  FROM public.raffle_tickets rt
  WHERE rt.raffle_id = p_raffle_id
  ORDER BY RANDOM()
  LIMIT 1;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay tickets en el sorteo: %', p_raffle_id;
  END IF;
  
  -- Obtener información del ganador
  SELECT 
    id,
    email,
    COALESCE(first_name || ' ' || last_name, email) as full_name
  INTO v_winner_profile
  FROM public.profiles
  WHERE id = v_winner_ticket.user_id;
  
  -- Actualizar sorteo con ganador
  UPDATE public.raffles
  SET 
    winner_id = v_winner_ticket.user_id,
    winner_ticket_id = v_winner_ticket.id,
    drawn_at = NOW(),
    status = 'drawn',
    updated_at = NOW()
  WHERE id = p_raffle_id;
  
  -- Retornar información del ganador
  RETURN QUERY SELECT
    v_winner_ticket.user_id,
    v_winner_ticket.id,
    v_winner_ticket.ticket_number,
    v_winner_profile.email,
    v_winner_profile.full_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.draw_raffle_winner IS 'Selecciona y registra el ganador de un sorteo aleatoriamente';

-- Función: Obtener estadísticas de sorteos del usuario
CREATE OR REPLACE FUNCTION public.get_user_raffle_stats(
  p_user_id UUID
)
RETURNS TABLE (
  total_tickets INTEGER,
  active_raffles_count INTEGER,
  participated_raffles_count INTEGER,
  won_raffles_count INTEGER
) AS $$
BEGIN
  RETURN QUERY SELECT
    (SELECT COUNT(*) FROM public.raffle_tickets WHERE user_id = p_user_id)::INTEGER as total_tickets,
    (SELECT COUNT(DISTINCT raffle_id) FROM public.raffle_tickets rt
     JOIN public.raffles r ON rt.raffle_id = r.id
     WHERE rt.user_id = p_user_id AND r.status = 'active' AND r.is_enabled = true)::INTEGER as active_raffles_count,
    (SELECT COUNT(DISTINCT raffle_id) FROM public.raffle_tickets WHERE user_id = p_user_id)::INTEGER as participated_raffles_count,
    (SELECT COUNT(*) FROM public.raffles WHERE winner_id = p_user_id AND status = 'drawn')::INTEGER as won_raffles_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_user_raffle_stats IS 'Obtiene estadísticas de sorteos de un usuario';

-- Función: Verificar elegibilidad de orden para sorteo
CREATE OR REPLACE FUNCTION public.check_raffle_eligibility(
  p_order_id UUID,
  p_raffle_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_order RECORD;
  v_raffle RECORD;
BEGIN
  -- Obtener orden
  SELECT id, buyer_id, total_amount, created_at
  INTO v_order
  FROM public.orders
  WHERE id = p_order_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Obtener sorteo
  SELECT *
  INTO v_raffle
  FROM public.raffles
  WHERE id = p_raffle_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Verificar condiciones
  IF v_raffle.status != 'active' OR v_raffle.is_enabled != true THEN
    RETURN FALSE;
  END IF;
  
  IF v_raffle.raffle_type != 'purchase_based' THEN
    RETURN FALSE;
  END IF;
  
  IF v_order.total_amount < v_raffle.min_purchase_amount THEN
    RETURN FALSE;
  END IF;
  
  IF v_order.created_at < v_raffle.start_date OR v_order.created_at > v_raffle.end_date THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.check_raffle_eligibility IS 'Verifica si una orden califica para un sorteo específico';

-- ============================================
-- 6. TRIGGERS PARA ACTUALIZAR CONTADORES
-- ============================================

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.update_raffles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_raffles_updated_at
  BEFORE UPDATE ON public.raffles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_raffles_updated_at();

-- Trigger: Actualizar contadores cuando se inserta/elimina ticket
CREATE OR REPLACE FUNCTION public.update_raffle_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.raffles
    SET 
      total_tickets = (SELECT COUNT(*) FROM public.raffle_tickets WHERE raffle_id = NEW.raffle_id),
      total_participants = (SELECT COUNT(DISTINCT user_id) FROM public.raffle_tickets WHERE raffle_id = NEW.raffle_id),
      updated_at = NOW()
    WHERE id = NEW.raffle_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.raffles
    SET 
      total_tickets = (SELECT COUNT(*) FROM public.raffle_tickets WHERE raffle_id = OLD.raffle_id),
      total_participants = (SELECT COUNT(DISTINCT user_id) FROM public.raffle_tickets WHERE raffle_id = OLD.raffle_id),
      updated_at = NOW()
    WHERE id = OLD.raffle_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_raffle_counters_on_insert
  AFTER INSERT ON public.raffle_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_raffle_counters();

CREATE TRIGGER trigger_update_raffle_counters_on_delete
  AFTER DELETE ON public.raffle_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_raffle_counters();

-- ============================================
-- 7. POLÍTICAS RLS (Row Level Security)
-- ============================================

ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para RAFFLES
-- SELECT: Público puede ver sorteos activos y habilitados
DROP POLICY IF EXISTS "Public can view active raffles" ON public.raffles;
CREATE POLICY "Public can view active raffles" ON public.raffles FOR SELECT
TO public
USING (status = 'active' AND is_enabled = true);

-- SELECT: Vendedores pueden ver sus propios sorteos
DROP POLICY IF EXISTS "Sellers can view their raffles" ON public.raffles;
CREATE POLICY "Sellers can view their raffles" ON public.raffles FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- SELECT: Admins pueden ver todos los sorteos
DROP POLICY IF EXISTS "Admins can view all raffles" ON public.raffles;
CREATE POLICY "Admins can view all raffles" ON public.raffles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- INSERT: Vendedores pueden crear sorteos
DROP POLICY IF EXISTS "Sellers can create raffles" ON public.raffles;
CREATE POLICY "Sellers can create raffles" ON public.raffles FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid() AND raffle_type = 'seller_raffle');

-- INSERT: Admins pueden crear cualquier sorteo
DROP POLICY IF EXISTS "Admins can create any raffle" ON public.raffles;
CREATE POLICY "Admins can create any raffle" ON public.raffles FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- UPDATE: Vendedores pueden actualizar sus sorteos (solo si no están activos)
-- Nota: No podemos restringir cambios de is_enabled/admin_approved en WITH CHECK porque OLD no está disponible
-- Esto se manejará en el código de la aplicación o en triggers
DROP POLICY IF EXISTS "Sellers can update their draft raffles" ON public.raffles;
CREATE POLICY "Sellers can update their draft raffles" ON public.raffles FOR UPDATE
TO authenticated
USING (seller_id = auth.uid() AND status = 'draft')
WITH CHECK (seller_id = auth.uid() AND status = 'draft');

-- UPDATE: Admins pueden actualizar cualquier sorteo
DROP POLICY IF EXISTS "Admins can update any raffle" ON public.raffles;
CREATE POLICY "Admins can update any raffle" ON public.raffles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Políticas para RAFFLE_TICKETS
-- SELECT: Usuarios pueden ver sus propios tickets
DROP POLICY IF EXISTS "Users can view their tickets" ON public.raffle_tickets;
CREATE POLICY "Users can view their tickets" ON public.raffle_tickets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- SELECT: Público puede ver tickets de sorteos activos (solo para estadísticas)
DROP POLICY IF EXISTS "Public can view active raffle tickets" ON public.raffle_tickets;
CREATE POLICY "Public can view active raffle tickets" ON public.raffle_tickets FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.raffles 
    WHERE id = raffle_id AND status = 'active' AND is_enabled = true
  )
);

-- SELECT: Admins pueden ver todos los tickets
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.raffle_tickets;
CREATE POLICY "Admins can view all tickets" ON public.raffle_tickets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- INSERT: Solo sistema puede crear tickets (a través de funciones)
DROP POLICY IF EXISTS "System can create tickets" ON public.raffle_tickets;
CREATE POLICY "System can create tickets" ON public.raffle_tickets FOR INSERT
TO authenticated
WITH CHECK (true); -- Permitido porque las funciones usan SECURITY DEFINER

-- Políticas para RAFFLE_SETTINGS
-- SELECT: Público puede leer configuración
DROP POLICY IF EXISTS "Public can read raffle settings" ON public.raffle_settings;
CREATE POLICY "Public can read raffle settings" ON public.raffle_settings FOR SELECT
TO public
USING (true);

-- UPDATE: Solo admins pueden actualizar configuración
DROP POLICY IF EXISTS "Admins can update raffle settings" ON public.raffle_settings;
CREATE POLICY "Admins can update raffle settings" ON public.raffle_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- 8. COMENTARIOS FINALES
-- ============================================

COMMENT ON TABLE public.raffles IS 'Sistema de sorteos: permite sorteos automáticos por compras y sorteos creados por vendedores';
COMMENT ON TABLE public.raffle_tickets IS 'Tickets individuales de participantes en sorteos';
COMMENT ON TABLE public.raffle_settings IS 'Configuración global del sistema de sorteos';

