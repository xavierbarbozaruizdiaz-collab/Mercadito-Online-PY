// ============================================
// Script para aplicar solo la migración de marketing
// ============================================

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '../supabase/migrations/20250203000001_marketing_system.sql');

console.log('📊 Aplicando migración de marketing...\n');

// Verificar que el archivo existe
if (!fs.existsSync(migrationFile)) {
  console.error('❌ No se encontró el archivo de migración');
  process.exit(1);
}

try {
  // Leer el contenido de la migración
  const migrationSQL = fs.readFileSync(migrationFile, 'utf8');
  
  console.log('✅ Archivo de migración encontrado');
  console.log('📝 Aplicando migración directamente a producción...\n');
  
  // Aplicar usando Supabase CLI con SQL directo
  // Nota: Esto requiere que el proyecto esté vinculado
  console.log('💡 Para aplicar la migración, ejecuta uno de estos comandos:\n');
  console.log('Opción 1 (recomendado):');
  console.log('  npx supabase db push --include-all\n');
  console.log('Opción 2 (solo esta migración):');
  console.log('  Copia el contenido del archivo y pégalo en el SQL Editor de Supabase Dashboard\n');
  console.log('Opción 3 (usando psql si tienes acceso directo):');
  console.log('  psql -h [tu-host] -U postgres -d postgres -f supabase/migrations/20250203000001_marketing_system.sql\n');
  
  console.log('📄 Contenido de la migración:');
  console.log('─'.repeat(60));
  console.log(migrationSQL.substring(0, 500) + '...\n');
  console.log('─'.repeat(60));
  console.log('\n✨ La migración está lista para aplicar');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

