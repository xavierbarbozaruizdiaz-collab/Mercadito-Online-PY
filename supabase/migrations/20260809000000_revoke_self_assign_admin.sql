-- Bloquear auto-asignación de rol admin desde el cliente
-- La promoción a admin debe hacerse solo con service role / SQL dashboard

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'assign_admin_role'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.assign_admin_role() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.assign_admin_role() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.assign_admin_role() FROM authenticated;
  END IF;
END $$;

-- Trigger: impedir cambio de role por usuarios no-service
CREATE OR REPLACE FUNCTION public.prevent_profile_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.role IS DISTINCT FROM OLD.role THEN
    -- Solo permitir si el caller es service_role (bypass RLS) o ya era admin
    IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
      RETURN NEW;
    END IF;

    IF OLD.role = 'admin' AND NEW.role = 'admin' THEN
      RETURN NEW;
    END IF;

    -- Admins existentes pueden cambiar roles de otros (vía panel) si usan service role.
    -- Desde el cliente autenticado, bloquear cualquier cambio de role.
    RAISE EXCEPTION 'Changing profile role is not allowed from the client';
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'admin' THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
      NEW.role := 'buyer';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_profile_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_role_escalation
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_role_escalation();

COMMENT ON FUNCTION public.prevent_profile_role_escalation() IS
  'Previene escalada de privilegios: no se puede auto-asignar role=admin desde el cliente';
