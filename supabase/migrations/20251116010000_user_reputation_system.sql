-- ============================================
-- MERCADITO ONLINE PY - SISTEMA DE REPUTACIÓN DE USUARIOS
-- Tabla y funciones para score unificado de reputación / strikes
-- ============================================

-- ============================================
-- 1. TABLA: user_reputation
-- Resumen unificado de reputación por usuario
-- ============================================

CREATE TABLE IF NOT EXISTS user_reputation (
  user_id UUID PRIMARY KEY,
  
  -- Métricas agregadas
  total_strikes INTEGER NOT NULL DEFAULT 0,
  strikes_last_90_days INTEGER NOT NULL DEFAULT 0,
  penalties_count INTEGER NOT NULL DEFAULT 0,          -- Multas como comprador (auction_penalties)
  seller_penalties_count INTEGER NOT NULL DEFAULT 0,   -- Multas como vendedor (seller_delivery_penalties)
  admin_alerts_count INTEGER NOT NULL DEFAULT 0,       -- Alertas admin relevantes
  reports_count INTEGER NOT NULL DEFAULT 0,            -- Reportes relevantes
  
  -- Score y nivel
  score INTEGER NOT NULL DEFAULT 100,
  level TEXT NOT NULL DEFAULT 'OK',
  
  -- Auditoría de reputación
  last_recalculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_strike_at TIMESTAMPTZ,
  notes TEXT,
  
  -- Constraints
  CONSTRAINT chk_user_reputation_score CHECK (score >= 0 AND score <= 100),
  CONSTRAINT chk_user_reputation_level CHECK (level IN ('OK', 'WARNING', 'RESTRICTED', 'BANNED'))
);

-- Índice adicional para reportes/admin (filtrar por nivel y ordenar por score)
CREATE INDEX IF NOT EXISTS idx_user_reputation_level_score
  ON user_reputation(level, score DESC);

-- ============================================
-- 2. FUNCIÓN: recalculate_user_reputation(p_user_id)
-- Recalcula reputación para un usuario específico
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_user_reputation(
  p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
  -- Verificación de existencia de perfil
  v_profile_exists BOOLEAN;
  v_banned_at TIMESTAMPTZ;
  
  -- Métricas de multas como comprador
  v_penalties_count INTEGER := 0;
  v_penalties_recent INTEGER := 0;
  v_penalties_last_at TIMESTAMPTZ;
  
  -- Métricas de multas como vendedor
  v_seller_penalties_count INTEGER := 0;
  v_seller_penalties_recent INTEGER := 0;
  v_seller_penalties_last_at TIMESTAMPTZ;
  
  -- Métricas de alertas admin
  v_admin_alerts_count INTEGER := 0;
  v_admin_alerts_recent INTEGER := 0;
  v_admin_alerts_last_at TIMESTAMPTZ;
  v_alerts_medium_count INTEGER := 0;
  v_alerts_high_count INTEGER := 0;
  v_alerts_critical_count INTEGER := 0;
  v_alerts_high_critical INTEGER := 0;
  v_suspicious_severe INTEGER := 0;
  
  -- Métricas de reportes
  v_reports_count INTEGER := 0;
  v_reports_recent INTEGER := 0;
  v_reports_last_at TIMESTAMPTZ;
  
  -- Agregados
  v_strikes_last_90_days INTEGER := 0;
  v_total_strikes INTEGER := 0;
  v_last_strike_at TIMESTAMPTZ;
  
  -- Score y penalizaciones
  v_score INTEGER := 100;
  v_penalty_buyer_penalties INTEGER := 0;
  v_penalty_seller_penalties INTEGER := 0;
  v_penalty_alerts INTEGER := 0;
  v_penalty_reports INTEGER := 0;
  v_penalty_recent INTEGER := 0;
  v_total_penalty INTEGER := 0;
  
  v_level TEXT := 'OK';
BEGIN
  -- Verificar que el usuario exista en profiles
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = p_user_id
  ) INTO v_profile_exists;
  
  IF NOT v_profile_exists THEN
    -- Si no existe perfil, no hacer nada para evitar romper flujos
    RETURN;
  END IF;
  
  -- Obtener estado de ban
  SELECT banned_at
  INTO v_banned_at
  FROM profiles
  WHERE id = p_user_id;
  
  -- ==========================
  -- Multas como comprador
  -- ==========================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auction_penalties' AND table_schema = 'public') THEN
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (
        WHERE applied_at >= NOW() - INTERVAL '90 days'
      ) AS recent_count,
      MAX(applied_at) AS last_at
    INTO
      v_penalties_count,
      v_penalties_recent,
      v_penalties_last_at
    FROM auction_penalties
    WHERE user_id = p_user_id
      AND status != 'cancelled';
  END IF;
  
  -- ==========================
  -- Multas como vendedor
  -- ==========================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_delivery_penalties' AND table_schema = 'public') THEN
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (
        WHERE applied_at >= NOW() - INTERVAL '90 days'
      ) AS recent_count,
      MAX(applied_at) AS last_at
    INTO
      v_seller_penalties_count,
      v_seller_penalties_recent,
      v_seller_penalties_last_at
    FROM seller_delivery_penalties
    WHERE seller_id = p_user_id
      AND status != 'cancelled';
  END IF;
  
  -- ==========================
  -- Alertas admin relevantes
  -- ==========================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_alerts' AND table_schema = 'public') THEN
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (
        WHERE created_at >= NOW() - INTERVAL '90 days'
      ) AS recent_count,
      MAX(created_at) AS last_at,
      COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
      COUNT(*) FILTER (WHERE severity = 'high') AS high_count,
      COUNT(*) FILTER (WHERE severity = 'critical') AS critical_count,
      COUNT(*) FILTER (WHERE severity IN ('high','critical')) AS high_critical_count,
      COUNT(*) FILTER (
        WHERE alert_type = 'suspicious_bidder'
          AND severity IN ('high','critical')
      ) AS suspicious_severe_count
    INTO
      v_admin_alerts_count,
      v_admin_alerts_recent,
      v_admin_alerts_last_at,
      v_alerts_medium_count,
      v_alerts_high_count,
      v_alerts_critical_count,
      v_alerts_high_critical,
      v_suspicious_severe
    FROM admin_alerts
    WHERE related_entity_type = 'user'
      AND related_entity_id = p_user_id
      AND severity IN ('medium','high','critical')
      AND status IN ('open','acknowledged');
  END IF;
  
  -- ==========================
  -- Reportes relevantes
  -- ==========================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reports' AND table_schema = 'public') THEN
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (
        WHERE created_at >= NOW() - INTERVAL '90 days'
      ) AS recent_count,
      MAX(created_at) AS last_at
    INTO
      v_reports_count,
      v_reports_recent,
      v_reports_last_at
    FROM reports
    WHERE target_id = p_user_id
      AND status IN ('pending','under_review','resolved');
  END IF;
  
  -- ==========================
  -- Agregados de strikes
  -- ==========================
  v_strikes_last_90_days :=
    COALESCE(v_penalties_recent, 0)
    + COALESCE(v_seller_penalties_recent, 0)
    + COALESCE(v_admin_alerts_recent, 0)
    + COALESCE(v_reports_recent, 0);
  
  v_total_strikes :=
    COALESCE(v_penalties_count, 0)
    + COALESCE(v_seller_penalties_count, 0)
    + COALESCE(v_admin_alerts_count, 0)
    + COALESCE(v_reports_count, 0);
  
  -- Último strike (mayor timestamp entre las fuentes)
  v_last_strike_at := GREATEST(
    COALESCE(v_penalties_last_at,        TO_TIMESTAMP(0)),
    COALESCE(v_seller_penalties_last_at, TO_TIMESTAMP(0)),
    COALESCE(v_admin_alerts_last_at,     TO_TIMESTAMP(0)),
    COALESCE(v_reports_last_at,          TO_TIMESTAMP(0))
  );
  IF v_last_strike_at = TO_TIMESTAMP(0) THEN
    v_last_strike_at := NULL;
  END IF;
  
  -- ==========================
  -- Cálculo de penalizaciones
  -- ==========================
  
  -- Multas como comprador: 10 puntos por multa, máximo 40
  v_penalty_buyer_penalties :=
    LEAST(COALESCE(v_penalties_count, 0) * 10, 40);
  
  -- Multas como vendedor: 15 puntos por multa, máximo 45
  v_penalty_seller_penalties :=
    LEAST(COALESCE(v_seller_penalties_count, 0) * 15, 45);
  
  -- Alertas admin:
  -- medium: 5 puntos, high: 10, critical: 15
  v_penalty_alerts :=
    COALESCE(v_alerts_medium_count, 0) * 5
    + COALESCE(v_alerts_high_count, 0) * 10
    + COALESCE(v_alerts_critical_count, 0) * 15;
  
  -- Extra para suspicious_bidder de severidad alta/crítica: +5 por alerta
  v_penalty_alerts := v_penalty_alerts
    + COALESCE(v_suspicious_severe, 0) * 5;
  
  -- Máximo 40 por alertas
  v_penalty_alerts := LEAST(v_penalty_alerts, 40);
  
  -- Reportes: 5 puntos por reporte, máximo 25
  v_penalty_reports :=
    LEAST(COALESCE(v_reports_count, 0) * 5, 25);
  
  -- Penalización por comportamiento reciente (últimos 90 días)
  IF v_strikes_last_90_days >= 5 THEN
    v_penalty_recent := 20;
  ELSIF v_strikes_last_90_days >= 3 THEN
    v_penalty_recent := 10;
  ELSE
    v_penalty_recent := 0;
  END IF;
  
  -- Penalización total (cap a 100)
  v_total_penalty :=
    COALESCE(v_penalty_buyer_penalties, 0)
    + COALESCE(v_penalty_seller_penalties, 0)
    + COALESCE(v_penalty_alerts, 0)
    + COALESCE(v_penalty_reports, 0)
    + COALESCE(v_penalty_recent, 0);
  
  v_total_penalty := LEAST(v_total_penalty, 100);
  
  v_score := 100 - v_total_penalty;
  
  -- Normalizar score a 0-100
  IF v_score < 0 THEN
    v_score := 0;
  ELSIF v_score > 100 THEN
    v_score := 100;
  END IF;
  
  -- ==========================
  -- Determinar nivel
  -- ==========================
  
  IF v_banned_at IS NOT NULL THEN
    -- Respeta ban manual: fuerza BANNED y score 0
    v_level := 'BANNED';
    v_score := 0;
  ELSE
    -- Por defecto OK
    v_level := 'OK';
    
    -- RESTRICTED si score bajo o muchos strikes / alertas graves
    IF v_score < 50
       OR v_strikes_last_90_days >= 3
       OR COALESCE(v_alerts_high_critical, 0) >= 2 THEN
      v_level := 'RESTRICTED';
    -- WARNING si score intermedio y strikes moderados
    ELSIF v_score >= 50 AND v_score < 80
          AND v_strikes_last_90_days <= 3
          AND COALESCE(v_alerts_high_critical, 0) <= 1 THEN
      v_level := 'WARNING';
    -- OK si score alto y casi sin strikes recientes
    ELSIF v_score >= 80
          AND v_strikes_last_90_days <= 1 THEN
      v_level := 'OK';
    ELSE
      -- Cualquier combinación no cubierta explícitamente se considera WARNING conservador
      v_level := 'WARNING';
    END IF;
  END IF;
  
  -- ==========================
  -- Upsert en user_reputation
  -- ==========================
  INSERT INTO user_reputation (
    user_id,
    total_strikes,
    strikes_last_90_days,
    penalties_count,
    seller_penalties_count,
    admin_alerts_count,
    reports_count,
    score,
    level,
    last_recalculated_at,
    last_strike_at
  ) VALUES (
    p_user_id,
    COALESCE(v_total_strikes, 0),
    COALESCE(v_strikes_last_90_days, 0),
    COALESCE(v_penalties_count, 0),
    COALESCE(v_seller_penalties_count, 0),
    COALESCE(v_admin_alerts_count, 0),
    COALESCE(v_reports_count, 0),
    COALESCE(v_score, 0),
    v_level,
    NOW(),
    v_last_strike_at
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_strikes = EXCLUDED.total_strikes,
    strikes_last_90_days = EXCLUDED.strikes_last_90_days,
    penalties_count = EXCLUDED.penalties_count,
    seller_penalties_count = EXCLUDED.seller_penalties_count,
    admin_alerts_count = EXCLUDED.admin_alerts_count,
    reports_count = EXCLUDED.reports_count,
    score = EXCLUDED.score,
    level = EXCLUDED.level,
    last_recalculated_at = EXCLUDED.last_recalculated_at,
    last_strike_at = EXCLUDED.last_strike_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_user_reputation IS
  'Recalcula el score de reputación y nivel para un usuario específico a partir de multas, alertas y reportes.';

-- ============================================
-- 3. FUNCIÓN: recalculate_all_user_reputations()
-- Recalcula reputación para todos los usuarios relevantes
-- ============================================

CREATE OR REPLACE FUNCTION recalculate_all_user_reputations()
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
  v_processed INTEGER := 0;
BEGIN
  -- Generar conjunto de usuarios relevantes
  FOR v_user IN
    SELECT DISTINCT uid AS user_id
    FROM (
      SELECT user_id AS uid
      FROM auction_penalties
      WHERE user_id IS NOT NULL
      
      UNION
      
      SELECT seller_id AS uid
      FROM seller_delivery_penalties
      WHERE seller_id IS NOT NULL
      
      UNION
      
      SELECT related_entity_id AS uid
      FROM admin_alerts
      WHERE related_entity_type = 'user'
        AND related_entity_id IS NOT NULL
      
      UNION
      
      SELECT target_id AS uid
      FROM reports
      WHERE target_id IS NOT NULL
      
      UNION
      
      SELECT id AS uid
      FROM profiles
    ) AS users
  LOOP
    PERFORM recalculate_user_reputation(v_user.user_id);
    v_processed := v_processed + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'processed', v_processed,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION recalculate_all_user_reputations IS
  'Recalcula el score de reputación para todos los usuarios relevantes y devuelve un resumen en JSON.';









