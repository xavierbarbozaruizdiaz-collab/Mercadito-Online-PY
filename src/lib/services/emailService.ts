// src/lib/services/emailService.ts
// Servicio de email usando Resend

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada. Email no enviado:', options.to);
      return null;
    }

    try {
      const { data, error } = await resend.emails.send({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
        replyTo: options.replyTo,
      });

      if (error) {
        console.error('Error enviando email:', error);
        return null;
      }

      return { id: data?.id || '' };
    } catch (error) {
      console.error('Error en emailService:', error);
      return null;
    }
  }

  /**
   * Envía confirmación de pedido
   */
  static async sendOrderConfirmation(
    email: string,
    orderNumber: string,
    orderDetails: {
      items: Array<{ name: string; quantity: number; price: number }>;
      total: number;
      shippingAddress: any;
    }
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .order-info { background: white; padding: 15px; margin: 15px 0; border-radius: 8px; }
            .item { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .total { font-size: 18px; font-weight: bold; margin-top: 15px; padding-top: 15px; border-top: 2px solid #3b82f6; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🛒 Confirmación de Pedido</h1>
              <p>¡Gracias por tu compra!</p>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Tu pedido ha sido confirmado. Aquí están los detalles:</p>
              
              <div class="order-info">
                <h3>Pedido #${orderNumber}</h3>
                <p><strong>Fecha:</strong> ${new Date().toLocaleDateString('es-PY')}</p>
              </div>

              <h3>Productos:</h3>
              ${orderDetails.items.map(item => `
                <div class="item">
                  <strong>${item.name}</strong><br>
                  Cantidad: ${item.quantity} | Precio: ${item.price.toLocaleString('es-PY')} Gs.
                </div>
              `).join('')}

              <div class="total">
                Total: ${orderDetails.total.toLocaleString('es-PY')} Gs.
              </div>

              <div class="order-info">
                <h3>Dirección de Envío:</h3>
                <p>${JSON.stringify(orderDetails.shippingAddress)}</p>
              </div>

              <p>Te notificaremos cuando tu pedido sea enviado.</p>
              
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
            <div class="footer">
              <p>Mercadito Online PY - El mejor marketplace de Paraguay</p>
              <p>Este es un email automático, por favor no responder.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: `Confirmación de Pedido #${orderNumber}`,
      html,
    });

    return result !== null;
  }

  /**
   * Envía email de bienvenida
   */
  static async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 ¡Bienvenido a Mercadito Online PY!</h1>
            </div>
            <div class="content">
              <p>Hola ${userName},</p>
              <p>¡Gracias por unirte a Mercadito Online PY!</p>
              <p>Estamos emocionados de tenerte como parte de nuestra comunidad. Ahora puedes:</p>
              <ul>
                <li>🛍️ Comprar productos de cientos de vendedores</li>
                <li>🏪 Crear tu propia tienda y comenzar a vender</li>
                <li>💬 Chatear directamente con vendedores</li>
                <li>⭐ Dejar reseñas y calificaciones</li>
              </ul>
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" class="button">Explorar Productos</a>
              <p>Si tienes alguna pregunta, estamos aquí para ayudarte.</p>
              <p>¡Que disfrutes de tu experiencia de compra!</p>
            </div>
            <div class="footer">
              <p>Mercadito Online PY - El mejor marketplace de Paraguay</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: '¡Bienvenido a Mercadito Online PY!',
      html,
    });

    return result !== null;
  }

  /**
   * Envía email de recuperación de contraseña (requiere token)
   */
  static async sendPasswordReset(email: string, resetLink: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Restablecer Contraseña</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p>Recibimos una solicitud para restablecer tu contraseña en Mercadito Online PY.</p>
              <p>Haz clic en el botón a continuación para crear una nueva contraseña:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Restablecer Contraseña</a>
              </div>
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este link expirará en 1 hora</li>
                  <li>Si no solicitaste este cambio, ignora este email</li>
                  <li>Nunca compartas este link con nadie</li>
                </ul>
              </div>
            </div>
            <div class="footer">
              <p>Mercadito Online PY</p>
              <p>Si no solicitaste este cambio, puedes ignorar este email de forma segura.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await this.sendEmail({
      to: email,
      subject: 'Restablecer Contraseña - Mercadito Online PY',
      html,
    });

    return result !== null;
  }

  /**
   * Envía notificación de nuevo mensaje
   */
  static async sendNewMessageNotification(
    email: string,
    senderName: string,
    messagePreview: string,
    conversationLink: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
            .message-box { background: white; padding: 15px; border-left: 4px solid #3b82f6; margin: 15px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 Nuevo Mensaje</h1>
            </div>
            <div class="content">
              <p>Hola,</p>
              <p><strong>${senderName}</strong> te ha enviado un mensaje:</p>
              <div class="message-box">
                <p>"${messagePreview}"</p>
              </div>
              <div style="text-align: center;">
                <a href="${conversationLink}" class="button">Ver Conversación</a>
              </div>
            </div>
            <div class="footer">
              <p>Mercadito Online PY</p>
            </div>
          </div>
        </body>
      </html>
    `;

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
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada. Emails no enviados.');
      return { sent: 0, failed: recipients.length };
    }

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
          resend.emails.send({
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

