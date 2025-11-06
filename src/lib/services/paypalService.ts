// src/lib/services/paypalService.ts
// Servicio para integración con PayPal
// NOTA: Este servicio requiere configuración de API keys de PayPal

/**
 * IMPORTANTE: Para usar este servicio en producción:
 * 1. Crea cuenta en PayPal Developer: https://developer.paypal.com
 * 2. Crea una aplicación para obtener Client ID y Secret
 * 3. Configura en .env.local:
 *    NEXT_PUBLIC_PAYPAL_CLIENT_ID=... (para Sandbox o Live)
 *    PAYPAL_SECRET=... (solo en servidor)
 *    PAYPAL_MODE=sandbox (o 'live' para producción)
 */

export interface PayPalConfig {
  clientId: string;
  secret?: string; // Solo disponible en servidor
  mode?: 'sandbox' | 'live';
}

export interface PayPalOrder {
  id: string;
  status: string;
  links: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}

export class PayPalService {
  private static config: PayPalConfig | null = null;

  /**
   * Inicializa el servicio de PayPal
   */
  static initialize(config?: PayPalConfig): void {
    if (config) {
      this.config = config;
    } else if (typeof window !== 'undefined') {
      const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      const mode = process.env.NEXT_PUBLIC_PAYPAL_MODE || 'sandbox';
      
      if (clientId) {
        this.config = { clientId, mode: mode as 'sandbox' | 'live' };
      }
    }
  }

  /**
   * Verifica si PayPal está configurado
   */
  static isConfigured(): boolean {
    return !!this.config?.clientId;
  }

  /**
   * Crea una orden de PayPal en el servidor
   */
  static async createOrder(params: {
    amount: number;
    currency: string;
    orderId: string;
    returnUrl?: string;
    cancelUrl?: string;
  }): Promise<PayPalOrder | null> {
    try {
      const response = await fetch('/api/payments/paypal/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.order;
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      return null;
    }
  }

  /**
   * Captura un pago de PayPal (después de que el usuario aprueba)
   */
  static async captureOrder(
    orderId: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    try {
      const response = await fetch('/api/payments/paypal/capture-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Order capture failed');
      }

      const data = await response.json();
      return { success: true, transactionId: data.transactionId };
    } catch (error: any) {
      console.error('Error capturing PayPal order:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene el estado de una orden de PayPal
   */
  static async getOrderStatus(
    orderId: string
  ): Promise<{ status: string; amount: number } | null> {
    try {
      const response = await fetch(
        `/api/payments/paypal/status?orderId=${orderId}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting PayPal order status:', error);
      return null;
    }
  }

  /**
   * Obtiene la URL de aprobación de PayPal
   */
  static getApprovalUrl(order: PayPalOrder): string | null {
    const approvalLink = order.links?.find((link) => link.rel === 'approve');
    return approvalLink?.href || null;
  }
}

// Inicializar automáticamente si hay client ID disponible
if (typeof window !== 'undefined') {
  PayPalService.initialize();
}

