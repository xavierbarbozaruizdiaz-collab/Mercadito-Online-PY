// src/components/ShippingTracker.tsx
// Componente para mostrar el tracking de envíos

'use client';

import { useEffect, useState } from 'react';
import { ShippingService, Shipment, ShipmentEvent } from '@/lib/services/shippingService';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import LoadingSpinner from './ui/LoadingSpinner';
import { Package, MapPin, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ShippingTrackerProps {
  shipmentId: string;
  trackingNumber?: string;
  orderId?: string;
}

export default function ShippingTracker({
  shipmentId,
  trackingNumber,
  orderId,
}: ShippingTrackerProps) {
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTracking = async () => {
      setLoading(true);
      try {
        const [shipmentData, eventsData] = await Promise.all([
          ShippingService.getShipment(shipmentId),
          ShippingService.getShipmentTracking(shipmentId),
        ]);

        setShipment(shipmentData);
        setEvents(eventsData || []);
      } catch (error) {
        console.error('Error loading tracking:', error);
      } finally {
        setLoading(false);
      }
    };

    if (shipmentId) {
      loadTracking();
    }
  }, [shipmentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (!shipment) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-500">No se encontró información del envío</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
      case 'returned':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'in_transit':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      in_transit: 'En Tránsito',
      delivered: 'Entregado',
      failed: 'Fallido',
      returned: 'Devuelto',
    };
    return labels[status] || status;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5" />
          Seguimiento de Envío
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Información del envío */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Estado Actual</p>
            <div className="flex items-center gap-2 mt-1">
              {getStatusIcon(shipment.status)}
              <p className="font-semibold">{getStatusLabel(shipment.status)}</p>
            </div>
          </div>
          {shipment.tracking_number && (
            <div>
              <p className="text-sm text-gray-500">Número de Seguimiento</p>
              <p className="font-mono font-semibold mt-1">{shipment.tracking_number}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-500">Transportista</p>
            <p className="font-semibold mt-1">{shipment.carrier.toUpperCase()}</p>
          </div>
          {shipment.estimated_delivery_date && (
            <div>
              <p className="text-sm text-gray-500">Entrega Estimada</p>
              <p className="font-semibold mt-1">
                {format(new Date(shipment.estimated_delivery_date), 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          )}
        </div>

        {/* Eventos de tracking */}
        {events.length > 0 && (
          <div>
            <p className="font-semibold mb-4">Historial de Envío</p>
            <div className="space-y-4">
              {events.map((event, index) => (
                <div
                  key={event.id}
                  className="flex gap-4 pb-4 border-b last:border-b-0"
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(event.status)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{getStatusLabel(event.status)}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(event.timestamp || event.event_timestamp || Date.now()), 'dd MMM yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.description && (
                      <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Dirección de envío */}
        {shipment.shipping_address && (
          <div>
            <p className="font-semibold mb-2">Dirección de Envío</p>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{shipment.shipping_address.street}</p>
              <p>
                {shipment.shipping_address.city}, {shipment.shipping_address.department}
              </p>
              {shipment.shipping_address.postal_code && (
                <p>CP: {shipment.shipping_address.postal_code}</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

