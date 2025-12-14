import 'server-only';

type RateState = { windowStartMs: number; count: number };
const rateState = new Map<string, RateState>();

function nowMs() {
  return Date.now();
}

function pickClientIp(req: Request): string {
  const h = req.headers;
  const xff = h.get('x-forwarded-for');
  if (xff) {
    const ip = xff.split(',')[0]?.trim();
    if (ip) return ip;
  }
  const candidates = [h.get('x-real-ip'), h.get('x-client-ip'), h.get('cf-connecting-ip'), h.get('true-client-ip')].filter(Boolean) as string[];
  return candidates[0] || 'unknown';
}

export function requireSameOrigin(req: Request): void {
  const origin = req.headers.get('origin');
  if (!origin) return; // some clients omit it; treat as same-origin
  const url = new URL(req.url);
  const expected = url.origin;
  if (origin !== expected) throw new Error('csrf_blocked');
}

export function rateLimit(req: Request, opts: { scope: string; limit: number; windowMs: number; key?: string }): void {
  const ip = pickClientIp(req);
  const k = `${opts.scope}:${opts.key || ip}`;
  const t = nowMs();
  const s = rateState.get(k);
  if (!s || t - s.windowStartMs >= opts.windowMs) {
    rateState.set(k, { windowStartMs: t, count: 1 });
    return;
  }
  s.count += 1;
  if (s.count > opts.limit) throw new Error('rate_limited');
}

