-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE RETIROS
-- Tabla y funciones para solicitudes de retiro
-- ============================================

-- Tabla de solicitudes de retiro
CREATE TABLE IF NOT EXISTS payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id),
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'paypal', 'cash', 'mobile_wallet')),
  payment_details JSONB NOT NULL, -- { account_number, bank_name, account_name, etc. }
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed')),
  admin_id UUID REFERENCES profiles(id), -- Admin que procesa
  admin_notes TEXT,
  rejection_reason TEXT,
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_created ON payout_requests(created_at DESC);

-- RLS
ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

-- Política: Vendedores pueden ver sus propias solicitudes
DROP POLICY IF EXISTS "Sellers can view own payout requests" ON payout_requests;
CREATE POLICY "Sellers can view own payout requests" ON payout_requests
FOR SELECT
TO authenticated
USING (seller_id = auth.uid());

-- Política: Vendedores pueden crear solicitudes
DROP POLICY IF EXISTS "Sellers can create payout requests" ON payout_requests;
CREATE POLICY "Sellers can create payout requests" ON payout_requests
FOR INSERT
TO authenticated
WITH CHECK (seller_id = auth.uid());

-- Política: Admins pueden ver todas las solicitudes
DROP POLICY IF EXISTS "Admins can view all payout requests" ON payout_requests;
CREATE POLICY "Admins can view all payout requests" ON payout_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política: Admins pueden actualizar solicitudes
DROP POLICY IF EXISTS "Admins can update payout requests" ON payout_requests;
CREATE POLICY "Admins can update payout requests" ON payout_requests
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Función: Crear solicitud de retiro
CREATE OR REPLACE FUNCTION create_payout_request(
  p_seller_id UUID,
  p_amount DECIMAL(10,2),
  p_payment_method TEXT,
  p_payment_details JSONB,
  p_store_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_available_balance DECIMAL(10,2);
  v_request_id UUID;
  v_min_withdrawal DECIMAL(10,2) := 50000; -- Mínimo 50,000 Gs.
BEGIN
  -- Verificar balance disponible
  SELECT available_balance INTO v_available_balance
  FROM seller_balance
  WHERE seller_id = p_seller_id;
  
  IF v_available_balance IS NULL OR v_available_balance < p_amount THEN
    RAISE EXCEPTION 'Balance insuficiente. Disponible: %, Solicitado: %', 
      COALESCE(v_available_balance, 0), p_amount;
  END IF;
  
  IF p_amount < v_min_withdrawal THEN
    RAISE EXCEPTION 'El monto mínimo de retiro es % Gs.', v_min_withdrawal;
  END IF;
  
  -- Crear solicitud
  INSERT INTO payout_requests (
    seller_id,
    store_id,
    amount,
    payment_method,
    payment_details,
    status
  )
  VALUES (
    p_seller_id,
    p_store_id,
    p_amount,
    p_payment_method,
    p_payment_details,
    'pending'
  )
  RETURNING id INTO v_request_id;
  
  -- Reducir balance disponible (reservar)
  UPDATE seller_balance
  SET available_balance = available_balance - p_amount,
      updated_at = NOW()
  WHERE seller_id = p_seller_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Procesar solicitud (aprobar/rechazar)
CREATE OR REPLACE FUNCTION process_payout_request(
  p_request_id UUID,
  p_status TEXT, -- 'approved', 'rejected'
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Obtener solicitud
  SELECT * INTO v_request
  FROM payout_requests
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;
  
  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION 'La solicitud ya fue procesada';
  END IF;
  
  -- Actualizar solicitud
  UPDATE payout_requests
  SET status = p_status,
      admin_id = p_admin_id,
      admin_notes = p_admin_notes,
      rejection_reason = p_rejection_reason,
      processed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  -- Si se rechaza, devolver balance
  IF p_status = 'rejected' THEN
    UPDATE seller_balance
    SET available_balance = available_balance + v_request.amount,
        updated_at = NOW()
    WHERE seller_id = v_request.seller_id;
  END IF;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Completar retiro (después del pago real)
CREATE OR REPLACE FUNCTION complete_payout(
  p_request_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request
  FROM payout_requests
  WHERE id = p_request_id;
  
  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Solicitud no encontrada';
  END IF;
  
  IF v_request.status NOT IN ('approved', 'processing') THEN
    RAISE EXCEPTION 'Solo se pueden completar solicitudes aprobadas o en procesamiento';
  END IF;
  
  UPDATE payout_requests
  SET status = 'completed',
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON TABLE payout_requests IS 'Solicitudes de retiro de vendedores';
COMMENT ON FUNCTION create_payout_request IS 'Crea una solicitud de retiro y reserva el balance';
COMMENT ON FUNCTION process_payout_request IS 'Procesa una solicitud (aprobar/rechazar)';
COMMENT ON FUNCTION complete_payout IS 'Marca un retiro como completado después del pago';

