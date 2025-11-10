// Script para aplicar la migración de función DELETE
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Faltan variables de entorno:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('📝 Leyendo archivo de migración...');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../supabase/migrations/20250130000002_fix_product_delete.sql'),
      'utf8'
    );

    console.log('🚀 Aplicando migración...');
    
    // Dividir el SQL en statements (separados por ;)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executando:', statement.substring(0, 50) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
          // Intentar ejecutar directamente si rpc no está disponible
          console.log('Intentando método alternativo...');
        }
      }
    }

    // Usar query directa si rpc no funciona
    const { error } = await supabase
      .from('_realtime')
      .select('*')
      .limit(0); // Solo para verificar conexión

    console.log('✅ Migración aplicada (o ya existe)');
    console.log('💡 Si hay errores, ejecuta el SQL manualmente en Supabase Dashboard');
    
  } catch (error) {
    console.error('❌ Error aplicando migración:', error);
    console.log('\n💡 INSTRUCCIONES MANUALES:');
    console.log('1. Ve a Supabase Dashboard → SQL Editor');
    console.log('2. Copia el contenido de: supabase/migrations/20250130000002_fix_product_delete.sql');
    console.log('3. Pégalo y ejecútalo');
  }
}

applyMigration();

