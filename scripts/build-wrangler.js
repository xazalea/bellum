#!/usr/bin/env node
/**
 * Wrangler-based build script for Cloudflare Pages
 * Simpler and more reliable than the previous build script
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message, data = {}) {
  console.log(`[WRANGLER BUILD] ${message}`, Object.keys(data).length > 0 ? data : '');
}

try {
  // Step 1: Set Cloudflare environment
  process.env.CF_PAGES = '1';
  process.env.NODE_ENV = 'production';
  
  log('Starting Wrangler build for Cloudflare Pages');
  
  // Step 2: Clean previous build
  const vercelOutputDir = path.join(process.cwd(), '.vercel/output');
  if (fs.existsSync(vercelOutputDir)) {
    log('Cleaning previous Vercel output...');
    fs.rmSync(vercelOutputDir, { recursive: true, force: true });
  }
  
  // Step 3: Run Next.js build
  log('Building Next.js application...');
  execSync('next build', { 
    stdio: 'inherit',
    env: { 
      ...process.env, 
      CF_PAGES: '1',
      NODE_ENV: 'production'
    }
  });
  log('Next.js build completed');
  
  // Step 4: Run next-on-pages to convert to Cloudflare format
  log('Converting to Cloudflare Pages format...');
  execSync('pnpm exec next-on-pages', { stdio: 'inherit' });
  log('Conversion completed');
  
  // Step 5: Update routes configuration
  const updateRoutesScript = path.join(__dirname, 'update-routes.js');
  if (fs.existsSync(updateRoutesScript)) {
    log('Updating routes...');
    execSync(`node ${updateRoutesScript}`, { stdio: 'inherit' });
    log('Routes updated');
  } else {
    log('⚠️  Warning: update-routes.js not found, skipping route updates');
  }
  
  log('✅ Build completed successfully');
  log('Ready for deployment. Run: wrangler pages deploy .vercel/output/static --project-name=challenger');
  
  process.exit(0);
  
} catch (error) {
  log('❌ Build failed', { 
    error: error.message,
    code: error.code,
    signal: error.signal
  });
  process.exit(1);
}
