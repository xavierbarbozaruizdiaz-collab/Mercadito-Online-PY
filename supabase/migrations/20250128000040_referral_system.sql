-- Migration: Sistema de Referidos
-- ============================================

-- Tabla para referidos
CREATE TABLE IF NOT EXISTS public.referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referred_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    referral_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, rewarded
    reward_amount DECIMAL(10, 2) DEFAULT 0,
    reward_type TEXT, -- credit, discount, bonus
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(referred_id) -- Un usuario solo puede ser referido una vez
);

-- Tabla para códigos de referido de usuarios
CREATE TABLE IF NOT EXISTS public.user_referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    referral_code TEXT NOT NULL UNIQUE,
    total_referrals INT DEFAULT 0,
    total_rewards DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON public.referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_user_id ON public.user_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_referral_codes_code ON public.user_referral_codes(referral_code);

-- Habilitar RLS
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para referrals
CREATE POLICY "Users can view referrals they made" ON public.referrals
    FOR SELECT TO authenticated
    USING (auth.uid() = referrer_id);

CREATE POLICY "Users can view their own referral" ON public.referrals
    FOR SELECT TO authenticated
    USING (auth.uid() = referred_id);

CREATE POLICY "Public can insert referrals during registration" ON public.referrals
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = referred_id);

-- Políticas RLS para user_referral_codes
CREATE POLICY "Users can view their own referral code" ON public.user_referral_codes
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own referral code" ON public.user_referral_codes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own referral code" ON public.user_referral_codes
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Función para generar código de referido único
CREATE OR REPLACE FUNCTION generate_referral_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generar código aleatorio de 8 caracteres
        new_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || user_id_param::TEXT) FROM 1 FOR 8));
        
        -- Verificar si el código ya existe
        SELECT EXISTS(SELECT 1 FROM public.user_referral_codes WHERE referral_code = new_code) INTO code_exists;
        
        EXIT WHEN NOT code_exists;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION generate_referral_code(UUID) TO authenticated;

-- Función para crear o obtener código de referido de un usuario
CREATE OR REPLACE FUNCTION get_or_create_referral_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
    existing_code TEXT;
    new_code TEXT;
BEGIN
    -- Verificar si ya existe un código
    SELECT referral_code INTO existing_code
    FROM public.user_referral_codes
    WHERE user_id = user_id_param;
    
    IF existing_code IS NOT NULL THEN
        RETURN existing_code;
    END IF;
    
    -- Generar nuevo código
    new_code := generate_referral_code(user_id_param);
    
    -- Insertar en la tabla
    INSERT INTO public.user_referral_codes (user_id, referral_code)
    VALUES (user_id_param, new_code)
    ON CONFLICT (user_id) DO UPDATE SET referral_code = EXCLUDED.referral_code
    RETURNING referral_code INTO new_code;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_or_create_referral_code(UUID) TO authenticated;

-- Función para procesar un referido
CREATE OR REPLACE FUNCTION process_referral(referral_code_param TEXT, referred_user_id UUID)
RETURNS UUID AS $$
DECLARE
    referrer_user_id UUID;
    referral_id UUID;
BEGIN
    -- Obtener el ID del usuario que tiene este código
    SELECT user_id INTO referrer_user_id
    FROM public.user_referral_codes
    WHERE referral_code = referral_code_param;
    
    IF referrer_user_id IS NULL THEN
        RAISE EXCEPTION 'Código de referido inválido';
    END IF;
    
    IF referrer_user_id = referred_user_id THEN
        RAISE EXCEPTION 'No puedes referirte a ti mismo';
    END IF;
    
    -- Crear registro de referido
    INSERT INTO public.referrals (referrer_id, referred_id, referral_code)
    VALUES (referrer_user_id, referred_user_id, referral_code_param)
    RETURNING id INTO referral_id;
    
    -- Actualizar contador del referidor
    UPDATE public.user_referral_codes
    SET total_referrals = total_referrals + 1,
        updated_at = now()
    WHERE user_id = referrer_user_id;
    
    RETURN referral_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION process_referral(TEXT, UUID) TO authenticated;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_user_referral_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_referral_codes_updated_at
    BEFORE UPDATE ON public.user_referral_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_user_referral_codes_updated_at();

