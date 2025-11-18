#!/usr/bin/env node
/**
 * Script para comparar funciones y servicios entre producción y local
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Comparando funciones y servicios...\n');

// Lista de archivos clave a comparar
const keyFiles = [
  'src/lib/supabaseClient.ts',
  'src/lib/supabaseServer.ts',
  'src/lib/utils.ts',
  'src/lib/services/raffleService.ts',
  'src/lib/services/googleAnalyticsService.ts',
  'src/components/CartButton.tsx',
  'src/components/AddToCartButton.tsx',
  'src/components/ProductsListClient.tsx',
];

console.log('📋 Archivos a verificar:\n');
keyFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`  ${status} ${file}`);
});

console.log('\n📊 Resumen:\n');
console.log('Para ver diferencias específicas, ejecuta:');
console.log('  git diff origin/dev HEAD -- src/lib');
console.log('  git diff origin/dev HEAD -- src/components');

