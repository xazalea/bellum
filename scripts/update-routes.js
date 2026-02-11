#!/usr/bin/env node
/**
 * Update _routes.json to exclude static HTML files
 * This must run AFTER next-on-pages since it overwrites _routes.json
 */

const fs = require('fs');
const path = require('path');

const routesJsonPath = path.join(process.cwd(), '.vercel/output/static/_routes.json');

if (!fs.existsSync(routesJsonPath)) {
  console.log('⚠️  _routes.json not found, skipping route update');
  process.exit(0);
}

const routes = JSON.parse(fs.readFileSync(routesJsonPath, 'utf8'));

// For Cloudflare Pages with Next.js, we want the worker to handle ALL routes
// Clear all exclusions so the Next.js worker handles everything, including the root route
// This ensures proper routing and prevents 404 errors

// Ensure version is set (required by Cloudflare Pages)
if (!routes.version) {
  routes.version = 1;
}

// Clear all exclusions - let Next.js worker handle all routes
routes.exclude = [];

// Optional: Only exclude truly static assets that never need Next.js processing
// But be careful - even these might need to go through Next.js for proper headers
// For now, exclude nothing to ensure everything works

// Ensure the structure is correct for Cloudflare Pages
// Format: { version: 1, exclude: [] }
// Empty exclude array means worker handles ALL routes
const finalRoutes = {
  version: 1,
  exclude: [], // Empty = worker handles everything (including root)
};

fs.writeFileSync(routesJsonPath, JSON.stringify(finalRoutes, null, 2));
console.log('✅ Updated _routes.json (Next.js worker handles all routes)');
console.log(`   Structure: version=${finalRoutes.version}, exclude=[${finalRoutes.exclude.length} items]`);

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
