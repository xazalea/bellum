#!/usr/bin/env node
/**
 * Cloudflare Pages build script
 * Runs next-on-pages and post-processes the output for Cloudflare compatibility.
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

log('START', 'Cloudflare Pages build started', { nodeVersion: process.version });

try {
  // Step 1: Check .env.local permissions
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

  // Step 2: Run next-on-pages (builds Next.js + converts for CF Pages)
  log('NEXT_ON_PAGES', 'Running next-on-pages');

  execSync('pnpm exec next-on-pages', {
    stdio: 'inherit',
    env: { ...process.env, CF_PAGES: '1' }
  });

  log('NEXT_ON_PAGES', 'next-on-pages completed successfully');

  // Step 3: Remove not-found function (served as static HTML by CF Pages)
  const notFoundFuncDir = path.join(process.cwd(), '.vercel/output/functions/_not-found.func');
  const notFoundRscFuncDir = path.join(process.cwd(), '.vercel/output/functions/_not-found.rsc.func');
  const notFoundPrerender = path.join(process.cwd(), '.vercel/output/functions/_not-found.prerender-config.json');
  const notFoundPrerenderFallback = path.join(process.cwd(), '.vercel/output/functions/_not-found.prerender-fallback.html');

  try {
    if (fs.existsSync(notFoundFuncDir)) {
      fs.rmSync(notFoundFuncDir, { recursive: true });
      log('REMOVE_NOTFOUND', 'Removed _not-found.func directory');
    }
    if (fs.existsSync(notFoundRscFuncDir)) {
      fs.rmSync(notFoundRscFuncDir, { recursive: true });
      log('REMOVE_NOTFOUND_RSC', 'Removed _not-found.rsc.func symlink');
    }
    if (fs.existsSync(notFoundPrerender)) {
      fs.unlinkSync(notFoundPrerender);
    }
    if (fs.existsSync(notFoundPrerenderFallback)) {
      fs.unlinkSync(notFoundPrerenderFallback);
    }
  } catch (err) {
    log('REMOVE_NOTFOUND_ERROR', 'Failed to remove _not-found', { error: err.message });
  }

  // Step 4: Copy static assets (public/ → .vercel/output/static/)
  log('COPY_STATIC', 'Copying static assets');
  execSync('node scripts/copy-static-assets.js', { stdio: 'inherit' });
  log('COPY_STATIC', 'Static assets copied');

  // Step 5: Update routes for CF Pages
  log('UPDATE_ROUTES', 'Updating routes');
  execSync('node scripts/update-routes.js', { stdio: 'inherit' });
  log('UPDATE_ROUTES', 'Routes updated');

  // Step 6: Patch async_hooks imports (polyfill for edge runtime)
  log('PATCH_ASYNC_HOOKS', 'Patching async_hooks imports');
  execSync('node scripts/patch-async-hooks.js', { stdio: 'inherit' });
  log('PATCH_ASYNC_HOOKS', 'async_hooks patched');

  log('BUILD_SUCCESS', 'Build completed successfully');

  console.log('✅ Cloudflare build completed successfully');
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
