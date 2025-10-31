-- ============================================
-- Trigger para notificaciones de WhatsApp cuando se crea un pedido
-- ============================================

-- Esta migración crea un trigger que se ejecuta después de crear una orden
-- y prepara la información necesaria para notificar a los vendedores vía WhatsApp

-- Función para obtener información de vendedores cuando se crea un pedido
CREATE OR REPLACE FUNCTION notify_sellers_on_order()
RETURNS TRIGGER AS $$
DECLARE
  order_item RECORD;
  seller_record RECORD;
  seller_phones TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Iterar sobre los items de la orden para obtener sellers únicos
  FOR order_item IN
    SELECT DISTINCT oi.seller_id
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
  LOOP
    -- Obtener información del vendedor
    SELECT p.phone, p.first_name, p.last_name
    INTO seller_record
    FROM public.profiles p
    WHERE p.id = order_item.seller_id;
    
    -- Si el vendedor tiene teléfono, agregarlo a la lista
    IF seller_record.phone IS NOT NULL AND seller_record.phone != '' THEN
      seller_phones := array_append(seller_phones, order_item.seller_id::TEXT || ':' || seller_record.phone);
    END IF;
  END LOOP;
  
  -- La notificación real se envía desde el backend (Next.js API route)
  -- Este trigger solo prepara la información
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger (si no existe)
DROP TRIGGER IF EXISTS on_order_created_whatsapp ON public.orders;
CREATE TRIGGER on_order_created_whatsapp
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_sellers_on_order();

-- Comentarios
COMMENT ON FUNCTION notify_sellers_on_order() IS 'Prepara información para notificaciones de WhatsApp cuando se crea un pedido';
COMMENT ON TRIGGER on_order_created_whatsapp ON public.orders IS 'Se ejecuta después de crear una orden para preparar notificaciones';

