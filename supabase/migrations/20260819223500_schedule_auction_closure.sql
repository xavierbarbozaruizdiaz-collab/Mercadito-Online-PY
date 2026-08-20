-- Cierra subastas expiradas desde Supabase, sin depender de Vercel Cron.
-- Una ejecución por minuto evita exigir un plan de pago en Vercel.

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
DECLARE
  existing_job_id bigint;
BEGIN
  FOR existing_job_id IN
    SELECT jobid
    FROM cron.job
    WHERE jobname = 'close-expired-auctions'
  LOOP
    PERFORM cron.unschedule(existing_job_id);
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'close-expired-auctions',
  '* * * * *',
  $job$SELECT public.auto_close_expired_auctions();$job$
);
