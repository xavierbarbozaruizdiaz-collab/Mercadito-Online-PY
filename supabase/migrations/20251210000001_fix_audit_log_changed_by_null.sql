-- ============================================
-- FIX: product_audit_log changed_by NULL cuando se usa service_role
-- ============================================
-- Problema: Cuando se borra un producto usando service_role (admin client),
-- auth.uid() es NULL, causando error en changed_by NOT NULL constraint.
-- Solución: Usar COALESCE para usar seller_id como fallback cuando auth.uid() es NULL.

CREATE OR REPLACE FUNCTION log_product_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.product_audit_log (
      product_id,
      seller_id,
      action,
      new_values,
      changed_by
    ) VALUES (
      NEW.id,
      NEW.seller_id,
      'create',
      to_jsonb(NEW),
      COALESCE(auth.uid(), NEW.seller_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Solo registrar si hay cambios significativos
    IF OLD.title IS DISTINCT FROM NEW.title 
       OR OLD.price IS DISTINCT FROM NEW.price 
       OR OLD.status IS DISTINCT FROM NEW.status 
       OR OLD.sale_type IS DISTINCT FROM NEW.sale_type THEN
      INSERT INTO public.product_audit_log (
        product_id,
        seller_id,
        action,
        old_values,
        new_values,
        changed_by
      ) VALUES (
        NEW.id,
        NEW.seller_id,
        CASE 
          WHEN OLD.status IS DISTINCT FROM NEW.status THEN 'status_change'
          ELSE 'update'
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        COALESCE(auth.uid(), NEW.seller_id)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.product_audit_log (
      product_id,
      seller_id,
      action,
      old_values,
      changed_by
    ) VALUES (
      OLD.id,
      OLD.seller_id,
      'delete',
      to_jsonb(OLD),
      COALESCE(auth.uid(), OLD.seller_id)
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;




