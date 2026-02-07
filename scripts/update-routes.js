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

// Exclude static HTML files - let Cloudflare Pages serve them directly
const htmlExcludes = [
  '/*.html',
  '/index.html',
  '/games.html',
  '/account.html',
  '/ai.html',
  '/android.html',
  '/cluster.html',
  '/library.html',
  '/storage.html',
  '/virtual-machines.html',
  '/vps.html',
  '/windows.html',
  '/_not-found.html',
  '/404.html'
];

// Merge excludes
if (!routes.exclude) {
  routes.exclude = [];
}

const existingExcludes = new Set(routes.exclude);
htmlExcludes.forEach(exclude => {
  if (!existingExcludes.has(exclude)) {
    routes.exclude.push(exclude);
  }
});

fs.writeFileSync(routesJsonPath, JSON.stringify(routes, null, 2));
console.log('✅ Updated _routes.json to exclude static HTML files');

// Also update _redirects file to map routes without .html to .html files
const redirectsPath = path.join(process.cwd(), '.vercel/output/static/_redirects');
const redirects = [
  '# Cloudflare Pages redirects - map routes to .html files',
  '/ /index.html 200',
  '/games /games.html 200',
  '/account /account.html 200',
  '/ai /ai.html 200',
  '/android /android.html 200',
  '/cluster /cluster.html 200',
  '/library /library.html 200',
  '/storage /storage.html 200',
  '/virtual-machines /virtual-machines.html 200',
  '/vps /vps.html 200',
  '/windows /windows.html 200',
  '',
  '# Don\'t redirect static files',
  '/_next/* 200',
  '/favicon.ico 200',
  '/images/* 200',
  '/v86/* 200',
  '/wasm/* 200',
  '/games.xml 200',
  '/sw.js 200',
].join('\n');

fs.writeFileSync(redirectsPath, redirects);
console.log('✅ Updated _redirects to map routes to .html files');
