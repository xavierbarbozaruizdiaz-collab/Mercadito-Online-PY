# 📋 PLAN INTEGRADO - MEJORAS PRIORIDADES 6-9
## Sistema de Gestión LPMS - Mercadito Online PY

**Fecha de Planificación:** 2025-01-30  
**Estado:** 📝 Planificado - Pendiente de Implementación

---

## 🎯 RESUMEN EJECUTIVO

Este plan integra 4 mejoras críticas de automatización y monitoreo para el marketplace:

| Prioridad | Mejora | Tipo | Complejidad | Tiempo Estimado |
|-----------|--------|------|-------------|-----------------|
| P6 | Cálculo de Comisiones | Automatización | Media | 2-3 días |
| P7 | Auditoría Nocturna | Monitoreo | Alta | 3-4 días |
| P8 | Limpieza Inactivos | Mantenimiento | Media | 2 días |
| P9 | Backups Automáticos | Infraestructura | Alta | 2-3 días |

**Tiempo Total Estimado:** 9-12 días de desarrollo  
**Dependencias:** P6 debe completarse antes de P7 (comisiones en auditoría)

---

## 📊 PRIORIDAD 6: CÁLCULO DE COMISIONES

### 🎯 Objetivo
Calcular automáticamente las comisiones de plataforma según el plan del vendedor cuando se crea una orden.

### 📐 Análisis Técnico

#### **Datos Actuales:**
- ✅ Tabla `orders` existe con `buyer_id`, `total_amount`, `status`
- ✅ Tabla `order_items` con `seller_id`, `total_price`
- ✅ Tabla `profiles` con `membership_level` ('free', 'bronze', 'silver', 'gold')
- ❌ Tabla `platform_fees` NO existe
- ❌ Trigger SQL NO existe

#### **Estructura Requerida:**

**1. Nueva Tabla: `platform_fees`**
```sql
CREATE TABLE platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES profiles(id),
  order_item_id UUID REFERENCES order_items(id),
  membership_level TEXT NOT NULL CHECK (membership_level IN ('free', 'bronze', 'silver', 'gold')),
  order_amount DECIMAL(10,2) NOT NULL,
  fee_percent DECIMAL(5,2) NOT NULL, -- Ej: 10.00 = 10%
  fee_amount DECIMAL(10,2) NOT NULL, -- Calculado: order_amount * (fee_percent / 100)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'collected', 'refunded')),
  collected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  INDEX idx_platform_fees_order_id (order_id),
  INDEX idx_platform_fees_seller_id (seller_id),
  INDEX idx_platform_fees_status (status)
);
```

**2. Configuración de Comisiones por Plan:**
```sql
-- Tabla de configuración (alternativa: función hardcodeada)
CREATE TABLE commission_config (
  membership_level TEXT PRIMARY KEY CHECK (membership_level IN ('free', 'bronze', 'silver', 'gold')),
  fee_percent DECIMAL(5,2) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO commission_config (membership_level, fee_percent) VALUES
  ('free', 15.00),    -- 15% para plan gratuito
  ('bronze', 12.00),  -- 12% para Bronce
  ('silver', 10.00),  -- 10% para Plata
  ('gold', 8.00);     -- 8% para Oro
```

**3. Trigger SQL: `calculate_platform_fees_trigger`**
```sql
CREATE OR REPLACE FUNCTION calculate_platform_fees()
RETURNS TRIGGER AS $$
DECLARE
  v_seller_id UUID;
  v_membership_level TEXT;
  v_fee_percent DECIMAL(5,2);
  v_order_item RECORD;
BEGIN
  -- Para cada item de la orden, calcular fee
  FOR v_order_item IN (
    SELECT oi.id, oi.seller_id, oi.total_price
    FROM order_items oi
    WHERE oi.order_id = NEW.id
  ) LOOP
    -- Obtener plan del vendedor
    SELECT p.membership_level INTO v_membership_level
    FROM profiles p
    WHERE p.id = v_order_item.seller_id;
    
    -- Si no tiene plan, usar 'free'
    IF v_membership_level IS NULL THEN
      v_membership_level := 'free';
    END IF;
    
    -- Obtener porcentaje de comisión según plan
    SELECT fee_percent INTO v_fee_percent
    FROM commission_config
    WHERE membership_level = v_membership_level;
    
    -- Si no existe config, usar default 15%
    IF v_fee_percent IS NULL THEN
      v_fee_percent := 15.00;
    END IF;
    
    -- Calcular y insertar fee
    INSERT INTO platform_fees (
      order_id,
      seller_id,
      order_item_id,
      membership_level,
      order_amount,
      fee_percent,
      fee_amount,
      status
    ) VALUES (
      NEW.id,
      v_order_item.seller_id,
      v_order_item.id,
      v_membership_level,
      v_order_item.total_price,
      v_fee_percent,
      v_order_item.total_price * (v_fee_percent / 100.0),
      'pending'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger
CREATE TRIGGER trigger_calculate_fees
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION calculate_platform_fees();
```

#### **Flujo de Ejecución:**
```
1. Usuario completa checkout
2. Se inserta orden en tabla `orders`
3. Trigger `calculate_platform_fees()` se ejecuta automáticamente
4. Para cada order_item:
   a. Obtiene seller_id del item
   b. Consulta membership_level del seller en profiles
   c. Busca fee_percent en commission_config
   d. Calcula fee_amount = order_amount * (fee_percent / 100)
   e. Inserta registro en platform_fees
5. Fee queda en status='pending' hasta recolección
```

#### **Consideraciones:**
- ⚠️ **Múltiples vendedores por orden:** Cada `order_item` puede tener diferente `seller_id`
- ⚠️ **Plan expirado:** Verificar `membership_expires_at` si existe
- ⚠️ **Rendimiento:** Trigger se ejecuta en tiempo real, puede afectar inserción de orden
- ✅ **Rollback automático:** Si falla trigger, la orden no se crea (transacción)

#### **Testing:**
- Test con orden de múltiples vendedores
- Test con seller sin plan (default 'free')
- Test con plan expirado
- Test de cálculo correcto de comisiones

---

## 📊 PRIORIDAD 7: AUDITORÍA NOCTURNA

### 🎯 Objetivo
Ejecutar verificaciones automáticas nocturnas para detectar anomalías y generar alertas administrativas.

### 📐 Análisis Técnico

#### **Checks a Implementar:**

**1. Orden sin pago >48h**
```sql
-- Encontrar órdenes pendientes de pago por más de 48 horas
SELECT 
  o.id,
  o.buyer_id,
  o.total_amount,
  o.created_at,
  NOW() - o.created_at AS time_since_created
FROM orders o
WHERE o.status = 'pending'
  AND o.payment_status != 'paid'
  AND o.created_at < NOW() - INTERVAL '48 hours';
```

**2. Subasta finalizada sin orden**
```sql
-- Encontrar subastas que terminaron pero no tienen orden asociada
SELECT 
  p.id,
  p.title,
  p.seller_id,
  p.auction_end_at,
  p.winner_id,
  NOW() - p.auction_end_at AS time_since_ended
FROM products p
WHERE p.sale_type = 'auction'
  AND p.auction_status = 'ended'
  AND p.winner_id IS NOT NULL
  AND p.auction_end_at < NOW() - INTERVAL '24 hours'
  AND NOT EXISTS (
    SELECT 1 FROM orders o
    WHERE o.buyer_id = p.winner_id
    AND EXISTS (
      SELECT 1 FROM order_items oi
      WHERE oi.order_id = o.id
      AND oi.product_id = p.id
    )
  );
```

**3. Postores anómalos (IP/UA repetidos)**
```sql
-- Detectar posibles bots o cuentas duplicadas
-- Requiere tabla auction_bids con ip_address y user_agent
SELECT 
  bidder_id,
  COUNT(DISTINCT product_id) AS unique_auctions,
  COUNT(*) AS total_bids,
  COUNT(DISTINCT ip_address) AS unique_ips,
  COUNT(DISTINCT user_agent) AS unique_agents
FROM auction_bids
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY bidder_id
HAVING 
  COUNT(DISTINCT ip_address) = 1  -- Misma IP en todas las pujas
  OR COUNT(DISTINCT user_agent) = 1  -- Mismo user agent
  OR COUNT(*) > 50;  -- Más de 50 pujas en 7 días (threshold ajustable)
```

**4. Tabla de Alertas: `admin_alerts`**
```sql
CREATE TABLE admin_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'unpaid_order',
    'missing_auction_order',
    'suspicious_bidder',
    'inactive_seller',
    'system_error'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  related_entity_type TEXT, -- 'order', 'product', 'user', etc.
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}', -- Datos adicionales
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved', 'dismissed')),
  acknowledged_by UUID REFERENCES profiles(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_admin_alerts_type (alert_type),
  INDEX idx_admin_alerts_status (status),
  INDEX idx_admin_alerts_severity (severity),
  INDEX idx_admin_alerts_created (created_at)
);
```

**5. Función de Auditoría Nocturna**
```sql
CREATE OR REPLACE FUNCTION run_nightly_audit()
RETURNS TABLE (
  alerts_created INTEGER,
  alerts_by_type JSONB
) AS $$
DECLARE
  v_unpaid_orders INTEGER := 0;
  v_missing_orders INTEGER := 0;
  v_suspicious_bidders INTEGER := 0;
  v_order_record RECORD;
  v_auction_record RECORD;
  v_bidder_record RECORD;
BEGIN
  -- 1. Verificar órdenes sin pago >48h
  FOR v_order_record IN (
    SELECT 
      o.id,
      o.buyer_id,
      o.total_amount,
      o.created_at
    FROM orders o
    WHERE o.status = 'pending'
      AND (o.payment_status IS NULL OR o.payment_status != 'paid')
      AND o.created_at < NOW() - INTERVAL '48 hours'
  ) LOOP
    INSERT INTO admin_alerts (
      alert_type,
      severity,
      title,
      description,
      related_entity_type,
      related_entity_id,
      metadata
    ) VALUES (
      'unpaid_order',
      'medium',
      'Orden sin pago por más de 48 horas',
      'La orden #' || v_order_record.id || ' tiene un monto pendiente de $' || v_order_record.total_amount,
      'order',
      v_order_record.id,
      jsonb_build_object(
        'buyer_id', v_order_record.buyer_id,
        'amount', v_order_record.total_amount,
        'created_at', v_order_record.created_at
      )
    );
    v_unpaid_orders := v_unpaid_orders + 1;
  END LOOP;
  
  -- 2. Verificar subastas finalizadas sin orden
  FOR v_auction_record IN (
    SELECT 
      p.id,
      p.title,
      p.seller_id,
      p.auction_end_at,
      p.winner_id
    FROM products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'ended'
      AND p.winner_id IS NOT NULL
      AND p.auction_end_at < NOW() - INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM orders o
        WHERE o.buyer_id = p.winner_id
        AND EXISTS (
          SELECT 1 FROM order_items oi
          WHERE oi.order_id = o.id AND oi.product_id = p.id
        )
      )
  ) LOOP
    INSERT INTO admin_alerts (
      alert_type,
      severity,
      title,
      description,
      related_entity_type,
      related_entity_id,
      metadata
    ) VALUES (
      'missing_auction_order',
      'high',
      'Subasta finalizada sin orden de compra',
      'La subasta "' || v_auction_record.title || '" terminó pero el ganador no ha completado la compra',
      'product',
      v_auction_record.id,
      jsonb_build_object(
        'seller_id', v_auction_record.seller_id,
        'winner_id', v_auction_record.winner_id,
        'ended_at', v_auction_record.auction_end_at
      )
    );
    v_missing_orders := v_missing_orders + 1;
  END LOOP;
  
  -- 3. Detectar postores anómalos (requiere tabla auction_bids con IP/UA)
  -- Nota: Esta verificación requiere que auction_bids tenga columnas ip_address y user_agent
  -- Si no existen, esta parte se omite o se implementa después
  
  -- Retornar resumen
  RETURN QUERY SELECT 
    (v_unpaid_orders + v_missing_orders + v_suspicious_bidders)::INTEGER,
    jsonb_build_object(
      'unpaid_orders', v_unpaid_orders,
      'missing_auction_orders', v_missing_orders,
      'suspicious_bidders', v_suspicious_bidders
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**6. API Route para Ejecutar Auditoría**
```typescript
// src/app/api/cron/nightly-audit/route.ts
// Ejecutar vía cron: 0 2 * * * (2 AM diario)
```

**7. Notificación Email a Admin**
```typescript
// Enviar email con resumen de alertas críticas y altas
// Usar emailService existente
```

#### **Flujo de Ejecución:**
```
1. Cron job ejecuta a las 2 AM (configurado en Vercel/Supabase)
2. Llama a /api/cron/nightly-audit
3. Ejecuta función SQL run_nightly_audit()
4. Inserta alertas en admin_alerts
5. Filtra alertas críticas y altas
6. Envía email a admin con resumen
7. Retorna estadísticas
```

#### **Consideraciones:**
- ⚠️ **Rendimiento:** Auditoría puede tardar varios minutos con muchas órdenes
- ⚠️ **IP/UA tracking:** Requiere agregar columnas a `auction_bids` si no existen
- ✅ **Configuración flexible:** Thresholds ajustables en metadata
- ✅ **Historial:** Alertas quedan registradas para auditoría

---

## 📊 PRIORIDAD 8: LIMPIEZA INACTIVOS

### 🎯 Objetivo
Mantener el catálogo limpio ocultando productos sin stock y pausando tiendas inactivas.

### 📐 Análisis Técnico

#### **Reglas de Limpieza:**

**1. Producto sin stock → oculto**
```sql
-- Productos con stock_quantity = 0 o NULL
-- Cambiar status de 'active' a 'hidden' o agregar campo is_hidden
UPDATE products
SET 
  status = 'out_of_stock',
  updated_at = NOW()
WHERE 
  status = 'active'
  AND (stock_quantity IS NULL OR stock_quantity <= 0)
  AND sale_type = 'direct';  -- No aplicar a subastas (no tienen stock)
```

**2. Tienda sin actividad 90 días → paused**
```sql
-- Tiendas sin órdenes ni productos nuevos en 90 días
UPDATE stores
SET 
  is_active = false,
  settings = COALESCE(settings, '{}'::jsonb) || 
    jsonb_build_object('auto_paused_at', NOW(), 'reason', 'inactivity_90d'),
  updated_at = NOW()
WHERE 
  is_active = true
  AND (
    -- Sin productos nuevos
    (SELECT MAX(created_at) FROM products WHERE store_id = stores.id OR seller_id = stores.seller_id) 
    < NOW() - INTERVAL '90 days'
    OR NOT EXISTS (SELECT 1 FROM products WHERE store_id = stores.id OR seller_id = stores.seller_id)
  )
  AND (
    -- Sin órdenes recientes
    NOT EXISTS (
      SELECT 1 FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE (p.store_id = stores.id OR p.seller_id = stores.seller_id)
      AND o.created_at > NOW() - INTERVAL '90 days'
    )
  );
```

**3. Tabla de Logs: `maintenance_logs`**
```sql
CREATE TABLE maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN (
    'product_hidden',
    'product_restored',
    'store_paused',
    'store_activated',
    'cleanup',
    'backup'
  )),
  entity_type TEXT NOT NULL, -- 'product', 'store', 'order', etc.
  entity_id UUID,
  action_description TEXT NOT NULL,
  affected_count INTEGER,
  metadata JSONB DEFAULT '{}',
  executed_by TEXT DEFAULT 'system', -- 'system', 'admin_id', etc.
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_maintenance_logs_type (maintenance_type),
  INDEX idx_maintenance_logs_executed (executed_at)
);
```

**4. Función de Limpieza**
```sql
CREATE OR REPLACE FUNCTION cleanup_inactive_items()
RETURNS TABLE (
  products_hidden INTEGER,
  stores_paused INTEGER,
  log_id UUID
) AS $$
DECLARE
  v_products_hidden INTEGER := 0;
  v_stores_paused INTEGER := 0;
  v_log_id UUID;
BEGIN
  -- 1. Ocultar productos sin stock
  WITH updated_products AS (
    UPDATE products
    SET 
      status = 'out_of_stock',
      updated_at = NOW()
    WHERE 
      status = 'active'
      AND (stock_quantity IS NULL OR stock_quantity <= 0)
      AND sale_type = 'direct'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_products_hidden FROM updated_products;
  
  -- 2. Pausar tiendas inactivas
  WITH updated_stores AS (
    UPDATE stores
    SET 
      is_active = false,
      settings = COALESCE(settings, '{}'::jsonb) || 
        jsonb_build_object('auto_paused_at', NOW(), 'reason', 'inactivity_90d'),
      updated_at = NOW()
    WHERE 
      is_active = true
      AND (
        (SELECT MAX(created_at) FROM products WHERE store_id = stores.id OR seller_id = stores.seller_id) 
        < NOW() - INTERVAL '90 days'
        OR NOT EXISTS (SELECT 1 FROM products WHERE store_id = stores.id OR seller_id = stores.seller_id)
      )
      AND (
        NOT EXISTS (
          SELECT 1 FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          JOIN products p ON p.id = oi.product_id
          WHERE (p.store_id = stores.id OR p.seller_id = stores.seller_id)
          AND o.created_at > NOW() - INTERVAL '90 days'
        )
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_stores_paused FROM updated_stores;
  
  -- 3. Registrar en log
  INSERT INTO maintenance_logs (
    maintenance_type,
    entity_type,
    action_description,
    affected_count,
    metadata,
    executed_by
  ) VALUES (
    'cleanup',
    'mixed',
    'Limpieza automática de productos y tiendas inactivas',
    v_products_hidden + v_stores_paused,
    jsonb_build_object(
      'products_hidden', v_products_hidden,
      'stores_paused', v_stores_paused,
      'executed_at', NOW()
    ),
    'system'
  ) RETURNING id INTO v_log_id;
  
  RETURN QUERY SELECT 
    v_products_hidden,
    v_stores_paused,
    v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**5. API Route para Limpieza**
```typescript
// src/app/api/cron/cleanup-inactive/route.ts
// Ejecutar vía cron: 0 3 * * * (3 AM diario, después de auditoría)
```

#### **Flujo de Ejecución:**
```
1. Cron job ejecuta a las 3 AM
2. Llama a /api/cron/cleanup-inactive
3. Ejecuta función SQL cleanup_inactive_items()
4. Oculta productos sin stock
5. Pausa tiendas inactivas >90 días
6. Registra acciones en maintenance_logs
7. Retorna estadísticas
```

#### **Consideraciones:**
- ⚠️ **Subastas:** No aplicar limpieza a productos en subasta (no tienen stock)
- ⚠️ **Reactivación:** Productos/tiendas pueden reactivarse manualmente
- ✅ **Reversible:** Cambios se pueden revertir
- ✅ **Configurable:** Thresholds ajustables (90 días)

---

## 📊 PRIORIDAD 9: BACKUPS AUTOMÁTICOS

### 🎯 Objetivo
Automatizar backups de base de datos y storage con retención de 4 semanas.

### 📐 Análisis Técnico

#### **Estrategia de Backup:**

**1. Base de Datos (Supabase)**
```bash
# Usar pg_dump desde Supabase CLI
# Alternativa: Supabase Dashboard → Backups automáticos (si está disponible)

# Script de backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/db"
SUPABASE_DB_URL="postgresql://..."

# Crear directorio si no existe
mkdir -p $BACKUP_DIR

# Dump completo
pg_dump $SUPABASE_DB_URL > "$BACKUP_DIR/backup_$DATE.sql"

# Comprimir
gzip "$BACKUP_DIR/backup_$DATE.sql"

# Subir a S3/R2
aws s3 cp "$BACKUP_DIR/backup_$DATE.sql.gz" \
  s3://mercadito-backups/db/backup_$DATE.sql.gz

# Limpiar backups locales antiguos (>7 días)
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

**2. Storage (Supabase Storage → S3/R2)**
```bash
# Script de sync
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/storage"

# Sync buckets de Supabase a S3/R2
# Usar supabase storage sync o rclone

# Bucket: product-images
supabase storage download product-images \
  --output "$BACKUP_DIR/product-images_$DATE/"

# Bucket: profiles
supabase storage download profiles \
  --output "$BACKUP_DIR/profiles_$DATE/"

# Subir a S3/R2
aws s3 sync "$BACKUP_DIR/product-images_$DATE/" \
  s3://mercadito-backups/storage/product-images/$DATE/

aws s3 sync "$BACKUP_DIR/profiles_$DATE/" \
  s3://mercadito-backups/storage/profiles/$DATE/

# Limpiar backups locales
rm -rf "$BACKUP_DIR"
```

**3. Configuración de Retención (4 semanas)**
```sql
-- Tabla para tracking de backups
CREATE TABLE backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('database', 'storage', 'full')),
  backup_location TEXT NOT NULL, -- URL o path del backup
  backup_size_bytes BIGINT,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'completed', 'failed')),
  error_message TEXT,
  retention_until TIMESTAMPTZ NOT NULL, -- Fecha de expiración (4 semanas)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_backup_logs_type (backup_type),
  INDEX idx_backup_logs_status (status),
  INDEX idx_backup_logs_retention (retention_until)
);
```

**4. Función de Limpieza de Backups Antiguos**
```sql
CREATE OR REPLACE FUNCTION cleanup_old_backups()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_backup_record RECORD;
BEGIN
  -- Encontrar backups expirados (>4 semanas)
  FOR v_backup_record IN (
    SELECT id, backup_location, backup_type
    FROM backup_logs
    WHERE retention_until < NOW()
      AND status = 'completed'
  ) LOOP
    -- Eliminar del storage (S3/R2) - se hace desde API externa
    -- Solo marcamos como expirado en BD
    UPDATE backup_logs
    SET status = 'expired'
    WHERE id = v_backup_record.id;
    
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;
```

**5. API Routes para Backups**
```typescript
// src/app/api/cron/backup-database/route.ts
// Ejecutar: Domingos 1 AM (backup semanal)

// src/app/api/cron/backup-storage/route.ts
// Ejecutar: Domingos 2 AM

// src/app/api/cron/cleanup-backups/route.ts
// Ejecutar: Domingos 3 AM (limpiar backups >4 semanas)
```

**6. Integración con S3/R2**
```typescript
// Usar AWS SDK o Cloudflare R2 SDK
// Configurar credenciales en env variables
// S3_BUCKET_NAME o R2_BUCKET_NAME
// S3_ACCESS_KEY_ID
// S3_SECRET_ACCESS_KEY
```

#### **Estructura de Backups:**
```
backups/
├── db/
│   ├── weekly/
│   │   ├── backup_20250101_010000.sql.gz  (semana 1)
│   │   ├── backup_20250108_010000.sql.gz  (semana 2)
│   │   ├── backup_20250115_010000.sql.gz  (semana 3)
│   │   └── backup_20250122_010000.sql.gz  (semana 4)
│   └── monthly/  (opcional, retención más larga)
└── storage/
    ├── product-images/
    │   └── 20250101/
    └── profiles/
        └── 20250101/
```

#### **Flujo de Ejecución:**
```
1. Cron job ejecuta backup-database (Domingos 1 AM)
2. Ejecuta pg_dump de Supabase
3. Comprime backup
4. Sube a S3/R2
5. Registra en backup_logs
6. Repite para storage (2 AM)
7. Limpieza de backups antiguos (3 AM)
```

#### **Consideraciones:**
- ⚠️ **Costo de storage:** 4 semanas de backups pueden ser costosos
- ⚠️ **Tiempo de ejecución:** Backups grandes pueden tardar horas
- ⚠️ **Credenciales:** Manejar secrets de forma segura
- ✅ **Incremental:** Considerar backups incrementales para ahorrar espacio
- ✅ **Verificación:** Validar integridad de backups periódicamente

---

## 🔗 DEPENDENCIAS Y ORDEN DE IMPLEMENTACIÓN

### **Dependencias Críticas:**
```
P6 (Comisiones) → P7 (Auditoría)
  └─ Las auditorías necesitan verificar fees

P7, P8, P9 → Independientes entre sí
  └─ Pueden implementarse en paralelo después de P6
```

### **Orden Recomendado:**
1. **Primero:** P6 - Comisiones (base para otras verificaciones)
2. **Segundo:** P8 - Limpieza (más simple, beneficios inmediatos)
3. **Tercero:** P7 - Auditoría (más compleja, requiere P6)
4. **Cuarto:** P9 - Backups (infraestructura, puede ser en paralelo)

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### **P6: Comisiones**
- [ ] Crear tabla `platform_fees`
- [ ] Crear tabla `commission_config`
- [ ] Crear función `calculate_platform_fees()`
- [ ] Crear trigger `trigger_calculate_fees`
- [ ] Agregar columnas a `order_items` si faltan (seller_id)
- [ ] Tests: verificar cálculo correcto
- [ ] Tests: múltiples vendedores por orden
- [ ] Tests: seller sin plan (default)

### **P7: Auditoría Nocturna**
- [ ] Crear tabla `admin_alerts`
- [ ] Crear función `run_nightly_audit()`
- [ ] Crear API route `/api/cron/nightly-audit`
- [ ] Configurar cron job (Vercel/Supabase)
- [ ] Integrar email a admin
- [ ] Agregar columnas IP/UA a `auction_bids` (opcional)
- [ ] Dashboard de alertas (opcional, fase 2)

### **P8: Limpieza Inactivos**
- [ ] Verificar estructura de `products` (status, stock_quantity)
- [ ] Crear tabla `maintenance_logs`
- [ ] Crear función `cleanup_inactive_items()`
- [ ] Crear API route `/api/cron/cleanup-inactive`
- [ ] Configurar cron job
- [ ] Tests: productos sin stock
- [ ] Tests: tiendas inactivas

### **P9: Backups Automáticos**
- [ ] Configurar credenciales S3/R2
- [ ] Crear tabla `backup_logs`
- [ ] Crear script de backup DB (bash/Node)
- [ ] Crear script de sync storage
- [ ] Crear API route `/api/cron/backup-database`
- [ ] Crear API route `/api/cron/backup-storage`
- [ ] Crear API route `/api/cron/cleanup-backups`
- [ ] Configurar cron jobs
- [ ] Implementar retención 4 semanas
- [ ] Tests: verificar backups generados

---

## 🎯 MÉTRICAS DE ÉXITO

### **P6: Comisiones**
- ✅ 100% de órdenes generan fees automáticamente
- ✅ Cálculo correcto según plan del seller
- ✅ Tiempo de ejecución < 500ms por orden

### **P7: Auditoría**
- ✅ Detecta órdenes sin pago >48h
- ✅ Detecta subastas sin orden
- ✅ Genera alertas en < 5 minutos
- ✅ Email a admin con resumen

### **P8: Limpieza**
- ✅ Oculta productos sin stock diariamente
- ✅ Pausa tiendas inactivas >90 días
- ✅ Registra todas las acciones en logs

### **P9: Backups**
- ✅ Backups semanales completos
- ✅ Retención de 4 semanas
- ✅ Verificación de integridad
- ✅ Restauración exitosa (test periódico)

---

## 📝 NOTAS ADICIONALES

### **Seguridad:**
- ✅ Triggers y funciones con `SECURITY DEFINER` para permisos adecuados
- ✅ Validación de datos en triggers
- ✅ Sanitización de inputs

### **Performance:**
- ⚠️ Triggers pueden afectar inserción de órdenes (monitorear)
- ⚠️ Auditoría nocturna puede ser pesada (ejecutar en horario de bajo tráfico)
- ✅ Índices en tablas nuevas para queries eficientes

### **Escalabilidad:**
- ✅ Considerar particionamiento de `admin_alerts` por fecha
- ✅ Considerar archivar `maintenance_logs` antiguos
- ✅ Optimizar queries de auditoría para grandes volúmenes

### **Monitoreo:**
- ✅ Alertar si trigger de comisiones falla
- ✅ Alertar si auditoría no se ejecuta
- ✅ Alertar si backups fallan

---

## 🚀 PRÓXIMOS PASOS

1. **Revisar y aprobar plan** ✅
2. **Crear migraciones SQL** (tablas nuevas)
3. **Implementar P6** (comisiones)
4. **Implementar P8** (limpieza)
5. **Implementar P7** (auditoría)
6. **Implementar P9** (backups)
7. **Testing integral**
8. **Documentación**
9. **Deploy a producción**

---

**Estado del Plan:** ✅ Completo y listo para implementación  
**Última Actualización:** 2025-01-30

