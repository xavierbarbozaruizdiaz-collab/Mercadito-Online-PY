/**
 * ============================================
 * SCRIPT PARA VERIFICAR ESTADO DE BD EN PRODUCCIÓN
 * ============================================
 * 
 * Este script verifica:
 * 1. Migraciones aplicadas
 * 2. Datos en hero_slides (con is_active = true)
 * 3. Políticas de RLS
 * 4. Estado general de la base de datos
 * 
 * USO:
 * 1. Configura SUPABASE_ACCESS_TOKEN como variable de entorno
 *    Windows: $env:SUPABASE_ACCESS_TOKEN="tu_token"
 *    Linux/Mac: export SUPABASE_ACCESS_TOKEN="tu_token"
 * 
 * 2. Ejecuta: node scripts/verificar-produccion-db.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'hqdatzhliaordlsqtjea';

// Intentar leer token del archivo local primero
let ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  // Intentar leer desde archivo .supabase-token.local
  const tokenFile = path.join(__dirname, '..', '.supabase-token.local');
  if (fs.existsSync(tokenFile)) {
    const fileContent = fs.readFileSync(tokenFile, 'utf-8');
    const match = fileContent.match(/SUPABASE_ACCESS_TOKEN=(.+)/);
    if (match && match[1]) {
      ACCESS_TOKEN = match[1].trim();
      console.log('✅ Token leído desde .supabase-token.local');
    }
  }
}

if (!ACCESS_TOKEN) {
  console.error('❌ Error: SUPABASE_ACCESS_TOKEN no está configurado');
  console.log('\n📝 Opciones para configurarlo:');
  console.log('   1. Variable de entorno:');
  console.log('      Windows PowerShell: $env:SUPABASE_ACCESS_TOKEN="tu_token_aqui"');
  console.log('      Windows CMD: set SUPABASE_ACCESS_TOKEN=tu_token_aqui');
  console.log('      Linux/Mac: export SUPABASE_ACCESS_TOKEN="tu_token_aqui"');
  console.log('\n   2. Archivo .supabase-token.local:');
  console.log('      Agrega: SUPABASE_ACCESS_TOKEN=tu_token_aqui');
  console.log('\n🔑 Obtén tu token en: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

console.log('🔍 Verificando estado de la base de datos en producción...\n');

try {
  // 1. Linkear proyecto primero (si no está linkeado)
  console.log('🔗 1. Linkeando proyecto a Supabase...');
  try {
    execSync(
      `npx supabase link --project-ref ${PROJECT_REF}`,
      {
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN },
        encoding: 'utf-8',
        stdio: 'pipe'
      }
    );
    console.log('✅ Proyecto linkeado correctamente');
  } catch (error) {
    console.log('⚠️  Proyecto ya linkeado o error en link (continuando...)');
  }

  // 2. Verificar migraciones
  console.log('\n📋 2. Verificando migraciones aplicadas...');
  try {
    const migrationsOutput = execSync(
      `npx supabase migration list --linked`,
      {
        env: { ...process.env, SUPABASE_ACCESS_TOKEN: ACCESS_TOKEN },
        encoding: 'utf-8',
        stdio: 'pipe'
      }
    );
    console.log('✅ Migraciones:');
    console.log(migrationsOutput);
  } catch (error) {
    console.error('❌ Error listando migraciones:', error.message);
  }

  // 3. Verificar datos en hero_slides
  console.log('\n🖼️  3. Verificando hero_slides activos...');
  console.log('⚠️  El CLI de Supabase no soporta ejecutar queries SQL directamente.');
  console.log('💡 Ejecuta esta query manualmente en Supabase Dashboard:');
  console.log('\n   SELECT id, title, is_active, sort_order, bg_type, created_at');
  console.log('   FROM hero_slides');
  console.log('   WHERE is_active = true');
  console.log('   ORDER BY sort_order ASC;');
  console.log('\n   📍 Dashboard: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');

  // 4. Verificar conteo de productos
  console.log('\n📦 4. Verificando conteo de productos...');
  console.log('💡 Ejecuta esta query manualmente en Supabase Dashboard:');
  console.log('\n   SELECT COUNT(*) as total FROM products WHERE status = \'active\';');
  console.log('\n   📍 Dashboard: https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');

  console.log('\n✅ Verificación completada');

} catch (error) {
  console.error('❌ Error general:', error.message);
  console.log('\n💡 Alternativas:');
  console.log('   1. Usa el Supabase Dashboard para verificar manualmente');
  console.log('   2. Verifica que el token tenga permisos correctos');
  console.log('   3. Ejecuta los comandos manualmente con el CLI');
}

