// Script para aplicar la función delete_user_product usando Supabase
const { createClient } = require('@supabase/supabase-js');

// Leer variables de entorno desde .env.local si existe
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL no está configurado');
  process.exit(1);
}

// Usar service key si está disponible, sino anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseKey) {
  console.error('❌ No hay clave de Supabase configurada (NEXT_PUBLIC_SUPABASE_ANON_KEY o SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrationSQL = `
CREATE OR REPLACE FUNCTION delete_user_product(product_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_seller_id UUID;
  current_user_id UUID;
BEGIN
  -- Obtener el ID del usuario actual
  current_user_id := auth.uid();
  
  -- Verificar que hay un usuario autenticado
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado';
  END IF;
  
  -- Obtener el seller_id del producto
  SELECT seller_id INTO product_seller_id
  FROM products
  WHERE id = product_id_to_delete;
  
  -- Verificar que el producto existe
  IF product_seller_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  
  -- Verificar que el usuario es el dueño
  IF product_seller_id != current_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar este producto';
  END IF;
  
  -- Eliminar el producto
  DELETE FROM products WHERE id = product_id_to_delete;
  
  -- Verificar que se eliminó
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_product(UUID) TO authenticated;

COMMENT ON FUNCTION delete_user_product IS 'Elimina un producto verificando que el usuario autenticado es el dueño';
`;

async function applyMigration() {
  try {
    console.log('🚀 Aplicando función delete_user_product...');
    console.log('📡 Conectando a Supabase:', supabaseUrl);
    
    // Intentar ejecutar usando el método directo de Supabase
    // Nota: Supabase no tiene un método directo para ejecutar SQL arbitrario desde el cliente
    // Necesitamos usar la REST API directamente o usar pg (postgresql client)
    
    // Como alternativa, verificamos que la función existe o mostramos instrucciones
    const { data, error } = await supabase
      .rpc('delete_user_product', { product_id_to_delete: '00000000-0000-0000-0000-000000000000' })
      .catch(() => ({ data: null, error: { message: 'Function does not exist' } }));

    if (error && error.message.includes('does not exist')) {
      console.log('⚠️  La función no existe todavía.');
      console.log('\n📋 INSTRUCCIONES PARA APLICAR LA MIGRACIÓN:');
      console.log('1. Ve a tu Supabase Dashboard');
      console.log('2. Navega a: SQL Editor');
      console.log('3. Copia y pega el siguiente SQL:\n');
      console.log(migrationSQL);
      console.log('\n4. Haz clic en "Run" para ejecutar la migración\n');
      process.exit(0);
    } else if (!error || error.message.includes('Producto no encontrado') || error.message.includes('No hay usuario autenticado')) {
      console.log('✅ La función delete_user_product ya existe!');
      console.log('✅ La migración ya está aplicada.');
      process.exit(0);
    } else {
      console.error('❌ Error verificando función:', error);
      console.log('\n📋 INSTRUCCIONES MANUALES:');
      console.log('1. Ve a Supabase Dashboard → SQL Editor');
      console.log('2. Ejecuta el SQL de: supabase/migrations/20250130000002_fix_product_delete.sql\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 INSTRUCCIONES MANUALES:');
    console.log('1. Ve a Supabase Dashboard → SQL Editor');
    console.log('2. Ejecuta el SQL de: supabase/migrations/20250130000002_fix_product_delete.sql\n');
    process.exit(1);
  }
}

applyMigration();

