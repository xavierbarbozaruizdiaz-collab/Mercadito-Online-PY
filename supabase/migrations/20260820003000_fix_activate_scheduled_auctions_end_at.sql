-- Preservar auction_end_at existente al activar subastas programadas
CREATE OR REPLACE FUNCTION public.activate_scheduled_auctions()
RETURNS INTEGER AS $$
DECLARE
  v_activated_count INTEGER := 0;
  v_auction RECORD;
  v_duration_minutes INTEGER;
  v_end_at TIMESTAMPTZ;
BEGIN
  FOR v_auction IN
    SELECT 
      p.id,
      p.auction_start_at,
      p.auction_end_at,
      (p.attributes->'auction'->>'duration_minutes') as duration_from_attrs,
      (p.attributes->'auction'->>'starting_price') as starting_price_from_attrs,
      p.price
    FROM public.products p
    WHERE p.sale_type = 'auction'
      AND p.auction_status = 'scheduled'
      AND p.auction_start_at IS NOT NULL
      AND p.auction_start_at <= NOW()
  LOOP
    -- Si ya tiene fecha de fin futura, respetarla
    IF v_auction.auction_end_at IS NOT NULL AND v_auction.auction_end_at > NOW() THEN
      v_end_at := v_auction.auction_end_at;
    ELSE
      v_duration_minutes := COALESCE(
        (v_auction.duration_from_attrs::TEXT)::INTEGER,
        1440
      );
      v_end_at := COALESCE(v_auction.auction_start_at, NOW()) + MAKE_INTERVAL(mins => v_duration_minutes);
    END IF;

    DECLARE
      v_starting_price DECIMAL(10,2);
    BEGIN
      v_starting_price := COALESCE(
        (v_auction.starting_price_from_attrs::TEXT)::DECIMAL,
        v_auction.price
      );

      UPDATE public.products
      SET 
        auction_status = 'active',
        auction_start_at = COALESCE(v_auction.auction_start_at, NOW()),
        auction_end_at = v_end_at,
        current_bid = COALESCE(current_bid, v_starting_price),
        updated_at = NOW()
      WHERE id = v_auction.id;

      v_activated_count := v_activated_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        CONTINUE;
    END;
  END LOOP;

  RETURN v_activated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.activate_scheduled_auctions IS
  'Activa subastas programadas. Preserva auction_end_at si ya fue definido al crear la subasta.';
