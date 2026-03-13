#!/usr/bin/env node
/**
 * Update _routes.json for Cloudflare Pages deployment
 * For static-only builds, we remove the worker entirely and serve static files directly
 */

const fs = require('fs');
const path = require('path');

const workerDir = path.join(process.cwd(), '.vercel/output/static/_worker.js');
const routesJsonPath = path.join(process.cwd(), '.vercel/output/static/_routes.json');

// Check if there are any functions (edge routes)
// If not, we should remove the worker and serve static files directly
const hasWorker = fs.existsSync(workerDir);
const nopBuildLogPath = path.join(workerDir, 'nop-build-log.json');
let hasFunctions = false;

if (hasWorker && fs.existsSync(nopBuildLogPath)) {
  try {
    const buildLog = JSON.parse(fs.readFileSync(nopBuildLogPath, 'utf8'));
    hasFunctions = buildLog.buildFiles?.functions?.edge?.length > 0 ||
                   buildLog.buildFiles?.functions?.middleware?.length > 0;
  } catch (e) {
    // If we can't parse, assume no functions
    hasFunctions = false;
  }
}

if (!hasFunctions && hasWorker) {
  // No edge functions - remove the worker to serve static files directly
  console.log('⚠️  No edge functions detected, removing worker for static-only deployment');
  fs.rmSync(workerDir, { recursive: true, force: true });
  if (fs.existsSync(routesJsonPath)) {
    fs.unlinkSync(routesJsonPath);
  }
  console.log('✅ Removed worker - static files will be served directly');
  process.exit(0);
}

if (!fs.existsSync(routesJsonPath)) {
  console.log('⚠️  _routes.json not found, skipping route update');
  process.exit(0);
}

const routes = JSON.parse(fs.readFileSync(routesJsonPath, 'utf8'));

// For Cloudflare Pages with Next.js static exports, we need to exclude static HTML files
// so they're served directly by Cloudflare Pages instead of going through the worker

// Ensure version is set (required by Cloudflare Pages)
if (!routes.version) {
  routes.version = 1;
}

// For static exports, exclude HTML files and static assets so they're served directly
// The worker will only handle API routes and dynamic content
const finalRoutes = {
  version: 1,
  include: ['/*'],
  exclude: [
    '/index.html',
    '/games.html',
    '/android.html',
    '/windows.html',
    '/ai.html',
    '/play.html',
    '/_not-found.html',
    '/games.json',
    '/sw.js',
    '/_next/*',
  ],
};

fs.writeFileSync(routesJsonPath, JSON.stringify(finalRoutes, null, 2));
console.log('✅ Updated _routes.json (Next.js worker handles all routes)');
console.log(`   Structure: version=${finalRoutes.version}, include=[${finalRoutes.include.length} items], exclude=[${finalRoutes.exclude.length} items]`);

// Also update _redirects file
// For Next.js on Cloudflare Pages, we should NOT use _redirects for routing
// The worker handles all routing. Only use _redirects for static assets if needed.
const redirectsPath = path.join(process.cwd(), '.vercel/output/static/_redirects');
const redirects = [
  '# Cloudflare Pages _redirects',
  '# Next.js worker handles all routing - no redirects needed',
  '# Static assets are served directly by Cloudflare Pages',
  '',
  '# Only specify static assets that should bypass the worker',
  '# (Usually not needed - worker can handle these too)',
].join('\n');

fs.writeFileSync(redirectsPath, redirects);
console.log('✅ Updated _redirects (Next.js worker handles all routes)');
