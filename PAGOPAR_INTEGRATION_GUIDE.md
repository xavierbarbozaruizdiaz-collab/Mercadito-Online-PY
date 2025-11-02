# 💳 Guía de Integración de Pagopar

Esta guía explica cómo configurar la integración de Pagopar en Mercadito Online PY.

## 📋 Estado Actual

La integración de Pagopar está implementada y lista para usar. Funciona en modo **mock/simulación** hasta que configures las API keys reales.

## 🚀 Configuración de Pagopar

### 1. Crear cuenta en Pagopar

1. Ve a [https://www.pagopar.com](https://www.pagopar.com)
2. Crea una cuenta o inicia sesión
3. Completa el proceso de verificación de tu negocio

### 2. Obtener credenciales de API

1. Ve a tu panel de control de Pagopar
2. Navega a la sección **"Integrar con mi sitio web"**
3. Copia las siguientes credenciales:
   - **Public Key** (Clave pública)
   - **Private Key** (Clave privada)

### 3. Configurar variables de entorno

Agrega a tu `.env.local` (o variables de entorno en producción):

```env
# Pagopar Configuration
PAGOPAR_PUBLIC_KEY=tu_public_key_aqui
PAGOPAR_PRIVATE_KEY=tu_private_key_aqui
PAGOPAR_ENVIRONMENT=sandbox  # o 'production' para producción
PAGOPAR_WEBHOOK_SECRET=tu_webhook_secret_aqui  # Opcional
```

### 4. Configurar Webhooks (Importante)

1. En tu panel de Pagopar, ve a **Webhooks** o **Notificaciones**
2. Configura la URL de webhook: `https://tu-dominio.com/api/webhooks/pagopar`
3. Selecciona los eventos que quieres recibir:
   - Factura pagada
   - Factura vencida
   - Factura cancelada

## 🏗️ Arquitectura de la Integración

### Flujo de Pago

1. **Usuario selecciona Pagopar** en el checkout
2. **Sistema crea orden** en la base de datos
3. **Sistema crea factura** en Pagopar usando la API
4. **Usuario es redirigido** al link de pago de Pagopar
5. **Usuario completa el pago** en Pagopar
6. **Pagopar envía webhook** cuando el pago se confirma
7. **Sistema actualiza la orden** automáticamente

### Archivos Implementados

```
src/
├── lib/services/
│   └── pagoparService.ts              # Servicio principal de Pagopar
├── app/api/
│   ├── payments/pagopar/
│   │   ├── create-invoice/route.ts    # Crear factura
│   │   └── status/route.ts            # Consultar estado
│   └── webhooks/
│       └── pagopar/route.ts           # Recibir notificaciones
└── app/checkout/
    ├── page.tsx                       # UI de checkout (modificado)
    └── success/page.tsx               # Página de éxito (modificado)
```

## 📝 Uso en el Checkout

Cuando un usuario está en el checkout, verá la opción **"Pago con Pagopar"** junto con los otros métodos de pago:

- Efectivo contra entrega
- Transferencia bancaria
- Tarjeta de crédito/débito
- **Pago con Pagopar** ⭐ (Nuevo)

Al seleccionar Pagopar:
- El sistema creará una factura automáticamente
- El usuario será redirigido a la plataforma segura de Pagopar
- Después del pago, Pagopar redirigirá al usuario de vuelta

## 🔒 Seguridad

**IMPORTANTE:**
- ✅ **NUNCA** expongas las `Private Key` en el cliente
- ✅ Las `Private Key` solo deben estar en variables de entorno del servidor
- ✅ Las `Public Key` también se mantienen en el servidor (no en cliente)
- ✅ Usa HTTPS en producción
- ✅ Valida webhooks de Pagopar (verificar firma si está disponible)

## 🧪 Testing

### Modo Sandbox

1. Usa `PAGOPAR_ENVIRONMENT=sandbox` en desarrollo
2. Pagopar proporciona credenciales de prueba
3. Realiza transacciones de prueba

### Modo Mock (Desarrollo sin credenciales)

Si no tienes credenciales configuradas, el sistema funcionará en modo mock:
- Creará facturas simuladas
- Mostrará mensajes informativos
- No procesará pagos reales

## 📊 Funcionalidades

### Crear Factura

```typescript
import { createPagoparInvoice } from '@/lib/services/pagoparService';

const invoice = await createPagoparInvoice({
  monto_total: 100000,
  tipo_factura: 2, // 1 = Solo efectivo, 2 = Tarjeta también
  comprador: {
    razon_social: 'Juan Pérez',
    ruc: '1234567',
    email: 'juan@example.com',
    telefono: '0981234567',
  },
  items: [
    {
      concepto: 'Producto 1',
      cantidad: 1,
      precio: 100000,
    },
  ],
  fecha_vencimiento: '2024-02-15',
});
```

### Consultar Estado

```typescript
import { getPagoparInvoiceStatus } from '@/lib/services/pagoparService';

const status = await getPagoparInvoiceStatus(123456);
// Retorna: { estado: 'pagada', monto_pagado: 100000, ... }
```

## 🔄 Webhooks

El endpoint `/api/webhooks/pagopar` recibe notificaciones de Pagopar cuando:
- Una factura es pagada
- Una factura vence
- Una factura es cancelada

El webhook automáticamente:
1. Busca la orden asociada
2. Actualiza el estado de la orden
3. Notifica al usuario
4. Registra la transacción

## 🐛 Troubleshooting

### Error: "Pagopar credentials not configured"

- Verifica que las variables `PAGOPAR_PUBLIC_KEY` y `PAGOPAR_PRIVATE_KEY` estén configuradas
- Reinicia el servidor después de agregar variables
- Verifica que no haya espacios extras en las keys

### Error: "Invalid API key"

- Verifica que copiaste las keys completas desde Pagopar
- Usa las keys de sandbox para pruebas
- No uses keys de producción en desarrollo

### Webhook no funciona

- Verifica que la URL del webhook sea accesible públicamente
- Verifica que uses HTTPS en producción
- Revisa los logs del servidor para ver errores

### Factura no se crea

- Verifica que los datos del comprador sean correctos (RUC, teléfono, email)
- Verifica que el monto sea mayor a 0
- Revisa los logs para ver el error específico de Pagopar

## 📚 Recursos

- [Documentación de Pagopar](https://soporte.pagopar.com/portal/es/kb/api)
- [Sincronización de productos](https://soporte.pagopar.com/portal/es/kb/articles/sincronizaci%C3%B3n-de-productos)
- [Portal de Soporte](https://soporte.pagopar.com/portal/es/home)

## ✅ Checklist de Configuración

- [ ] Cuenta creada en Pagopar
- [ ] Credenciales de API obtenidas
- [ ] Variables de entorno configuradas
- [ ] Webhooks configurados en Pagopar
- [ ] Probado en modo sandbox
- [ ] Verificado en producción
- [ ] HTTPS habilitado
- [ ] Notificaciones funcionando

## 📞 Soporte

Si necesitas ayuda con la integración:
1. Revisa los logs del servidor (`logger` registra todas las operaciones)
2. Consulta la documentación oficial de Pagopar
3. Contacta al soporte de Pagopar si hay problemas con su API
4. Revisa los errores en la consola del navegador y del servidor



