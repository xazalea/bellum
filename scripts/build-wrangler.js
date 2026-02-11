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
  
  // Step 2: Run Next.js build
  log('Building Next.js application...');
  execSync('next build --no-lint', { 
    stdio: 'inherit',
    env: { ...process.env, CF_PAGES: '1' }
  });
  log('Next.js build completed');
  
  // Step 3: Copy static assets (if script exists)
  const copyStaticScript = path.join(__dirname, 'copy-static-assets.js');
  if (fs.existsSync(copyStaticScript)) {
    log('Copying static assets...');
    execSync(`node ${copyStaticScript}`, { stdio: 'inherit' });
    log('Static assets copied');
  }
  
  // Step 4: Run next-on-pages to convert to Cloudflare format
  log('Converting to Cloudflare Pages format...');
  execSync('pnpm exec next-on-pages -s', { stdio: 'inherit' });
  log('Conversion completed');
  
  // Step 5: Update routes (if script exists)
  const updateRoutesScript = path.join(__dirname, 'update-routes.js');
  if (fs.existsSync(updateRoutesScript)) {
    log('Updating routes...');
    execSync(`node ${updateRoutesScript}`, { stdio: 'inherit' });
    log('Routes updated');
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
