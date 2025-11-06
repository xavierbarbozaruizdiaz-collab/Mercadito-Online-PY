#!/usr/bin/env node

/**
 * ============================================
 * COMPARADOR DE RENDERS
 * Compara el HTML generado local vs producción
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 COMPARADOR DE RENDERS\n');
console.log('='.repeat(60));
console.log('');

// Verificar archivos de build
const nextDir = path.join(process.cwd(), '.next');
const serverDir = path.join(nextDir, 'server');
const staticDir = path.join(nextDir, 'static');

console.log('📁 ANALIZANDO ARCHIVOS DE BUILD...\n');

// 1. Verificar estructura de build
if (!fs.existsSync(nextDir)) {
  console.log('   ❌ Directorio .next no existe');
  console.log('   💡 Ejecuta: npm run build');
  process.exit(1);
}

console.log('   ✅ Directorio .next existe');

// 2. Analizar archivos HTML generados
const htmlFiles = [];
function findHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      findHtmlFiles(fullPath);
    } else if (item.endsWith('.html')) {
      htmlFiles.push(fullPath);
    }
  });
}

if (fs.existsSync(serverDir)) {
  findHtmlFiles(serverDir);
}

console.log(`   📄 ${htmlFiles.length} archivo(s) HTML encontrado(s)`);

// 3. Analizar clases CSS en HTML
if (htmlFiles.length > 0) {
  const sampleHtml = htmlFiles[0];
  const htmlContent = fs.readFileSync(sampleHtml, 'utf8');
  
  // Extraer todas las clases
  const classMatches = htmlContent.match(/class(Name)?=["']([^"']+)["']/g) || [];
  const allClasses = new Set();
  
  classMatches.forEach(match => {
    const classValue = match.match(/["']([^"']+)["']/)?.[1];
    if (classValue) {
      classValue.split(/\s+/).forEach(cls => {
        if (cls.trim()) {
          allClasses.add(cls.trim());
        }
      });
    }
  });
  
  console.log(`\n   📊 ${allClasses.size} clases únicas encontradas en HTML`);
  
  // Verificar clases críticas
  const criticalClasses = [
    'bg-blue-500',
    'bg-red-500',
    'bg-gray-100',
    'flex',
    'grid',
    'hidden',
    'block',
  ];
  
  console.log('\n   🔍 Clases críticas en HTML:');
  criticalClasses.forEach(cls => {
    if (allClasses.has(cls)) {
      console.log(`      ✅ ${cls}`);
    } else {
      console.log(`      ❌ ${cls} - NO ENCONTRADA`);
    }
  });
  
  // Verificar clases dinámicas comunes
  const dynamicPatterns = [
    /bg-\w+-\d+/,
    /text-\w+-\d+/,
    /border-\w+-\d+/,
    /hover:\w+/,
    /dark:\w+/,
  ];
  
  let dynamicCount = 0;
  allClasses.forEach(cls => {
    dynamicPatterns.forEach(pattern => {
      if (pattern.test(cls)) {
        dynamicCount++;
      }
    });
  });
  
  console.log(`\n   📈 ~${dynamicCount} clases dinámicas encontradas en HTML`);
}

// 4. Analizar CSS generado
const cssDir = path.join(staticDir, 'css');
if (fs.existsSync(cssDir)) {
  const cssFiles = fs.readdirSync(cssDir).filter(f => f.endsWith('.css'));
  if (cssFiles.length > 0) {
    const cssFile = path.join(cssDir, cssFiles[0]);
    const cssContent = fs.readFileSync(cssFile, 'utf8');
    const cssSize = (fs.statSync(cssFile).size / 1024).toFixed(2);
    
    console.log(`\n   🎨 CSS: ${cssSize} KB`);
    
    // Contar clases en CSS
    const cssClassMatches = cssContent.match(/\.[\w-\\:]+/g) || [];
    const cssClasses = new Set(cssClassMatches.map(m => m.substring(1)));
    
    console.log(`   📊 ~${cssClasses.size} clases únicas en CSS`);
  }
}

console.log('\n' + '='.repeat(60));
console.log('\n💡 RECOMENDACIONES:');
console.log('   1. Compara este output con el de producción');
console.log('   2. Verifica que las clases en HTML coincidan con CSS');
console.log('   3. Si hay diferencias, pueden ser la causa');
console.log('\n📝 Para comparar con producción:');
console.log('   1. Abre DevTools en producción');
console.log('   2. Copia el HTML de <body>');
console.log('   3. Compara las clases con este output');

