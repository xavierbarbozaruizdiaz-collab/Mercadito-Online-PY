#!/usr/bin/env node

/**
 * ============================================
 * VERIFICAR DATOS EN SUPABASE
 * Verifica que los datos necesarios existan
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO DATOS EN SUPABASE\n');
console.log('='.repeat(60));
console.log('');

// Leer .env.local
const envLocal = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envLocal)) {
  console.log('❌ .env.local no existe');
  process.exit(1);
}

const envContent = fs.readFileSync(envLocal, 'utf8');
const supabaseUrl = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variables de Supabase no encontradas en .env.local');
  process.exit(1);
}

console.log('📋 VERIFICACIONES NECESARIAS:\n');
console.log('1. HERO SLIDES:');
console.log('   Ejecuta en Supabase SQL Editor:');
console.log('   SELECT * FROM hero_slides WHERE is_active = true;');
console.log('   ');
console.log('   Si no hay resultados:');
console.log('   - Ve a /dashboard/admin/hero (si eres admin)');
console.log('   - Crea slides con is_active = true');
console.log('');

console.log('2. PROFILES CON ROLES:');
console.log('   Ejecuta en Supabase SQL Editor:');
console.log('   SELECT id, email, role FROM profiles WHERE role IN (\'admin\', \'seller\', \'affiliate\');');
console.log('   ');
console.log('   Si no hay resultados:');
console.log('   - Actualiza el rol manualmente:');
console.log('   UPDATE profiles SET role = \'admin\' WHERE email = \'tu-email@ejemplo.com\';');
console.log('');

console.log('3. RLS (Row Level Security):');
console.log('   Ejecuta en Supabase SQL Editor:');
console.log('   SELECT * FROM pg_policies WHERE tablename = \'profiles\';');
console.log('   ');
console.log('   Si no hay políticas:');
console.log('   CREATE POLICY "Users can read own profile"');
console.log('   ON profiles FOR SELECT');
console.log('   USING (auth.uid() = id);');
console.log('');

console.log('='.repeat(60));
console.log('\n💡 Estas verificaciones son CRÍTICAS para que funcione en producción.');
console.log('   Si los datos no existen, nada funcionará incluso con variables correctas.');

