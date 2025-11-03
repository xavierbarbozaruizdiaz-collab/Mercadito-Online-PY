#!/usr/bin/env node

/**
 * ============================================
 * ANALIZADOR DE COMPONENTES DINÁMICOS
 * Encuentra todas las clases dinámicas usadas en componentes
 * ============================================
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ANALIZANDO COMPONENTES CON CLASES DINÁMICAS\n');
console.log('='.repeat(60));
console.log('');

function findFiles(dir, extension) {
  const files = [];
  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    const items = fs.readdirSync(currentPath);
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        walk(fullPath);
      } else if (item.endsWith(extension)) {
        files.push(fullPath);
      }
    });
  }
  walk(dir);
  return files;
}

const componentsDir = path.join(process.cwd(), 'src', 'components');
const appDir = path.join(process.cwd(), 'src', 'app');

const allFiles = [
  ...findFiles(componentsDir, '.tsx'),
  ...findFiles(componentsDir, '.jsx'),
  ...findFiles(appDir, '.tsx'),
  ...findFiles(appDir, '.jsx'),
];

console.log(`📁 Analizando ${allFiles.length} archivos...\n`);

const dynamicClasses = new Set();
const filesWithDynamic = [];

allFiles.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    
    // Buscar patrones de clases dinámicas
    const patterns = [
      // className con template literals
      /className\s*=\s*`([^`]+)`/g,
      // className con objetos
      /className\s*=\s*\{[^}]*\?/g,
      // clsx() o cn()
      /(clsx|cn)\(([^)]+)\)/g,
      // Variantes de objetos
      /(variantClasses|sizeClasses|colorClasses)\s*=\s*\{[^}]+\}/g,
    ];
    
    let hasDynamic = false;
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        hasDynamic = true;
        
        // Extraer clases del match
        const matchContent = match[1] || match[2] || match[0];
        
        // Buscar clases Tailwind en el contenido
        const classMatches = matchContent.match(/\b(bg-|text-|border-|hover:|dark:|focus:|active:|disabled:)[\w-]+/g);
        if (classMatches) {
          classMatches.forEach(cls => dynamicClasses.add(cls));
        }
      }
    });
    
    if (hasDynamic) {
      filesWithDynamic.push(file);
    }
  } catch (e) {
    // Ignorar errores de lectura
  }
});

console.log(`📊 ${filesWithDynamic.length} archivos con clases dinámicas encontrados\n`);
console.log('📝 Archivos:\n');
filesWithDynamic.slice(0, 20).forEach(file => {
  console.log(`   - ${path.relative(process.cwd(), file)}`);
});

console.log(`\n🎨 ${dynamicClasses.size} clases dinámicas únicas encontradas\n`);

// Mostrar algunas clases
const classesArray = Array.from(dynamicClasses).sort();
console.log('📋 Primeras 30 clases:\n');
classesArray.slice(0, 30).forEach(cls => {
  console.log(`   - ${cls}`);
});

// Verificar si están en safelist
const safelistFile = path.join(process.cwd(), 'src', 'styles', 'tailwind-safelist.ts');
if (fs.existsSync(safelistFile)) {
  const safelistContent = fs.readFileSync(safelistFile, 'utf8');
  
  let missingClasses = [];
  classesArray.forEach(cls => {
    // Buscar si la clase está en el safelist (puede estar con espacios)
    const escaped = cls.replace(/:/g, '\\:');
    const pattern = new RegExp(`\\b${escaped}\\b`);
    if (!pattern.test(safelistContent)) {
      missingClasses.push(cls);
    }
  });
  
  console.log(`\n⚠️  ${missingClasses.length} clases NO están en safelist:\n`);
  missingClasses.slice(0, 20).forEach(cls => {
    console.log(`   - ${cls}`);
  });
  
  if (missingClasses.length > 0) {
    console.log('\n💡 RECOMENDACIÓN: Agregar estas clases al safelist');
  }
}

console.log('\n' + '='.repeat(60));

