export type VirtualDhcpLease = {
  peerId: string;
  ipv4: string; // 10.0.0.x
  gateway: string; // 10.0.0.1
  dns: string; // 10.0.0.1 (virtual)
};

export type VirtualDhcpTable = {
  roomId: string;
  ssid: string;
  subnetCidr: string;
  gateway: string;
  dns: string;
  leases: VirtualDhcpLease[];
  computedAt: number;
};

export const DEFAULT_LOCALNET_SSID = 'LOCALNET';
export const DEFAULT_LOCALNET_SUBNET = '10.0.0.0/24';
export const DEFAULT_LOCALNET_GATEWAY = '10.0.0.1';
export const DEFAULT_LOCALNET_DNS = '10.0.0.1';

function uniqSorted(ids: string[]): string[] {
  return Array.from(new Set(ids.map((s) => String(s || '').trim()).filter(Boolean))).sort();
}

function ipForIndex(idx: number): string {
  // Reserve:
  // - .0 network
  // - .1 gateway/dns
  // leases start at .2
  const host = 2 + idx;
  // cap in /24: 2..254 inclusive => 253 addresses
  const safe = Math.max(2, Math.min(254, host));
  return `10.0.0.${safe}`;
}

export function computeVirtualDhcpTable(args: {
  roomId: string;
  peerIds: string[];
  ssid?: string;
}): VirtualDhcpTable {
  const roomId = String(args.roomId || '').trim();
  const ssid = String(args.ssid || DEFAULT_LOCALNET_SSID);

  const peers = uniqSorted(args.peerIds);

  const leases: VirtualDhcpLease[] = peers.map((peerId, i) => ({
    peerId,
    ipv4: ipForIndex(i),
    gateway: DEFAULT_LOCALNET_GATEWAY,
    dns: DEFAULT_LOCALNET_DNS,
  }));

  return {
    roomId,
    ssid,
    subnetCidr: DEFAULT_LOCALNET_SUBNET,
    gateway: DEFAULT_LOCALNET_GATEWAY,
    dns: DEFAULT_LOCALNET_DNS,
    leases,
    computedAt: Date.now(),
  };
}

export function findLease(table: VirtualDhcpTable, peerId: string): VirtualDhcpLease | null {
  const id = String(peerId || '').trim();
  return table.leases.find((l) => l.peerId === id) || null;
}












