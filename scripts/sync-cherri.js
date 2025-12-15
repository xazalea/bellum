#!/usr/bin/env node
/**
 * Sync the upstream Cherri static site into public/unblocker.
 *
 * We keep Cherri as a git submodule (vendor/cherri) to avoid committing tens
 * of thousands of static files into this repo.
 *
 * Flags:
 * - --if-missing: skip if already synced for current submodule commit
 * - --force: always resync
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'vendor', 'cherri');
const targetDir = path.join(__dirname, '..', 'public', 'unblocker');
const stampPath = path.join(targetDir, '.cherri-stamp.json');

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

function rmRecursiveSafe(p) {
  try {
    fs.rmSync(p, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function readGitHeadFromGitdir(gitdir) {
  const head = readTextSafe(path.join(gitdir, 'HEAD'));
  if (!head) return null;
  const s = head.trim();
  if (s.startsWith('ref:')) {
    const ref = s.replace(/^ref:\s*/, '').trim();
    const refText = readTextSafe(path.join(gitdir, ref));
    if (refText) return refText.trim();
    // packed-refs fallback not needed for typical submodules (detached HEAD)
    return null;
  }
  return s;
}

function tryReadSubmoduleHeadCommit(submoduleDir) {
  const dotGit = path.join(submoduleDir, '.git');
  if (!fs.existsSync(dotGit)) return null;
  const st = fs.statSync(dotGit);

  if (st.isDirectory()) return readGitHeadFromGitdir(dotGit);

  // Submodules typically have a .git file pointing to the actual gitdir
  if (st.isFile()) {
    const text = readTextSafe(dotGit);
    const m = text && text.match(/gitdir:\s*(.+)\s*/);
    if (!m) return null;
    const gitdir = path.resolve(submoduleDir, m[1]);
    return readGitHeadFromGitdir(gitdir);
  }

  return null;
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

try {
  if (!fs.existsSync(sourceDir)) {
    console.warn(`Cherri submodule missing at ${sourceDir}.`);
    console.warn('Run: git submodule update --init --recursive');
    process.exit(0);
  }

  const commit = tryReadSubmoduleHeadCommit(sourceDir) || 'unknown';
  const prev = readJsonSafe(stampPath);

  if (ifMissing && !force && prev && prev.commit === commit && fs.existsSync(targetDir)) {
    console.log('✓ Cherri already synced');
    process.exit(0);
  }

  // Full resync for correctness.
  rmRecursiveSafe(targetDir);
  ensureDir(targetDir);

  // Use cpSync for speed, but filter out any .git artifacts.
  fs.cpSync(sourceDir, targetDir, {
    recursive: true,
    force: true,
    dereference: true,
    filter: (src) => {
      const rel = path.relative(sourceDir, src);
      if (!rel) return true;
      if (rel === '.git') return false;
      if (rel.startsWith('.git' + path.sep)) return false;
      return true;
    },
  });

  fs.writeFileSync(
    stampPath,
    JSON.stringify({ commit, syncedAt: Date.now(), node: process.version }, null, 2) + '\n',
    'utf8',
  );

  console.log('✓ Cherri synced to public/unblocker');
} catch (e) {
  console.warn('Failed to sync cherri:', e?.message || e);
  process.exit(0);
}
