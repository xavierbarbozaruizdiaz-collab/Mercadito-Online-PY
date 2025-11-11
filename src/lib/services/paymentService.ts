// src/lib/services/paymentService.ts
// Servicio para gestionar pagos con múltiples gateways

import { supabase } from '@/lib/supabase/client';

export type PaymentMethod = 
  | 'stripe'
  | 'paypal'
  | 'cash_on_delivery'
  | 'bank_transfer'
  | 'crypto'
  | 'local_bank'; // Bancos locales de Paraguay

export interface PaymentIntent {
  id: string;
  amount: number; // En guaraníes
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  payment_method: PaymentMethod;
  order_id: string;
  created_at: string;
}

export interface PaymentRequest {
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  metadata?: Record<string, any>;
}

export class PaymentService {
  /**
   * Crea un intent de pago
   */
  static async createPaymentIntent(
    request: PaymentRequest
  ): Promise<PaymentIntent | null> {
    try {
      // En producción, esto llamaría a un endpoint seguro del servidor
      // Por ahora, simulamos la creación del payment intent
      
      const paymentIntent: PaymentIntent = {
        id: `pi_${Date.now()}`,
        amount: request.amount,
        currency: 'PYG',
        status: 'pending',
        payment_method: request.payment_method,
        order_id: request.order_id,
        created_at: new Date().toISOString(),
      };

      // Guardar en base de datos
      const { error } = await (supabase as any)
        .from('payment_intents')
        .insert({
          id: paymentIntent.id,
          order_id: request.order_id,
          amount: request.amount,
          currency: paymentIntent.currency,
          status: paymentIntent.status,
          payment_method: request.payment_method,
          metadata: request.metadata || {},
        })
        .select()
        .single();

      if (error) throw error;

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return null;
    }
  }

  /**
   * Procesa un pago con Stripe
   */
  static async processStripePayment(
    _paymentIntentId: string,
    _paymentMethodId: string
  ): Promise<{ success: boolean; clientSecret?: string }> {
    try {
      // En producción, esto se haría desde un endpoint del servidor
      // que llama a la API de Stripe de forma segura
      
      // Por ahora, simulamos el proceso
      return {
        success: true,
        clientSecret: `pi_${Date.now()}_secret_stripe`,
      };
    } catch (error) {
      console.error('Error processing Stripe payment:', error);
      return { success: false };
    }
  }

  /**
   * Procesa un pago con PayPal
   */
  static async processPayPalPayment(
    orderId: string,
    _amount: number
  ): Promise<{ success: boolean; approvalUrl?: string }> {
    try {
      // Similar a Stripe, esto se hace desde el servidor en producción
      return {
        success: true,
        approvalUrl: `https://paypal.com/checkout/${orderId}`,
      };
    } catch (error) {
      console.error('Error processing PayPal payment:', error);
      return { success: false };
    }
  }

  /**
   * Confirma un pago
   */
  static async confirmPayment(
    paymentIntentId: string
  ): Promise<boolean> {
    try {
      const { error } = await (supabase as any)
        .from('payment_intents')
        .update({ status: 'succeeded' })
        .eq('id', paymentIntentId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error confirming payment:', error);
      return false;
    }
  }

  /**
   * Obtiene el estado de un pago
   */
  static async getPaymentStatus(
    paymentIntentId: string
  ): Promise<PaymentIntent | null> {
    try {
      const { data, error } = await supabase
        .from('payment_intents')
        .select('*')
        .eq('id', paymentIntentId)
        .single();

      if (error) throw error;

      return data as PaymentIntent;
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }

  /**
   * Procesa un pago contra entrega
   */
  static async processCashOnDelivery(
    orderId: string
  ): Promise<boolean> {
    try {
      // Para pagos contra entrega, simplemente marcamos como pendiente
      const { error } = await (supabase as any)
        .from('payment_intents')
        .insert({
          order_id: orderId,
          payment_method: 'cash_on_delivery',
          status: 'pending',
          amount: 0, // Se actualizará cuando se confirme el pedido
        });

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error processing cash on delivery:', error);
      return false;
    }
  }
}

