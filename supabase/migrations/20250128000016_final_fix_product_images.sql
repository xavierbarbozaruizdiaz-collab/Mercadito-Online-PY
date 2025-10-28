-- Verificar y corregir completamente la estructura de product_images
-- Asegurar que la tabla product_images tenga las columnas necesarias

-- Agregar columna url si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'url' AND table_schema = 'public') THEN
        ALTER TABLE public.product_images ADD COLUMN url TEXT;
    END IF;
END $$;

-- Agregar columna image_url si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'product_images' AND column_name = 'image_url' AND table_schema = 'public') THEN
        ALTER TABLE public.product_images ADD COLUMN image_url TEXT;
    END IF;
END $$;

-- Crear función para sincronizar url e image_url
CREATE OR REPLACE FUNCTION sync_product_images_url()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.image_url IS NOT NULL THEN
        NEW.url = NEW.image_url;
    END IF;
    IF NEW.url IS NOT NULL THEN
        NEW.image_url = NEW.url;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS sync_product_images_url ON public.product_images;
CREATE TRIGGER sync_product_images_url
    BEFORE INSERT OR UPDATE ON public.product_images
    FOR EACH ROW
    EXECUTE FUNCTION sync_product_images_url();
