// src/lib/services/shippingService.ts
// Servicio para gestionar envíos y tracking

import { supabase } from '@/lib/supabase/client';
import { normalizeRpcList, normalizeRpcResult } from '@/lib/supabase/rpc';

export type Carrier = 
  | 'correo_paraguayo'
  | 'oca'
  | 'dhl'
  | 'fedex'
  | 'mercosur_logistics';

export type ShipmentStatus = 
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'returned';

export interface ShippingAddress {
  street: string;
  city: string;
  department: string;
  postal_code?: string;
  country?: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface Shipment {
  id: string;
  order_id: string;
  tracking_number: string | null;
  carrier: Carrier;
  status: ShipmentStatus;
  shipping_address: ShippingAddress;
  shipping_cost: number;
  estimated_delivery_date: string | null;
  actual_delivery_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShipmentEvent {
  id: string;
  shipment_id?: string;
  status: string;
  location: string | null;
  description: string | null;
  timestamp?: string;
  event_timestamp?: string; // Nombre alternativo de la función SQL
}

export class ShippingService {
  /**
   * Crea un envío para una orden
   */
  static async createShipment(
    orderId: string,
    carrier: Carrier,
    shippingAddress: ShippingAddress,
    trackingNumber?: string
  ): Promise<Shipment | null> {
    try {
      const { data, error } = await (supabase as any)
        .from('shipments')
        .insert({
          order_id: orderId,
          carrier,
          tracking_number: trackingNumber,
          shipping_address: shippingAddress,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return data as Shipment;
    } catch (error) {
      console.error('Error creating shipment:', error);
      return null;
    }
  }

  /**
   * Obtiene el tracking de un envío
   */
  static async getShipmentTracking(
    shipmentId: string
  ): Promise<ShipmentEvent[]> {
    try {
      const { data, error } = await (supabase as any).rpc(
        'get_shipment_tracking',
        { shipment_id_param: shipmentId }
      );

      if (error) throw error;

      return normalizeRpcList<ShipmentEvent>(data);
    } catch (error) {
      console.error('Error getting shipment tracking:', error);
      return [];
    }
  }

  /**
   * Obtiene un envío por ID
   */
  static async getShipment(shipmentId: string): Promise<Shipment | null> {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', shipmentId)
        .single();

      if (error) throw error;

      return data as Shipment;
    } catch (error) {
      console.error('Error getting shipment:', error);
      return null;
    }
  }

  /**
   * Obtiene envíos de una orden
   */
  static async getOrderShipments(orderId: string): Promise<Shipment[]> {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as Shipment[];
    } catch (error) {
      console.error('Error getting order shipments:', error);
      return [];
    }
  }

  /**
   * Actualiza el estado de un envío
   */
  static async updateShipmentStatus(
    shipmentId: string,
    status: ShipmentStatus,
    location?: string,
    description?: string
  ): Promise<boolean> {
    try {
      const updates: any = {
        status,
      };

      if (status === 'delivered') {
        updates.actual_delivery_date = new Date().toISOString();
      }

      const { error: updateError } = await (supabase as any)
        .from('shipments')
        .update(updates)
        .eq('id', shipmentId);

      if (updateError) throw updateError;

      // Agregar evento de tracking
      if (location || description) {
        const { error: eventError } = await (supabase as any)
          .from('shipment_events')
          .insert({
            shipment_id: shipmentId,
            status,
            location,
            description,
          });

        if (eventError) {
          console.error('Error adding shipment event:', eventError);
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating shipment status:', error);
      return false;
    }
  }

  /**
   * Calcula el costo de envío
   */
  static async calculateShippingCost(
    originCity: string,
    destinationCity: string,
    weightKg: number = 1.0,
    carrier: Carrier = 'correo_paraguayo'
  ): Promise<number> {
    try {
      const { data, error } = await (supabase as any).rpc('calculate_shipping_cost', {
        origin_city: originCity,
        destination_city: destinationCity,
        weight_kg: weightKg,
        carrier,
      });

      if (error) throw error;

      return Number(data) || 0;
    } catch (error) {
      console.error('Error calculating shipping cost:', error);
      return 0;
    }
  }

  /**
   * Busca un envío por número de tracking
   */
  static async trackByNumber(
    trackingNumber: string
  ): Promise<Shipment | null> {
    try {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .single();

      if (error) throw error;

      return data as Shipment;
    } catch (error) {
      console.error('Error tracking shipment:', error);
      return null;
    }
  }
}

