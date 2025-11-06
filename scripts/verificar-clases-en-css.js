#!/usr/bin/env node

/**
 * ============================================
 * VERIFICADOR DE CLASES EN CSS
 * Compara clases usadas en código vs clases en CSS generado
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 VERIFICANDO CLASES EN CSS GENERADO\n');
console.log('='.repeat(60));
console.log('');

// 1. Leer CSS generado
const cssDir = path.join(process.cwd(), '.next', 'static', 'css');
if (!fs.existsSync(cssDir)) {
  console.log('❌ CSS no generado. Ejecuta: npm run build');
  process.exit(1);
}

const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
if (cssFiles.length === 0) {
  console.log('❌ No se encontraron archivos CSS');
  process.exit(1);
}

const cssFile = path.join(cssDir, cssFiles[0]);
const cssContent = fs.readFileSync(cssFile, 'utf8');

// 2. Extraer todas las clases del CSS
const cssClasses = new Set();
const cssClassMatches = cssContent.match(/\.[\w-\\:]+/g) || [];
cssClassMatches.forEach(match => {
  // Remover el punto inicial y escapar backslashes
  const className = match.substring(1).replace(/\\:/g, ':');
  cssClasses.add(className);
});

console.log(`📊 ${cssClasses.size} clases únicas en CSS\n`);

// 3. Leer safelist
const safelistFile = path.join(process.cwd(), 'src', 'styles', 'tailwind-safelist.ts');
let safelistClasses = new Set();
if (fs.existsSync(safelistFile)) {
  const safelistContent = fs.readFileSync(safelistFile, 'utf8');
  const safelistMatches = safelistContent.match(/\b(bg-|text-|border-|hover:|dark:|focus:|active:|disabled:|px-|py-|m-|p-|w-|h-|flex|grid|hidden|block)[\w-]+/g) || [];
  safelistMatches.forEach(cls => safelistClasses.add(cls));
  console.log(`📝 ${safelistClasses.size} clases en safelist\n`);
}

// 4. Verificar clases críticas de componentes UI
const criticalComponentClasses = [
  // Badge
  'bg-gray-100', 'bg-blue-100', 'bg-green-100', 'bg-red-100', 'bg-yellow-100',
  'text-gray-800', 'text-blue-800', 'text-green-800', 'text-red-800',
  'px-2', 'px-2.5', 'px-3', 'py-1', 'py-1.5', 'py-2',
  'text-xs', 'text-sm', 'text-base',
  
  // Button
  'bg-blue-600', 'bg-gray-600', 'bg-red-600',
  'hover:bg-blue-700', 'hover:bg-gray-700', 'hover:bg-red-700',
  'focus:ring-blue-500', 'focus:ring-gray-500', 'focus:ring-red-500',
  'border-gray-300', 'hover:bg-gray-50',
  
  // Common
  'flex', 'inline-flex', 'items-center', 'justify-center',
  'rounded-md', 'rounded-full',
];

console.log('🔍 Verificando clases críticas de componentes UI:\n');
let foundCount = 0;
let missingCount = 0;
const missingClasses = [];

criticalComponentClasses.forEach(cls => {
  // Buscar en CSS (puede estar con formato escapado)
  const escaped = cls.replace(/:/g, '\\:');
  const pattern1 = new RegExp(`\\.${escaped}\\b`);
  const pattern2 = new RegExp(`\\b${escaped}\\b`);
  
  if (pattern1.test(cssContent) || pattern2.test(cssContent)) {
    console.log(`   ✅ ${cls}`);
    foundCount++;
  } else {
    console.log(`   ❌ ${cls} - NO ENCONTRADA`);
    missingCount++;
    missingClasses.push(cls);
  }
});

console.log(`\n📊 Resultados: ${foundCount}/${criticalComponentClasses.length} encontradas`);

if (missingClasses.length > 0) {
  console.log(`\n⚠️  ${missingClasses.length} clases críticas NO están en CSS:`);
  missingClasses.forEach(cls => console.log(`   - ${cls}`));
  console.log('\n💡 Esto causará diferencias visuales en producción');
}

// 5. Verificar clases del safelist en CSS
if (safelistClasses.size > 0) {
  console.log('\n📋 Verificando clases del safelist en CSS:\n');
  let safelistFound = 0;
  let safelistMissing = 0;
  const safelistMissingClasses = [];
  
  Array.from(safelistClasses).slice(0, 50).forEach(cls => {
    const escaped = cls.replace(/:/g, '\\:');
    const pattern = new RegExp(`\\.${escaped}\\b|\\b${escaped}\\b`);
    
    if (pattern.test(cssContent)) {
      safelistFound++;
    } else {
      safelistMissing++;
      if (safelistMissingClasses.length < 20) {
        safelistMissingClasses.push(cls);
      }
    }
  });
  
  console.log(`   ✅ ${safelistFound}/50 encontradas`);
  console.log(`   ❌ ${safelistMissing}/50 NO encontradas`);
  
  if (safelistMissingClasses.length > 0) {
    console.log('\n   Primeras clases faltantes:');
    safelistMissingClasses.forEach(cls => console.log(`      - ${cls}`));
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 RECOMENDACIONES:');
if (missingClasses.length > 0) {
  console.log('   1. Agregar clases faltantes al safelist');
  console.log('   2. Verificar que optimizeCss está deshabilitado');
  console.log('   3. Rebuild completo');
} else {
  console.log('   ✅ Todas las clases críticas están presentes');
}

