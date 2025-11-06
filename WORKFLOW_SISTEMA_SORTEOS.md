# 🎟️ WORKFLOW: SISTEMA DE SORTEOS - MERCADITO ONLINE PY

## 📋 TABLA DE CONTENIDOS
1. [Flujo Admin - Crear Sorteo](#flujo-admin---crear-sorteo)
2. [Flujo Admin - Gestionar Sorteos](#flujo-admin---gestionar-sorteos)
3. [Flujo Vendedor - Crear Sorteo](#flujo-vendedor---crear-sorteo)
4. [Flujo Usuario - Participar en Sorteos](#flujo-usuario---participar-en-sorteos)
5. [Flujo Sistema - Generación Automática de Tickets](#flujo-sistema---generación-automática-de-tickets)
6. [Flujo Sistema - Realización del Sorteo](#flujo-sistema---realización-del-sorteo)

---

## 🔧 FLUJO ADMIN - CREAR SORTEO

### Paso 1: Acceder al Panel Admin
1. Iniciar sesión como **admin**
2. Navegar a `/admin/raffles`
3. Clic en botón **"Crear Sorteo"** → `/admin/raffles/create`

### Paso 2: Completar Formulario
**Campos obligatorios:**
- ✅ **Título del sorteo** (requerido)
- ✅ **Tipo de sorteo** (requerido):
  - `purchase_based` - Por compras (ganar tickets automáticamente)
  - `direct_purchase` - Compra directa de cupones
  - `seller_raffle` - Sorteo de vendedor
- ✅ **Fechas** (requeridas):
  - Fecha de inicio
  - Fecha de fin
  - Fecha de sorteo

**Campos opcionales:**
- ⚪ **ID del Producto** (opcional)
  - Si hay producto: usar ID desde URL `/products/[id]`
  - Si no hay producto: dejar vacío y subir imágenes
- ⚪ **Descripción**
- ⚪ **Imágenes** (si no hay producto):
  - Subir hasta 5 imágenes
  - Primera imagen = portada
  - Formatos: JPG, PNG, WEBP (máx 5MB cada una)

**Configuración según tipo:**

**A) Tipo: `purchase_based` (Por compras)**
- Monto mínimo de compra (Gs.) - default: 50,000
- Monto por ticket (Gs.) - default: 100,000
  - Ejemplo: 100,000 Gs. = 1 ticket por cada 100,000 Gs. de compra

**B) Tipo: `direct_purchase` (Compra directa)**
- ✅ Activar checkbox "Permitir compra directa de cupones"
- ✅ Precio por cupón (Gs.) - requerido

**C) Tipo: `seller_raffle` (Sorteo de vendedor)**
- Similar a `purchase_based`

### Paso 3: Crear Sorteo
1. Clic en **"Crear Sorteo"**
2. Sistema valida:
   - ✅ Fechas válidas (inicio < fin < sorteo)
   - ✅ Precio de cupones si es `direct_purchase`
   - ✅ Monto por ticket si es `purchase_based`
3. Si hay errores → mostrar alertas
4. Si todo OK:
   - Subir imágenes (si hay)
   - Crear sorteo en BD con:
     - `status = 'active'`
     - `is_enabled = true`
     - `admin_approved = true`
   - Redirigir a `/admin/raffles`

### Resultado
- ✅ Sorteo creado y activo inmediatamente
- ✅ Visible en `/raffles` para usuarios
- ✅ Usuarios pueden participar

---

## 🔧 FLUJO ADMIN - GESTIONAR SORTEOS

### Acceder a Gestión
1. Ir a `/admin/raffles`
2. Ver pestañas:
   - **Activos** - Sorteos actualmente activos
   - **Pendientes** - Sorteos de vendedores esperando aprobación
   - **Finalizados** - Historial de sorteos
   - **Settings** - Configuración global

### Operaciones Disponibles

#### 1. Aprobar Sorteo de Vendedor
**Desde pestaña "Pendientes":**
1. Ver lista de sorteos en estado `draft`
2. Clic en **"Aprobar"**
3. Confirmar acción
4. Sistema actualiza:
   - `admin_approved = true`
   - `is_enabled = true`
   - `status = 'active'`
   - `admin_approved_at = NOW()`
   - `admin_approved_by = current_user_id`
5. Sorteo se activa y aparece en `/raffles`

#### 2. Rechazar Sorteo de Vendedor
**Desde pestaña "Pendientes":**
1. Clic en **"Rechazar"**
2. Confirmar acción
3. Sistema actualiza:
   - `status = 'cancelled'`
   - `admin_approved = false`
   - `is_enabled = false`
4. Vendedor es notificado (pendiente implementar)

#### 3. Realizar Sorteo Manualmente
**Desde pestaña "Activos":**
1. Ver sorteos activos
2. Clic en **"Realizar Sorteo"**
3. Confirmar acción
4. Sistema ejecuta función `draw_raffle_winner()`:
   - Selecciona ticket aleatorio
   - Actualiza sorteo con ganador
   - `status = 'drawn'`
   - `drawn_at = NOW()`
5. Muestra resultado: ganador y email

#### 4. Configuración Global
**Desde pestaña "Settings":**
- **Habilitar/Deshabilitar Sistema:**
  - Toggle "Sistema de Sorteos"
  - Si deshabilitado: no se generan tickets automáticamente
  - Si habilitado: sistema funciona normalmente

---

## 🏪 FLUJO VENDEDOR - CREAR SORTEO

### Paso 1: Acceder al Dashboard
1. Iniciar sesión como **vendedor**
2. Navegar a `/dashboard/raffles`
3. Clic en **"Crear Sorteo"**

### Paso 2: Completar Formulario
**Campos:**
- ✅ Título
- ⚪ Descripción
- ✅ ID del Producto (debe ser de su tienda)
- ✅ Fechas (inicio, fin, sorteo)

**Tipo:** Siempre `seller_raffle`

### Paso 3: Enviar para Aprobación
1. Clic en **"Crear Sorteo"**
2. Sistema valida:
   - ✅ Producto existe y pertenece al vendedor
   - ✅ Fechas válidas
3. Si todo OK:
   - Crear sorteo con:
     - `status = 'draft'`
     - `is_enabled = false`
     - `admin_approved = false`
   - Redirigir a `/dashboard/raffles`

### Resultado
- ✅ Sorteo creado en estado `draft`
- ⏳ Esperando aprobación del admin
- 📍 Visible en pestaña "Pendientes" del vendedor

### Paso 4: Esperar Aprobación
- Vendedor ve sorteo en pestaña "Pendientes"
- Admin revisa y aprueba/rechaza
- Si aprobado: aparece en "Activos" del vendedor

---

## 👤 FLUJO USUARIO - PARTICIPAR EN SORTEOS

### Opción 1: Participar por Compras (`purchase_based`)

#### Paso 1: Ver Sorteos Activos
1. Navegar a `/raffles`
2. Ver lista de sorteos activos
3. Clic en sorteo para ver detalles → `/raffles/[id]`

#### Paso 2: Realizar Compra
1. Comprar productos en la plataforma
2. Monto mínimo requerido: según configuración del sorteo
3. Completar orden (checkout)

#### Paso 3: Generación Automática de Tickets
**Sistema automáticamente:**
1. Detecta orden completada
2. Verifica sorteos activos que califican:
   - `status = 'active'`
   - `is_enabled = true`
   - `raffle_type = 'purchase_based'`
   - Orden dentro de fechas (start_date <= orden.created_at <= end_date)
   - `orden.total_amount >= min_purchase_amount`
3. Calcula tickets:
   - `tickets = floor(total_amount / tickets_per_amount)`
   - Ejemplo: 250,000 Gs. / 100,000 = 2 tickets
4. Verifica límite por usuario (si existe):
   - Si `max_tickets_per_user` existe:
     - `tickets_disponibles = max_tickets_per_user - tickets_actuales`
     - Ajusta tickets a `min(tickets_calculados, tickets_disponibles)`
5. Genera tickets:
   - Crea registros en `raffle_tickets`
   - `ticket_number = "RAFFLE-{raffle_id}-{sequence}"`
   - `ticket_type = 'purchase'`
6. Actualiza contadores:
   - `raffle.total_tickets += tickets_generados`
   - `raffle.total_participants = COUNT(DISTINCT user_id)`

#### Paso 4: Ver Tickets Ganados
1. Ir a `/raffles/mis-tickets`
2. Ver lista de sorteos donde tiene tickets
3. Ver cantidad de tickets por sorteo

### Opción 2: Comprar Cupones Directamente (`direct_purchase`)

#### Paso 1: Ver Sorteo con Compra Directa
1. Navegar a `/raffles`
2. Ver sorteo que permite compra directa
3. Clic para ver detalles → `/raffles/[id]`

#### Paso 2: Comprar Cupones
1. En la página de detalle, ver componente **"Comprar Cupones"**
2. Seleccionar cantidad:
   - Usar botones +/- o escribir directamente
   - Validación: no exceder `max_tickets_per_user` (si existe)
3. Ver precio total calculado
4. Clic en **"Comprar X cupones"**

#### Paso 3: Procesamiento de Compra
**Sistema:**
1. Verifica sesión de usuario
2. Valida sorteo:
   - `allow_direct_purchase = true`
   - `status = 'active'`
   - `is_enabled = true`
   - `ticket_price` válido
3. Valida cantidad:
   - No exceder límite por usuario
   - Cantidad > 0
4. Genera tickets:
   - Crea registros en `raffle_tickets`
   - `ticket_type = 'manual'`
   - `purchase_amount = ticket_price`
   - `ticket_number = "RAFFLE-{raffle_id}-{sequence}"`
5. Actualiza contadores del sorteo

#### Paso 4: Confirmación
- ✅ Muestra mensaje: "Has comprado X cupones exitosamente"
- ✅ Recarga datos para mostrar tickets actualizados
- ✅ Tickets aparecen en "Mis tickets"

---

## 🤖 FLUJO SISTEMA - GENERACIÓN AUTOMÁTICA DE TICKETS

### Trigger: Orden Completada
**Función:** `create_order_from_cart()`

**Al completar una orden:**
1. Verifica si sistema de sorteos está habilitado:
   ```sql
   SELECT 1 FROM raffle_settings 
   WHERE key = 'global_enabled' 
   AND (value->>'enabled')::BOOLEAN = true
   ```
2. Si habilitado, ejecuta:
   ```sql
   PERFORM generate_raffle_tickets_from_order(order_id)
   ```
3. Si error: solo registra warning (no falla la orden)

### Función: `generate_raffle_tickets_from_order()`

**Proceso:**
1. Obtiene datos de la orden:
   - `buyer_id`
   - `total_amount`
   - `created_at`

2. Busca sorteos activos que califican:
   ```sql
   SELECT * FROM raffles
   WHERE status = 'active'
     AND is_enabled = true
     AND raffle_type = 'purchase_based'
     AND start_date <= order.created_at
     AND end_date >= order.created_at
     AND min_purchase_amount <= order.total_amount
   ```

3. Para cada sorteo que califica:
   - Calcula tickets: `floor(total_amount / tickets_per_amount)`
   - Verifica límite por usuario
   - Genera tickets con números únicos
   - Actualiza contadores

---

## 🎲 FLUJO SISTEMA - REALIZACIÓN DEL SORTEO

### Opción 1: Automático (Scheduled Job - Pendiente)
**Recomendación:** Implementar cron job o función programada

**Proceso:**
1. Verifica sorteos con `draw_date <= NOW()` y `status = 'active'`
2. Para cada sorteo:
   - Ejecuta `draw_raffle_winner(raffle_id)`
   - Actualiza estado a `drawn`
   - Notifica ganador (pendiente)

### Opción 2: Manual (Admin)
**Proceso:**
1. Admin va a `/admin/raffles` → pestaña "Activos"
2. Ver sorteo activo
3. Clic en **"Realizar Sorteo"**
4. Sistema ejecuta función SQL:
   ```sql
   SELECT * FROM draw_raffle_winner(raffle_id)
   ```

### Función: `draw_raffle_winner()`

**Proceso:**
1. Verifica sorteo existe y está activo
2. Selecciona ticket ganador aleatorio:
   ```sql
   SELECT * FROM raffle_tickets
   WHERE raffle_id = p_raffle_id
   ORDER BY RANDOM()
   LIMIT 1
   ```
3. Obtiene información del ganador:
   - `user_id`
   - `email`
   - `first_name`, `last_name`
4. Actualiza sorteo:
   - `winner_id = ticket.user_id`
   - `winner_ticket_id = ticket.id`
   - `drawn_at = NOW()`
   - `status = 'drawn'`
5. Retorna información del ganador

### Resultado
- ✅ Sorteo marcado como `drawn`
- ✅ Ganador registrado
- ✅ Visible en página de detalle del sorteo
- ⏳ Notificaciones (pendiente implementar)

---

## 📊 ESTADOS DEL SORTEO

### Estados Posibles:
1. **`draft`** - Borrador (sorteos de vendedores esperando aprobación)
2. **`active`** - Activo (visible y participable)
3. **`ended`** - Finalizado (período de participación terminó)
4. **`cancelled`** - Cancelado (rechazado por admin)
5. **`drawn`** - Sorteado (ganador seleccionado)

### Flujo de Estados:
```
draft → (admin aprueba) → active → (draw_date llega) → drawn
  ↓
cancelled (si admin rechaza)
```

---

## 🔐 PERMISOS Y ACCESOS

### Admin
- ✅ Crear sorteos (sin aprobación)
- ✅ Activar/Desactivar sorteos
- ✅ Aprobar/Rechazar sorteos de vendedores
- ✅ Realizar sorteos manualmente
- ✅ Configurar sistema globalmente
- ✅ Ver todos los sorteos

### Vendedor
- ✅ Crear sorteos de sus productos
- ✅ Ver sus sorteos (activos y pendientes)
- ❌ Activar sorteos (requiere aprobación admin)
- ❌ Realizar sorteos

### Usuario (Público)
- ✅ Ver sorteos activos
- ✅ Ver detalles de sorteos
- ✅ Participar:
  - Por compras (automático)
  - Comprar cupones (si está habilitado)
- ✅ Ver sus tickets en `/raffles/mis-tickets`

---

## 🎯 CASOS DE USO

### Caso 1: Sorteo Automático por Compras
1. Admin crea sorteo tipo `purchase_based`
2. Configura: min 50,000 Gs., 1 ticket por cada 100,000 Gs.
3. Usuario compra por 250,000 Gs.
4. Sistema genera 2 tickets automáticamente
5. Usuario ve sus tickets en `/raffles/mis-tickets`

### Caso 2: Sorteo con Compra Directa
1. Admin crea sorteo tipo `direct_purchase`
2. Configura: precio 10,000 Gs. por cupón
3. Usuario va a `/raffles/[id]`
4. Compra 5 cupones = 50,000 Gs.
5. Recibe 5 tickets inmediatamente

### Caso 3: Sorteo de Vendedor
1. Vendedor crea sorteo de su producto
2. Envía para aprobación
3. Admin revisa y aprueba
4. Sorteo se activa
5. Usuarios pueden participar

---

## 📍 RUTAS PRINCIPALES

- `/raffles` - Lista de sorteos activos (público)
- `/raffles/[id]` - Detalle de sorteo (público)
- `/raffles/mis-tickets` - Mis tickets (requiere login)
- `/admin/raffles` - Gestión admin (requiere admin)
- `/admin/raffles/create` - Crear sorteo (requiere admin)
- `/dashboard/raffles` - Gestión vendedor (requiere seller)

---

## ✅ CHECKLIST DE FUNCIONALIDADES

### Implementado ✅
- [x] Crear sorteos (admin)
- [x] Crear sorteos (vendedor con aprobación)
- [x] Aprobar/Rechazar sorteos
- [x] Generación automática de tickets por compras
- [x] Compra directa de cupones
- [x] Ver sorteos activos
- [x] Ver detalle de sorteo
- [x] Ver mis tickets
- [x] Realizar sorteo manualmente
- [x] Subir imágenes (si no hay producto)
- [x] Producto opcional
- [x] Configuración global

### Pendiente ⏳
- [ ] Notificaciones automáticas
- [ ] Sorteo automático por fecha (cron job)
- [ ] Email al ganador
- [ ] Estadísticas avanzadas
- [ ] Historial de sorteos del usuario

---

**Última actualización:** Enero 2025

