#!/usr/bin/env node

/**
 * Script para EXPORTAR datos de PRODUCCIÓN a archivos JSON
 * 
 * Uso:
 *   node scripts/export-data.js
 * 
 * Genera archivos en scripts/data-export/
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.local', override: false });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const TABLES_TO_EXPORT = [
  'categories',
  'hero_slides',
  'products',
  'product_images',
  'orders',
  'order_items',
  'raffles',
  'raffle_tickets',
  'raffle_winner_photos',
];

const EXPORT_DIR = path.join(__dirname, 'data-export');

async function exportTable(supabase, tableName) {
  log(`📦 Exportando tabla: ${tableName}...`, 'cyan');
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });
    
    if (error) {
      log(`  ❌ Error: ${error.message}`, 'red');
      return { success: false, count: 0 };
    }
    
    if (!data || data.length === 0) {
      log(`  ⚠️  Tabla vacía`, 'yellow');
      return { success: true, count: 0, data: [] };
    }
    
    // Guardar en archivo JSON
    const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    log(`  ✅ ${data.length} registros exportados → ${filePath}`, 'green');
    return { success: true, count: data.length, data };
    
  } catch (error) {
    log(`  ❌ Error inesperado: ${error.message}`, 'red');
    return { success: false, count: 0 };
  }
}

async function main() {
  log('🚀 Iniciando exportación de datos', 'blue');
  log('='.repeat(60), 'blue');
  
  // Crear directorio de exportación
  if (!fs.existsSync(EXPORT_DIR)) {
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    log(`📁 Directorio creado: ${EXPORT_DIR}`, 'cyan');
  }
  
  // Determinar de dónde exportar (producción por defecto)
  const useProduction = process.argv.includes('--prod') || !process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  const supabaseUrl = useProduction 
    ? (process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
    
  const supabaseKey = useProduction
    ? (process.env.PROD_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('❌ Error: Variables de entorno no encontradas', 'red');
    log('   Usa --prod para exportar de producción', 'yellow');
    log('   O configura .env.local para exportar de local', 'yellow');
    process.exit(1);
  }
  
  log(`📡 Conectando a: ${supabaseUrl}`, 'cyan');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Exportar todas las tablas
  const results = {};
  let totalExported = 0;
  
  for (const table of TABLES_TO_EXPORT) {
    const result = await exportTable(supabase, table);
    results[table] = result;
    if (result.success) totalExported += result.count;
    
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Crear resumen
  const summary = {
    exportDate: new Date().toISOString(),
    source: useProduction ? 'production' : 'local',
    tables: results,
    totalRecords: totalExported,
  };
  
  const summaryPath = path.join(EXPORT_DIR, 'export-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN DE EXPORTACIÓN', 'blue');
  log('='.repeat(60), 'blue');
  
  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    log(`${status} ${table}: ${result.count} registros`, result.success ? 'green' : 'red');
  }
  
  log(`\n✅ Total exportado: ${totalExported} registros`, 'green');
  log(`📁 Archivos guardados en: ${EXPORT_DIR}`, 'green');
  log(`📄 Resumen: ${summaryPath}`, 'green');
  log('🎉 Exportación completada!', 'green');
}

main().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

