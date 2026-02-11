#!/usr/bin/env node
/**
 * Wrangler deployment script for Cloudflare Pages
 * Deploys the built application to Cloudflare Pages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(message, data = {}) {
  console.log(`[WRANGLER DEPLOY] ${message}`, Object.keys(data).length > 0 ? data : '');
}

try {
  const outputDir = path.join(process.cwd(), '.vercel/output/static');
  
  // Check if build output exists
  if (!fs.existsSync(outputDir)) {
    log('❌ Build output not found. Run build first: pnpm run build:wrangler');
    process.exit(1);
  }
  
  // Check for required files
  const requiredFiles = ['_worker.js', '_routes.json'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(outputDir, file)));
  
  if (missingFiles.length > 0) {
    log('⚠️  Warning: Some required files are missing', { missingFiles });
    log('The deployment may still work, but some features might not function correctly.');
  }
  
  log('Deploying to Cloudflare Pages (will use .pages.dev domain)...');
  
  // Deploy using Wrangler Pages (not Workers)
  // This ensures deployment to .pages.dev, not .workers.dev
  const projectName = process.env.CF_PAGES_PROJECT_NAME || 'challenger';
  
  log(`Project name: ${projectName}`);
  log('Note: This will deploy to a .pages.dev domain, not .workers.dev');
  
  execSync(`wrangler pages deploy ${outputDir} --project-name=${projectName}`, { 
    stdio: 'inherit'
  });
  
  log('✅ Deployment completed successfully');
  process.exit(0);
  
} catch (error) {
  log('❌ Deployment failed', { 
    error: error.message,
    code: error.code,
    signal: error.signal
  });
  process.exit(1);
}
