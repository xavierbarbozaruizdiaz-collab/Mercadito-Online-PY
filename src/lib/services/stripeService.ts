// src/lib/services/stripeService.ts
// Servicio para integración con Stripe
// NOTA: Este servicio requiere configuración de API keys de Stripe

/**
 * IMPORTANTE: Para usar este servicio en producción:
 * 1. Instala: npm install @stripe/stripe-js
 * 2. Crea cuenta en Stripe: https://stripe.com
 * 3. Obtén tus API keys (public y secret)
 * 4. Configura en .env.local:
 *    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
 *    STRIPE_SECRET_KEY=sk_test_... (solo en servidor)
 */

export interface StripeConfig {
  publishableKey: string;
  secretKey?: string; // Solo disponible en servidor
}

export interface StripePaymentIntent {
  id: string;
  clientSecret: string;
  amount: number;
  currency: string;
  status: string;
}

export class StripeService {
  private static config: StripeConfig | null = null;

  /**
   * Inicializa el servicio de Stripe
   */
  static initialize(config?: StripeConfig): void {
    if (config) {
      this.config = config;
    } else if (typeof window !== 'undefined') {
      // En el cliente, usar la clave pública
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (publishableKey) {
        this.config = { publishableKey };
      }
    }
  }

  /**
   * Verifica si Stripe está configurado
   */
  static isConfigured(): boolean {
    return !!this.config?.publishableKey;
  }

  /**
   * Crea un Payment Intent en el servidor
   * Este método debe llamarse desde una API route de Next.js
   */
  static async createPaymentIntent(params: {
    amount: number;
    currency: string;
    orderId: string;
    metadata?: Record<string, string>;
  }): Promise<StripePaymentIntent | null> {
    try {
      // Llamar a la API route del servidor
      const response = await fetch('/api/payments/stripe/create-intent', {
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
      return data.paymentIntent;
    } catch (error) {
      console.error('Error creating Stripe payment intent:', error);
      return null;
    }
  }

  /**
   * Confirma un pago con Stripe (desde el cliente)
   */
  static async confirmPayment(params: {
    paymentIntentId: string;
    paymentMethodId: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('/api/payments/stripe/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Payment confirmation failed');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error confirming Stripe payment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene el estado de un Payment Intent
   */
  static async getPaymentStatus(
    paymentIntentId: string
  ): Promise<{ status: string; amount: number } | null> {
    try {
      const response = await fetch(
        `/api/payments/stripe/status?paymentIntentId=${paymentIntentId}`
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting Stripe payment status:', error);
      return null;
    }
  }
}

// Inicializar automáticamente si hay clave pública disponible
if (typeof window !== 'undefined') {
  StripeService.initialize();
}

