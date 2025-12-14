/**
 * Minimal smoke checks (no extra deps).
 *
 * Usage:
 *   1) Start dev server: npm run dev
 *   2) In another terminal: node scripts/smoke.js
 *
 * Note: Authenticated flows require a browser session (Firebase session cookie),
 * so this only checks unauthenticated behavior + endpoint availability.
 */

const ORIGIN = process.env.ORIGIN || 'http://localhost:3000';

async function must(path, opts = {}) {
  const url = `${ORIGIN}${path}`;
  const res = await fetch(url, { redirect: 'manual', ...opts });
  return res;
}

function ok(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  // Public pages
  ok((await must('/')).status < 500, 'GET / should not 5xx');
  ok((await must('/xfabric')).status < 500, 'GET /xfabric should not 5xx');
  ok((await must('/fabric')).status < 500, 'GET /fabric should not 5xx');

  // Public APIs
  ok((await must('/api/telegram/status', { cache: 'no-store' })).status === 200, 'GET /api/telegram/status');
  ok((await must('/api/archives', { cache: 'no-store' })).status === 200, 'GET /api/archives');
  ok((await must('/api/game-repositories', { cache: 'no-store' })).status === 200, 'GET /api/game-repositories');

  // Auth-required APIs should reject without session
  ok((await must('/api/user/apps', { cache: 'no-store' })).status === 401, 'GET /api/user/apps should 401');
  ok((await must('/api/user/settings', { cache: 'no-store' })).status === 401, 'GET /api/user/settings should 401');
  ok((await must('/api/cluster/peers', { cache: 'no-store' })).status === 401, 'GET /api/cluster/peers should 401');
  ok((await must('/api/ip', { cache: 'no-store' })).status === 401, 'GET /api/ip should 401');

  console.log('smoke: ok');
}

main().catch((e) => {
  console.error('smoke: failed:', e?.message || e);
  process.exit(1);
});

