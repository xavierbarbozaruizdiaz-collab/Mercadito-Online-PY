-- Ajuste de trigger de auditoría de productos
-- Ejecutar AFTER para insert/update y BEFORE para delete

DROP TRIGGER IF EXISTS trigger_product_audit ON public.products;
DROP TRIGGER IF EXISTS trigger_product_audit_after ON public.products;
DROP TRIGGER IF EXISTS trigger_product_audit_before_delete ON public.products;

CREATE TRIGGER trigger_product_audit_after
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION log_product_changes();

CREATE TRIGGER trigger_product_audit_before_delete
BEFORE DELETE ON public.products
FOR EACH ROW
EXECUTE FUNCTION log_product_changes();

