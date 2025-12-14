'use client';

// ============================================
// MERCADITO ONLINE PY - MODAL DE WHATSAPP PARA TRANSFERENCIA
// Modal simple que lleva al usuario a WhatsApp para coordinar transferencia
// ============================================

import { X, MessageCircle } from 'lucide-react';

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  whatsappUrl: string;
  checkoutType?: 'membership' | null;
  paymentMethod?: 'cash' | 'transfer' | 'card' | 'pagopar';
}

export default function WhatsAppModal({
  isOpen,
  onClose,
  whatsappUrl,
  checkoutType,
  paymentMethod = 'transfer',
}: WhatsAppModalProps) {
  function handleOpenWhatsApp() {
    window.open(whatsappUrl, '_blank');
    // Cerrar modal después de abrir WhatsApp (el onClose manejará la redirección si es necesario)
    setTimeout(() => {
      onClose();
    }, 500); // Pequeño delay para que se abra WhatsApp primero
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
            aria-label="Cerrar modal"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-700">
            {paymentMethod === 'cash' 
              ? 'Para completar tu compra en efectivo, te vamos a atender por WhatsApp. Ahí coordinamos el punto de encuentro y confirmamos tu pedido.'
              : 'Para completar tu compra por transferencia, te vamos a atender por WhatsApp. Ahí te pasamos los datos bancarios y confirmamos tu pedido.'
            }
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



