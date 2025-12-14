# 📋 RESUMEN - REFACTORIZACIÓN MÉTODO "TRANSFERENCIA" → WHATSAPP

## 1️⃣ CONTEXTO ACTUAL ENCONTRADO

### Archivos involucrados

**Archivo principal:** `src/app/checkout/page.tsx`
- Componente: `CheckoutContent` (función interna, línea 38)
- Función de submit: `handleSubmit` (línea 358)

**Modal existente:** `src/components/TransferBankModal.tsx`
- Componente completo que muestra datos bancarios y botón WhatsApp

### Código actual del método "transfer"

#### A) En handleSubmit - Validación para membresías (líneas 384-417)

```typescript
// Si es transferencia bancaria, validar configuración y mostrar modal
if (paymentMethod === 'transfer') {
  try {
    // Validar que cuenta bancaria esté configurada
    const { getSetting } = await import('@/lib/services/siteSettingsService');
    const bankAccount = await getSetting('bank_account_number', '');
    
    if (!bankAccount) {
      toast.error('Configuración de cuenta bancaria incompleta. Por favor contacta al administrador o usa otro método de pago.');
      setProcessing(false);
      return;
    }
    
    // Mostrar modal de transferencia
    setShowTransferModal(true);
    setProcessing(false);
    return;
  } catch (error: any) {
    logger.error('Error leyendo configuración bancaria', error, {
      paymentMethod,
      checkoutType,
      planId
    });
    
    // Distinguir entre error de acceso (RLS/red) y datos faltantes
    if (error.message?.includes('RLS') || error.status === 406 || error.status === 403 || error.status === 500) {
      toast.error('Error de servidor al leer configuración. Por favor intenta de nuevo o usa otro método de pago.');
    } else {
      toast.error('Configuración de cuenta bancaria incompleta. Por favor contacta al administrador o usa otro método de pago.');
    }
    setProcessing(false);
    return;
  }
}
```

**Problemas identificados:**
- ❌ Depende de `bank_account_number` en `site_settings`
- ❌ Bloquea el flujo si no hay configuración bancaria
- ❌ Muestra mensajes de error confusos
- ❌ Solo aplica para membresías (no hay validación para pedidos normales)

#### B) Modal actual TransferBankModal (líneas 47-64)

```typescript
async function loadBankSettings() {
  setLoading(true);
  try {
    const account = await getSetting('bank_account_number', '');
    const name = await getSetting('bank_name', '');
    const holder = await getSetting('bank_account_holder', '');
    const whatsapp = await getSetting('whatsapp_number', '');

    setBankAccount(account || '');
    setBankName(name || '');
    setAccountHolder(holder || '');
    setWhatsappNumber(whatsapp || '');
  } catch (error) {
    console.error('Error loading bank settings:', error);
  } finally {
    setLoading(false);
  }
}
```

**Problemas identificados:**
- ❌ Lee múltiples campos bancarios que ya no necesitamos
- ❌ Muestra datos bancarios estáticos en el modal
- ✅ Ya tiene lógica para abrir WhatsApp (líneas 74-96)

#### C) Renderizado del modal (líneas 1187-1236)

```typescript
{/* Modal de Transferencia Bancaria */}
{checkoutType === 'membership' && membershipPlan && (
  <TransferBankModal
    isOpen={showTransferModal}
    onClose={() => setShowTransferModal(false)}
    onConfirm={async () => {
      // Crea suscripción pendiente
      // Redirige a success page
    }}
    amount={...}
    planName={...}
    subscriptionType={...}
    userName={...}
    userEmail={...}
  />
)}
```

**Observación:**
- El modal solo se muestra para membresías
- Para pedidos normales, no hay validación especial de transferencia (se crea la orden directamente)

---

## 2️⃣ PROPUESTA DE CAMBIOS

### Archivos a modificar

1. ✅ **`src/lib/services/siteSettingsService.ts`**
   - Agregar función `getWhatsappNumber()` con fallback inteligente

2. ✅ **`src/components/TransferBankModal.tsx`** (REFACTORIZAR)
   - Simplificar para solo mostrar modal de WhatsApp
   - Eliminar dependencia de datos bancarios
   - Mantener solo lógica de WhatsApp

3. ✅ **`src/app/checkout/page.tsx`**
   - Refactorizar bloque `paymentMethod === 'transfer'`
   - Eliminar validación de `bank_account_number`
   - Simplificar flujo para abrir modal de WhatsApp

### Nuevo código propuesto

#### A) Helper para obtener WhatsApp (nuevo en siteSettingsService.ts)

```typescript
/**
 * Obtiene el número de WhatsApp del sitio con fallback inteligente
 * Orden de prioridad: whatsapp_number -> contact_phone -> fallback hardcodeado
 */
export async function getWhatsappNumber(): Promise<string> {
  // 1. Intentar whatsapp_number
  try {
    const whatsapp = await getSetting('whatsapp_number', '');
    if (whatsapp && whatsapp.trim()) {
      return normalizePhoneNumber(whatsapp);
    }
  } catch (error) {
    console.warn('[getWhatsappNumber] Error leyendo whatsapp_number, intentando contact_phone', error);
  }

  // 2. Intentar contact_phone como fallback
  try {
    const contactPhone = await getSetting('contact_phone', '');
    if (contactPhone && contactPhone.trim()) {
      return normalizePhoneNumber(contactPhone);
    }
  } catch (error) {
    console.warn('[getWhatsappNumber] Error leyendo contact_phone, usando fallback', error);
  }

  // 3. Fallback hardcodeado
  return '595981123456';
}

/**
 * Normaliza un número de teléfono para WhatsApp (wa.me)
 * - Elimina espacios y caracteres no numéricos
 * - Si empieza con 0, lo convierte a 595 + resto
 * - Ejemplo: "0981 123 456" → "595981123456"
 */
function normalizePhoneNumber(phone: string): string {
  // Eliminar espacios y caracteres no numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Si empieza con 0, convertir a formato internacional (595)
  if (cleaned.startsWith('0')) {
    cleaned = '595' + cleaned.substring(1);
  }
  
  // Si ya tiene código de país pero no empieza con 595, asegurar que tenga
  if (!cleaned.startsWith('595') && cleaned.length > 9) {
    // Si tiene código de país diferente, mantenerlo
    // Si no tiene código, agregar 595
    if (cleaned.length === 9) {
      cleaned = '595' + cleaned;
    }
  }
  
  return cleaned;
}
```

#### B) Nuevo bloque en handleSubmit (checkout/page.tsx)

```typescript
// Si es transferencia bancaria, abrir modal de WhatsApp
if (paymentMethod === 'transfer') {
  try {
    // 1. Obtener número de WhatsApp desde settings (whatsapp_number -> contact_phone -> fallback)
    const { getWhatsappNumber } = await import('@/lib/services/siteSettingsService');
    const whatsappNumber = await getWhatsappNumber();
    
    if (!whatsappNumber) {
      // Caso extremo: ni siquiera fallback
      toast.error('No se pudo obtener el número de WhatsApp. Por favor intenta otro método de pago o contacta al administrador.');
      setProcessing(false);
      return;
    }

    // 2. Construir URL de WhatsApp con mensaje prearmado
    const siteName = await getSetting('site_name', 'Mercadito Online PY');
    let message = `Hola, quiero finalizar mi compra por transferencia desde ${siteName}.\n\n`;
    
    if (checkoutType === 'membership' && membershipPlan) {
      const paymentAmount = membershipAmount ? parseFloat(membershipAmount) : 0;
      message += `📋 Detalles:\n`;
      message += `• Tipo: Membresía\n`;
      message += `• Plan: ${membershipPlan.name}\n`;
      message += `• Tipo de suscripción: ${
        subscriptionType === 'monthly' ? 'Mensual' : 
        subscriptionType === 'yearly' ? 'Anual' : 
        subscriptionType === 'one_time' ? 'Pago Único' : subscriptionType
      }\n`;
      message += `• Monto: ${paymentAmount.toLocaleString('es-PY')} Gs.\n`;
      if (userProfile?.name) {
        message += `• Usuario: ${userProfile.name}\n`;
      }
    } else {
      // Pedido normal
      message += `📋 Detalles:\n`;
      message += `• Tipo: Pedido de productos\n`;
      message += `• Monto aproximado: ${totalPrice.toLocaleString('es-PY')} Gs.\n`;
      if (cartItems.length > 0) {
        message += `• Productos: ${cartItems.length} item(s)\n`;
      }
    }
    
    message += `\nPor favor, envíame los datos bancarios para realizar la transferencia.`;

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    // 3. Abrir modal de WhatsApp (no crear pedido todavía, solo preparar)
    setWhatsappUrl(whatsappUrl);
    setShowWhatsappModal(true);
    setProcessing(false);
    return;
  } catch (error: any) {
    logger.error('Error preparando pago por transferencia/WhatsApp', error, {
      paymentMethod,
      checkoutType,
      planId
    });
    toast.error('Ocurrió un error al preparar el pago por WhatsApp. Por favor intenta de nuevo o usa otro método de pago.');
    setProcessing(false);
    return;
  }
}
```

#### C) Modal simplificado (TransferBankModal.tsx refactorizado)

```typescript
'use client';

import { X, MessageCircle } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappUrl: string;
  checkoutType?: 'membership' | null;
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  whatsappUrl,
  checkoutType,
}: WhatsAppModalProps) {
  function handleOpenWhatsApp() {
    window.open(whatsappUrl, '_blank');
    // Opcional: cerrar modal después de abrir WhatsApp
    // onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Finalizar por WhatsApp
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            Para completar tu compra por transferencia, te vamos a atender por WhatsApp. 
            Ahí te pasamos los datos bancarios y confirmamos tu pedido.
          </p>

          {/* Botones */}
          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleOpenWhatsApp}
              className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold"
            >
              <MessageCircle className="h-5 w-5" />
              Abrir WhatsApp
            </button>

            <button
              onClick={onClose}
              className="w-full px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 3️⃣ CAMBIOS TÉCNICOS DETALLADOS

### Estado necesario en checkout/page.tsx

```typescript
// Reemplazar:
const [showTransferModal, setShowTransferModal] = useState(false);

// Por:
const [showWhatsappModal, setShowWhatsappModal] = useState(false);
const [whatsappUrl, setWhatsappUrl] = useState<string>('');
```

### Importaciones a actualizar

```typescript
// Eliminar:
import TransferBankModal from '@/components/TransferBankModal';

// Agregar:
import WhatsAppModal from '@/components/WhatsAppModal';
```

### Renderizado del modal

```typescript
{/* Modal de WhatsApp para transferencia */}
<WhatsAppModal
  isOpen={showWhatsappModal}
  onClose={() => setShowWhatsappModal(false)}
  whatsappUrl={whatsappUrl}
  checkoutType={checkoutType}
/>
```

---

## 4️⃣ RESUMEN DE ARCHIVOS A MODIFICAR

1. ✅ **`src/lib/services/siteSettingsService.ts`**
   - Agregar `getWhatsappNumber()`
   - Agregar `normalizePhoneNumber()`

2. ✅ **`src/components/TransferBankModal.tsx`** → **`src/components/WhatsAppModal.tsx`**
   - Refactorizar completamente
   - Eliminar dependencia de datos bancarios
   - Simplificar a solo modal de WhatsApp

3. ✅ **`src/app/checkout/page.tsx`**
   - Refactorizar bloque `paymentMethod === 'transfer'`
   - Actualizar estado (showTransferModal → showWhatsappModal)
   - Actualizar importaciones
   - Actualizar renderizado del modal

---

## 5️⃣ CONSIDERACIONES ESPECIALES

### ✅ No romper otros métodos de pago
- No tocar lógica de `cash`, `card`, `pagopar`
- Mantener intacto cálculo de totales
- Mantener validación de campos del comprador

### ✅ Manejo de errores robusto
- Siempre `setProcessing(false)` en todos los caminos
- Mensajes de error claros
- Fallback hardcodeado para WhatsApp

### ✅ Logging
- Usar `logger.error` para errores importantes
- No spamear console.log

### ✅ Compatibilidad
- Funciona para membresías Y pedidos normales
- No requiere datos bancarios en site_settings
- Funciona incluso si no hay configuración de WhatsApp (usa fallback)

---

## ✅ LISTO PARA APLICAR

Después de tu aprobación, procederé a:
1. Crear función `getWhatsappNumber()` en siteSettingsService
2. Refactorizar TransferBankModal → WhatsAppModal
3. Actualizar checkout/page.tsx con nuevo flujo
4. Verificar que no haya errores de linting















