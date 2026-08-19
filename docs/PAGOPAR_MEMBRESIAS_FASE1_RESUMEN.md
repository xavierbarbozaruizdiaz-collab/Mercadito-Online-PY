# 📋 Resumen: FASE 1 - Pagopar para Membresías (COMPLETADO)

## ✅ Implementación Completada

Este documento resume la implementación del webhook de Pagopar para activar membresías automáticamente.

---

## 📁 Archivos Modificados/Creados

### 1. **src/app/checkout/page.tsx**
   - **Cambio**: Modificado para crear suscripción PENDING antes de enviar a Pagopar cuando es membresía
   - **Lógica**: 
     - Si es membresía y NO es Pagopar → activa directamente (código existente)
     - Si es membresía y ES Pagopar → crea suscripción en estado `pending` antes de crear factura
     - Guarda `subscriptionId` en localStorage para cuando Pagopar redirija de vuelta
   - **Compatibilidad**: No rompe el flujo de órdenes/productos existente

### 2. **src/app/api/payments/pagopar/create-invoice/route.ts**
   - **Cambio**: Modificado para soportar membresías además de órdenes
   - **Lógica**:
     - Acepta `subscriptionId` y `type` en el body (además de `orderId` existente)
     - Valida suscripción si `type === 'membership'`
     - Usa `subscriptionId` como `external_reference` para membresías
     - Actualiza `membership_subscriptions.payment_reference` con `id_factura` de Pagopar
     - Mantiene backward compatibility: el flujo de órdenes sigue funcionando igual
   - **Compatibilidad**: 100% backward compatible con órdenes existentes

### 3. **src/lib/services/pagoparService.ts**
   - **Cambio**: Agregado campo opcional `external_reference` a la interfaz `PagoparInvoice`
   - **Lógica**: El campo se pasa directamente a la API de Pagopar si está presente
   - **Compatibilidad**: No rompe código existente (campo opcional)

### 4. **src/app/api/webhooks/pagopar/route.ts** ⭐ (IMPLEMENTACIÓN COMPLETA)
   - **Cambio**: Reimplementado completamente para procesar pagos de membresías
   - **Lógica**:
     - Crea cliente Supabase con `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS
     - Extrae `external_reference` del payload de Pagopar (múltiples campos posibles)
     - Valida que el pago esté aprobado (estados: 'pagada', 'pagado', 'success', 'approved', 'completed')
     - Busca suscripción en `membership_subscriptions` por `id = external_reference`
     - Verifica idempotencia: si ya está `active` y `completed`, responde OK sin fallar
     - Actualiza suscripción directamente: `status = 'active'`, `payment_status = 'completed'`, etc.
     - Actualiza perfil del usuario: `membership_level` y `membership_expires_at`
     - Calcula `expires_at` según `subscription_type` y `plan.duration_days`
     - Logs detallados para debugging en Vercel
     - Siempre responde `200 OK` para no romper comunicación con Pagopar
   - **Compatibilidad**: No rompe webhooks de órdenes (si no encuentra suscripción, ignora)

---

## 🔄 Flujo Completo Implementado

### Paso 1: Usuario elige plan de membresía
1. Usuario navega a checkout con `?type=membership&plan_id=...&subscription_type=...`
2. Usuario llena datos y elige método de pago "Pagopar"
3. Usuario hace clic en "Pagar con Pagopar"

### Paso 2: Crear suscripción PENDING
1. Se inserta fila en `membership_subscriptions` con:
   - `status = 'pending'`
   - `payment_status = 'pending'`
   - `payment_method = 'pagopar'`
   - `payment_provider = 'pagopar'`
   - `user_id`, `plan_id`, `subscription_type`, etc.
2. Se obtiene `subscriptionId` (UUID)

### Paso 3: Crear factura en Pagopar
1. Se llama a `/api/payments/pagopar/create-invoice` con `subscriptionId` y `type: 'membership'`
2. Se pasa `external_reference = subscriptionId` a Pagopar
3. Pagopar crea factura y devuelve `id_factura`
4. Se actualiza `membership_subscriptions.payment_reference = id_factura`
5. Se guarda `subscriptionId` en localStorage
6. Se redirige al usuario a `link_pago` de Pagopar

### Paso 4: Usuario paga en Pagopar
1. Usuario completa el pago en la plataforma de Pagopar
2. Pagopar procesa el pago y llama al webhook

### Paso 5: Webhook activa membresía
1. Pagopar llama `POST /api/webhooks/pagopar` con payload de confirmación
2. Webhook extrae `external_reference` (subscriptionId)
3. Webhook verifica que el pago esté aprobado
4. Webhook busca suscripción por `id = external_reference`
5. Webhook verifica idempotencia (si ya está activa, responde OK)
6. Webhook actualiza `membership_subscriptions`:
   - `status = 'active'`
   - `payment_status = 'completed'`
   - `payment_reference = id_factura` (si no estaba)
   - `amount_paid = monto` (del payload)
   - `starts_at = NOW()`
   - `expires_at = NOW() + duration_days`
   - `paid_at = NOW()`
7. Webhook actualiza `profiles`:
   - `membership_level = plan.level`
   - `membership_expires_at = expires_at`

---

## 🔍 Campos del Payload de Pagopar

El webhook busca los siguientes campos en el payload (múltiples variantes):

### `external_reference`
- `payload.external_reference`
- `payload.referencia_externa`
- `payload.referencia`
- `payload.resultado.external_reference`
- `payload.resultado.referencia_externa`
- `payload.datos.external_reference`
- `payload.datos.referencia_externa`

### Estado del pago (`paymentState`)
- `payload.estado` o `payload.status`
- `payload.resultado.estado` o `payload.resultado.status`
- `payload.datos.estado` o `payload.datos.status`

**Estados aprobados**: `'pagada'`, `'pagado'`, `'success'`, `'approved'`, `'completed'`, `'completado'`

### ID de factura/operación (`invoiceId`)
- `payload.id_factura`
- `payload.id_operacion`
- `payload.operation_id`
- `payload.resultado.id_factura`
- `payload.datos.id_factura`

### Monto pagado (`amount`)
- `payload.monto_pagado`
- `payload.monto`
- `payload.amount`
- `payload.resultado.monto_pagado`
- `payload.datos.monto_pagado`

---

## 🧪 Cómo Probar

### Paso 1: Configurar en Producción
1. Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurada en Vercel
2. Verificar que las variables de Pagopar estén configuradas:
   - `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN`
   - `PAGOPAR_PRIVATE_TOKEN`

### Paso 2: Probar el Flujo Completo

1. **Ir a membresías**:
   - Navegar a la página de planes de membresía
   - Elegir un plan (ej: Bronze, Silver, Gold)

2. **Ir a checkout de membresía**:
   - Clickear en el plan
   - Debería redirigir a `/checkout?type=membership&plan_id=...&subscription_type=one_time&amount=...`

3. **Completar checkout**:
   - Llenar dirección de envío
   - Elegir método de pago: **"Pago con Pagopar"**
   - Clickear en "Pagar con Pagopar"

4. **Verificar en Supabase (ANTES del pago)**:
   ```sql
   SELECT id, user_id, plan_id, status, payment_status, payment_method, payment_provider, payment_reference
   FROM membership_subscriptions
   WHERE payment_method = 'pagopar'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   - Debería ver una fila con `status = 'pending'` y `payment_status = 'pending'`
   - `payment_reference` debería ser `NULL` o tener el `id_factura` de Pagopar

5. **Probar pago en Pagopar**:
   - En el panel de Pagopar, ir a "Facturas" o "Pedidos"
   - Buscar la última factura creada
   - Clickear en "Simular pago del último pedido" (o equivalente)
   - Esto disparará el webhook

6. **Verificar logs en Vercel**:
   - Ir a Vercel Dashboard → Tu proyecto → Logs
   - Buscar logs con `[Pagopar Webhook]`
   - Deberías ver:
     - `payload recibido`
     - `external_reference`
     - `Estado del pago`
     - `Suscripción encontrada`
     - `Membresía activada exitosamente`

7. **Verificar en Supabase (DESPUÉS del pago)**:

   **a) Verificar `membership_subscriptions`**:
   ```sql
   SELECT 
     id,
     user_id,
     plan_id,
     status,
     payment_status,
     payment_method,
     payment_provider,
     payment_reference,
     amount_paid,
     starts_at,
     expires_at,
     paid_at,
     created_at
   FROM membership_subscriptions
   WHERE payment_method = 'pagopar'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   
   **Nota**: El `user_id` que ves aquí es el que necesitás para verificar el perfil en el paso siguiente.
   
   **Deberías ver**:
   - `status = 'active'` ✅
   - `payment_status = 'completed'` ✅
   - `payment_method = 'pagopar'` ✅
   - `payment_provider = 'pagopar'` ✅
   - `payment_reference` = `id_factura` de Pagopar ✅
   - `amount_paid` = monto del pago ✅
   - `starts_at` = fecha actual ✅
   - `expires_at` = fecha actual + duration_days ✅
   - `paid_at` = fecha actual ✅

   **b) Verificar `profiles`**:
   
   **Opción 1: Usar subquery (recomendado)**:
   ```sql
   SELECT 
     p.id,
     p.email,
     p.membership_level,
     p.membership_expires_at
   FROM profiles p
   WHERE p.id IN (
     SELECT user_id 
     FROM membership_subscriptions 
     WHERE payment_method = 'pagopar' 
     ORDER BY created_at DESC 
     LIMIT 1
   );
   ```
   
   **Opción 2: Si ya conocés el user_id de la query anterior**:
   ```sql
   -- Primero ejecutar la query anterior para obtener el user_id
   -- Luego reemplazar el UUID aquí:
   SELECT 
     id,
     email,
     membership_level,
     membership_expires_at
   FROM profiles
   WHERE id = 'TU_USER_ID_AQUI'; -- Reemplazar con el UUID real obtenido arriba
   ```
   
   **Opción 3: Ver todos los perfiles con membresías activas recientes**:
   ```sql
   SELECT 
     p.id,
     p.email,
     p.membership_level,
     p.membership_expires_at,
     ms.status as subscription_status,
     ms.payment_status,
     ms.paid_at
   FROM profiles p
   INNER JOIN membership_subscriptions ms ON ms.user_id = p.id
   WHERE ms.payment_method = 'pagopar'
     AND ms.status = 'active'
     AND ms.payment_status = 'completed'
   ORDER BY ms.paid_at DESC
   LIMIT 5;
   ```
   
   **Deberías ver**:
   - `membership_level` = nivel del plan (ej: 'bronze', 'silver', 'gold') ✅
   - `membership_expires_at` = fecha de expiración (igual a `expires_at` de la suscripción) ✅

### Paso 3: Probar Idempotencia

1. **Simular el mismo pago dos veces**:
   - En Pagopar, usar "Simular pago" otra vez para la misma factura
   - Verificar en logs que aparezca: `Suscripción ya está activa y pagada (idempotencia)`
   - Verificar que la respuesta sea `{ ok: true, alreadyActive: true }`
   - Verificar que no se duplicó la suscripción ni se modificó la fecha de expiración

---

## 🔒 Seguridad y Validaciones

### Validaciones Implementadas:
1. ✅ **Service Role Key**: Webhook usa `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS
2. ✅ **Estado del pago**: Solo activa si el estado indica pago aprobado
3. ✅ **Idempotencia**: No falla ni duplica si se llama dos veces
4. ✅ **Logs sanitizados**: No loguea datos sensibles
5. ✅ **Manejo de errores**: Siempre responde `200 OK` para no romper comunicación con Pagopar

### Respuestas del Webhook:
- **Pago aprobado + Suscripción activada**: `{ ok: true, activated: true, subscriptionId: '...' }`
- **Pago aprobado + Ya estaba activa**: `{ ok: true, alreadyActive: true }`
- **Pago NO aprobado**: `{ ok: true, ignored: true, reason: 'Payment not approved', state: '...' }`
- **Sin external_reference**: `{ ok: true, ignored: true, reason: 'No external_reference' }`
- **No es membresía (orden)**: `{ ok: true, ignored: true, reason: 'Not a membership subscription' }`
- **Error interno**: `{ ok: false, error: '...' }` (pero siempre `200` status)

---

## ⚠️ Advertencias y Compatibilidad

### ✅ No Rompe Código Existente:

1. **Flujo de órdenes/productos**:
   - El código existente de órdenes sigue funcionando igual
   - Si el webhook recibe un `external_reference` que no es una suscripción, lo ignora
   - Las órdenes se procesan con su flujo original (si existe)

2. **Otros métodos de pago**:
   - Si la membresía NO es Pagopar, se activa directamente (como antes)
   - No afecta el flujo de transferencias, efectivo, etc.

3. **Checkout de productos/subastas**:
   - El flujo de checkout de productos/subastas no cambió
   - Solo se modificó la parte de membresías cuando es Pagopar

### 🔄 Cambios Backward Compatible:

1. **create-invoice/route.ts**:
   - Acepta `subscriptionId` O `orderId` (no ambos)
   - Si viene `subscriptionId` → procesa membresía
   - Si viene `orderId` → procesa orden (código original)
   - Si viene `type: 'membership'` → fuerza procesamiento de membresía

2. **pagoparService.ts**:
   - `external_reference` es opcional
   - Si no se pasa, funciona igual que antes (backward compatible)

3. **Webhook**:
   - Si no encuentra suscripción, ignora (podría ser una orden)
   - No falla si no encuentra `external_reference` (solo ignora)

---

## 📊 Mapeo de Campos: Pagopar → Database

| Campo Pagopar (webhook) | Campo Database | Tabla | Notas |
|-------------------------|----------------|-------|-------|
| `external_reference` | `id` | `membership_subscriptions` | Se usa para buscar la suscripción |
| `id_factura` o `id_operacion` | `payment_reference` | `membership_subscriptions` | ID de la factura de Pagopar |
| `estado` o `status` | - | - | Se usa para validar aprobación |
| `monto_pagado` o `monto` | `amount_paid` | `membership_subscriptions` | Monto confirmado por Pagopar |
| - | `status` | `membership_subscriptions` | Se actualiza a `'active'` |
| - | `payment_status` | `membership_subscriptions` | Se actualiza a `'completed'` |
| - | `payment_method` | `membership_subscriptions` | Se actualiza a `'pagopar'` |
| - | `payment_provider` | `membership_subscriptions` | Se actualiza a `'pagopar'` |
| - | `starts_at` | `membership_subscriptions` | Se actualiza a `NOW()` |
| - | `expires_at` | `membership_subscriptions` | Se calcula: `NOW() + duration_days` |
| - | `paid_at` | `membership_subscriptions` | Se actualiza a `NOW()` |
| - | `membership_level` | `profiles` | Se actualiza al nivel del plan |
| - | `membership_expires_at` | `profiles` | Se actualiza al `expires_at` calculado |

---

## 🐛 Troubleshooting

### Problema: El webhook no se llama
**Solución**:
1. Verificar que la URL esté configurada en Pagopar: `https://tu-dominio.com/api/webhooks/pagopar`
2. Verificar que las IPs estén configuradas correctamente en Pagopar
3. Verificar logs en Vercel para ver si hay errores de conexión

### Problema: El webhook se llama pero no activa la membresía
**Solución**:
1. Verificar logs en Vercel con `[Pagopar Webhook]`
2. Verificar que `SUPABASE_SERVICE_ROLE_KEY` esté configurada
3. Verificar que el `external_reference` del payload coincida con un `id` de `membership_subscriptions`
4. Verificar que el estado del pago esté en los estados aprobados

### Problema: Se crean suscripciones duplicadas
**Solución**:
1. Verificar que la idempotencia esté funcionando (debería ver `alreadyActive: true` en logs)
2. Verificar que el webhook esté verificando `status = 'active'` y `payment_status = 'completed'` antes de procesar

### Problema: El external_reference no se encuentra
**Solución**:
1. Verificar que al crear la factura se esté pasando `external_reference = subscriptionId`
2. Verificar en los logs qué campos tiene el payload de Pagopar
3. Ajustar la función `extractExternalReference` si Pagopar usa otro nombre de campo

---

## 📝 Notas Técnicas

### ¿Por qué no usé la función SQL `activate_membership_subscription()`?

La función SQL `activate_membership_subscription()` **crea una NUEVA suscripción**, no actualiza una existente. Como ya creamos la suscripción en estado `pending` antes del pago, el webhook **actualiza directamente** esa suscripción existente en lugar de crear una nueva. Esto es más eficiente y evita duplicados.

**Lógica equivalente**:
- La función SQL calcula `expires_at = NOW() + duration_days` ✅ (igual que el webhook)
- La función SQL actualiza `profiles.membership_level` ✅ (igual que el webhook)
- La función SQL actualiza `profiles.membership_expires_at` ✅ (igual que el webhook)
- El webhook además actualiza campos de pago específicos (`payment_reference`, `paid_at`, etc.)

### Manejo de Errores

El webhook **siempre responde `200 OK`** para no romper la comunicación con Pagopar, incluso si hay errores internos. Esto es importante porque:
- Pagopar puede reintentar llamadas si recibe error
- Queremos evitar múltiples activaciones por el mismo pago
- Los errores se loguean en Vercel para debugging

### Logs

Todos los logs usan el formato `[Pagopar Webhook]` para facilitar el debugging en Vercel:
- Logs de información: `logger.info('[Pagopar Webhook] ...')`
- Logs de advertencia: `logger.warn('[Pagopar Webhook] ...')`
- Logs de error: `logger.error('[Pagopar Webhook] ...')`

---

## ✅ Checklist Final

- [x] Crear suscripción PENDING antes del pago
- [x] Pasar external_reference a Pagopar
- [x] Guardar payment_reference al crear factura
- [x] Implementar webhook completo
- [x] Validar estado del pago
- [x] Activar membresía cuando pago está aprobado
- [x] Actualizar membership_subscriptions
- [x] Actualizar profiles
- [x] Implementar idempotencia
- [x] Agregar logs detallados
- [x] Manejar errores correctamente
- [x] Mantener backward compatibility
- [x] Documentar cómo probar

---

**Última actualización**: Noviembre 2024  
**Estado**: ✅ FASE 1 COMPLETADA - Lista para producción
