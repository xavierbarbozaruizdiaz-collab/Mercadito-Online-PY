'use client';

// ============================================
// MERCADITO ONLINE PY - COMPONENTE DE IMPRESIÓN DE ÓRDENES
// Vista optimizada para impresión de órdenes de compra
// ============================================

import React from 'react';
import { formatCurrency, formatDate } from '@/lib/utils';
import Image from 'next/image';
import { Package, User, MapPin, Phone, Mail, Calendar, DollarSign, FileText } from 'lucide-react';

type OrderItem = {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product: {
    id: string;
    title: string;
    cover_url: string | null;
  };
};

type Order = {
  id: string;
  status: string;
  total_amount: number;
  created_at: string;
  shipping_address: any;
  payment_method: string;
  notes: string | null;
  order_items: OrderItem[];
  buyer: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
  } | null;
};

type Store = {
  id: string;
  name: string;
  location?: string;
  contact_phone?: string;
  contact_email?: string;
  logo_url?: string | null;
};

interface OrderPrintViewProps {
  order: Order;
  store: Store | null;
  onClose: () => void;
}

export default function OrderPrintView({ order, store, onClose }: OrderPrintViewProps) {
  const orderTotal = order.order_items.reduce((sum, item) => sum + item.total_price, 0);
  const orderDate = new Date(order.created_at);

  // Función para imprimir
  const handlePrint = () => {
    window.print();
  };

  // Calcular subtotales
  const subtotal = orderTotal;
  const shipping = 0;
  const total = subtotal + shipping;

  return (
    <>
      {/* Estilos optimizados para impresión */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 8mm 10mm;
          }
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            background: white;
            font-size: 10px;
            line-height: 1.3;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            page-break-inside: avoid;
            margin-bottom: 6px;
            break-inside: avoid;
          }
          .print-table {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .print-header {
            page-break-after: avoid;
            break-after: avoid;
          }
          .print-footer {
            page-break-before: avoid;
            break-before: avoid;
          }
          /* Evitar páginas vacías */
          .print-container > div:empty {
            display: none;
          }
          /* Optimizar espacios */
          h1, h2, h3, h4, h5, h6 {
            margin-top: 0;
            margin-bottom: 4px;
          }
          p {
            margin: 2px 0;
          }
        }
        @media screen {
          .print-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            z-index: 50;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .print-container {
            background: white;
            border-radius: 8px;
            max-width: 210mm;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
            padding: 20px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          }
        }
      `}</style>

      {/* Overlay para vista previa */}
      <div className="print-overlay" onClick={onClose}>
        <div className="print-container" onClick={(e) => e.stopPropagation()}>
          {/* Botones de acción (no se imprimen) */}
          <div className="no-print flex justify-end gap-3 mb-4">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Imprimir
            </button>
          </div>

          {/* Contenido de la orden - OPTIMIZADO */}
          <div className="space-y-2">
            {/* Encabezado compacto */}
            <div className="print-header print-section border-b border-gray-900 pb-1.5">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-bold text-gray-900 mb-0.5">ORDEN DE COMPRA</h1>
                  <p className="text-xs text-gray-600">Mercadito Online PY</p>
                </div>
                {store?.logo_url && (
                  <div className="relative w-12 h-12">
                    <Image
                      src={store.logo_url}
                      alt={store.name}
                      fill
                      className="object-contain"
                      sizes="48px"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Información principal en 2 columnas */}
            <div className="print-section grid grid-cols-2 gap-3">
              {/* Columna izquierda: Tienda y Orden */}
              <div className="space-y-1.5">
                {store && (
                  <div className="bg-gray-50 rounded p-1.5 border border-gray-200">
                    <h2 className="font-bold text-xs text-gray-900 mb-0.5">TIENDA</h2>
                    <p className="text-xs font-semibold text-gray-900 leading-tight">{store.name}</p>
                    {store.location && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5 leading-tight">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>{store.location}</span>
                      </p>
                    )}
                    {store.contact_phone && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5 leading-tight">
                        <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                        <span>{store.contact_phone}</span>
                      </p>
                    )}
                    {store.contact_email && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5 leading-tight">
                        <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                        <span className="break-all">{store.contact_email}</span>
                      </p>
                    )}
                  </div>
                )}
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">N° Orden:</p>
                  <p className="text-xs font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-700 mb-0.5">Fecha:</p>
                  <p className="text-xs text-gray-900 leading-tight">{formatDate(order.created_at)}</p>
                  <p className="text-xs text-gray-600">
                    {orderDate.toLocaleTimeString('es-PY', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Columna derecha: Cliente */}
              {order.buyer && (
                <div className="bg-blue-50 rounded p-1.5 border border-blue-200">
                  <h2 className="font-bold text-xs text-gray-900 mb-0.5 flex items-center gap-1">
                    <User className="w-2.5 h-2.5 flex-shrink-0" />
                    CLIENTE
                  </h2>
                  {(order.buyer.first_name || order.buyer.last_name) && (
                    <p className="text-xs font-semibold text-gray-900 leading-tight">
                      {`${order.buyer.first_name || ''} ${order.buyer.last_name || ''}`.trim()}
                    </p>
                  )}
                  <p className="text-xs text-gray-700 flex items-center gap-1 mt-0.5 leading-tight">
                    <Mail className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="break-all">{order.buyer.email}</span>
                  </p>
                  {order.buyer.phone && (
                    <p className="text-xs text-gray-700 flex items-center gap-1 mt-0.5 leading-tight">
                      <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{order.buyer.phone}</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Dirección de envío compacta */}
            {order.shipping_address && (
              <div className="print-section bg-gray-50 rounded p-1.5 border border-gray-200">
                <h2 className="font-bold text-xs text-gray-900 mb-0.5 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  DIRECCIÓN DE ENVÍO
                </h2>
                <div className="text-xs text-gray-700 space-y-0.5 leading-tight">
                  <p className="font-semibold">{order.shipping_address.fullName}</p>
                  <p>{order.shipping_address.address}</p>
                  {(order.shipping_address.city || order.shipping_address.department) && (
                    <p>
                      {[order.shipping_address.city, order.shipping_address.department]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  {order.shipping_address.zipCode && (
                    <p>C.P: {order.shipping_address.zipCode}</p>
                  )}
                  {order.shipping_address.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5 flex-shrink-0" />
                      <span>{order.shipping_address.phone}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tabla de productos optimizada */}
            <div className="print-section print-table">
              <h2 className="font-bold text-xs text-gray-900 mb-1 flex items-center gap-1">
                <Package className="w-3 h-3 flex-shrink-0" />
                PRODUCTOS
              </h2>
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-1.5 py-0.5 text-left font-semibold text-gray-900">
                      Producto
                    </th>
                    <th className="border border-gray-300 px-1.5 py-0.5 text-center font-semibold text-gray-900 w-12">
                      Cant.
                    </th>
                    <th className="border border-gray-300 px-1.5 py-0.5 text-right font-semibold text-gray-900 w-18">
                      P. Unit.
                    </th>
                    <th className="border border-gray-300 px-1.5 py-0.5 text-right font-semibold text-gray-900 w-20">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {order.order_items.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-1.5 py-1">
                        <div className="flex items-center gap-1.5">
                          {item.product.cover_url && (
                            <div className="relative w-6 h-6 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                              <Image
                                src={item.product.cover_url}
                                alt={item.product.title}
                                fill
                                className="object-cover"
                                sizes="24px"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 text-xs leading-tight">
                              {item.product.title}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1 text-center text-gray-700">
                        {item.quantity}
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right text-gray-700">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="border border-gray-300 px-1.5 py-1 text-right font-semibold text-gray-900">
                        {formatCurrency(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales y info adicional en 2 columnas */}
            <div className="print-section print-footer grid grid-cols-2 gap-3">
              {/* Totales */}
              <div className="space-y-0.5">
                <div className="flex justify-between text-xs text-gray-700 border-b border-gray-300 pb-0.5">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {shipping > 0 && (
                  <div className="flex justify-between text-xs text-gray-700 border-b border-gray-300 pb-0.5">
                    <span>Envío:</span>
                    <span className="font-semibold">{formatCurrency(shipping)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-gray-900 pt-0.5 border-t-2 border-gray-900">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Método de pago y estado */}
              <div className="space-y-1">
                <div>
                  <p className="text-xs font-semibold text-gray-900 mb-0.5">Método de Pago:</p>
                  <p className="text-xs text-gray-700 leading-tight">
                    {order.payment_method === 'cash' && 'Efectivo contra entrega'}
                    {order.payment_method === 'transfer' && 'Transferencia bancaria'}
                    {order.payment_method === 'card' && 'Tarjeta de crédito/débito'}
                    {order.payment_method === 'pagopar' && 'Pagopar'}
                    {!['cash', 'transfer', 'card', 'pagopar'].includes(order.payment_method) && order.payment_method}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900 mb-0.5">Estado:</p>
                  <p className="text-xs text-gray-700 capitalize leading-tight">
                    {order.status === 'pending' && 'Pendiente'}
                    {order.status === 'confirmed' && 'Confirmado'}
                    {order.status === 'shipped' && 'Enviado'}
                    {order.status === 'delivered' && 'Entregado'}
                    {order.status === 'cancelled' && 'Cancelado'}
                    {!['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'].includes(order.status) && order.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Notas (si existen) */}
            {order.notes && (
              <div className="print-section bg-yellow-50 rounded p-1.5 border border-yellow-200">
                <p className="text-xs font-semibold text-gray-900 mb-0.5">Notas del Cliente:</p>
                <p className="text-xs text-gray-700 whitespace-pre-wrap leading-tight">{order.notes}</p>
              </div>
            )}

            {/* Pie de página compacto */}
            <div className="print-footer border-t border-gray-300 pt-1 mt-1 text-center text-xs text-gray-500">
              <p>Generado el {new Date().toLocaleString('es-PY')} - Mercadito Online PY</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

