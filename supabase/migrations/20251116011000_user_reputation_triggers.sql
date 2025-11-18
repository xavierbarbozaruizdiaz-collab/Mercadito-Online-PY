-- ============================================
-- MERCADITO ONLINE PY - TRIGGERS DE REPUTACIÓN
-- Actualización automática de user_reputation
-- según multas, alertas, reportes y ban/unban
-- ============================================

-- Nota: Esta migración es ADITIVA. No modifica la lógica
-- de negocio de multas ni alertas; solo agrega triggers
-- que llaman recalculate_user_reputation(p_user_id).

-- ============================================
-- 1. TRIGGER: auction_penalties (multas comprador)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_reputation_on_auction_penalties()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Determinar usuario afectado (ganador de subasta)
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);
  
  IF v_user_id IS NOT NULL THEN
    PERFORM recalculate_user_reputation(v_user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reputation_auction_penalties_au ON auction_penalties;
CREATE TRIGGER trg_reputation_auction_penalties_au
AFTER INSERT OR UPDATE ON auction_penalties
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_reputation_on_auction_penalties();

COMMENT ON FUNCTION trigger_recalculate_reputation_on_auction_penalties IS
  'Trigger de reputación: recalcula user_reputation cuando se crean o actualizan multas de comprador (auction_penalties).';

COMMENT ON TRIGGER trg_reputation_auction_penalties_au ON auction_penalties IS
  'AFTER INSERT/UPDATE: llama recalculate_user_reputation para el usuario afectado en auction_penalties.';

-- ============================================
-- 2. TRIGGER: seller_delivery_penalties (multas vendedor)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_reputation_on_seller_penalties()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Determinar usuario afectado (vendedor)
  v_user_id := COALESCE(NEW.seller_id, OLD.seller_id);
  
  IF v_user_id IS NOT NULL THEN
    PERFORM recalculate_user_reputation(v_user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reputation_seller_penalties_au ON seller_delivery_penalties;
CREATE TRIGGER trg_reputation_seller_penalties_au
AFTER INSERT OR UPDATE ON seller_delivery_penalties
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_reputation_on_seller_penalties();

COMMENT ON FUNCTION trigger_recalculate_reputation_on_seller_penalties IS
  'Trigger de reputación: recalcula user_reputation cuando se crean o actualizan multas de vendedor (seller_delivery_penalties).';

COMMENT ON TRIGGER trg_reputation_seller_penalties_au ON seller_delivery_penalties IS
  'AFTER INSERT/UPDATE: llama recalculate_user_reputation para el vendedor afectado en seller_delivery_penalties.';

-- ============================================
-- 3. TRIGGER: admin_alerts (alertas asociadas a usuarios)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_reputation_on_admin_alerts()
RETURNS TRIGGER AS $$
DECLARE
  v_type TEXT;
  v_user_id UUID;
BEGIN
  v_type := COALESCE(NEW.related_entity_type, OLD.related_entity_type);
  v_user_id := COALESCE(NEW.related_entity_id, OLD.related_entity_id);
  
  -- Solo aplicar cuando la alerta está asociada a un usuario
  IF v_type = 'user' AND v_user_id IS NOT NULL THEN
    PERFORM recalculate_user_reputation(v_user_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reputation_admin_alerts_au ON admin_alerts;
CREATE TRIGGER trg_reputation_admin_alerts_au
AFTER INSERT OR UPDATE ON admin_alerts
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_reputation_on_admin_alerts();

COMMENT ON FUNCTION trigger_recalculate_reputation_on_admin_alerts IS
  'Trigger de reputación: recalcula user_reputation cuando se crean o actualizan admin_alerts relacionadas a usuarios.';

COMMENT ON TRIGGER trg_reputation_admin_alerts_au ON admin_alerts IS
  'AFTER INSERT/UPDATE: llama recalculate_user_reputation cuando admin_alerts afecta a un usuario.';

-- ============================================
-- 4. TRIGGER: reports (denuncias contra usuarios)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_reputation_on_reports()
RETURNS TRIGGER AS $$
DECLARE
  v_report_type TEXT;
  v_target_id UUID;
BEGIN
  v_report_type := COALESCE(NEW.report_type, OLD.report_type);
  v_target_id := COALESCE(NEW.target_id, OLD.target_id);
  
  -- Solo recalcular cuando el reporte es contra un usuario
  IF v_report_type = 'user' AND v_target_id IS NOT NULL THEN
    PERFORM recalculate_user_reputation(v_target_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reputation_reports_au ON reports;
CREATE TRIGGER trg_reputation_reports_au
AFTER INSERT OR UPDATE ON reports
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_reputation_on_reports();

COMMENT ON FUNCTION trigger_recalculate_reputation_on_reports IS
  'Trigger de reputación: recalcula user_reputation cuando se crean o actualizan reportes contra usuarios.';

COMMENT ON TRIGGER trg_reputation_reports_au ON reports IS
  'AFTER INSERT/UPDATE: llama recalculate_user_reputation cuando un reporte es de tipo ''user''.';

-- ============================================
-- 5. TRIGGER: profiles (ban/unban vía banned_at)
-- ============================================

CREATE OR REPLACE FUNCTION trigger_recalculate_reputation_on_profiles_ban()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actuar cuando cambia banned_at (ban/unban)
  IF OLD.banned_at IS DISTINCT FROM NEW.banned_at THEN
    PERFORM recalculate_user_reputation(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reputation_profiles_banned_at_au ON profiles;
CREATE TRIGGER trg_reputation_profiles_banned_at_au
AFTER UPDATE OF banned_at ON profiles
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_reputation_on_profiles_ban();

COMMENT ON FUNCTION trigger_recalculate_reputation_on_profiles_ban IS
  'Trigger de reputación: recalcula user_reputation cuando se banea o desbanea un usuario (cambio en banned_at).';

COMMENT ON TRIGGER trg_reputation_profiles_banned_at_au ON profiles IS
  'AFTER UPDATE OF banned_at: llama recalculate_user_reputation para el usuario afectado.';









