#!/usr/bin/env node

/**
 * ============================================
 * VERIFICACIÓN DE BUILD Y CSS
 * Verifica que el build funciona y que las clases están en el CSS generado
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICACIÓN DE BUILD Y CSS\n');
console.log('='.repeat(60));
console.log('');

// 1. Verificar que existe directorio .next
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  console.log('❌ ERROR: Directorio .next no encontrado');
  console.log('   Ejecuta: npm run build');
  process.exit(1);
}
console.log('✅ Directorio .next existe');

// 2. Verificar archivos CSS generados
const cssDir = path.join(nextDir, 'static', 'css');
if (!fs.existsSync(cssDir)) {
  console.log('❌ ERROR: Directorio .next/static/css no encontrado');
  process.exit(1);
}

const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
if (cssFiles.length === 0) {
  console.log('❌ ERROR: No se encontraron archivos CSS generados');
  process.exit(1);
}

console.log(`✅ ${cssFiles.length} archivo(s) CSS encontrado(s)`);

// 3. Leer el CSS generado
const cssFile = path.join(cssDir, cssFiles[0]);
const cssContent = fs.readFileSync(cssFile, 'utf8');
const cssSize = (fs.statSync(cssFile).size / 1024).toFixed(2);
console.log(`   - Archivo: ${cssFiles[0]}`);
console.log(`   - Tamaño: ${cssSize} KB`);

// 4. Verificar clases críticas en el CSS
console.log('\n📋 Verificando clases críticas en CSS generado...\n');

const criticalClasses = [
  'bg-blue-500',
  'bg-red-500',
  'bg-gray-100',
  'bg-white',
  'text-gray-900',
  'flex',
  'grid',
  'hidden',
  'block',
  'rounded-lg',
  'hover:bg-blue-600',
  'dark:bg-gray-700',
];

let foundClasses = 0;
let missingClasses = [];

criticalClasses.forEach(cls => {
  // Buscar la clase en el CSS (puede estar como .bg-blue-500 o dentro de reglas)
  const pattern = new RegExp(`\\.${cls.replace(/:/g, '\\:')}|\\b${cls.replace(/:/g, '\\:')}\\b`);
  if (pattern.test(cssContent)) {
    foundClasses++;
    console.log(`   ✅ ${cls}`);
  } else {
    missingClasses.push(cls);
    console.log(`   ❌ ${cls} - NO ENCONTRADA`);
  }
});

console.log(`\n📊 Resultados: ${foundClasses}/${criticalClasses.length} clases encontradas`);

if (missingClasses.length > 0) {
  console.log(`\n⚠️  ADVERTENCIA: ${missingClasses.length} clases no encontradas en CSS:`);
  missingClasses.forEach(cls => console.log(`   - ${cls}`));
  console.log('\n💡 Esto puede causar diferencias visuales en producción');
} else {
  console.log('\n✅ Todas las clases críticas están presentes en el CSS');
}

// 5. Verificar que el archivo safelist existe
const safelistFile = path.join(process.cwd(), 'src', 'styles', 'tailwind-safelist.ts');
if (fs.existsSync(safelistFile)) {
  console.log('\n✅ Archivo tailwind-safelist.ts existe');
  const safelistContent = fs.readFileSync(safelistFile, 'utf8');
  const classCount = (safelistContent.match(/bg-|text-|border-|hover:/g) || []).length;
  console.log(`   - Clases aproximadas en safelist: ${classCount}`);
} else {
  console.log('\n⚠️  ADVERTENCIA: tailwind-safelist.ts no encontrado');
}

// 6. Verificar configuración de Tailwind
const tailwindConfig = path.join(process.cwd(), 'tailwind.config.js');
if (fs.existsSync(tailwindConfig)) {
  const configContent = fs.readFileSync(tailwindConfig, 'utf8');
  if (configContent.includes('src/styles')) {
    console.log('\n✅ tailwind.config.js incluye src/styles en content');
  } else {
    console.log('\n⚠️  ADVERTENCIA: tailwind.config.js no incluye src/styles');
  }
}

// 7. Verificar optimizeCss
const nextConfig = path.join(process.cwd(), 'next.config.js');
if (fs.existsSync(nextConfig)) {
  const nextConfigContent = fs.readFileSync(nextConfig, 'utf8');
  if (nextConfigContent.includes('optimizeCss: true')) {
    console.log('\n⚠️  ADVERTENCIA: optimizeCss está habilitado');
    console.log('   Esto puede eliminar clases no detectadas');
  } else {
    console.log('\n✅ optimizeCss está deshabilitado (correcto para debug)');
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n✅ Verificación completada');

if (missingClasses.length > 0) {
  console.log('\n💡 RECOMENDACIONES:');
  console.log('   1. Verificar que las clases están en tailwind-safelist.ts');
  console.log('   2. Verificar que src/styles está en content de tailwind.config.js');
  console.log('   3. Rebuild del proyecto');
  process.exit(1);
}

