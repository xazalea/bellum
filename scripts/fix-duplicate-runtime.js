#!/usr/bin/env node

/**
 * Script to fix duplicate runtime exports in API routes
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

async function fixDuplicateRuntime() {
  console.log('🔍 Finding all API route files...');
  
  const files = await glob('app/api/**/route.ts', {
    cwd: process.cwd(),
    absolute: true,
  });
  
  console.log(`📝 Found ${files.length} API route files\n`);
  
  let fixed = 0;
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    const originalContent = content;
    
    // Remove all runtime exports first
    content = content.replace(/export const runtime = ['"]nodejs['"];?\n?/g, '');
    content = content.replace(/export const runtime = ['"]edge['"];?\n?/g, '');
    
    // Remove comment about edge runtime
    content = content.replace(/\/\/ Edge runtime for Cloudflare compatibility\n?/g, '');
    
    // Find where to insert (after imports, before first export)
    const lines = content.split('\n');
    let insertIndex = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('import ') || line.startsWith('//') || line === '' || line.startsWith('/*') || line.startsWith('*')) {
        insertIndex = i + 1;
      } else {
        break;
      }
    }
    
    // Insert edge runtime export
    lines.splice(insertIndex, 0, 'export const runtime = \'edge\';', '');
    content = lines.join('\n');
    
    // Clean up multiple blank lines
    content = content.replace(/\n\n\n+/g, '\n\n');
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`✅ ${path.relative(process.cwd(), file)}`);
      fixed++;
    }
  }
  
  console.log(`\n📊 Fixed ${fixed} files`);
}

fixDuplicateRuntime().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
