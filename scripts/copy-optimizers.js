#!/usr/bin/env node
/**
 * Copy optimizer source files to public directory for serving.
 *
 * Flags:
 * - --if-missing: skip if already copied and unchanged
 * - --force: always recopy
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'optimizers');
const targetDir = path.join(__dirname, '..', 'public', 'optimizers');
const stampPath = path.join(targetDir, '.optimizers-stamp.json');

const ifMissing = process.argv.includes('--if-missing');
const force = process.argv.includes('--force');

function readTextSafe(p) {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

function readJsonSafe(p) {
  try {
    const t = readTextSafe(p);
    if (!t) return null;
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

try {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`Source directory ${sourceDir} does not exist, skipping...`);
    process.exit(0);
  }

  const srcStat = fs.statSync(sourceDir);
  const fingerprint = String(srcStat.mtimeMs);
  const prev = readJsonSafe(stampPath);

  if (ifMissing && !force && prev && prev.fingerprint === fingerprint && fs.existsSync(targetDir)) {
    console.log('✓ Optimizer files already copied');
    process.exit(0);
  }

  ensureDir(targetDir);
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true, dereference: true });

  fs.writeFileSync(
    stampPath,
    JSON.stringify({ fingerprint, copiedAt: Date.now(), node: process.version }, null, 2) + '\n',
    'utf8',
  );

  console.log('✓ Optimizer files copied to public directory');
} catch (error) {
  console.warn('Failed to copy optimizer files:', error?.message || error);
  // Don't fail the build if this fails
  process.exit(0);
}
