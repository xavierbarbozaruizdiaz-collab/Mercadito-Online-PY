// Script para aplicar la función delete_user_product
// Usa las credenciales hardcodeadas del proyecto como fallback
const { createClient } = require('@supabase/supabase-js');

// Credenciales del proyecto (del código fuente)
const supabaseUrl = 'https://hqdatzhliaordlsqtjea.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhxZGF0emhsaWFvcmRsc3F0amVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1MTk1NzQsImV4cCI6MjA3NzA5NTU3NH0.u1VFWCN4yHZ_v_bR4MNw5wt7jTPdfpIwjhDRYfQ5qRw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const migrationSQL = `CREATE OR REPLACE FUNCTION delete_user_product(product_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_seller_id UUID;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'No hay usuario autenticado';
  END IF;
  SELECT seller_id INTO product_seller_id
  FROM products
  WHERE id = product_id_to_delete;
  IF product_seller_id IS NULL THEN
    RAISE EXCEPTION 'Producto no encontrado';
  END IF;
  IF product_seller_id != current_user_id THEN
    RAISE EXCEPTION 'No tienes permiso para eliminar este producto';
  END IF;
  DELETE FROM products WHERE id = product_id_to_delete;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_user_product(UUID) TO authenticated;`;

async function checkFunction() {
  try {
    console.log('🔍 Verificando si la función existe...');
    
    // Intentar llamar la función con un UUID inválido para verificar si existe
    const { error } = await supabase
      .rpc('delete_user_product', { product_id_to_delete: '00000000-0000-0000-0000-000000000000' });

    if (error) {
      if (error.message.includes('does not exist') || error.code === '42883') {
        console.log('⚠️  La función no existe.');
        console.log('\n📋 APLICA ESTA MIGRACIÓN MANUALMENTE:\n');
        console.log('1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new');
        console.log('2. Copia y pega este SQL:\n');
        console.log('─'.repeat(70));
        console.log(migrationSQL);
        console.log('─'.repeat(70));
        console.log('\n3. Haz clic en "Run" para ejecutar\n');
        process.exit(0);
      } else if (error.message.includes('Producto no encontrado') || error.message.includes('No hay usuario autenticado')) {
        console.log('✅ La función delete_user_product ya existe!');
        console.log('✅ La migración ya está aplicada.');
        process.exit(0);
      } else {
        console.log('⚠️  Error verificando:', error.message);
        console.log('\n📋 APLICA LA MIGRACIÓN MANUALMENTE:\n');
        console.log('1. Ve a: https://supabase.com/dashboard/project/hqdatzhliaordlsqtjea/sql/new');
        console.log('2. Copia y pega el SQL de: supabase/migrations/20250130000002_fix_product_delete.sql');
        console.log('3. Haz clic en "Run"\n');
        process.exit(0);
      }
    } else {
      console.log('✅ La función existe.');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 APLICA LA MIGRACIÓN MANUALMENTE:\n');
    console.log('1. Ve a Supabase Dashboard → SQL Editor');
    console.log('2. Copia y pega el SQL de: supabase/migrations/20250130000002_fix_product_delete.sql');
    console.log('3. Ejecuta la migración\n');
    process.exit(1);
  }
}

checkFunction();

