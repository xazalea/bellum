#!/usr/bin/env node
/**
 * Cloudflare build script with debugging instrumentation
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const logPath = path.join(process.cwd(), '.cursor/debug.log');
const logEndpoint = 'http://127.0.0.1:7245/ingest/5cc2c9a0-642b-4978-b141-93157e15cb6e';

function log(step, message, data = {}) {
  const logEntry = {
    location: `build-cloudflare-debug.js:${step}`,
    message,
    data: { step, ...data },
    timestamp: Date.now(),
    runId: 'build-debug',
    hypothesisId: 'A'
  };
  
  // Write to log file
  try {
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (err) {
    // Ignore log write errors
  }
  
  // Also try to send via HTTP (non-blocking)
  try {
    require('http').request({
      hostname: '127.0.0.1',
      port: 7245,
      path: '/ingest/5cc2c9a0-642b-4978-b141-93157e15cb6e',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, () => {}).on('error', () => {}).end(JSON.stringify(logEntry));
  } catch (err) {
    // Ignore HTTP errors
  }
  
  console.log(`[DEBUG ${step}] ${message}`, data);
}

// #region agent log
log('START', 'Build started', { env: { CF_PAGES: process.env.CF_PAGES } });
// #endregion

try {
  // Step 1: Check .env.local permissions
  // #region agent log
  const envLocalPath = path.join(process.cwd(), '.env.local');
  let envLocalExists = false;
  let envLocalReadable = false;
  try {
    envLocalExists = fs.existsSync(envLocalPath);
    if (envLocalExists) {
      fs.accessSync(envLocalPath, fs.constants.R_OK);
      envLocalReadable = true;
    }
    log('ENV_CHECK', 'Checked .env.local', { exists: envLocalExists, readable: envLocalReadable });
  } catch (err) {
    log('ENV_CHECK', 'Error checking .env.local', { error: err.message, code: err.code });
  }
  // #endregion

  // Step 2: Run Next.js build
  // #region agent log
  log('NEXT_BUILD_START', 'Starting Next.js build');
  // #endregion
  
  process.env.CF_PAGES = '1';
  execSync('next build --no-lint', { 
    stdio: 'inherit',
    env: { ...process.env, CF_PAGES: '1' }
  });
  
  // #region agent log
  log('NEXT_BUILD_SUCCESS', 'Next.js build completed successfully');
  // #endregion

  // Step 3: Create output directory and config
  // #region agent log
  log('OUTPUT_DIR_START', 'Creating output directory');
  // #endregion
  
  const outputDir = path.join(process.cwd(), '.vercel/output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const configPath = path.join(outputDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify({ version: 3, framework: 'nextjs' }));
  
  // #region agent log
  log('OUTPUT_DIR_SUCCESS', 'Output directory created', { configExists: fs.existsSync(configPath) });
  // #endregion

  // Step 4: Copy static assets
  // #region agent log
  log('COPY_STATIC_START', 'Copying static assets');
  // #endregion
  
  execSync('node scripts/copy-static-assets.js', { stdio: 'inherit' });
  
  // #region agent log
  log('COPY_STATIC_SUCCESS', 'Static assets copied');
  // #endregion

  // Step 5: Run next-on-pages
  // #region agent log
  log('NEXT_ON_PAGES_START', 'Running next-on-pages');
  // #endregion
  
  execSync('pnpm exec next-on-pages -s', { stdio: 'inherit' });
  
  // #region agent log
  log('NEXT_ON_PAGES_SUCCESS', 'next-on-pages completed');
  // #endregion

  // Step 6: Update routes
  // #region agent log
  log('UPDATE_ROUTES_START', 'Updating routes');
  // #endregion
  
  execSync('node scripts/update-routes.js', { stdio: 'inherit' });
  
  // #region agent log
  log('UPDATE_ROUTES_SUCCESS', 'Routes updated');
  // #endregion

  // #region agent log
  log('BUILD_SUCCESS', 'Build completed successfully');
  // #endregion
  
  console.log('✅ Cloudflare build completed successfully');
  process.exit(0);
  
} catch (error) {
  // #region agent log
  log('BUILD_ERROR', 'Build failed', { 
    error: error.message, 
    code: error.code,
    signal: error.signal,
    stack: error.stack?.split('\n').slice(0, 5).join('\n')
  });
  // #endregion
  
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
