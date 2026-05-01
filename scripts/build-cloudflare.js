#!/usr/bin/env node
/**
 * Cloudflare Pages/Workers build script
 * Uses @opennextjs/cloudflare to build Next.js for Cloudflare Workers.
 *
 * Usage: pnpm run build:cloudflare
 *
 * Output structure (.open-next/):
 *   _worker.js                 ← Cloudflare Pages Worker entry point
 *   _next/static/...           ← Static assets served from CDN
 *   BUILD_ID, _headers, sw.js  ← Other static assets at root
 *   server-functions/          ← Worker module dependencies
 *   middleware/                ← Worker module dependencies
 *   .build/                   ← Worker module dependencies
 *   cloudflare/               ← Worker module dependencies
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

  // Step 3: Restructure .open-next/ for Cloudflare Pages compatibility
  //
  // Cloudflare Pages requires:
  //   1. _worker.js (with underscore) at root — the Worker entry point
  //   2. Static assets at root level — Pages serves these from the CDN
  //      (not nested inside an assets/ subdirectory)
  //
  // The opennextjs-cloudflare build outputs:
  //   .open-next/worker.js     ← must rename to _worker.js
  //   .open-next/assets/...    ← must move contents to root
  //   .open-next/server-functions/, middleware/, etc. ← keep as-is

  const openNextDir = path.join(process.cwd(), '.open-next');

  // 3a: Rename worker.js → _worker.js
  const workerSrc = path.join(openNextDir, 'worker.js');
  const workerDest = path.join(openNextDir, '_worker.js');
  if (fs.existsSync(workerSrc)) {
    fs.renameSync(workerSrc, workerDest);
    log('RENAME', 'Renamed worker.js → _worker.js');
  } else if (fs.existsSync(workerDest)) {
    log('RENAME', '_worker.js already exists — skipping rename');
  } else {
    throw new Error('Neither worker.js nor _worker.js found in .open-next/');
  }

  // 3b: Move contents of assets/ to root of .open-next/
  // Cloudflare Pages serves static files from the root of the deployment
  // directory. Files inside assets/ won't be found by the CDN.
  const assetsDir = path.join(openNextDir, 'assets');
  if (fs.existsSync(assetsDir)) {
    const entries = fs.readdirSync(assetsDir);
    for (const entry of entries) {
      // Skip macOS metadata files that shouldn't be deployed
      if (entry === '.DS_Store') continue;
      const src = path.join(assetsDir, entry);
      const dest = path.join(openNextDir, entry);
      // Skip if destination already exists (e.g. _next/ might already be there)
      if (!fs.existsSync(dest)) {
        fs.renameSync(src, dest);
        log('MOVE', `Moved assets/${entry} → ${entry}`);
      } else {
        // Merge: copy contents into existing directory
        const srcStat = fs.statSync(src);
        const destStat = fs.statSync(dest);
        if (srcStat.isDirectory() && destStat.isDirectory()) {
          // Recursively copy and then remove source
          fs.cpSync(src, dest, { recursive: true, force: true });
          log('MERGE', `Merged assets/${entry}/ → ${entry}/`);
        } else {
          // Overwrite file
          fs.copyFileSync(src, dest);
          log('OVERWRITE', `Overwrote ${entry} with assets/${entry}`);
        }
      }
    }
    // Remove the now-empty assets/ directory
    fs.rmSync(assetsDir, { recursive: true, force: true });
    log('CLEANUP', 'Removed empty assets/ directory');
  } else {
    log('ASSETS', 'No assets/ directory found — static files may already be at root');
  }

  // 3c: Also clean up the .open-next-deploy directory if it exists
  // (old build script created this; no longer needed)
  const oldDeployDir = path.join(process.cwd(), '.open-next-deploy');
  if (fs.existsSync(oldDeployDir)) {
    fs.rmSync(oldDeployDir, { recursive: true, force: true });
    log('CLEANUP', 'Removed obsolete .open-next-deploy/ directory');
  }

  log('BUILD_SUCCESS', 'Build completed successfully');

  console.log('✅ Cloudflare build completed successfully');
  console.log('   Output: .open-next/ (Cloudflare Pages compatible)');
  console.log('   Entry:  .open-next/_worker.js');
  console.log('   Static: .open-next/_next/static/, .open-next/wasm/, etc.');
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

