#!/usr/bin/env node
/**
 * Cloudflare Pages/Workers build script
 * Uses @opennextjs/cloudflare to build Next.js for Cloudflare Workers.
 *
 * Usage: pnpm run build:cloudflare
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function log(step, message, data = {}) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] [${step}] ${message}`, Object.keys(data).length > 0 ? data : '');
}

log('START', 'Cloudflare build started (opennextjs-cloudflare)', { nodeVersion: process.version });

try {
  // Step 1: Verify environment
  const envLocalPath = path.join(process.cwd(), '.env.local');
  try {
    if (fs.existsSync(envLocalPath)) {
      fs.accessSync(envLocalPath, fs.constants.R_OK);
      log('ENV_CHECK', '.env.local present and readable');
    } else {
      log('ENV_CHECK', 'No .env.local — using environment defaults');
    }
  } catch (err) {
    log('ENV_CHECK', 'Warning: .env.local not readable', { error: err.message });
  }

  // Step 2: Run opennextjs-cloudflare build adapter
  // This runs `next build` internally and converts the output into
  // Cloudflare Workers format (.open-next/worker.js + .open-next/assets)
  //
  // --dangerouslyUseUnsupportedNextVersion is required because Next.js 14.2
  // is past its official support window. This flag may break on minor OpenNext
  // updates — upgrade to Next.js 15.x when possible to remove it.
  log('OPENNEXT', 'Running opennextjs-cloudflare build (includes next build)');
  execSync('pnpm exec opennextjs-cloudflare build --dangerouslyUseUnsupportedNextVersion', {
    stdio: 'inherit',
  });
  log('OPENNEXT', 'opennextjs-cloudflare build completed successfully');

  log('BUILD_SUCCESS', 'Build completed successfully');

  console.log('✅ Cloudflare build completed successfully');
  console.log('   Output: .open-next/worker.js + .open-next/assets/');
  process.exit(0);

} catch (error) {
  log('BUILD_ERROR', 'Build failed', {
    error: error.message,
    code: error.code,
    signal: error.signal,
  });

  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
