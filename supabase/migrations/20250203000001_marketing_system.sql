-- ============================================
-- MARKETING SYSTEM - TABLAS Y FUNCIONES
-- ============================================

-- Tabla: marketing_campaigns
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('general', 'individual')),
  meta_campaign_id VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  objective VARCHAR(50) CHECK (objective IN ('traffic', 'conversions', 'engagement', 'awareness')),
  budget_amount DECIMAL(10,2),
  budget_type VARCHAR(20) CHECK (budget_type IN ('daily', 'lifetime')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  target_url TEXT NOT NULL,
  ad_set_id VARCHAR(255),
  creative_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tabla: campaign_metrics
CREATE TABLE IF NOT EXISTS campaign_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  spend DECIMAL(10,2) DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr DECIMAL(5,4),
  cpc DECIMAL(10,4),
  cpm DECIMAL(10,4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campaign_id, date)
);

-- Tabla: campaign_targeting
CREATE TABLE IF NOT EXISTS campaign_targeting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  age_min INTEGER CHECK (age_min >= 13 AND age_min <= 65),
  age_max INTEGER CHECK (age_max >= 13 AND age_max <= 65),
  genders JSONB,
  locations JSONB,
  interests JSONB,
  behaviors JSONB,
  custom_audiences JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(campaign_id)
);

-- Tabla: product_catalog_sync
CREATE TABLE IF NOT EXISTS product_catalog_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('meta', 'tiktok', 'instagram', 'google')),
  external_id VARCHAR(255),
  sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'syncing')),
  last_synced_at TIMESTAMP,
  error_message TEXT,
  sync_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(product_id, platform)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_store_id ON marketing_campaigns(store_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_type ON marketing_campaigns(campaign_type);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_campaign_id ON campaign_metrics(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_metrics_date ON campaign_metrics(date);
CREATE INDEX IF NOT EXISTS idx_product_catalog_sync_product_id ON product_catalog_sync(product_id);
CREATE INDEX IF NOT EXISTS idx_product_catalog_sync_status ON product_catalog_sync(sync_status);
CREATE INDEX IF NOT EXISTS idx_product_catalog_sync_platform ON product_catalog_sync(platform);

-- Vista: store_daily_metrics (para analytics rápido)
-- Nota: store_id se extrae de event_data JSONB
CREATE OR REPLACE VIEW store_daily_metrics AS
SELECT 
  (event_data->>'store_id')::UUID as store_id,
  DATE(COALESCE(timestamp, created_at)) as date,
  COUNT(*) as views,
  COUNT(DISTINCT user_id) as unique_visitors,
  COUNT(DISTINCT COALESCE(session_id, user_id::text)) as sessions
FROM analytics_events
WHERE event_type = 'store_view' 
  AND event_data->>'store_id' IS NOT NULL
GROUP BY (event_data->>'store_id')::UUID, DATE(COALESCE(timestamp, created_at));

-- Vista: product_analytics_by_store
CREATE OR REPLACE VIEW product_analytics_by_store AS
SELECT 
  p.store_id,
  p.id as product_id,
  p.title as product_title,
  COUNT(ae.id) as views,
  COUNT(DISTINCT ae.user_id) as unique_views,
  SUM(CASE WHEN ae.event_type = 'add_to_cart' THEN 1 ELSE 0 END) as add_to_cart_count,
  SUM(CASE WHEN ae.event_type = 'purchase' THEN 1 ELSE 0 END) as purchase_count
FROM products p
LEFT JOIN analytics_events ae ON ae.event_data->>'product_id' = p.id::text
WHERE p.status != 'archived' OR p.status IS NULL
GROUP BY p.store_id, p.id, p.title;

-- Función: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_marketing_campaigns_updated_at
  BEFORE UPDATE ON marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_marketing_campaigns_updated_at();

CREATE OR REPLACE FUNCTION update_product_catalog_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_catalog_sync_updated_at
  BEFORE UPDATE ON product_catalog_sync
  FOR EACH ROW
  EXECUTE FUNCTION update_product_catalog_sync_updated_at();

-- RLS Policies
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targeting ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_catalog_sync ENABLE ROW LEVEL SECURITY;

-- Policy: Marketing campaigns - Los admins pueden ver todas, los vendedores solo las suyas
CREATE POLICY "Admins can view all campaigns" ON marketing_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own store campaigns" ON marketing_campaigns
  FOR SELECT
  USING (
    store_id IN (
      SELECT id FROM stores WHERE seller_id = auth.uid()
    )
    OR campaign_type = 'general'
  );

CREATE POLICY "Admins can insert campaigns" ON marketing_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Sellers can insert own store campaigns" ON marketing_campaigns
  FOR INSERT
  WITH CHECK (
    store_id IN (
      SELECT id FROM stores WHERE seller_id = auth.uid()
    )
    AND campaign_type = 'individual'
  );

CREATE POLICY "Admins can update all campaigns" ON marketing_campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Sellers can update own store campaigns" ON marketing_campaigns
  FOR UPDATE
  USING (
    store_id IN (
      SELECT id FROM stores WHERE seller_id = auth.uid()
    )
  );

-- Policy: Campaign metrics - Solo lectura
CREATE POLICY "Admins can view all campaign metrics" ON campaign_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Sellers can view own store campaign metrics" ON campaign_metrics
  FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM marketing_campaigns
      WHERE store_id IN (
        SELECT id FROM stores WHERE seller_id = auth.uid()
      )
    )
  );

-- Policy: Product catalog sync - Vendedores ven solo sus productos
CREATE POLICY "Sellers can view own product sync" ON product_catalog_sync
  FOR SELECT
  USING (
    product_id IN (
      SELECT id FROM products WHERE seller_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all product sync" ON product_catalog_sync
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert product sync" ON product_catalog_sync
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update product sync" ON product_catalog_sync
  FOR UPDATE
  USING (true);

-- Comentarios
COMMENT ON TABLE marketing_campaigns IS 'Campañas de marketing centralizadas e individuales';
COMMENT ON TABLE campaign_metrics IS 'Métricas diarias de campañas de marketing';
COMMENT ON TABLE campaign_targeting IS 'Configuración de targeting para campañas';
COMMENT ON TABLE product_catalog_sync IS 'Sincronización de productos con plataformas externas (Meta, TikTok, etc.)';

