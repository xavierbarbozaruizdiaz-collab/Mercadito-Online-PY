# 📋 Resumen: Flujo de Pago de Subastas

## 🎯 Flujo Completo

### 1. Subasta Ganada → Botón "Pagar Ahora"
- **Ubicación**: Página de subasta (`/auctions/[id]`)
- **Condición**: Usuario es el ganador (`currentUserId === auction.winner_id`)
- **Estado requerido**: Subasta debe estar `ended`
- **Botón**: "💳 Pagar Ahora"
- **URL generada**: `/checkout?auction={productId}`

### 2. Checkout de Subasta
- **Ruta**: `/checkout?auction={productId}`
- **Validaciones**:
  - ✅ Subasta existe
  - ✅ Subasta está `ended`
  - ✅ Usuario es el ganador
  - ✅ Usuario está autenticado
- **Proceso**:
  1. Carga datos de la subasta
  2. Calcula comisiones (comprador + vendedor)
  3. Muestra precio final (precio subasta + comisión comprador)
  4. Usuario completa datos de envío
  5. Selecciona método de pago

### 3. Procesamiento de Pago

#### Opción A: Pagopar
- **Endpoint**: `/api/payments/pagopar/create-invoice`
- **Proceso**:
  1. Crea orden en base de datos
  2. Crea factura en Pagopar
  3. Guarda `orderId` en localStorage
  4. Redirige a `link_pago` de Pagopar
- **Retorno**: Pagopar redirige de vuelta (configurado en Pagopar dashboard)
- **Verificación**: Webhook `/api/webhooks/pagopar` actualiza estado de orden

#### Opción B: Otros métodos
- **Proceso**:
  1. Crea orden en base de datos
  2. Actualiza estado según método
  3. Redirige a página de éxito

### 4. Página de Éxito
- **Ruta**: `/checkout/success?orderId={orderId}`
- **Muestra**:
  - Resumen de la orden
  - Estado del pago
  - Próximos pasos
  - Link para ver orden completa

## 🔄 Manejo de Errores

### Subasta no encontrada
- **Mensaje**: "Subasta no encontrada o ya no está disponible"
- **Acción**: Redirige a `/auctions`

### Subasta no finalizada
- **Mensaje**: "Esta subasta aún no ha finalizado. Solo puedes pagar subastas que ya terminaron."
- **Acción**: Redirige a `/auctions/{id}`

### Usuario no es ganador
- **Mensaje**: "No eres el ganador de esta subasta."
- **Acción**: Redirige a `/auctions/{id}`

### Error al calcular precio
- **Mensaje**: "Error al calcular el precio. Por favor, recarga la página e intenta de nuevo."
- **Fallback**: Usa precio base de la subasta (sin comisiones)

### Error en Pagopar
- **Mensaje**: "Error al procesar pago con Pagopar: {mensaje}"
- **Acción**: Permanece en checkout para reintentar

## 📝 URLs Clave

| Paso | URL | Parámetros |
|------|-----|------------|
| Subasta ganada | `/auctions/{id}` | - |
| Checkout | `/checkout?auction={id}` | `auction`: ID de subasta |
| Éxito | `/checkout/success?orderId={id}` | `orderId`: ID de orden |
| API Pagopar | `/api/payments/pagopar/create-invoice` | POST body |
| Webhook Pagopar | `/api/webhooks/pagopar` | POST body |

## ✅ Validaciones Implementadas

1. ✅ Subasta existe y es válida
2. ✅ Subasta está finalizada (`ended`)
3. ✅ Usuario es el ganador
4. ✅ Usuario está autenticado
5. ✅ Precio calculado correctamente (con comisiones)
6. ✅ Manejo de errores en cada paso
7. ✅ Redirecciones apropiadas en caso de error

## 🚨 Prevención de 404

- ✅ Todas las rutas existen y están implementadas
- ✅ Validaciones previenen acceso a rutas inválidas
- ✅ Redirecciones claras en caso de error
- ✅ Mensajes de error amigables
- ✅ Fallbacks para casos edge

---

**Última actualización**: 2024

