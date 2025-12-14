// ============================================
// MERCADITO ONLINE PY - WHATSAPP CONTACT BUTTON
// Botón para contactar al vendedor vía WhatsApp
// ============================================

'use client';

import { Product } from '@/types';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui';

// ============================================
// TIPOS
// ============================================

interface StartConversationButtonProps {
  product: Product;
  sellerId: string;
  sellerName?: string;
  sellerPhone?: string | null;
  storePhone?: string | null;
  className?: string;
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

/**
 * Formatea un número de teléfono para WhatsApp
 * Elimina espacios, guiones y otros caracteres especiales
 */
function formatPhoneForWhatsApp(phone: string): string {
  // Eliminar todos los caracteres que no sean números o +
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Si no empieza con +, agregar código de Paraguay (595)
  if (!cleaned.startsWith('+')) {
    // Si empieza con 595, agregar +
    if (cleaned.startsWith('595')) {
      cleaned = '+' + cleaned;
    } else if (cleaned.startsWith('0')) {
      // Si empieza con 0, reemplazar por +595
      cleaned = '+595' + cleaned.substring(1);
    } else {
      // Agregar +595 al inicio
      cleaned = '+595' + cleaned;
    }
  }
  
  return cleaned;
}

/**
 * Genera el mensaje predefinido para WhatsApp
 */
function generateWhatsAppMessage(product: Product): string {
  const message = `Hola! Me interesa el producto: ${product.title}\n\n¿Todavía está disponible?`;
  return encodeURIComponent(message);
}

// ============================================
// COMPONENTE
// ============================================

export default function StartConversationButton({
  product,
  sellerId,
  sellerName,
  sellerPhone,
  storePhone,
  className = '',
}: StartConversationButtonProps) {
  const handleOpenWhatsApp = () => {
    // Priorizar el teléfono de la tienda, luego el del vendedor
    const phone = storePhone || sellerPhone;
    
    if (!phone) {
      alert('El vendedor no tiene un número de teléfono configurado. Por favor, contacta al vendedor por otro medio.');
      return;
    }

    try {
      const formattedPhone = formatPhoneForWhatsApp(phone);
      const message = generateWhatsAppMessage(product);
      // CORREGIDO: Asegurar que el número no tenga el + en la URL de wa.me
      const phoneNumber = formattedPhone.startsWith('+') ? formattedPhone.substring(1) : formattedPhone;
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
      
      console.log('📱 Abriendo WhatsApp:', { phone, formattedPhone, phoneNumber, whatsappUrl });
      
      // Abrir WhatsApp en una nueva pestaña
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      alert('Error al abrir WhatsApp. Por favor, verifica que el número de teléfono sea válido.');
    }
  };

  const phone = storePhone || sellerPhone;
  const hasPhone = !!phone;

  return (
    <div className="w-full space-y-2">
      <Button
        onClick={handleOpenWhatsApp}
        disabled={!hasPhone}
        className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm hover:shadow-md ${className}`}
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        <span>{hasPhone ? 'Chatear con el vendedor' : 'Sin número de contacto'}</span>
      </Button>
      
      {!hasPhone && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
          <p className="text-xs sm:text-sm text-yellow-700 text-center font-medium">
            El vendedor no tiene WhatsApp configurado
          </p>
        </div>
      )}
    </div>
  );
}
