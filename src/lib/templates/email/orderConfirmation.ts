// ============================================
// ORDER CONFIRMATION EMAIL TEMPLATE
// Template para confirmación de pedido
// ============================================

import { getBaseEmailTemplate } from './baseTemplate';

export interface OrderConfirmationData {
  orderNumber: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    imageUrl?: string;
  }>;
  subtotal: number;
  shipping?: number;
  tax?: number;
  total: number;
  shippingAddress: {
    name: string;
    address: string;
    city?: string;
    department?: string;
    phone?: string;
  };
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export function getOrderConfirmationTemplate(data: OrderConfirmationData): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            ${item.imageUrl ? `
              <td style="width: 60px; padding-right: 12px; vertical-align: top;">
                <img src="${item.imageUrl}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px;">
              </td>
            ` : ''}
            <td style="vertical-align: top;">
              <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #111827;">${item.name}</p>
              <p style="margin: 0; font-size: 14px; color: #6b7280;">Cantidad: ${item.quantity}</p>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${item.price.toLocaleString('es-PY')} Gs.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');

  const totalsHtml = `
    <tr>
      <td style="padding: 8px 0; font-size: 14px; color: #374151;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td>Subtotal:</td>
            <td style="text-align: right; font-weight: 600;">${data.subtotal.toLocaleString('es-PY')} Gs.</td>
          </tr>
          ${data.shipping ? `
            <tr>
              <td>Envío:</td>
              <td style="text-align: right; font-weight: 600;">${data.shipping.toLocaleString('es-PY')} Gs.</td>
            </tr>
          ` : ''}
          ${data.tax ? `
            <tr>
              <td>Impuestos:</td>
              <td style="text-align: right; font-weight: 600;">${data.tax.toLocaleString('es-PY')} Gs.</td>
            </tr>
          ` : ''}
          <tr>
            <td style="padding-top: 12px; border-top: 2px solid #3b82f6; font-size: 18px; font-weight: 700; color: #111827;">Total:</td>
            <td style="padding-top: 12px; border-top: 2px solid #3b82f6; text-align: right; font-size: 18px; font-weight: 700; color: #111827;">${data.total.toLocaleString('es-PY')} Gs.</td>
          </tr>
        </table>
      </td>
    </tr>
  `;

  const shippingHtml = `
    <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #111827;">Dirección de Envío</h3>
      <p style="margin: 0 0 4px 0; font-size: 14px; color: #374151; line-height: 1.6;">
        <strong>${data.shippingAddress.name}</strong><br>
        ${data.shippingAddress.address}<br>
        ${data.shippingAddress.city ? `${data.shippingAddress.city}, ` : ''}${data.shippingAddress.department || ''}<br>
        ${data.shippingAddress.phone ? `Tel: ${data.shippingAddress.phone}` : ''}
      </p>
    </div>
  `;

  const trackingHtml = data.trackingNumber ? `
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e40af;">Número de Seguimiento</p>
      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1e40af; font-family: monospace;">${data.trackingNumber}</p>
      ${data.estimatedDelivery ? `
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #1e40af;">Entrega estimada: ${data.estimatedDelivery}</p>
      ` : ''}
    </div>
  ` : '';

  const content = `
    <p style="margin: 0 0 20px 0;">¡Gracias por tu compra! Tu pedido ha sido confirmado y está siendo procesado.</p>
    
    <div style="background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #111827;">Pedido #${data.orderNumber}</h2>
      <p style="margin: 0 0 20px 0; font-size: 14px; color: #6b7280;">Fecha: ${data.orderDate}</p>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 20px;">
        ${itemsHtml}
      </table>
      
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        ${totalsHtml}
      </table>
    </div>
    
    ${shippingHtml}
    ${trackingHtml}
    
    <p style="margin: 20px 0 0 0;">Te notificaremos cuando tu pedido sea enviado. Si tienes alguna pregunta, no dudes en contactarnos.</p>
  `;

  return getBaseEmailTemplate({
    title: `Confirmación de Pedido #${data.orderNumber}`,
    content,
    buttonText: 'Ver Detalles del Pedido',
    buttonUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://mercadito-online-py.vercel.app'}/dashboard/orders`,
    footerText: 'Mercadito Online PY - El mejor marketplace de Paraguay',
  });
}

