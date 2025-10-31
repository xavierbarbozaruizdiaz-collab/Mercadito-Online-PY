# 💳 Guía de Integración de Pagos

Esta guía explica cómo configurar las integraciones de pago reales con Stripe y PayPal.

## 📋 Estado Actual

Las integraciones de pago están implementadas como estructura base. Actualmente funcionan en modo **mock/simulación** hasta que configures las API keys reales.

## 🚀 Configuración de Stripe

### 1. Crear cuenta en Stripe

1. Ve a [https://stripe.com](https://stripe.com)
2. Crea una cuenta o inicia sesión
3. Ve al Dashboard → Developers → API keys

### 2. Obtener API Keys

- **Test Mode (desarrollo):**
  - `Publishable key`: `pk_test_...`
  - `Secret key`: `sk_test_...`

- **Live Mode (producción):**
  - `Publishable key`: `pk_live_...`
  - `Secret key`: `sk_live_...`

### 3. Instalar dependencias

```bash
npm install stripe @stripe/stripe-js
```

### 4. Configurar variables de entorno

Agrega a tu `.env.local`:

```env
# Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### 5. Activar integración real

Edita los archivos en `src/app/api/payments/stripe/` y descomenta el código real, reemplazando los mocks.

## 💰 Configuración de PayPal

### 1. Crear cuenta en PayPal Developer

1. Ve a [https://developer.paypal.com](https://developer.paypal.com)
2. Crea una cuenta o inicia sesión
3. Ve a Dashboard → My Apps & Credentials

### 2. Crear una aplicación

1. Haz clic en "Create App"
2. Elige "Merchant" como tipo de aplicación
3. Guarda el `Client ID` y `Secret`

### 3. Instalar dependencias

```bash
npm install @paypal/checkout-server-sdk
```

### 4. Configurar variables de entorno

Agrega a tu `.env.local`:

```env
# PayPal Configuration
NEXT_PUBLIC_PAYPAL_CLIENT_ID=... (del Sandbox o Live)
PAYPAL_SECRET=... (del Sandbox o Live)
PAYPAL_MODE=sandbox  # o 'live' para producción
```

### 5. Activar integración real

Edita los archivos en `src/app/api/payments/paypal/` y descomenta el código real, reemplazando los mocks.

## 📁 Estructura de Archivos

```
src/
├── lib/
│   └── services/
│       ├── stripeService.ts          # Servicio cliente de Stripe
│       ├── paypalService.ts          # Servicio cliente de PayPal
│       └── paymentService.ts         # Servicio principal de pagos
├── app/
│   └── api/
│       └── payments/
│           ├── stripe/
│           │   ├── create-intent/    # Crear Payment Intent
│           │   ├── confirm/          # Confirmar pago
│           │   └── status/           # Obtener estado
│           └── paypal/
│               ├── create-order/     # Crear orden
│               ├── capture-order/    # Capturar pago
│               └── status/           # Obtener estado
```

## 🔒 Seguridad

**IMPORTANTE:**
- ❌ **NUNCA** expongas las `Secret Keys` en el cliente
- ✅ Las `Secret Keys` solo deben estar en variables de entorno del servidor
- ✅ Las `Publishable Keys` pueden estar en el cliente (prefijo `NEXT_PUBLIC_`)
- ✅ Usa HTTPS en producción
- ✅ Valida webhooks de Stripe y PayPal

## 🧪 Testing

### Stripe Test Cards

Usa estas tarjetas en modo sandbox:

- **Pago exitoso:** `4242 4242 4242 4242`
- **Pago rechazado:** `4000 0000 0000 0002`
- **Requiere autenticación:** `4000 0025 0000 3155`

Más información: https://stripe.com/docs/testing

### PayPal Sandbox

Usa las credenciales del Sandbox de PayPal para pruebas. En el dashboard puedes crear cuentas de prueba.

## 📝 Webhooks

### Configurar Webhooks de Stripe

1. Ve a Stripe Dashboard → Developers → Webhooks
2. Agrega endpoint: `https://tudominio.com/api/webhooks/stripe`
3. Selecciona eventos:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

### Configurar Webhooks de PayPal

1. Ve a PayPal Developer Dashboard → Webhooks
2. Agrega URL: `https://tudominio.com/api/webhooks/paypal`
3. Selecciona eventos:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`

## 🔄 Conversión de Moneda

**Nota:** Stripe no soporta Guaraníes (PYG) directamente. Necesitarás:
- Convertir a USD en el frontend antes de crear el Payment Intent
- O usar un servicio de conversión de moneda

Para PayPal, verifica qué monedas soporta en tu región.

## ✅ Checklist de Configuración

- [ ] Cuenta creada en Stripe
- [ ] API Keys de Stripe obtenidas
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas (`stripe`, `@stripe/stripe-js`)
- [ ] Código real activado (descomentado) en endpoints
- [ ] Webhooks configurados
- [ ] Probado en modo sandbox/test
- [ ] Verificado en producción

## 🐛 Troubleshooting

### Error: "Stripe not configured"
- Verifica que las variables de entorno estén configuradas
- Reinicia el servidor después de agregar variables

### Error: "Invalid API key"
- Verifica que copiaste las keys completas
- Usa `sk_test_...` para desarrollo, no `sk_live_...`
- No incluyas espacios al inicio o final

### PayPal no redirige correctamente
- Verifica `returnUrl` y `cancelUrl` en la creación de orden
- Asegúrate de que las URLs sean accesibles públicamente

## 📚 Recursos

- [Documentación de Stripe](https://stripe.com/docs)
- [Documentación de PayPal](https://developer.paypal.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

