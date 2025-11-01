import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import type { Database } from '@/types/database';

/**
 * API Route para enviar notificaciones de WhatsApp a vendedores cuando reciben un pedido
 * POST /api/whatsapp/notify-seller
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sellerId, orderId, orderData, buyerPhone, buyerName } = body;

    if (!sellerId || !orderId) {
      return NextResponse.json(
        { error: 'sellerId y orderId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener información del vendedor (teléfono y nombre)
    const { data: sellerProfile, error: sellerError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, phone, email')
      .eq('id', sellerId)
      .single();

    if (sellerError || !sellerProfile) {
      console.error('Error obteniendo perfil del vendedor:', sellerError);
      return NextResponse.json(
        { error: 'No se pudo obtener información del vendedor' },
        { status: 404 }
      );
    }

    const sellerPhone = (sellerProfile as any).phone;
    if (!sellerPhone) {
      console.warn('⚠️ El vendedor no tiene teléfono registrado:', sellerId);
      return NextResponse.json(
        { error: 'El vendedor no tiene teléfono registrado', skipped: true },
        { status: 200 }
      );
    }

    // Obtener detalles del pedido
    const { data: orderDetails } = await supabase
      .from('orders')
      .select(`
        id,
        total_amount,
        status,
        order_items (
          quantity,
          unit_price,
          total_price,
          product:products (
            title
          )
        )
      `)
      .eq('id', orderId)
      .single();

    if (!orderDetails) {
      return NextResponse.json(
        { error: 'No se pudo obtener información del pedido' },
        { status: 404 }
      );
    }

    // Construir mensaje
    type Profile = Database['public']['Tables']['profiles']['Row'];
    type OrderItemWithProduct = {
      quantity: number;
      total_price: number;
      product: { title: string };
    };
    type OrderWithItems = Database['public']['Tables']['orders']['Row'] & {
      order_items: OrderItemWithProduct[];
    };

    const sellerProfileTyped = sellerProfile as Profile | null;
    const orderDetailsTyped = orderDetails as OrderWithItems | null;

    const sellerName = `${sellerProfileTyped?.first_name || ''} ${sellerProfileTyped?.last_name || ''}`.trim() || 'Vendedor';
    const orderItems = (orderDetailsTyped?.order_items || [])
      .map((item) => `• ${item.product.title} x${item.quantity} - ${item.total_price.toLocaleString('es-PY')} Gs.`)
      .join('\n');

    const message = `🛍️ *Nuevo Pedido Recibido*

¡Hola ${sellerName}!

Has recibido un nuevo pedido:

*Pedido #${orderId.slice(0, 8)}*
Total: ${(orderDetailsTyped?.total_amount || 0).toLocaleString('es-PY')} Gs.

*Productos:*
${orderItems}

*Cliente:*
${buyerName}
Tel: ${buyerPhone}

*Estado:* Pendiente

Puedes ver y gestionar este pedido desde tu panel de vendedor.

¡Gracias por usar Mercadito Online PY! 🎉`;

    // Limpiar teléfono (remover espacios, guiones, etc.)
    const cleanPhone = sellerPhone.replace(/[\s\-\(\)]/g, '');
    // Asegurar formato internacional (Paraguay: +595)
    let formattedPhone = cleanPhone;
    if (!formattedPhone.startsWith('+')) {
      if (formattedPhone.startsWith('595')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.startsWith('0')) {
        formattedPhone = '+595' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+595' + formattedPhone;
      }
    }

    // Codificar mensaje para URL
    const encodedMessage = encodeURIComponent(message);

    // Crear URL de WhatsApp
    // Opción 1: URL directa de WhatsApp (abre la app/web)
    const whatsappUrl = `https://wa.me/${formattedPhone.replace('+', '')}?text=${encodedMessage}`;

    // Opción 2: Usar API externa si está configurada (ej: Twilio, ChatAPI, etc.)
    // Por ahora usamos la URL directa, pero puedes agregar integración con API aquí
    const useWhatsAppAPI = process.env.WHATSAPP_API_ENABLED === 'true';
    
    if (useWhatsAppAPI && process.env.WHATSAPP_API_KEY) {
      // Aquí puedes integrar con una API de WhatsApp como Twilio, ChatAPI, etc.
      // Ejemplo con fetch a API externa:
      try {
        const apiResponse = await fetch(process.env.WHATSAPP_API_URL || '', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: formattedPhone,
            message: message,
            type: 'text',
          }),
        });

        if (apiResponse.ok) {
          console.log('✅ Mensaje WhatsApp enviado vía API:', formattedPhone);
          return NextResponse.json({ 
            success: true, 
            method: 'api',
            phone: formattedPhone 
          });
        }
      } catch (apiError) {
        console.error('Error enviando por API, usando URL directa:', apiError);
      }
    }

    // Guardar notificación en la base de datos (opcional)
    try {
      await supabase
        .from('notifications')
        .insert({
          user_id: sellerId,
          type: 'order_received',
          title: 'Nuevo Pedido',
          message: `Pedido #${orderId.slice(0, 8)} de ${buyerName}`,
          metadata: {
            order_id: orderId,
            buyer_name: buyerName,
            buyer_phone: buyerPhone,
            whatsapp_url: whatsappUrl,
          },
          read: false,
        });
    } catch (notifError) {
      console.warn('No se pudo guardar notificación en BD (tabla puede no existir):', notifError);
    }

    console.log('📱 URL de WhatsApp generada:', whatsappUrl);

    // Intentar abrir WhatsApp automáticamente usando la URL (opcional)
    // Si tienes una API de WhatsApp configurada (Twilio, ChatAPI, etc.), úsala aquí
    
    // Por defecto, retornamos la URL que el sistema puede usar para notificar
    // En producción, puedes configurar un servicio que realmente envíe el mensaje
    
    return NextResponse.json({ 
      success: true, 
      method: 'url',
      whatsapp_url: whatsappUrl,
      phone: formattedPhone,
      seller_name: sellerName,
      order_id: orderId,
      message: 'Notificación preparada. Configura WhatsApp API para envío automático en producción.',
    });

  } catch (error: any) {
    console.error('❌ Error en notificación WhatsApp:', error);
    return NextResponse.json(
      { error: error.message || 'Error al enviar notificación' },
      { status: 500 }
    );
  }
}

