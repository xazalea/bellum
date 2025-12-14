#!/usr/bin/env node
/**
 * Sync the upstream Cherri static site into public/unblocker.
 *
 * We keep Cherri as a git submodule (vendor/cherri) to avoid committing tens
 * of thousands of static files into this repo (which causes push timeouts).
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'vendor', 'cherri');
const targetDir = path.join(__dirname, '..', 'public', 'unblocker');

function rmRecursiveSafe(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === '.git') continue;
      copyRecursive(path.join(src, e.name), path.join(dest, e.name));
    }
    return;
  }
  fs.copyFileSync(src, dest);
}

try {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`Cherri submodule missing at ${sourceDir}.`);
    console.warn('Run: git submodule update --init --recursive');
    process.exit(0);
  }

  rmRecursiveSafe(targetDir);
  fs.mkdirSync(targetDir, { recursive: true });
  copyRecursive(sourceDir, targetDir);

  console.log('✓ Cherri synced to public/unblocker');
} catch (e) {
  console.warn('Failed to sync cherri:', e?.message || e);
  process.exit(0);
}
