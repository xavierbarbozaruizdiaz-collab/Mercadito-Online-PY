#!/usr/bin/env node

/**
 * Script para IMPORTAR datos desde archivos JSON a LOCAL
 * 
 * Uso:
 *   node scripts/import-data.js [--prod]
 * 
 * Si se usa --prod, importa a producción (cuidado!)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production', override: false });

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

const EXPORT_DIR = path.join(__dirname, 'data-export');

async function importTable(supabase, tableName) {
  log(`📦 Importando tabla: ${tableName}...`, 'cyan');
  
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`);
  
  if (!fs.existsSync(filePath)) {
    log(`  ⚠️  Archivo no encontrado: ${filePath}`, 'yellow');
    return { success: false, count: 0 };
  }
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);
    
    if (!Array.isArray(data) || data.length === 0) {
      log(`  ⚠️  No hay datos para importar`, 'yellow');
      return { success: true, count: 0 };
    }
    
    log(`  📄 Cargados ${data.length} registros del archivo`, 'cyan');
    
    // Limpiar datos existentes
    const { error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    
    if (deleteError) {
      log(`  ⚠️  No se pudieron eliminar datos existentes: ${deleteError.message}`, 'yellow');
    } else {
      log(`  🗑️  Datos existentes eliminados`, 'yellow');
    }
    
    // Insertar en lotes
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(batch);
      
      if (insertError) {
        log(`  ❌ Error al insertar lote ${Math.floor(i / batchSize) + 1}: ${insertError.message}`, 'red');
        // Intentar uno por uno
        for (const item of batch) {
          const { error: singleError } = await supabase
            .from(tableName)
            .insert(item);
          if (!singleError) inserted++;
        }
      } else {
        inserted += batch.length;
        log(`  ✅ Lote ${Math.floor(i / batchSize) + 1} insertado (${inserted}/${data.length})`, 'green');
      }
    }
    
    log(`  ✅ Tabla ${tableName} importada: ${inserted} registros`, 'green');
    return { success: true, count: inserted };
    
  } catch (error) {
    log(`  ❌ Error: ${error.message}`, 'red');
    return { success: false, count: 0 };
  }
}

async function main() {
  log('🚀 Iniciando importación de datos', 'blue');
  log('='.repeat(60), 'blue');
  
  // Verificar que existe el directorio de exportación
  if (!fs.existsSync(EXPORT_DIR)) {
    log('❌ Error: Directorio de exportación no encontrado', 'red');
    log(`   Ejecuta primero: node scripts/export-data.js`, 'yellow');
    process.exit(1);
  }
  
  // Determinar destino
  const useProduction = process.argv.includes('--prod');
  
  if (useProduction) {
    log('⚠️  ADVERTENCIA: Importarás a PRODUCCIÓN', 'red');
    log('   Presiona Ctrl+C para cancelar (10 segundos)...', 'yellow');
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  
  const supabaseUrl = useProduction
    ? (process.env.PROD_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    : process.env.NEXT_PUBLIC_SUPABASE_URL;
    
  const supabaseKey = useProduction
    ? (process.env.PROD_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('❌ Error: Variables de entorno no encontradas', 'red');
    process.exit(1);
  }
  
  log(`📡 Conectando a: ${supabaseUrl}`, 'cyan');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Leer resumen si existe
  const summaryPath = path.join(EXPORT_DIR, 'export-summary.json');
  if (fs.existsSync(summaryPath)) {
    const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
    log(`📄 Archivo de exportación del: ${new Date(summary.exportDate).toLocaleString()}`, 'cyan');
    log(`📦 Fuente original: ${summary.source}`, 'cyan');
  }
  
  // Obtener lista de archivos JSON
  const files = fs.readdirSync(EXPORT_DIR)
    .filter(f => f.endsWith('.json') && f !== 'export-summary.json')
    .map(f => f.replace('.json', ''));
  
  if (files.length === 0) {
    log('❌ No se encontraron archivos de exportación', 'red');
    process.exit(1);
  }
  
  log(`\n📋 Tablas a importar: ${files.join(', ')}`, 'cyan');
  
  // Importar tablas
  const results = {};
  let totalImported = 0;
  
  for (const table of files) {
    const result = await importTable(supabase, table);
    results[table] = result;
    if (result.success) totalImported += result.count;
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  log('\n' + '='.repeat(60), 'blue');
  log('📊 RESUMEN DE IMPORTACIÓN', 'blue');
  log('='.repeat(60), 'blue');
  
  for (const [table, result] of Object.entries(results)) {
    const status = result.success ? '✅' : '❌';
    log(`${status} ${table}: ${result.count} registros`, result.success ? 'green' : 'red');
  }
  
  log(`\n✅ Total importado: ${totalImported} registros`, 'green');
  log('🎉 Importación completada!', 'green');
}

main().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

