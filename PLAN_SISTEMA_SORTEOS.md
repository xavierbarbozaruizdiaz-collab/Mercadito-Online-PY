# 🎟️ PLAN: SISTEMA DE SORTEOS - MERCADITO ONLINE PY

## 📋 RESUMEN EJECUTIVO

Sistema de sorteos que permite:
1. **Sorteos automáticos por compras** - Los usuarios ganan tickets automáticamente al comprar
2. **Sorteos de vendedores** - Vendedores pueden sortear productos
3. **Control administrativo** - Solo admins pueden activar/habilitar sorteos
4. **UI visible** - Ícono de ticket junto al martillo en la navegación

---

## 🎯 OBJETIVOS

- **Aumentar engagement** y fidelización de compradores
- **Incentivar compras** con posibilidad de ganar productos gratis
- **Dar visibilidad a vendedores** que quieren promocionar productos
- **Control centralizado** de sorteos desde panel admin

---

## 🗄️ ESTRUCTURA DE BASE DE DATOS

### 1. Tabla `raffles` (Sorteos)
```sql
CREATE TABLE raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Tipo de sorteo
  raffle_type TEXT NOT NULL CHECK (raffle_type IN ('purchase_based', 'seller_raffle')),
  
  -- Configuración de tickets
  min_purchase_amount DECIMAL(10,2) DEFAULT 0, -- Monto mínimo de compra para ganar ticket
  tickets_per_purchase DECIMAL(5,2) DEFAULT 1, -- Cantidad de tickets por compra (ej: 1 ticket por cada 100,000 Gs)
  max_tickets_per_user INTEGER, -- Límite de tickets por usuario (opcional)
  
  -- Fechas
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  draw_date TIMESTAMPTZ NOT NULL, -- Fecha de sorteo
  
  -- Estado y control
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'ended', 'cancelled', 'drawn')),
  is_enabled BOOLEAN DEFAULT FALSE, -- Solo activado por admin
  admin_approved BOOLEAN DEFAULT FALSE, -- Aprobación del admin
  admin_approved_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES profiles(id),
  
  -- Ganador
  winner_id UUID REFERENCES profiles(id), -- Usuario ganador
  winner_ticket_id UUID REFERENCES raffle_tickets(id), -- Ticket ganador
  drawn_at TIMESTAMPTZ,
  
  -- Metadata
  total_tickets INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Tabla `raffle_tickets` (Tickets de Sorteo)
```sql
CREATE TABLE raffle_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id), -- Orden que generó el ticket (para sorteos por compra)
  
  -- Información del ticket
  ticket_number TEXT NOT NULL, -- Número único del ticket (ej: RAFFLE-001-0001)
  ticket_type TEXT NOT NULL CHECK (ticket_type IN ('purchase', 'seller_bonus', 'admin_bonus')),
  
  -- Metadata
  purchase_amount DECIMAL(10,2), -- Monto de compra que generó el ticket
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índices
  UNIQUE(raffle_id, ticket_number),
  CONSTRAINT unique_user_raffle_ticket UNIQUE(raffle_id, user_id, ticket_number)
);

CREATE INDEX idx_raffle_tickets_raffle_id ON raffle_tickets(raffle_id);
CREATE INDEX idx_raffle_tickets_user_id ON raffle_tickets(user_id);
CREATE INDEX idx_raffle_tickets_order_id ON raffle_tickets(order_id);
```

### 3. Tabla `raffle_participants` (Participantes - Vista agregada)
```sql
-- Vista materializada para estadísticas rápidas
CREATE MATERIALIZED VIEW raffle_participants_stats AS
SELECT 
  raffle_id,
  user_id,
  COUNT(*) as ticket_count,
  MIN(created_at) as first_ticket_at,
  MAX(created_at) as last_ticket_at
FROM raffle_tickets
GROUP BY raffle_id, user_id;

CREATE INDEX idx_raffle_participants_stats ON raffle_participants_stats(raffle_id, user_id);
```

### 4. Tabla `raffle_settings` (Configuración Global)
```sql
CREATE TABLE raffle_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- Configuración por defecto
INSERT INTO raffle_settings (key, value, description) VALUES
('global_enabled', '{"enabled": false}', 'Habilitar/deshabilitar sistema de sorteos globalmente'),
('auto_ticket_generation', '{"enabled": true, "min_amount": 50000, "tickets_per_100k": 1}', 'Generación automática de tickets por compras'),
('max_active_raffles', '{"value": 5}', 'Máximo de sorteos activos simultáneos'),
('seller_raffle_approval', '{"required": true}', 'Requiere aprobación admin para sorteos de vendedores');
```

---

## 🔄 FLUJOS Y LÓGICA

### FLUJO 1: Sorteo Automático por Compras

**1.1. Creación del Sorteo (Admin)**
```
1. Admin va a Panel Admin → Sorteos → Crear Sorteo
2. Selecciona tipo: "Sorteo por Compras"
3. Configura:
   - Producto a sortear (debe existir en la plataforma)
   - Monto mínimo de compra para ganar ticket (ej: 50,000 Gs)
   - Tickets por cada X monto (ej: 1 ticket por cada 100,000 Gs)
   - Fecha de inicio y fin del sorteo
   - Fecha de sorteo (draw_date)
4. Admin activa el sorteo (is_enabled = true)
5. Sistema genera notificación a todos los usuarios activos
```

**1.2. Generación Automática de Tickets**
```
Cuando un usuario completa una compra:
1. Sistema verifica si hay sorteos activos (status='active' AND is_enabled=true)
2. Para cada sorteo activo:
   - Verifica si la orden califica:
     * order.total_amount >= raffle.min_purchase_amount
     * order.created_at BETWEEN raffle.start_date AND raffle.end_date
   - Calcula tickets ganados:
     * tickets = floor((order.total_amount / 100000) * raffle.tickets_per_purchase)
   - Verifica límite por usuario (si existe):
     * Si max_tickets_per_user existe:
       * tickets_existentes = COUNT tickets del usuario en este sorteo
       * tickets_a_agregar = MIN(tickets_calculados, max_tickets_per_user - tickets_existentes)
   - Genera tickets:
     * FOR i = 1 TO tickets_a_agregar:
       * ticket_number = "RAFFLE-{raffle_id}-{ticket_sequence}"
       * INSERT raffle_tickets
   - Actualiza contadores:
     * raffle.total_tickets += tickets_agregados
     * raffle.total_participants = COUNT(DISTINCT user_id)
3. Notifica al usuario: "🎉 ¡Ganaste X tickets para el sorteo de {producto}!"
```

**1.3. Visualización de Tickets**
```
Usuario puede ver:
- Sus tickets en /raffles/mis-tickets
- Lista de sorteos activos en /raffles
- Detalle de sorteo con:
  * Producto a sortear
  * Sus tickets ganados
  * Total de tickets en el sorteo
  * Probabilidad de ganar (tus_tickets / total_tickets)
  * Fecha de sorteo
```

### FLUJO 2: Sorteo de Vendedor

**2.1. Vendedor Crea Sorteo**
```
1. Vendedor va a Dashboard → Sorteos → Crear Sorteo
2. Selecciona tipo: "Sorteo de Vendedor"
3. Selecciona producto de su tienda (o crea uno nuevo)
4. Configura:
   - Título y descripción
   - Fecha de inicio y fin
   - Fecha de sorteo
   - (Opcional) Requisitos de participación
5. Envía para aprobación (status='draft', admin_approved=false)
6. Sistema notifica a admin: "Nuevo sorteo pendiente de aprobación"
```

**2.2. Aprobación Admin**
```
1. Admin recibe notificación
2. Admin revisa sorteo en Panel Admin → Sorteos → Pendientes
3. Admin puede:
   - Aprobar y activar (admin_approved=true, is_enabled=true, status='active')
   - Rechazar con motivo (status='cancelled')
   - Solicitar cambios (notifica al vendedor)
4. Si se aprueba:
   - Sistema notifica al vendedor
   - Se publica en /raffles
   - Se envía notificación a usuarios activos
```

**2.3. Participación en Sorteo de Vendedor**
```
Opciones de participación:
A) Por compra (igual que sorteo automático)
B) Registro manual (vendedor puede permitir registro sin compra)
C) Bonus del vendedor (vendedor puede dar tickets manualmente)
```

### FLUJO 3: Realización del Sorteo

**3.1. Proceso Automático (Scheduled Job)**
```
1. Sistema verifica sorteos con draw_date <= NOW() y status='active'
2. Para cada sorteo:
   - Obtiene todos los tickets válidos
   - Selecciona ticket ganador aleatoriamente (usando función SQL RANDOM())
   - Actualiza sorteo:
     * winner_id = ticket.user_id
     * winner_ticket_id = ticket.id
     * drawn_at = NOW()
     * status = 'drawn'
   - Notifica al ganador: "🎉 ¡Felicidades! Ganaste el sorteo de {producto}"
   - Notifica al vendedor: "Sorteo completado, ganador: {usuario}"
   - Notifica a participantes: "Sorteo completado, ganador anunciado"
```

**3.2. Sorteo Manual (Admin)**
```
Admin puede sortear manualmente:
1. Admin va a Panel Admin → Sorteos → [Sorteo] → Realizar Sorteo
2. Sistema muestra:
   - Total de tickets
   - Total de participantes
   - Botón "Sortear Ahora"
3. Al hacer clic:
   - Mismo proceso que automático
   - Se muestra resultado inmediatamente
```

---

## 🎨 INTERFAZ DE USUARIO

### 1. Navegación (Header)
```tsx
// En src/app/layout.tsx
// Agregar junto al ícono de subastas:
<Ticket className="w-5 h-5 sm:w-6 sm:h-6" />
<Link href="/raffles">Sorteos</Link>
```

### 2. Página Principal de Sorteos (`/raffles`)
```
- Hero section: "🎟️ Sorteos Activos"
- Lista de sorteos activos:
  * Card con:
    - Imagen del producto
    - Título del sorteo
    - Producto a sortear
    - Fecha de sorteo (countdown)
    - "Mis tickets: X" (si está logueado)
    - Botón "Ver detalles"
```

### 3. Detalle de Sorteo (`/raffles/[id]`)
```
- Información del sorteo
- Imagen y detalles del producto
- Contador regresivo hasta sorteo
- Sección "Mis Tickets":
  * Lista de tickets del usuario
  * Probabilidad de ganar
- Sección "Cómo participar"
- Estadísticas:
  * Total de tickets
  * Total de participantes
  * Tickets del usuario
```

### 4. Mis Tickets (`/raffles/mis-tickets`)
```
- Lista de sorteos donde el usuario tiene tickets
- Para cada sorteo:
  * Producto
  * Cantidad de tickets
  * Fecha de sorteo
  * Estado (activo, finalizado, ganado)
```

### 5. Panel Admin - Gestión de Sorteos (`/admin/raffles`)
```
Pestañas:
- Activos: Sorteos actualmente activos
- Pendientes: Sorteos de vendedores esperando aprobación
- Finalizados: Historial de sorteos
- Configuración: Ajustes globales

Funciones:
- Crear sorteo
- Aprobar/Rechazar sorteos de vendedores
- Activar/Desactivar sorteos
- Realizar sorteo manualmente
- Ver estadísticas
- Ver ganadores
```

### 6. Dashboard Vendedor - Sorteos (`/dashboard/raffles`)
```
- Crear sorteo
- Mis sorteos:
  * Activos
  * Pendientes de aprobación
  * Finalizados
- Estadísticas:
  * Total de sorteos creados
  * Total de participantes
  * Productos sorteados
```

---

## 🔧 FUNCIONES SQL NECESARIAS

### 1. `generate_raffle_tickets_from_order(order_id)`
```sql
-- Genera tickets automáticamente cuando se completa una orden
-- Verifica sorteos activos y genera tickets según configuración
```

### 2. `draw_raffle_winner(raffle_id)`
```sql
-- Selecciona ganador aleatorio del sorteo
-- Retorna winner_id y winner_ticket_id
```

### 3. `get_user_raffle_stats(user_id)`
```sql
-- Estadísticas de sorteos del usuario:
-- - Total de tickets
-- - Sorteos participados
-- - Sorteos ganados
```

### 4. `check_raffle_eligibility(order_id, raffle_id)`
```sql
-- Verifica si una orden califica para un sorteo específico
```

---

## 🔐 SEGURIDAD Y VALIDACIONES

### Validaciones de Negocio
- ✅ Un usuario no puede tener más tickets que el límite permitido
- ✅ Solo se generan tickets durante el período activo del sorteo
- ✅ Solo admins pueden activar sorteos
- ✅ Vendedores solo pueden crear sorteos de sus propios productos
- ✅ Un sorteo no puede tener draw_date antes de end_date
- ✅ Un sorteo no puede tener end_date antes de start_date

### Políticas RLS (Row Level Security)
- ✅ Usuarios pueden ver sorteos activos públicos
- ✅ Usuarios pueden ver sus propios tickets
- ✅ Vendedores pueden ver/editar sus propios sorteos
- ✅ Admins tienen acceso completo
- ✅ Solo admins pueden cambiar `is_enabled` y `admin_approved`

---

## 📊 NOTIFICACIONES

### Tipos de Notificaciones
1. **Nuevo sorteo activo** → Todos los usuarios
2. **Ganaste tickets** → Usuario que compró
3. **Sorteo aprobado** → Vendedor
4. **Sorteo rechazado** → Vendedor
5. **¡Eres ganador!** → Usuario ganador
6. **Sorteo finalizado** → Todos los participantes
7. **Nuevo sorteo pendiente** → Admin

---

## 🚀 IMPLEMENTACIÓN POR FASES

### FASE 1: Base de Datos y Backend
- [ ] Crear migraciones SQL (tablas, funciones, índices)
- [ ] Implementar políticas RLS
- [ ] Crear funciones SQL de generación de tickets
- [ ] Crear función de sorteo (draw_raffle_winner)

### FASE 2: Servicios y Lógica
- [ ] `raffleService.ts` - Gestión de sorteos
- [ ] `raffleTicketService.ts` - Gestión de tickets
- [ ] Integrar con `create_order_from_cart` para generar tickets automáticos
- [ ] Scheduled job o función para sorteos automáticos

### FASE 3: UI Pública
- [ ] Agregar ícono de ticket en navegación
- [ ] Página `/raffles` - Lista de sorteos
- [ ] Página `/raffles/[id]` - Detalle de sorteo
- [ ] Página `/raffles/mis-tickets` - Mis tickets
- [ ] Componente `RaffleCard`
- [ ] Componente `CountdownTimer`

### FASE 4: Panel Admin
- [ ] Página `/admin/raffles` - Gestión de sorteos
- [ ] Aprobar/Rechazar sorteos
- [ ] Crear sorteos
- [ ] Realizar sorteos manualmente
- [ ] Configuración global

### FASE 5: Dashboard Vendedor
- [ ] Página `/dashboard/raffles` - Gestión de sorteos
- [ ] Crear sorteo
- [ ] Ver mis sorteos
- [ ] Estadísticas

### FASE 6: Notificaciones y UX
- [ ] Notificaciones en tiempo real
- [ ] Emails de notificación
- [ ] Badges de notificación
- [ ] Animaciones y feedback visual

---

## 📝 CASOS DE USO DETALLADOS

### Caso 1: Comprador gana tickets automáticamente
```
Usuario compra producto por 250,000 Gs.
Sistema detecta sorteo activo con:
- min_purchase_amount: 50,000
- tickets_per_purchase: 1 ticket por cada 100,000 Gs
Resultado: Usuario gana 2 tickets (250,000 / 100,000 = 2.5 → floor = 2)
```

### Caso 2: Vendedor crea sorteo promocional
```
Vendedor quiere promocionar un iPhone.
1. Crea sorteo en dashboard
2. Selecciona producto iPhone
3. Configura: "Sorteo por compras, min 100,000 Gs"
4. Envía para aprobación
5. Admin aprueba
6. Se publica en /raffles
7. Usuarios compran y ganan tickets automáticamente
```

### Caso 3: Sorteo finaliza y se selecciona ganador
```
1. Fecha de sorteo llega
2. Sistema automáticamente:
   - Selecciona ticket aleatorio
   - Notifica al ganador
   - Actualiza estado del sorteo
   - Notifica a participantes
```

---

## ⚙️ CONFIGURACIÓN ADMIN

### Configuración Global
- **Habilitar/Deshabilitar sistema**: Master switch
- **Monto mínimo para tickets**: Por defecto 50,000 Gs
- **Tickets por cada X monto**: Por defecto 1 ticket por cada 100,000 Gs
- **Máximo de sorteos activos**: Por defecto 5
- **Requiere aprobación admin**: Para sorteos de vendedores

---

## 🎯 MÉTRICAS Y ANALYTICS

### Métricas a Trackear
- Total de sorteos creados
- Total de tickets generados
- Total de participantes únicos
- Tasa de conversión (compradores → participantes)
- Sorteos ganados por usuario
- Productos más sorteados
- Impacto en ventas (aumento de compras por sorteos)

---

## 🔍 CONSIDERACIONES TÉCNICAS

### Performance
- Índices en `raffle_tickets(raffle_id, user_id)`
- Materialized view para estadísticas rápidas
- Cache de sorteos activos
- Paginación en listados

### Escalabilidad
- Scheduled jobs para sorteos automáticos
- Queue system para generación masiva de tickets
- Background jobs para notificaciones

### Integración
- Hook en `create_order_from_cart` para generar tickets
- Event listeners para cambios de estado
- Webhooks para notificaciones externas (opcional)

---

## ✅ CHECKLIST DE APROBACIÓN

- [ ] Estructura de base de datos clara
- [ ] Flujos de negocio definidos
- [ ] Seguridad implementada
- [ ] UI/UX diseñada
- [ ] Notificaciones planificadas
- [ ] Métricas definidas
- [ ] Escalabilidad considerada

---

**¿Aprobar este plan para proceder con la implementación?**

