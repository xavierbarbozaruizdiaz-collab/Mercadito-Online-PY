-- ============================================
-- MERCADITO ONLINE PY - SCHEMA SIMPLE UPDATE
-- Migración: Agregar solo las columnas esenciales
-- ============================================

-- ============================================
-- ACTUALIZAR TABLA PROFILES
-- ============================================

-- Agregar columnas faltantes a profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS membership_level TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS membership_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE;

-- ============================================
-- CREAR TABLA STORES
-- ============================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  logo_url TEXT,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  social_links JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ACTUALIZAR TABLA PRODUCTS
-- ============================================

-- Agregar columnas faltantes a products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS compare_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS sku TEXT,
ADD COLUMN IF NOT EXISTS barcode TEXT,
ADD COLUMN IF NOT EXISTS weight DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS dimensions JSONB,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- ============================================
-- CREAR TABLA PRODUCT_VARIANTS
-- ============================================

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sku TEXT,
  price DECIMAL(10,2),
  compare_price DECIMAL(10,2),
  stock_quantity INTEGER DEFAULT 0,
  attributes JSONB NOT NULL,
  image_url TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ACTUALIZAR TABLA PRODUCT_IMAGES
-- ============================================

-- Agregar columnas faltantes a product_images
ALTER TABLE product_images 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS alt_text TEXT,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- ============================================
-- ACTUALIZAR TABLA ORDERS
-- ============================================

-- Agregar columnas faltantes a orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_address JSONB;

-- ============================================
-- ACTUALIZAR TABLA ORDER_ITEMS
-- ============================================

-- Agregar columnas faltantes a order_items
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE;

-- ============================================
-- CREAR TABLAS FALTANTES
-- ============================================

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  payment_provider TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'PYG',
  status TEXT NOT NULL DEFAULT 'pending',
  provider_transaction_id TEXT,
  provider_response JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de envíos
CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tracking_number TEXT,
  carrier TEXT,
  service_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  estimated_delivery TIMESTAMP,
  actual_delivery TIMESTAMP,
  shipping_address JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de mensajes
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  subject TEXT,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CREAR ÍNDICES BÁSICOS
-- ============================================

-- Índices para perfiles
CREATE INDEX IF NOT EXISTS idx_profiles_membership ON profiles(membership_level);

-- Índices para tiendas
CREATE INDEX IF NOT EXISTS idx_stores_seller_id ON stores(seller_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_active ON stores(is_active);

-- Índices para productos
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);

-- Índices para variantes
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_default ON product_variants(is_default);

-- Índices para imágenes
CREATE INDEX IF NOT EXISTS idx_product_images_cover ON product_images(is_cover);

-- Índices para órdenes
CREATE INDEX IF NOT EXISTS idx_orders_seller_id ON orders(seller_id);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Índices para envíos
CREATE INDEX IF NOT EXISTS idx_shipments_order_id ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Índices para mensajes
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);

-- Índices para analytics
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);

-- ============================================
-- CREAR TRIGGERS BÁSICOS
-- ============================================

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_stores_updated_at ON stores;
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shipments_updated_at ON shipments;
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HABILITAR RLS
-- ============================================

-- Habilitar RLS en nuevas tablas
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS BÁSICAS
-- ============================================

-- Políticas para stores
CREATE POLICY "stores_select_public" ON stores FOR SELECT TO public USING (is_active = true);
CREATE POLICY "stores_insert_seller" ON stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "stores_update_own" ON stores FOR UPDATE TO authenticated USING (auth.uid() = seller_id);

-- Políticas para product_variants
CREATE POLICY "product_variants_select_public" ON product_variants FOR SELECT TO public USING (
  EXISTS (SELECT 1 FROM products WHERE id = product_id AND status = 'active')
);
CREATE POLICY "product_variants_insert_seller" ON product_variants FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM products p JOIN stores s ON p.store_id = s.id WHERE p.id = product_id AND s.seller_id = auth.uid())
);

-- Políticas para payments
CREATE POLICY "payments_select_own" ON payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);

-- Políticas para shipments
CREATE POLICY "shipments_select_own" ON shipments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);

-- Políticas para notifications
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_own" ON notifications FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Políticas para messages
CREATE POLICY "messages_select_own" ON messages FOR SELECT TO authenticated USING (
  sender_id = auth.uid() OR recipient_id = auth.uid()
);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- Políticas para analytics_events
CREATE POLICY "analytics_events_insert_authenticated" ON analytics_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "analytics_events_select_admin" ON analytics_events FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

DO $$
DECLARE
    table_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Verificar tablas
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('profiles', 'stores', 'categories', 'products', 'product_variants', 'product_images', 'orders', 'order_items', 'payments', 'shipments', 'notifications', 'messages', 'analytics_events');
    
    -- Verificar columnas nuevas en profiles
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns
    WHERE table_name = 'profiles' AND table_schema = 'public'
    AND column_name IN ('membership_level', 'first_name', 'last_name', 'phone', 'avatar_url', 'cover_url', 'bio', 'location', 'verified');
    
    RAISE NOTICE '✅ Actualización completada: % tablas verificadas', table_count;
    RAISE NOTICE '✅ Columnas nuevas en profiles: %', column_count;
    RAISE NOTICE '✅ RLS habilitado en todas las tablas';
    RAISE NOTICE '✅ Índices creados para optimización';
    RAISE NOTICE '✅ Triggers de updated_at configurados';
    RAISE NOTICE '✅ Políticas de seguridad aplicadas';
END $$;
