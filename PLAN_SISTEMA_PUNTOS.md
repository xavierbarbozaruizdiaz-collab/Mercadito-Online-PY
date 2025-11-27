# 🎯 PLAN: SISTEMA DE PUNTOS - MERCADITO ONLINE PY

## 📋 RESUMEN EJECUTIVO

Sistema de puntos de fidelidad que permite:
1. **Acumular puntos** por compras y acciones específicas
2. **Canjear puntos** por descuentos en compras futuras
3. **Niveles de fidelidad** (Bronce, Plata, Oro) con beneficios progresivos
4. **Gestión administrativa** completa del sistema
5. **Historial transparente** de todas las transacciones de puntos

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### 1. Tabla `loyalty_points` (Saldo de puntos por usuario)
```sql
CREATE TABLE loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0 CHECK (total_points >= 0), -- Puntos totales acumulados (histórico)
  available_points INTEGER DEFAULT 0 CHECK (available_points >= 0), -- Puntos disponibles para canjear
  lifetime_points INTEGER DEFAULT 0 CHECK (lifetime_points >= 0), -- Puntos totales ganados (incluye canjeados)
  tier_level TEXT DEFAULT 'bronze' CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum')),
  tier_points INTEGER DEFAULT 0, -- Puntos acumulados en el nivel actual
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id)
);
```

### 2. Tabla `loyalty_transactions` (Historial de transacciones)
```sql
CREATE TABLE loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'redeemed', 'expired', 'adjusted', 'bonus')),
  points INTEGER NOT NULL, -- Positivo para ganados, negativo para canjeados
  source_type TEXT, -- 'purchase', 'referral', 'review', 'signup', 'bonus', 'admin', 'redemption'
  source_id UUID, -- ID de la orden, referido, review, etc.
  description TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL, -- Si es por compra
  expires_at TIMESTAMPTZ, -- Fecha de expiración (opcional)
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

### 3. Tabla `loyalty_settings` (Configuración global)
```sql
CREATE TABLE loyalty_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_by UUID REFERENCES auth.users(id)
);
```

**Configuraciones por defecto:**
- `points_per_currency`: `{"value": 10, "currency": "PYG"}` - 10 puntos por cada 1,000 Gs gastados
- `redemption_rate`: `{"points": 1000, "currency_amount": 10000}` - 1000 puntos = 10,000 Gs
- `tier_thresholds`: `{"silver": 5000, "gold": 20000, "platinum": 50000}` - Umbrales para niveles
- `tier_benefits`: Beneficios por nivel (descuentos, envío gratis, etc.)
- `expiration_days`: `365` - Los puntos expiran después de 365 días de inactividad
- `max_redemption_percent`: `50` - Máximo 50% del total puede pagarse con puntos
- `enabled`: `true` - Sistema activo/inactivo

### 4. Tabla `loyalty_tier_benefits` (Beneficios por nivel)
```sql
CREATE TABLE loyalty_tier_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level TEXT NOT NULL CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum')),
  benefit_type TEXT NOT NULL CHECK (benefit_type IN ('discount_percent', 'free_shipping', 'early_access', 'exclusive_deals')),
  benefit_value JSONB NOT NULL, -- Valor del beneficio (ej: {"discount": 5} para 5% de descuento)
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

---

## 🎯 FLUJOS PRINCIPALES

### FLUJO 1: Acumulación de Puntos por Compra

**Trigger:** Orden marcada como `delivered`

1. **Calcular puntos ganados:**
   - Obtener configuración: `points_per_currency`
   - Calcular: `puntos = (total_amount / 1000) * points_per_currency.value`
   - Ejemplo: 50,000 Gs = 500 puntos (si es 10 puntos por 1,000 Gs)

2. **Crear transacción:**
   - Insertar en `loyalty_transactions`
   - `transaction_type = 'earned'`
   - `source_type = 'purchase'`
   - `source_id = order_id`
   - `points = puntos_calculados`
   - `expires_at = NOW() + expiration_days`

3. **Actualizar saldo:**
   - Actualizar `loyalty_points`:
     - `available_points += puntos`
     - `total_points += puntos`
     - `lifetime_points += puntos`
     - `tier_points += puntos`

4. **Verificar ascenso de nivel:**
   - Comparar `tier_points` con umbrales
   - Si supera umbral → actualizar `tier_level`
   - Enviar notificación de ascenso

5. **Notificar al usuario:**
   - Email: "¡Ganaste X puntos por tu compra!"
   - Notificación en dashboard

### FLUJO 2: Canje de Puntos en Checkout

**Trigger:** Usuario selecciona usar puntos en checkout

1. **Validaciones:**
   - Usuario tiene puntos suficientes
   - Puntos no expirados
   - No excede `max_redemption_percent` del total
   - Sistema activo

2. **Calcular descuento:**
   - Obtener `redemption_rate`
   - `descuento = (puntos_a_usar / redemption_rate.points) * redemption_rate.currency_amount`
   - Ejemplo: 1,000 puntos = 10,000 Gs de descuento

3. **Aplicar descuento:**
   - Reducir `total_amount` de la orden
   - Guardar `points_used` y `points_discount_amount` en la orden

4. **Al completar orden:**
   - Crear transacción `redeemed`
   - Actualizar `available_points -= puntos_usados`
   - Reducir `total_points` (opcional, o mantener histórico)

### FLUJO 3: Acumulación por Acciones Especiales

**A. Registro de usuario:**
- Puntos de bienvenida: 100 puntos
- `transaction_type = 'bonus'`
- `source_type = 'signup'`

**B. Referir amigos:**
- Usuario referente: 200 puntos cuando el referido hace su primera compra
- Usuario referido: 100 puntos de bienvenida adicionales
- `source_type = 'referral'`
- `source_id = referral_id`

**C. Reseña de producto:**
- 50 puntos por cada reseña verificada (con compra)
- `source_type = 'review'`
- `source_id = review_id`

**D. Compartir en redes sociales:**
- 25 puntos por compartir producto (máximo 1 vez por producto)
- `source_type = 'social_share'`
- `source_id = product_id`

**E. Cumpleaños:**
- 500 puntos en el mes del cumpleaños
- `source_type = 'birthday_bonus'`

### FLUJO 4: Expiración de Puntos

**Trigger:** Job diario automático

1. **Buscar puntos próximos a expirar:**
   - Transacciones con `expires_at < NOW() + 30 days` (aviso)
   - Transacciones con `expires_at < NOW()` (expirar)

2. **Crear transacciones de expiración:**
   - `transaction_type = 'expired'`
   - `points = negativo`
   - Actualizar `available_points`

3. **Notificar al usuario:**
   - Email: "Tus puntos están por expirar"
   - Notificación: "X puntos expiran en Y días"

### FLUJO 5: Ajustes Administrativos

**Admin puede:**
- Añadir puntos manualmente: `transaction_type = 'adjusted'`, `source_type = 'admin'`
- Remover puntos: `points = negativo`
- Ajustar configuración global
- Ver estadísticas del sistema

---

## 🎨 INTERFAZ DE USUARIO

### Dashboard del Usuario

1. **Widget de Puntos:**
   - Saldo disponible grande y visible
   - Nivel actual (Bronce/Plata/Oro/Platino) con badge
   - Progreso hacia próximo nivel (barra de progreso)
   - Puntos próximos a expirar (si aplica)

2. **Página "Mis Puntos":**
   - Historial completo de transacciones
   - Filtros: Ganados, Canjeados, Expirados
   - Tabla con fecha, descripción, puntos, estado
   - Gráfico de acumulación en el tiempo

3. **En Checkout:**
   - Checkbox: "Usar puntos"
   - Input: cantidad de puntos a usar
   - Preview: descuento aplicado
   - Validación en tiempo real

### Dashboard de Admin

1. **Configuración:**
   - Tasa de acumulación (puntos por moneda)
   - Tasa de canje (puntos = descuento)
   - Umbrales de niveles
   - Beneficios por nivel
   - Expiración de puntos
   - Activar/desactivar sistema

2. **Estadísticas:**
   - Total de puntos en circulación
   - Puntos canjeados vs ganados
   - Usuarios por nivel
   - Top usuarios
   - Transacciones recientes

3. **Gestión:**
   - Ajustar puntos manualmente
   - Ver historial de cualquier usuario
   - Exportar reportes

---

## 🔧 FUNCIONES SQL

### 1. `calculate_points_from_order(order_id)`
```sql
-- Calcula puntos ganados por una orden
-- Retorna: puntos a otorgar
```

### 2. `award_points_from_order(order_id)`
```sql
-- Otorga puntos por una orden completada
-- Crea transacción y actualiza saldo
```

### 3. `redeem_points(user_id, points_to_redeem)`
```sql
-- Canjea puntos del usuario
-- Valida disponibilidad y expiración
-- Retorna: monto de descuento en moneda
```

### 4. `check_tier_upgrade(user_id)`
```sql
-- Verifica si el usuario debe subir de nivel
-- Actualiza tier_level si corresponde
```

### 5. `expire_old_points()`
```sql
-- Expira puntos vencidos
-- Ejecutar diariamente via cron
```

### 6. `get_user_points_summary(user_id)`
```sql
-- Retorna resumen completo de puntos del usuario
-- Incluye: disponible, total, nivel, próximo nivel, etc.
```

---

## 🔒 SEGURIDAD Y RLS

### Políticas RLS:

1. **loyalty_points:**
   - Usuarios pueden ver SOLO sus propios puntos
   - Solo sistema puede actualizar (via triggers/functions)

2. **loyalty_transactions:**
   - Usuarios pueden ver SOLO sus propias transacciones
   - Solo sistema puede insertar (via triggers/functions)
   - Admins pueden ver todas

3. **loyalty_settings:**
   - Lectura pública (para cálculo de puntos)
   - Solo admins pueden modificar

---

## 📊 CARACTERÍSTICAS ADICIONALES

### 1. Niveles de Fidelidad

**Bronce (Nivel inicial):**
- Sin beneficios especiales
- Umbral: 0 puntos

**Plata (5,000 puntos):**
- 2% de descuento adicional en compras
- Acceso anticipado a ofertas
- Envío gratis en compras > 100,000 Gs

**Oro (20,000 puntos):**
- 5% de descuento adicional
- Envío gratis en todas las compras
- Soporte prioritario
- Productos exclusivos

**Platino (50,000 puntos):**
- 10% de descuento adicional
- Envío gratis express
- Eventos exclusivos
- Asistente personal de compras

### 2. Promociones Especiales

- **Doble puntos:** Fechas especiales (Black Friday, Navidad)
- **Puntos extra por categoría:** Promociones temporales
- **Bonos de cumpleaños:** Puntos en el mes del cumpleaños
- **Referidos:** Sistema de referidos con puntos

### 3. Notificaciones

- Email al ganar puntos
- Email al canjear puntos
- Notificación de ascenso de nivel
- Alerta de puntos por expirar (30 días antes)
- Resumen mensual de puntos

### 4. Integración con Checkout

- Mostrar puntos disponibles
- Calcular descuento en tiempo real
- Validar límites automáticamente
- Aplicar descuento al total
- Registrar uso en la orden

### 5. Reportes y Analytics

- Puntos otorgados por período
- Puntos canjeados por período
- Tasa de redención
- Distribución de usuarios por nivel
- Valor de puntos en circulación
- ROI del programa de fidelidad

---

## 🚀 IMPLEMENTACIÓN PASO A PASO

### Fase 1: Base de Datos
1. Crear migración con todas las tablas
2. Crear funciones SQL
3. Crear triggers para acumulación automática
4. Configurar RLS policies
5. Insertar configuraciones iniciales

### Fase 2: Backend/Servicios
1. Crear `loyaltyService.ts` con todas las funciones
2. Integrar con `orderService` para otorgar puntos
3. Integrar con `checkout` para canje
4. Crear endpoints de API si necesario

### Fase 3: Frontend - Dashboard Usuario
1. Widget de puntos en dashboard
2. Página "Mis Puntos" con historial
3. Integración en checkout
4. Notificaciones de puntos

### Fase 4: Frontend - Admin
1. Panel de configuración
2. Estadísticas y reportes
3. Gestión manual de puntos

### Fase 5: Notificaciones y Automatización
1. Emails de puntos ganados/canjeados
2. Job de expiración de puntos
3. Notificaciones de ascenso de nivel

---

## 📝 NOTAS IMPORTANTES

1. **Conversión de Moneda:**
   - Sistema trabaja en Guaraníes (PYG)
   - 1,000 Gs = unidad base para cálculo
   - Ejemplo: 10 puntos por cada 1,000 Gs gastados

2. **Expiración:**
   - Los puntos expiran después de X días de inactividad
   - FIFO: Los puntos más antiguos se usan/caducan primero

3. **Límites de Canje:**
   - Máximo 50% del total puede pagarse con puntos
   - Mínimo de puntos para canjear (ej: 100 puntos)

4. **Integración con Órdenes:**
   - Los puntos se otorgan cuando la orden se marca como `delivered`
   - Los puntos canjeados se registran en la orden

5. **Escalabilidad:**
   - Sistema diseñado para manejar millones de transacciones
   - Índices en `user_id`, `created_at`, `expires_at`
   - Agregaciones periódicas para reportes

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Migración de base de datos
- [ ] Funciones SQL
- [ ] Triggers automáticos
- [ ] RLS policies
- [ ] Servicio de puntos (TypeScript)
- [ ] Integración con órdenes
- [ ] Integración con checkout
- [ ] UI Dashboard usuario
- [ ] UI Admin panel
- [ ] Sistema de notificaciones
- [ ] Job de expiración
- [ ] Tests
- [ ] Documentación

---

**Fecha de creación:** 2025-02-02  
**Versión:** 1.0  
**Estado:** Pendiente de implementación








