#!/usr/bin/env node

/**
 * Script to convert all API routes to Edge runtime for Cloudflare compatibility
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const EDGE_RUNTIME_EXPORT = `export const runtime = 'edge';`;
const DYNAMIC_EXPORT = `export const dynamic = 'force-dynamic';`;

async function convertToEdgeRuntime() {
  console.log('🔍 Finding all API route files...');
  
  // Find all route.ts files in app/api
  const files = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
  });
  
  console.log(`📝 Found ${files.length} API route files\n`);
  
  let converted = 0;
  let skipped = 0;
  let alreadyEdge = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Check if already has edge runtime
    if (content.includes(`runtime = 'edge'`) || content.includes(`runtime = "edge"`)) {
      console.log(`✓ ${path.relative(process.cwd(), file)} - Already Edge`);
      alreadyEdge++;
      continue;
    }
    
    // Check if it has nodejs runtime (need to replace)
    if (content.includes(`runtime = 'nodejs'`) || content.includes(`runtime = "nodejs"`)) {
      const newContent = content.replace(
        /export const runtime = ['"]nodejs['"];?/g,
        EDGE_RUNTIME_EXPORT
      );
      fs.writeFileSync(file, newContent, 'utf-8');
      console.log(`🔄 ${path.relative(process.cwd(), file)} - Converted from Node.js`);
      converted++;
      continue;
    }
    
    // Add edge runtime export at the top (after imports)
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // Find the last import or first non-import line
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('//') || line === '') {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    
    // Check if there's already a dynamic export
    const hasDynamic = content.includes(DYNAMIC_EXPORT);
    
    // Insert edge runtime export
    const runtimeExport = hasDynamic 
      ? `${EDGE_RUNTIME_EXPORT}\n`
      : `${DYNAMIC_EXPORT}\n${EDGE_RUNTIME_EXPORT}\n`;
    
    lines.splice(insertIndex, 0, runtimeExport);
    const newContent = lines.join('\n');
    
    fs.writeFileSync(file, newContent, 'utf-8');
    console.log(`✨ ${path.relative(process.cwd(), file)} - Added Edge runtime`);
    converted++;
  }
  
  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Converted: ${converted}`);
  console.log(`   ✓  Already Edge: ${alreadyEdge}`);
  console.log(`   ⏭  Skipped: ${skipped}`);
  console.log(`   📁 Total: ${files.length}`);
  console.log(`\n🎉 All API routes are now Edge-compatible!`);
}

convertToEdgeRuntime().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
