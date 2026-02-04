#!/usr/bin/env node
/**
 * Copy static assets to Cloudflare Pages output directory
 * This ensures public folder and static HTML files are included
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(process.cwd(), '.vercel/output/static');
const publicDir = path.join(process.cwd(), 'public');
const nextDir = path.join(process.cwd(), '.next');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Copy public folder to output
if (fs.existsSync(publicDir)) {
  console.log('📁 Copying public folder...');
  copyRecursiveSync(publicDir, outputDir);
}

// Copy static HTML files from .next/server/app to output
const nextAppDir = path.join(nextDir, 'server/app');
if (fs.existsSync(nextAppDir)) {
  console.log('📄 Copying static HTML files...');
  const htmlFiles = findHtmlFiles(nextAppDir);
  htmlFiles.forEach(file => {
    const relativePath = path.relative(nextAppDir, file);
    const destPath = path.join(outputDir, relativePath);
    const destDir = path.dirname(destPath);
    
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    
    fs.copyFileSync(file, destPath);
    console.log(`  ✓ Copied ${relativePath}`);
  });
}

// Copy Next.js static chunks (_next/static) - these are required for the app to work
const nextStaticDir = path.join(nextDir, 'static');
if (fs.existsSync(nextStaticDir)) {
  console.log('📦 Copying Next.js static chunks...');
  const nextStaticOutput = path.join(outputDir, '_next/static');
  copyRecursiveSync(nextStaticDir, nextStaticOutput);
  console.log('  ✓ Copied _next/static directory');
}

// Restore _routes.json to original format (worker handles all routes)
const routesJsonPath = path.join(outputDir, '_routes.json');
if (fs.existsSync(routesJsonPath)) {
  // Reset to original next-on-pages format
  const originalRoutes = {
    version: 1,
    description: "Built with @cloudflare/next-on-pages@1.13.16.",
    include: ["/*"],
    exclude: ["/_next/static/*"]
  };
  fs.writeFileSync(routesJsonPath, JSON.stringify(originalRoutes, null, 2));
  console.log('✅ Restored _routes.json to original format');
}

console.log('✅ Static assets copied successfully');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach(childItemName => {
      // Skip copying to avoid overwriting _worker.js
      if (childItemName === '_worker.js' || childItemName === '_routes.json') {
        return;
      }
      copyRecursiveSync(
        path.join(src, childItemName),
        path.join(dest, childItemName)
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function findHtmlFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...findHtmlFiles(fullPath));
    } else if (item.endsWith('.html')) {
      files.push(fullPath);
    }
  });
  
  return files;
}
