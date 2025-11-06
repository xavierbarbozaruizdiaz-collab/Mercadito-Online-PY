#!/usr/bin/env node

/**
 * ============================================
 * COMPARADOR DE MIGRACIONES: LOCAL vs PRODUCCIÓN
 * Identifica migraciones faltantes en producción
 * ============================================
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

/**
 * Lee todas las migraciones del directorio local
 */
function getLocalMigrations() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      // Extraer versión/nombre de diferentes formatos
      const match = file.match(/^(\d{14}|\d{8}_[^_]+|.+?)(?:_(.+))?\.sql$/);
      let version, name;
      
      if (match) {
        version = match[1];
        name = match[2] || match[1];
      } else {
        version = file.replace('.sql', '');
        name = version;
      }
      
      return {
        filename: file,
        version: version,
        name: name,
        fullPath: path.join(migrationsDir, file),
      };
    });

  return files;
}

/**
 * Parsea el resultado del SQL de producción
 * Soporta formato JSON, tabla, o texto plano
 */
function parseProductionMigrations(input) {
  const migrations = [];
  
  // Intentar parsear como JSON primero
  try {
    const jsonData = JSON.parse(input.trim());
    if (Array.isArray(jsonData)) {
      for (const item of jsonData) {
        if (item.version && item.name) {
          let filename = `${item.version}_${item.name}.sql`;
          migrations.push({
            version: item.version,
            name: item.name,
            filename: filename,
          });
        }
      }
      return migrations;
    }
  } catch (e) {
    // No es JSON, continuar con parsing de texto
  }
  
  // Intentar leer desde archivo JSON si existe
  const jsonPath = path.join(__dirname, 'migraciones-produccion.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (Array.isArray(jsonData)) {
        for (const item of jsonData) {
          if (item.version && item.name) {
            let filename = `${item.version}_${item.name}.sql`;
            migrations.push({
              version: item.version,
              name: item.name,
              filename: filename,
            });
          }
        }
        return migrations;
      }
    } catch (e) {
      // Continuar con parsing de texto
    }
  }
  
  // Parsear como texto (formato tabla SQL)
  const lines = input.trim().split('\n');
  
  // Saltar encabezados si existen
  let startIndex = 0;
  if (lines[0] && (lines[0].includes('version') || lines[0].includes('name'))) {
    startIndex = 1;
  }
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('--') || line.startsWith('|') && line.includes('---')) {
      continue;
    }
    
    // Formato: version | name  o  version|name
    const parts = line.split('|').map(p => p.trim()).filter(p => p);
    
    if (parts.length >= 1) {
      const version = parts[0];
      const name = parts[1] || version;
      
      // Normalizar nombre para comparación
      let normalizedName = name;
      if (!normalizedName.endsWith('.sql')) {
        normalizedName = `${normalizedName}.sql`;
      }
      
      migrations.push({
        version: version,
        name: name,
        filename: normalizedName,
      });
    }
  }
  
  return migrations;
}

/**
 * Normaliza el nombre de archivo para comparación
 */
function normalizeFilename(filename) {
  return filename
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[_-]+/g, '_');
}

/**
 * Compara dos nombres de migración (flexible)
 */
function migrationMatches(local, prod) {
  // Comparación exacta
  if (local.filename.toLowerCase() === prod.filename.toLowerCase()) {
    return true;
  }
  
  // Comparación por versión
  if (local.version === prod.version) {
    return true;
  }
  
  // Comparación por nombre normalizado
  const localNorm = normalizeFilename(local.filename);
  const prodNorm = normalizeFilename(prod.filename);
  
  if (localNorm === prodNorm || localNorm.includes(prodNorm) || prodNorm.includes(localNorm)) {
    return true;
  }
  
  // Comparación parcial (para casos como "20251103000000_fix_hero_slides_table" vs "fix_hero_slides_table.sql")
  const localBase = local.filename.replace(/^\d+_/, '').replace('.sql', '').toLowerCase();
  const prodBase = prod.filename.replace(/^\d+_/, '').replace('.sql', '').toLowerCase();
  
  return localBase === prodBase;
}

/**
 * Genera reporte de comparación
 */
function generateComparisonReport(localMigrations, prodMigrations) {
  console.log('\n' + colors.bold + colors.cyan + '='.repeat(80));
  console.log('  COMPARACIÓN: MIGRACIONES LOCALES vs PRODUCCIÓN');
  console.log('='.repeat(80) + colors.reset + '\n');

  // Estadísticas
  console.log(colors.bold + 'Estadísticas:' + colors.reset);
  console.log(`  ${colors.blue}Total local:${colors.reset} ${localMigrations.length} migraciones`);
  console.log(`  ${colors.blue}Total producción:${colors.reset} ${prodMigrations.length} migraciones`);
  console.log(`  ${colors.yellow}Diferencia:${colors.reset} ${localMigrations.length - prodMigrations.length} migraciones\n`);

  // Encontrar migraciones en local pero no en producción
  const missingInProd = [];
  const foundInProd = [];
  
  for (const local of localMigrations) {
    const found = prodMigrations.some(prod => migrationMatches(local, prod));
    if (!found) {
      missingInProd.push(local);
    } else {
      foundInProd.push(local);
    }
  }
  
  // Encontrar migraciones en producción pero no en local
  const extraInProd = [];
  for (const prod of prodMigrations) {
    const found = localMigrations.some(local => migrationMatches(local, prod));
    if (!found) {
      extraInProd.push(prod);
    }
  }

  // Reporte de migraciones encontradas
  if (foundInProd.length > 0) {
    console.log(colors.bold + colors.green + `✅ Migraciones encontradas en producción: ${foundInProd.length}` + colors.reset);
    console.log(`   (Estas migraciones están sincronizadas)\n`);
  }

  // Reporte de migraciones faltantes
  if (missingInProd.length > 0) {
    console.log(colors.bold + colors.red + `❌ Migraciones FALTANTES en producción: ${missingInProd.length}` + colors.reset);
    console.log('─'.repeat(80));
    
    for (const mig of missingInProd) {
      console.log(`  ${colors.red}✗${colors.reset} ${colors.bold}${mig.filename}${colors.reset}`);
      console.log(`    Versión: ${mig.version}`);
      console.log(`    Archivo: ${mig.fullPath}`);
      console.log();
    }
    
    // Instrucciones para aplicar
    console.log(colors.bold + colors.yellow + '\n📋 CÓMO APLICAR LAS MIGRACIONES FALTANTES:' + colors.reset);
    console.log(`
${colors.cyan}Opción 1: Usando Supabase CLI${colors.reset}
  1. Asegúrate de estar vinculado al proyecto de producción:
     ${colors.yellow}supabase link --project-ref tu-project-ref${colors.reset}
  
  2. Aplica las migraciones faltantes:
     ${colors.yellow}supabase db push${colors.reset}

${colors.cyan}Opción 2: Manualmente desde Supabase Dashboard${colors.reset}
  1. Ve a Supabase Dashboard → SQL Editor
  
  2. Copia y pega el contenido de cada archivo faltante:
${missingInProd.map((mig, i) => `     ${i + 1}. ${mig.filename}`).join('\n')}
  
  3. Ejecuta cada uno en orden

${colors.cyan}Opción 3: Aplicar solo las faltantes específicas${colors.reset}
   Ejecuta cada archivo SQL faltante manualmente desde el Dashboard
    `);
    
  } else {
    console.log(colors.bold + colors.green + '\n✅ ¡Excelente! Todas las migraciones locales están aplicadas en producción.' + colors.reset + '\n');
  }

  // Reporte de migraciones extras en producción
  if (extraInProd.length > 0) {
    console.log(colors.bold + colors.yellow + `⚠️  Migraciones en producción que NO están en local: ${extraInProd.length}` + colors.reset);
    console.log('─'.repeat(80));
    
    for (const mig of extraInProd) {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${colors.bold}${mig.filename}${colors.reset}`);
      console.log(`    Versión: ${mig.version}`);
      console.log();
    }
    
    console.log(colors.yellow + '   Nota: Estas migraciones fueron aplicadas manualmente en producción.' + colors.reset);
    console.log('   Considera agregarlas al repositorio local si son necesarias.\n');
  }

  // Resumen final
  console.log(colors.bold + colors.cyan + '='.repeat(80));
  console.log('  RESUMEN FINAL');
  console.log('='.repeat(80) + colors.reset);
  
  console.log(`
${colors.green}✅ Sincronizadas:${colors.reset} ${foundInProd.length}
${colors.red}❌ Faltantes en producción:${colors.reset} ${missingInProd.length}
${colors.yellow}⚠️  Extras en producción:${colors.reset} ${extraInProd.length}
  `);

  // Guardar reporte en archivo
  if (missingInProd.length > 0 || extraInProd.length > 0) {
    const reportPath = path.join(__dirname, '..', 'migraciones-faltantes-reporte.txt');
    let reportContent = 'REPORTE DE COMPARACIÓN DE MIGRACIONES\n';
    reportContent += '='.repeat(80) + '\n\n';
    reportContent += `Total local: ${localMigrations.length}\n`;
    reportContent += `Total producción: ${prodMigrations.length}\n`;
    reportContent += `Diferencia: ${localMigrations.length - prodMigrations.length}\n\n`;
    
    if (missingInProd.length > 0) {
      reportContent += 'MIGRACIONES FALTANTES EN PRODUCCIÓN:\n';
      reportContent += '-'.repeat(80) + '\n';
      for (const mig of missingInProd) {
        reportContent += `- ${mig.filename}\n`;
      }
      reportContent += '\n';
    }
    
    if (extraInProd.length > 0) {
      reportContent += 'MIGRACIONES EXTRAS EN PRODUCCIÓN:\n';
      reportContent += '-'.repeat(80) + '\n';
      for (const mig of extraInProd) {
        reportContent += `- ${mig.filename} (versión: ${mig.version})\n`;
      }
    }
    
    fs.writeFileSync(reportPath, reportContent);
    console.log(colors.cyan + `\n💾 Reporte guardado en: ${reportPath}` + colors.reset + '\n');
  }
}

/**
 * Lee entrada del usuario (puede ser desde archivo o pegado)
 */
async function getProductionMigrationsInput() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log(colors.cyan + '\n📋 INSTRUCCIONES:' + colors.reset);
    console.log(`
1. Ve al Supabase Dashboard → SQL Editor
2. Ejecuta este SQL:
   ${colors.yellow}SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version ASC;${colors.reset}
3. Copia TODOS los resultados (incluyendo encabezados)
4. Pega aquí abajo y presiona Enter dos veces cuando termines
5. O escribe la ruta de un archivo .txt que contenga los resultados

${colors.blue}Opciones:${colors.reset}
  - Pega los resultados directamente
  - Escribe ${colors.yellow}file:ruta/al/archivo.txt${colors.reset} para leer de un archivo
  - Escribe ${colors.yellow}skip${colors.reset} para usar datos de prueba
`);
    
    console.log(colors.bold + '\nPega los resultados del SQL aquí:' + colors.reset);
    console.log('(Presiona Enter dos veces cuando termines)\n');
    
    let input = '';
    let emptyLines = 0;
    
    rl.on('line', (line) => {
      if (line.trim().toLowerCase() === 'skip') {
        rl.close();
        resolve(null); // Retornar null para usar datos de prueba
        return;
      }
      
      if (line.trim().startsWith('file:')) {
        const filePath = line.trim().substring(5).trim();
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          rl.close();
          resolve(content);
          return;
        } catch (error) {
          console.log(colors.red + `Error leyendo archivo: ${error.message}` + colors.reset);
          console.log('Continúa pegando los resultados...\n');
          return;
        }
      }
      
      input += line + '\n';
      
      if (line.trim() === '') {
        emptyLines++;
        if (emptyLines >= 2 && input.trim().length > 10) {
          rl.close();
          resolve(input);
        }
      } else {
        emptyLines = 0;
      }
    });
    
    rl.on('close', () => {
      if (input.trim()) {
        resolve(input);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Función principal
 */
async function main() {
  try {
    console.log(colors.bold + colors.cyan + '\n🔍 COMPARADOR DE MIGRACIONES: LOCAL vs PRODUCCIÓN' + colors.reset);
    
    // Leer migraciones locales
    const localMigrations = getLocalMigrations();
    
    if (localMigrations.length === 0) {
      console.log(colors.red + '\n❌ No se encontraron migraciones locales.\n' + colors.reset);
      return;
    }
    
    console.log(colors.green + `✅ Encontradas ${localMigrations.length} migraciones locales` + colors.reset);
    
    // Intentar leer JSON automáticamente primero
    const jsonPath = path.join(__dirname, 'migraciones-produccion.json');
    let prodMigrations = [];
    
    if (fs.existsSync(jsonPath)) {
      console.log(colors.cyan + `📂 Leyendo migraciones desde: migraciones-produccion.json` + colors.reset);
      try {
        const jsonContent = fs.readFileSync(jsonPath, 'utf8');
        prodMigrations = parseProductionMigrations(jsonContent);
        if (prodMigrations.length > 0) {
          console.log(colors.green + `✅ Leídas ${prodMigrations.length} migraciones desde JSON` + colors.reset);
        }
      } catch (e) {
        console.log(colors.yellow + `⚠️  Error leyendo JSON: ${e.message}` + colors.reset);
      }
    }
    
    // Si no se encontraron migraciones desde JSON, pedir entrada
    if (prodMigrations.length === 0) {
      const prodInput = await getProductionMigrationsInput();
      
      if (!prodInput) {
        console.log(colors.yellow + '\n⚠️  No se ingresaron datos de producción.' + colors.reset);
        console.log('   Ejecuta el script nuevamente y pega los resultados del SQL.\n');
        return;
      }
      
      // Parsear migraciones de producción
      prodMigrations = parseProductionMigrations(prodInput);
    }
    
    if (prodMigrations.length === 0) {
      console.log(colors.red + '\n❌ No se pudieron parsear las migraciones de producción.' + colors.reset);
      console.log('   Verifica que hayas copiado correctamente los resultados del SQL.\n');
      return;
    }
    
    console.log(colors.green + `✅ Parseadas ${prodMigrations.length} migraciones de producción` + colors.reset);
    
    // Generar reporte
    generateComparisonReport(localMigrations, prodMigrations);
    
  } catch (error) {
    console.error(colors.red + '\n❌ Error:', error.message + colors.reset);
    console.error(error.stack);
    process.exit(1);
  }
}

// Ejecutar
main();

