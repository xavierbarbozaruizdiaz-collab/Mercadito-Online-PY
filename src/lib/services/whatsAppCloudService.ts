// ============================================
// WHATSAPP CLOUD API SERVICE
// Servicio para enviar mensajes automáticos vía WhatsApp Cloud API
// ============================================

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template' | 'image' | 'document';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components?: Array<{
      type: string;
      parameters?: Array<{
        type: string;
        text?: string;
      }>;
    }>;
  };
  image?: {
    link?: string;
    id?: string;
    caption?: string;
  };
  document?: {
    link?: string;
    id?: string;
    caption?: string;
    filename?: string;
  };
}

interface WhatsAppResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

class WhatsAppCloudService {
  private phoneNumberId: string | null = null;
  private accessToken: string | null = null;
  private businessAccountId: string | null = null;
  private apiVersion: string = 'v21.0';
  private baseUrl: string = 'https://graph.facebook.com';

  /**
   * Inicializa el servicio con credenciales
   */
  initialize(config: {
    phoneNumberId: string;
    accessToken: string;
    businessAccountId?: string;
    apiVersion?: string;
  }): void {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.businessAccountId = config.businessAccountId || null;
    this.apiVersion = config.apiVersion || 'v21.0';
  }

  /**
   * Verifica si el servicio está configurado
   */
  isConfigured(): boolean {
    return !!(this.phoneNumberId && this.accessToken);
  }

  /**
   * Envía un mensaje de texto
   */
  async sendTextMessage(to: string, message: string): Promise<WhatsAppResponse | null> {
    if (!this.isConfigured()) {
      console.warn('WhatsApp Cloud API no está configurado');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: this.formatPhoneNumber(to),
            type: 'text',
            text: {
              body: message,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error enviando mensaje WhatsApp:', error);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error en WhatsApp Cloud API:', error);
      return null;
    }
  }

  /**
   * Envía un mensaje usando plantilla
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'es',
    parameters?: string[]
  ): Promise<WhatsAppResponse | null> {
    if (!this.isConfigured()) {
      console.warn('WhatsApp Cloud API no está configurado');
      return null;
    }

    try {
      const messageData: WhatsAppMessage = {
        to: this.formatPhoneNumber(to),
        type: 'template',
        template: {
          name: templateName,
          language: {
            code: languageCode,
          },
        },
      };

      if (parameters && parameters.length > 0) {
        messageData.template!.components = [
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param,
            })),
          },
        ];
      }

      const response = await fetch(
        `${this.baseUrl}/${this.apiVersion}/${this.phoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            ...messageData,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('Error enviando plantilla WhatsApp:', error);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('Error en WhatsApp Cloud API:', error);
      return null;
    }
  }

  /**
   * Envía confirmación de pedido
   */
  async sendOrderConfirmation(
    phone: string,
    orderNumber: string,
    orderDetails: {
      items: Array<{ name: string; quantity: number }>;
      total: number;
    }
  ): Promise<boolean> {
    const itemsText = orderDetails.items
      .map(item => `${item.quantity}x ${item.name}`)
      .join('\n');

    const message = `✅ *Confirmación de Pedido #${orderNumber}*\n\n` +
      `Gracias por tu compra en Mercadito Online PY!\n\n` +
      `*Productos:*\n${itemsText}\n\n` +
      `*Total:* ${orderDetails.total.toLocaleString('es-PY')} Gs.\n\n` +
      `Tu pedido está siendo procesado. Te notificaremos cuando sea enviado.`;

    const result = await this.sendTextMessage(phone, message);
    return result !== null;
  }

  /**
   * Envía notificación de pedido enviado
   */
  async sendOrderShipped(
    phone: string,
    orderNumber: string,
    trackingNumber?: string
  ): Promise<boolean> {
    let message = `🚚 *Pedido Enviado #${orderNumber}*\n\n` +
      `Tu pedido ha sido enviado y está en camino.\n\n`;

    if (trackingNumber) {
      message += `*Número de seguimiento:* ${trackingNumber}\n\n`;
    }

    message += `Puedes seguir el estado de tu pedido en tu cuenta.`;

    const result = await this.sendTextMessage(phone, message);
    return result !== null;
  }

  /**
   * Envía notificación de subasta por terminar
   */
  async sendAuctionEnding(
    phone: string,
    auctionTitle: string,
    auctionId: string,
    timeRemaining: string
  ): Promise<boolean> {
    const message = `⏰ *Subasta por Terminar*\n\n` +
      `La subasta "${auctionTitle}" termina en ${timeRemaining}.\n\n` +
      `No pierdas tu oportunidad! Ver subasta: ${process.env.NEXT_PUBLIC_APP_URL || ''}/auctions/${auctionId}`;

    const result = await this.sendTextMessage(phone, message);
    return result !== null;
  }

  /**
   * Envía notificación de ganador de sorteo
   */
  async sendRaffleWinner(
    phone: string,
    raffleTitle: string,
    prize: string
  ): Promise<boolean> {
    const message = `🎉 *¡FELICITACIONES!*\n\n` +
      `Has ganado el sorteo: "${raffleTitle}"\n\n` +
      `*Premio:* ${prize}\n\n` +
      `Por favor, contacta a nuestro equipo para reclamar tu premio.`;

    const result = await this.sendTextMessage(phone, message);
    return result !== null;
  }

  /**
   * Formatea número de teléfono para WhatsApp
   */
  private formatPhoneNumber(phone: string): string {
    // Eliminar espacios, guiones, paréntesis
    let formatted = phone.replace(/[\s\-\(\)]/g, '');

    // Si empieza con +, quitarlo
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }

    // Si empieza con 0, reemplazar con código de país (595 para Paraguay)
    if (formatted.startsWith('0')) {
      formatted = '595' + formatted.substring(1);
    }

    // Si no empieza con código de país, agregar 595
    if (!formatted.startsWith('595')) {
      formatted = '595' + formatted;
    }

    return formatted;
  }

  /**
   * Verifica webhook (requerido por Meta)
   */
  async verifyWebhook(
    mode: string,
    token: string,
    challenge: string,
    verifyToken: string
  ): Promise<string | null> {
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    return null;
  }
}

// Exportar instancia singleton
export const whatsAppCloud = new WhatsAppCloudService();

// Inicializar si hay variables de entorno
if (typeof window === 'undefined' && process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID && process.env.WHATSAPP_CLOUD_API_TOKEN) {
  whatsAppCloud.initialize({
    phoneNumberId: process.env.WHATSAPP_CLOUD_PHONE_NUMBER_ID,
    accessToken: process.env.WHATSAPP_CLOUD_API_TOKEN,
    businessAccountId: process.env.WHATSAPP_CLOUD_BUSINESS_ACCOUNT_ID || undefined,
  });
}

