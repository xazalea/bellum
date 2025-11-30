#!/usr/bin/env node
/**
 * Copy optimizer source files to public directory for serving
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'optimizers');
const targetDir = path.join(__dirname, '..', 'public', 'optimizers');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`Source directory ${src} does not exist, skipping...`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  copyRecursive(sourceDir, targetDir);
  console.log('✓ Optimizer files copied to public directory');
} catch (error) {
  console.warn('Failed to copy optimizer files:', error.message);
  // Don't fail the build if this fails
  process.exit(0);
}

