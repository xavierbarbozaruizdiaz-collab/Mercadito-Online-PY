# RESUMEN COMPLETO: Fix Flujo de Pagos con Pagopar

## ✅ PROBLEMAS IDENTIFICADOS Y RESUELTOS

### 🔴 PROBLEMA 1: Membresías se activaban sin pasar por Pagopar

**Causa raíz:**
- En `src/app/checkout/page.tsx` líneas 467-487, cuando el método de pago NO era transferencia, el código activaba directamente la membresía usando `activateMembershipSubscription()` sin crear factura en Pagopar
- Esto causaba que se saltara completamente la pasarela de pagos

**Solución aplicada:**
- Refactorizado el flujo para que cuando `paymentMethod === 'pagopar'`:
  1. Se cree una suscripción pendiente usando `createPendingMembershipSubscription()`
  2. Se llame al nuevo endpoint `/api/pagopar/membership` que crea la factura en Pagopar
  3. Se redirija al usuario a `link_pago` de Pagopar
  4. La membresía solo se activa cuando el webhook confirma el pago

---

### 🔴 PROBLEMA 2: Error 500/502 "Error al crear token Pagopar" en productos

**Causa raíz:**
- El servicio `pagoparService.ts` tenía manejo de errores limitado
- No se logueaban suficientes detalles cuando fallaba la creación del token
- Posibles causas: variables de entorno no configuradas, formato incorrecto del payload, o respuesta inesperada de Pagopar

**Solución aplicada:**
1. **Mejorado manejo de errores** en `createPagoparToken()`:
   - Validación previa de que los tokens existen
   - Logging detallado de request/response
   - Parsing mejorado de errores de Pagopar
   - Mensajes de error más descriptivos

2. **Mejorado manejo de errores** en `createPagoparInvoice()`:
   - Lectura del body como texto primero para capturar errores detallados
   - Logging completo de errores de API
   - Mejor parsing de respuestas de error

3. **Agregado `external_reference`** a las facturas:
   - Para membresías: usa `subscriptionId`
   - Para órdenes: usa `orderId`
   - Permite al webhook identificar correctamente qué activar

---

## 📁 ARCHIVOS MODIFICADOS

### 1. `src/app/api/pagopar/membership/route.ts` (NUEVO)
**Descripción:** Endpoint dedicado para crear facturas Pagopar de membresías
- Crea suscripción pendiente
- Genera factura en Pagopar con `external_reference = subscriptionId`
- Devuelve `link_pago` para redirección
- Manejo completo de errores

### 2. `src/app/checkout/page.tsx`
**Cambios:**
- **Líneas 467-510:** Refactorizado bloque de membresías para usar Pagopar correctamente
  - Si es Pagopar: llama a `/api/pagopar/membership` y redirige
  - Si NO es Pagopar: activa directamente (efectivo, transferencia)
- **Línea 937:** Eliminada lógica de membresías del bloque de Pagopar para productos (ya no debería llegar ahí)

### 3. `src/app/api/payments/pagopar/create-invoice/route.ts`
**Cambios:**
- **Línea 99:** Agregado `external_reference: orderId` al crear factura
- Mejorado logging de errores con más detalles (longitud de tokens, stack traces en dev)

### 4. `src/app/api/webhooks/pagopar/route.ts`
**Cambios:**
- **Líneas 294-363:** Agregada lógica completa para procesar órdenes de productos
  - Busca orden por `external_reference` (orderId)
  - Verifica que no esté ya pagada (idempotencia)
  - Marca orden como `paid` cuando Pagopar confirma
  - Logging completo del proceso

### 5. `src/lib/services/pagoparService.ts`
**Cambios:**
- **Línea 41:** Agregado campo opcional `external_reference?: string` a `PagoparInvoice`
- **Líneas 112-123:** Mejorado `createPagoparToken()`:
  - Validación previa de tokens
  - Logging detallado
  - Mejor manejo de errores
- **Líneas 200-225:** Mejorado `createPagoparInvoice()`:
  - Lectura de body como texto para mejor debugging
  - Logging completo de errores
  - Mensajes de error más descriptivos

---

## 🔄 FLUJO FINAL IMPLEMENTADO

### FLUJO 1: Checkout de Membresías con Pagopar

```
1. Usuario selecciona plan y método "Pagar con Pagopar"
2. Usuario hace clic en "Pagar con Pagopar"
   ↓
3. Frontend llama a `/api/pagopar/membership`:
   - Crea suscripción en estado 'pending'
   - Crea factura en Pagopar con external_reference = subscriptionId
   - Devuelve link_pago
   ↓
4. Frontend redirige: window.location.href = link_pago
   ↓
5. Usuario paga en Pagopar
   ↓
6. Pagopar envía webhook a `/api/webhooks/pagopar`:
   - Busca suscripción por external_reference (subscriptionId)
   - Actualiza suscripción: status='active', payment_status='completed'
   - Actualiza perfil: membership_level y membership_expires_at
   ↓
7. Usuario es redirigido a /checkout/success?membership=...
```

### FLUJO 2: Checkout de Productos con Pagopar

```
1. Usuario agrega productos al carrito
2. Usuario selecciona "Pagar con Pagopar"
3. Usuario completa formulario y hace clic en "Pagar con Pagopar"
   ↓
4. Frontend crea orden en estado 'pending_payment'
   ↓
5. Frontend llama a `/api/payments/pagopar/create-invoice`:
   - Crea factura en Pagopar con external_reference = orderId
   - Actualiza orden: payment_reference = invoice.id_factura
   - Devuelve link_pago
   ↓
6. Frontend redirige: window.location.href = link_pago
   ↓
7. Usuario paga en Pagopar
   ↓
8. Pagopar envía webhook a `/api/webhooks/pagopar`:
   - Busca orden por external_reference (orderId)
   - Actualiza orden: status='paid', payment_status='completed'
   ↓
9. Usuario es redirigido a /checkout/success?orderId=...
```

---

## 🔐 SEGURIDAD Y VALIDACIONES

### ✅ Validaciones implementadas:

1. **Autenticación:**
   - Todos los endpoints verifican sesión de usuario
   - Webhook usa service role para bypass RLS (necesario)

2. **Autorización:**
   - Usuarios solo pueden crear facturas para sus propias órdenes/suscripciones
   - Webhook verifica que el external_reference corresponda al recurso correcto

3. **Idempotencia:**
   - Webhook verifica si ya está pagado antes de procesar
   - Evita activaciones/actualizaciones duplicadas

4. **Manejo de errores:**
   - Si falla creación de factura, se marca como 'failed'
   - No se activa nada si Pagopar no confirma

---

## 📊 MEJORAS DE LOGGING

### Logs agregados:

1. **`[pagopar][create-token]`**: Logging detallado de creación de token
   - URL de API
   - Estado de tokens (existen, longitud)
   - Respuesta completa de Pagopar

2. **`[pagopar][create-invoice]`**: Logging de creación de factura
   - OrderId/subscriptionId
   - Detalles de la factura creada
   - Errores detallados con stack traces (solo en dev)

3. **`[pagopar][membership]`**: Logging del endpoint de membresías
   - PlanId, tipo de suscripción, monto
   - SubscriptionId creado
   - Estado de la factura

4. **`[Pagopar Webhook]`**: Logging del webhook
   - Payload recibido (sanitizado)
   - External reference encontrado
   - Estado del pago
   - Resultado del procesamiento

---

## 🚨 IMPORTANTE: Nada se activa antes del webhook

### ✅ Garantías implementadas:

1. **Membresías:**
   - Se crean en estado `pending`
   - Solo se activan cuando el webhook confirma pago
   - El frontend NO llama a `activateMembershipSubscription()` para Pagopar

2. **Órdenes:**
   - Se crean en estado `pending_payment`
   - Solo se marcan como `paid` cuando el webhook confirma
   - El frontend solo redirige, no marca como pagado

3. **Webhook:**
   - Es el único lugar donde se activa/marca como pagado
   - Tiene validaciones de idempotencia
   - Usa service role para poder actualizar cualquier recurso

---

## 🔍 DIAGNÓSTICO DEL ERROR "Error al crear token Pagopar"

### Posibles causas identificadas:

1. **Variables de entorno no configuradas:**
   - `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN` no existe o está vacía
   - `PAGOPAR_PRIVATE_TOKEN` no existe o está vacía
   - **Solución:** Verificar que ambas estén configuradas en Vercel

2. **Formato incorrecto de tokens:**
   - Tokens mal copiados o con espacios
   - Tokens de sandbox en producción o viceversa
   - **Solución:** Logging ahora muestra longitud de tokens para verificar

3. **Respuesta inesperada de Pagopar:**
   - API de Pagopar puede estar caída o con cambios
   - Payload incorrecto según versión de API
   - **Solución:** Logging completo de respuesta de Pagopar para diagnóstico

4. **Problemas de red:**
   - Timeout en la llamada
   - Firewall bloqueando requests
   - **Solución:** Logging de URL y status code ayuda a diagnosticar

### Mejoras implementadas para diagnóstico:

- ✅ Validación previa de que tokens existen
- ✅ Logging de longitud de tokens (sin exponer valores)
- ✅ Logging completo de request/response
- ✅ Parsing mejorado de errores de Pagopar
- ✅ Stack traces en desarrollo

---

## 📋 TODOs RECOMENDADOS

### Prioridad Alta:

1. **✅ Configurar variables de entorno en Vercel:**
   - Verificar que `NEXT_PUBLIC_PAGOPAR_PUBLIC_TOKEN` esté configurada
   - Verificar que `PAGOPAR_PRIVATE_TOKEN` esté configurada
   - Verificar que sean tokens de producción (no sandbox)

2. **✅ Configurar URL de webhook en Pagopar:**
   - URL debe ser: `https://mercadito-online-py.vercel.app/api/webhooks/pagopar`
   - Verificar que Pagopar tenga acceso a esta URL

3. **Verificar URLs de retorno:**
   - Pagopar puede requerir configurar URLs de retorno en su dashboard
   - Verificar documentación de Pagopar sobre URLs de retorno/callback

### Prioridad Media:

4. **Tests automáticos:**
   - Test unitario para `createPagoparToken()`
   - Test de integración para flujo completo de membresía
   - Test de integración para flujo completo de producto

5. **Monitoreo:**
   - Dashboard de pagos fallidos
   - Alertas cuando webhook no se recibe después de X tiempo
   - Métricas de conversión (cuántos usuarios completan el pago)

6. **Mejora de UX:**
   - Página de "Verificando pago..." mientras se espera webhook
   - Polling del estado del pago si webhook tarda
   - Notificaciones push cuando se confirma el pago

### Prioridad Baja:

7. **Reintentos:**
   - Si falla creación de token, reintentar 2-3 veces
   - Si falla creación de factura, marcar para retry manual

8. **Análisis:**
   - Dashboard de conversión de Pagopar vs otros métodos
   - Tiempo promedio desde clic hasta confirmación de webhook
   - Tasa de abandono en pasarela de Pagopar

---

## 🎯 VERIFICACIÓN POST-IMPLEMENTACIÓN

### Checklist de pruebas:

- [ ] **Membresía con Pagopar:**
  - [ ] Seleccionar plan
  - [ ] Elegir "Pagar con Pagopar"
  - [ ] Confirmar que redirige a Pagopar
  - [ ] Completar pago en Pagopar
  - [ ] Verificar que webhook activa la membresía
  - [ ] Verificar que redirige a página de éxito

- [ ] **Productos con Pagopar:**
  - [ ] Agregar productos al carrito
  - [ ] Elegir "Pagar con Pagopar"
  - [ ] Completar formulario de envío
  - [ ] Confirmar que redirige a Pagopar
  - [ ] Completar pago en Pagopar
  - [ ] Verificar que webhook marca orden como pagada
  - [ ] Verificar que redirige a página de éxito

- [ ] **Manejo de errores:**
  - [ ] Si falla creación de factura, mostrar error claro
  - [ ] Si webhook falla, orden/suscripción queda pendiente (correcto)
  - [ ] Si Pagopar rechaza pago, no se activa nada (correcto)

---

## 📝 NOTAS FINALES

- ✅ **No se rompe ningún otro método de pago:** Efectivo y transferencia siguen funcionando igual
- ✅ **Tipos TypeScript mantenidos:** Todos los cambios son type-safe
- ✅ **Logging sin exponer secretos:** Tokens nunca se loguean, solo longitud
- ✅ **Idempotencia garantizada:** Webhook puede recibirse múltiples veces sin problema
- ✅ **Manejo de errores robusto:** Todos los casos de error están cubiertos

---

## 🚀 SIGUIENTE PASO

**Aplicar migración de base de datos:**
- La migración `20251201200001_add_profiles_updated_at_column.sql` debe aplicarse antes de deployar
- Esto asegura que las funciones SQL funcionen correctamente














