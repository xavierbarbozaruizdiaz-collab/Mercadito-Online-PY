// src/lib/services/emailService.ts
// Servicio de email usando Resend con templates profesionales

import { Resend } from 'resend';
import { getBaseEmailTemplate } from '@/lib/templates/email/baseTemplate';
import { getOrderConfirmationTemplate, type OrderConfirmationData } from '@/lib/templates/email/orderConfirmation';

// Cliente Resend lazy para evitar errores en build cuando falta la API key
let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  bcc?: string | string[];
  replyTo?: string;
}

export class EmailService {
  private static defaultFrom = process.env.RESEND_FROM_EMAIL || 'noreply@mercadito-online-py.com';

  /**
   * Envía un email genérico
   */
  static async sendEmail(options: EmailOptions): Promise<{ id: string } | null> {
    const client = getResendClient();

    if (!client) {
      // Warnings se mantienen para debugging de configuración
      console.warn('RESEND_API_KEY no configurada. Email no enviado:', options.to);
      return null;
    }

    try {
      const { data, error } = await client.emails.send({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        replyTo: options.replyTo,
      });

      if (error) {
        // Errores se mantienen para debugging
        console.error('Error enviando email:', error);
        return null;
      }

      return { id: data?.id || '' };
    } catch (error) {
      // Errores se mantienen para debugging
      console.error('Error en emailService:', error);
      return null;
    }
  }

  /**
   * Envía confirmación de pedido con template mejorado
   */
  static async sendOrderConfirmation(
    email: string,
    orderNumber: string,
    orderDetails: {
      items: Array<{ name: string; quantity: number; price: number; imageUrl?: string }>;
      total: number;
      subtotal?: number;
      shipping?: number;
      tax?: number;
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
  ): Promise<boolean> {
    const orderData: OrderConfirmationData = {
      orderNumber,
      orderDate: new Date().toLocaleDateString('es-PY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      items: orderDetails.items,
      subtotal: orderDetails.subtotal || orderDetails.total,
      shipping: orderDetails.shipping,
      tax: orderDetails.tax,
      total: orderDetails.total,
      shippingAddress: orderDetails.shippingAddress,
      trackingNumber: orderDetails.trackingNumber,
      estimatedDelivery: orderDetails.estimatedDelivery,
    };

    const html = getOrderConfirmationTemplate(orderData);

    const result = await this.sendEmail({
      to: email,
      subject: `Confirmación de Pedido #${orderNumber}`,
      html,
    });

    return result !== null;
  }

  /**
   * Envía email de bienvenida con template mejorado
   */
  static async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0;">¡Gracias por unirte a Mercadito Online PY!</p>
      <p style="margin: 0 0 20px 0;">Estamos emocionados de tenerte como parte de nuestra comunidad. Ahora puedes:</p>
      <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;">🛍️ Comprar productos de cientos de vendedores</li>
        <li style="margin-bottom: 8px;">🏪 Crear tu propia tienda y comenzar a vender</li>
        <li style="margin-bottom: 8px;">💬 Chatear directamente con vendedores</li>
        <li style="margin-bottom: 8px;">⭐ Dejar reseñas y calificaciones</li>
        <li style="margin-bottom: 8px;">🎟️ Participar en sorteos y ganar premios</li>
      </ul>
      <p style="margin: 20px 0 0 0;">Si tienes alguna pregunta, estamos aquí para ayudarte.</p>
      <p style="margin: 10px 0 0 0;">¡Que disfrutes de tu experiencia de compra!</p>
    `;

    const html = getBaseEmailTemplate({
      title: `¡Bienvenido${userName ? `, ${userName}` : ''}!`,
      content,
      buttonText: 'Explorar Productos',
      buttonUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      footerText: 'Mercadito Online PY - El mejor marketplace de Paraguay',
    });

    const result = await this.sendEmail({
      to: email,
      subject: '¡Bienvenido a Mercadito Online PY!',
      html,
    });

    return result !== null;
  }

  /**
   * Envía email de recuperación de contraseña con template mejorado
   */
  static async sendPasswordReset(email: string, resetLink: string): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0;">Recibimos una solicitud para restablecer tu contraseña en Mercadito Online PY.</p>
      <p style="margin: 0 0 20px 0;">Haz clic en el botón a continuación para crear una nueva contraseña:</p>
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #991b1b;">⚠️ Importante:</p>
        <ul style="margin: 0; padding-left: 20px; color: #991b1b; font-size: 14px;">
          <li style="margin-bottom: 4px;">Este link expirará en 1 hora</li>
          <li style="margin-bottom: 4px;">Si no solicitaste este cambio, ignora este email</li>
          <li>Nunca compartas este link con nadie</li>
        </ul>
      </div>
      <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este email de forma segura.</p>
    `;

    const html = getBaseEmailTemplate({
      title: 'Restablecer Contraseña',
      content,
      buttonText: 'Restablecer Contraseña',
      buttonUrl: resetLink,
      footerText: 'Mercadito Online PY - El mejor marketplace de Paraguay',
    });

    const result = await this.sendEmail({
      to: email,
      subject: 'Restablecer Contraseña - Mercadito Online PY',
      html,
    });

    return result !== null;
  }

  /**
   * Envía notificación de nuevo mensaje con template mejorado
   */
  static async sendNewMessageNotification(
    email: string,
    senderName: string,
    messagePreview: string,
    conversationLink: string
  ): Promise<boolean> {
    const content = `
      <p style="margin: 0 0 20px 0;"><strong>${senderName}</strong> te ha enviado un mensaje:</p>
      <div style="background-color: #ffffff; padding: 20px; border-left: 4px solid #3b82f6; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0; font-style: italic; color: #374151;">"${messagePreview}"</p>
      </div>
      <p style="margin: 20px 0 0 0;">Responde al mensaje para continuar la conversación.</p>
    `;

    const html = getBaseEmailTemplate({
      title: '💬 Nuevo Mensaje',
      content,
      buttonText: 'Ver Conversación',
      buttonUrl: conversationLink,
      footerText: 'Mercadito Online PY - El mejor marketplace de Paraguay',
    });

    const result = await this.sendEmail({
      to: email,
      subject: `Nuevo mensaje de ${senderName}`,
      html,
    });

    return result !== null;
  }

  /**
   * Envía notificación masiva por email
   */
  static async sendBulkNotificationEmail(
    recipients: Array<{ email: string; name?: string }>,
    notification: {
      title: string;
      message: string;
      type: 'promotion' | 'system' | 'announcement' | 'urgent';
      action_url?: string;
    }
  ): Promise<{ sent: number; failed: number }> {
    const client = getResendClient();
    if (!client) {
      console.warn('RESEND_API_KEY no configurada. Emails no enviados.');
      return { sent: 0, failed: recipients.length };
    }

    let sent = 0;
    let failed = 0;

    // Enviar en lotes de 50 (límite de Resend)
    const batchSize = 50;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const emails = batch.map((recipient) => ({
        to: recipient.email,
        subject: notification.title,
        html: this.getNotificationEmailTemplate(recipient.name || 'Usuario', notification),
      }));

      try {
        // Resend permite enviar múltiples emails en una sola llamada
        const promises = emails.map((email) =>
          client.emails.send({
            from: this.defaultFrom,
            to: email.to,
            subject: email.subject,
            html: email.html,
          })
        );

        const results = await Promise.allSettled(promises);

        results.forEach((result) => {
          if (result.status === 'fulfilled' && result.value.data) {
            sent++;
          } else {
            failed++;
            console.error('Error sending email:', result.status === 'rejected' ? result.reason : result.value.error);
          }
        });
      } catch (error) {
        console.error('Error en batch de emails:', error);
        failed += batch.length;
      }
    }

    return { sent, failed };
  }

  /**
   * Envía email al ganador de un sorteo
   */
  static async sendRaffleWinnerEmail(
    email: string,
    winnerName: string,
    raffleTitle: string,
    raffleDetails: {
      prize?: string;
      productName?: string;
      drawDate: string;
      raffleId: string;
    }
  ): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const raffleUrl = `${appUrl}/raffles/${raffleDetails.raffleId}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 28px; }
            .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; }
            .winner-box { background: white; padding: 25px; border: 3px solid #10b981; border-radius: 8px; margin: 20px 0; text-align: center; }
            .winner-box h2 { color: #10b981; margin: 0 0 10px 0; font-size: 24px; }
            .prize-info { background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
            .button { display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .button:hover { background: #059669; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡FELICITACIONES! 🎉</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Has ganado un sorteo</p>
            </div>
            <div class="content">
              <p>Hola <strong>${winnerName}</strong>,</p>
              <p>¡Tenemos excelentes noticias para ti!</p>
              
              <div class="winner-box">
                <h2>🎊 ¡ERES EL GANADOR! 🎊</h2>
                <p style="font-size: 18px; margin: 10px 0;"><strong>${raffleTitle}</strong></p>
              </div>

              <div class="prize-info">
                <h3 style="margin-top: 0; color: #059669;">Premio:</h3>
                ${raffleDetails.productName ? `<p style="font-size: 18px; font-weight: bold; margin: 10px 0;">${raffleDetails.productName}</p>` : ''}
                ${raffleDetails.prize ? `<p style="font-size: 18px; font-weight: bold; margin: 10px 0;">${raffleDetails.prize}</p>` : ''}
                <p style="margin: 10px 0; color: #6b7280;">Fecha del sorteo: ${new Date(raffleDetails.drawDate).toLocaleDateString('es-PY', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</p>
              </div>

              <p>Para reclamar tu premio, por favor:</p>
              <ol style="text-align: left; max-width: 500px; margin: 20px auto;">
                <li>Visita tu perfil en Mercadito Online PY</li>
                <li>Revisa la sección "Sorteos Ganados"</li>
                <li>Contacta al administrador o vendedor según corresponda</li>
              </ol>

              <div style="text-align: center;">
                <a href="${raffleUrl}" class="button">Ver Detalles del Sorteo</a>
              </div>

              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                <strong>Nota importante:</strong> Tienes 30 días para reclamar tu premio. 
                Si no lo reclamas en ese tiempo, el premio será sorteado nuevamente.
              </p>
            </div>
            <div class="footer">
              <p><strong>Mercadito Online PY</strong></p>
              <p>El mejor marketplace de Paraguay</p>
              <p style="margin-top: 15px; color: #9ca3af;">Este es un email automático, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: `🎉 ¡Felicidades! Ganaste: ${raffleTitle}`,
      html,
    });

    return result !== null;
  }

  /**
   * Genera el template HTML para notificaciones masivas
   */
  private static getNotificationEmailTemplate(
    userName: string,
    notification: {
      title: string;
      message: string;
      type: 'promotion' | 'system' | 'announcement' | 'urgent';
      action_url?: string;
    }
  ): string {
    const typeColors = {
      promotion: '#10b981',
      system: '#3b82f6',
      announcement: '#8b5cf6',
      urgent: '#dc2626',
    };

    const typeIcons = {
      promotion: '🎉',
      system: '⚙️',
      announcement: '📢',
      urgent: '🚨',
    };

    const color = typeColors[notification.type];
    const icon = typeIcons[notification.type];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${color}; color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: #f9fafb; padding: 30px 20px; border: 1px solid #e5e7eb; }
            .message-box { background: white; padding: 20px; border-left: 4px solid ${color}; margin: 20px 0; border-radius: 4px; }
            .button { display: inline-block; padding: 12px 24px; background: ${color}; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
            .button:hover { opacity: 0.9; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; }
            .unsubscribe { text-align: center; margin-top: 20px; font-size: 11px; color: #9ca3af; }
            .unsubscribe a { color: #9ca3af; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${icon} ${notification.title}</h1>
            </div>
            <div class="content">
              <p>Hola ${userName},</p>
              <div class="message-box">
                ${notification.message.split('\n').map((line) => `<p>${line}</p>`).join('')}
              </div>
              ${notification.action_url ? `
                <div style="text-align: center;">
                  <a href="${notification.action_url}" class="button">Ver más información</a>
                </div>
              ` : ''}
              <p>Gracias por ser parte de Mercadito Online PY.</p>
            </div>
            <div class="footer">
              <p><strong>Mercadito Online PY</strong></p>
              <p>El mejor marketplace de Paraguay</p>
              <div class="unsubscribe">
                <p>Puedes desactivar estas notificaciones en tu <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/notifications">configuración de cuenta</a></p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;
  }
}

