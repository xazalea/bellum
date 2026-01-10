export type VirtualDnsRecord = {
  name: string; // e.g. chat.local
  target: { kind: 'ipv4' | 'ipv6' | 'service'; value: string };
  updatedAt: number;
};

export type VirtualDnsTable = {
  roomId: string;
  records: VirtualDnsRecord[];
  updatedAt: number;
};

function normalizeName(name: string): string {
  const n = String(name || '').trim().toLowerCase();
  if (!n) return '';
  // Keep it simple: allow letters, numbers, dots, hyphens. Enforce suffix .local
  const safe = n.replace(/[^a-z0-9.-]/g, '');
  if (!safe.endsWith('.local')) return `${safe}.local`;
  return safe;
}

function readTable(roomId: string): VirtualDnsTable {
  try {
    const raw = window.localStorage.getItem(`bellum.lan.dns.v1:${roomId}`);
    if (!raw) return { roomId, records: [], updatedAt: Date.now() };
    const j = JSON.parse(raw) as any;
    const recs = Array.isArray(j?.records) ? j.records : [];
    return {
      roomId,
      updatedAt: typeof j?.updatedAt === 'number' ? j.updatedAt : Date.now(),
      records: recs
        .map((r: any) => ({
          name: normalizeName(r?.name),
          target: r?.target && typeof r.target === 'object' ? r.target : { kind: 'service', value: '' },
          updatedAt: typeof r?.updatedAt === 'number' ? r.updatedAt : Date.now(),
        }))
        .filter((r: VirtualDnsRecord) => !!r.name && !!r.target?.value),
    };
  } catch {
    return { roomId, records: [], updatedAt: Date.now() };
  }
}

function writeTable(table: VirtualDnsTable) {
  try {
    window.localStorage.setItem(`bellum.lan.dns.v1:${table.roomId}`, JSON.stringify(table));
  } catch {
    // ignore
  }
}

export function listDnsRecords(roomId: string): VirtualDnsRecord[] {
  const t = readTable(roomId);
  return t.records.slice().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function upsertDnsRecord(roomId: string, record: Omit<VirtualDnsRecord, 'updatedAt'>): VirtualDnsRecord {
  const t = readTable(roomId);
  const name = normalizeName(record.name);
  const next: VirtualDnsRecord = { name, target: record.target, updatedAt: Date.now() };
  const idx = t.records.findIndex((r) => r.name === name);
  if (idx >= 0) t.records[idx] = next;
  else t.records.unshift(next);
  t.updatedAt = Date.now();
  t.records = t.records.slice(0, 256);
  writeTable(t);
  return next;
}

export function removeDnsRecord(roomId: string, name: string): void {
  const t = readTable(roomId);
  const n = normalizeName(name);
  t.records = t.records.filter((r) => r.name !== n);
  t.updatedAt = Date.now();
  writeTable(t);
}

export function resolveDns(roomId: string, name: string): VirtualDnsRecord | null {
  const n = normalizeName(name);
  const t = readTable(roomId);
  return t.records.find((r) => r.name === n) || null;
}













