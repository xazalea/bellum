'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Link2, Network, PlugZap, Users, Server, Cpu, Globe2 } from 'lucide-react';
import { AetherLanRoom, randomRoomId } from '@/lib/lan/aetherlan';
import { virtualIpv6Overlay } from '@/lib/nacho/networking/virtual-ipv6';
import { DEFAULT_LOCALNET_GATEWAY, DEFAULT_LOCALNET_SSID } from '@/lib/lan/dhcp';
import { listDnsRecords, removeDnsRecord, upsertDnsRecord, type VirtualDnsRecord } from '@/lib/lan/dns';
import { addAllowlistEntry, getRoomAllowlist, removeAllowlistEntry, setRoomAllowlist } from '@/lib/security/allowlist';

export function AetherLanPanel() {
  const [roomId, setRoomId] = useState<string>(() => {
    try {
      return window.localStorage.getItem('bellum.lan.room') || '';
    } catch {
      return '';
    }
  });
  const [room, setRoom] = useState<AetherLanRoom | null>(null);
  const [status, setStatus] = useState<string>('offline');
  const [err, setErr] = useState<string | null>(null);
  const [manualPeerId, setManualPeerId] = useState<string>('');

  const localPeerId = useMemo(() => room?.getLocalPeerId() ?? null, [room]);
  const peers = useMemo(() => room?.listPeers() ?? [], [room, status]);
  const localV6 = useMemo(() => virtualIpv6Overlay?.getLocalIpv6?.() ?? null, [status]);
  const dhcp = useMemo(() => (room ? room.getDhcpTable() : null), [room, status, peers.length]);
  const localLease = useMemo(() => {
    if (!dhcp || !localPeerId) return null;
    return dhcp.leases.find((l) => l.peerId === localPeerId) || null;
  }, [dhcp, localPeerId]);

  const [dnsName, setDnsName] = useState('chat.local');
  const [dnsTarget, setDnsTarget] = useState('10.0.0.10');
  const dnsRecords = useMemo(() => {
    if (!roomId.trim()) return [] as VirtualDnsRecord[];
    return listDnsRecords(roomId.trim());
  }, [roomId, status]);

  const [lanAllowEnabled, setLanAllowEnabled] = useState(false);
  const [lanAllowEntry, setLanAllowEntry] = useState('*.localnet');
  const [lanAllowEntries, setLanAllowEntries] = useState<string[]>([]);

  useEffect(() => {
    const rid = roomId.trim();
    if (!rid) return;
    const p = getRoomAllowlist(rid);
    setLanAllowEnabled(!!p.enabled);
    setLanAllowEntries(Array.isArray(p.entries) ? p.entries : []);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;
    try {
      window.localStorage.setItem('bellum.lan.room', roomId);
    } catch {
      // ignore
    }
  }, [roomId]);

  const start = async () => {
    setErr(null);
    try {
      const id = roomId.trim() || randomRoomId();
      setRoomId(id);
      const r = new AetherLanRoom(id);
      setRoom(r);
      setStatus('booting');
      await r.start();
      setStatus('online');
    } catch (e: any) {
      setErr(e?.message || 'failed_to_start');
      setStatus('offline');
    }
  };

  const stop = () => {
    room?.stop();
    setRoom(null);
    setStatus('offline');
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-24 space-y-6 min-h-screen">
      <div className="bellum-card p-7 border-2 border-white/10">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold">AetherLAN</div>
            <div className="text-3xl font-extrabold tracking-tight text-white mt-2">LOCALNET Router (virtual)</div>
            <div className="text-sm text-white/55 mt-2 max-w-3xl">
              A private, LAN-like fabric with virtual DHCP, DNS, and policy. It feels like a router, but runs as an overlay.
              Everyone connected contributes compute/ingress automatically while the UI stays latency-free.
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl border-2 border-white/10 bg-white/5 flex items-center justify-center">
            <Network size={20} className="text-[rgb(186,187,241)]" />
          </div>
        </div>
      </div>

      {err && <div className="text-sm text-red-200 bg-red-500/10 border-2 border-red-400/20 rounded-xl p-3">{err}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bellum-card p-6 border-2 border-white/10 space-y-4">
          <div className="text-sm font-bold text-white/90">Room</div>
          <div className="text-xs text-white/55">
            Share the room id with nearby users. This does not change router DNS or control Wi‑Fi; it’s a browser overlay network.
          </div>
          <div className="flex gap-2">
            <input
              className="bellum-input font-mono"
              placeholder="room id"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold" onClick={() => setRoomId(randomRoomId())}>
              New
            </button>
          </div>

          <div className="flex items-center gap-2">
            {status !== 'online' ? (
              <button className="bellum-btn inline-flex items-center gap-2" onClick={() => void start()}>
                <PlugZap size={16} /> Start
              </button>
            ) : (
              <button className="bellum-btn bellum-btn-secondary inline-flex items-center gap-2" onClick={stop}>
                Stop
              </button>
            )}
            <button
              className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold inline-flex items-center gap-2"
              onClick={() => copy(roomId)}
              disabled={!roomId}
            >
              <Copy size={14} /> Copy room
            </button>
          </div>

          <div className="rounded-2xl border-2 border-white/10 bg-black/20 p-4">
            <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Router Identity</div>
            <div className="mt-2 text-xs text-white/55">
              peerId: <span className="font-mono text-white/80">{localPeerId ?? '—'}</span>
            </div>
            <div className="mt-1 text-xs text-white/55">
              v6: <span className="font-mono text-white/80">{localV6 ?? '—'}</span>
            </div>
            <div className="mt-1 text-xs text-white/55">
              ipv4: <span className="font-mono text-white/80">{localLease?.ipv4 ?? '—'}</span>
            </div>
            <div className="mt-1 text-xs text-white/55">
              gateway: <span className="font-mono text-white/80">{DEFAULT_LOCALNET_GATEWAY}</span>
            </div>
          </div>
        </div>

        <div className="bellum-card p-6 border-2 border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-white/90">Peers</div>
            <div className="text-xs font-mono text-white/60">{peers.length}</div>
          </div>

          <div className="flex gap-2">
            <input
              className="bellum-input font-mono"
              placeholder="peerId to connect"
              value={manualPeerId}
              onChange={(e) => setManualPeerId(e.target.value)}
            />
            <button
              className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-sm font-bold inline-flex items-center gap-2"
              onClick={() => void room?.connectToPeer(manualPeerId.trim())}
              disabled={!manualPeerId.trim() || !room}
            >
              <Link2 size={14} /> Connect
            </button>
          </div>

          <div className="rounded-2xl border-2 border-white/10 overflow-hidden">
            <div className="bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-white/40 font-bold flex items-center gap-2">
              <Users size={14} /> Membership
            </div>
            <div className="divide-y divide-white/10">
              {peers.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/45 text-sm">No peers yet. Share the room id.</div>
              ) : (
                peers.map((p) => (
                  <div key={p.peerId} className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="font-mono text-xs text-white/80 truncate">{p.peerId}</div>
                    <button
                      className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold"
                      onClick={() => copy(p.peerId)}
                    >
                      Copy
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bellum-card p-6 border-2 border-white/10 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-white/90">
            <Server size={16} /> Services (catalog)
          </div>
          <div className="text-xs text-white/55">
            These are LOCALNET-native services we can host inside the platform and route via virtual DNS.
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              { id: 'chat', icon: Globe2, name: 'chat.local', desc: 'Room chat (planned endpoint)' },
              { id: 'files', icon: Server, name: 'files.local', desc: 'File drop/share (planned endpoint)' },
              { id: 'llm', icon: Cpu, name: 'llm.local', desc: 'Local LLM gateway (planned endpoint)' },
            ].map((s) => (
              <div key={s.id} className="rounded-2xl border-2 border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <s.icon size={14} className="text-white/70" />
                    <div className="font-mono text-xs text-white/80 truncate">{s.name}</div>
                  </div>
                  <button
                    className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold"
                    onClick={() => {
                      if (!roomId.trim()) return;
                      upsertDnsRecord(roomId.trim(), { name: s.name, target: { kind: 'service', value: s.id } });
                    }}
                    disabled={!roomId.trim()}
                  >
                    Register
                  </button>
                </div>
                <div className="text-xs text-white/45 mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bellum-card p-6 border-2 border-white/10 space-y-3">
          <div className="text-sm font-bold text-white/90">Router summary</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border-2 border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-widest text-white/40 font-bold">SSID</div>
              <div className="mt-2 font-mono text-sm text-white/80">{DEFAULT_LOCALNET_SSID}</div>
              <div className="text-xs text-white/45 mt-1">(cosmetic)</div>
            </div>
            <div className="rounded-2xl border-2 border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Gateway</div>
              <div className="mt-2 font-mono text-sm text-white/80">{DEFAULT_LOCALNET_GATEWAY}</div>
              <div className="text-xs text-white/45 mt-1">virtual</div>
            </div>
            <div className="rounded-2xl border-2 border-white/10 bg-black/20 p-4">
              <div className="text-xs uppercase tracking-widest text-white/40 font-bold">Clients</div>
              <div className="mt-2 font-mono text-sm text-white/80">{dhcp ? dhcp.leases.length : 0}</div>
              <div className="text-xs text-white/45 mt-1">leases</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bellum-card p-6 border-2 border-white/10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white/90">Virtual DHCP</div>
            <div className="text-xs text-white/55 mt-1">
              SSID: <span className="font-mono text-white/80">{DEFAULT_LOCALNET_SSID}</span> • subnet <span className="font-mono text-white/80">10.0.0.0/24</span>
            </div>
          </div>
          <div className="text-xs font-mono text-white/60">{dhcp ? dhcp.leases.length : 0} leases</div>
        </div>
        <div className="mt-4 rounded-2xl border-2 border-white/10 overflow-hidden">
          <div className="grid grid-cols-[220px_120px_1fr_110px] bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-white/40 font-bold">
            <div>Peer</div>
            <div>IPv4</div>
            <div>Role</div>
            <div>Actions</div>
          </div>
          <div className="divide-y divide-white/10">
            {!dhcp ? (
              <div className="px-4 py-8 text-center text-white/45 text-sm">Start the room to allocate leases.</div>
            ) : (
              dhcp.leases.map((l) => (
                <div key={l.peerId} className="grid grid-cols-[220px_120px_1fr_110px] px-4 py-3 items-center gap-3">
                  <div className="font-mono text-xs text-white/80 truncate">{l.peerId}</div>
                  <div className="font-mono text-xs text-white/80">{l.ipv4}</div>
                  <div className="text-xs text-white/55">{l.peerId === localPeerId ? 'this device' : 'peer'}</div>
                  <button
                    className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold"
                    onClick={() => copy(`${l.peerId} ${l.ipv4}`)}
                  >
                    Copy
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bellum-card p-6 border-2 border-white/10 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-bold text-white/90">Virtual DNS</div>
              <div className="text-xs text-white/55 mt-1">
                Records are local-to-room and used by LOCALNET apps/services inside Nacho/Fabrik.
              </div>
            </div>
            <div className="text-xs font-mono text-white/60">{dnsRecords.length} records</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px] gap-2">
            <input className="bellum-input font-mono" value={dnsName} onChange={(e) => setDnsName(e.target.value)} placeholder="name.local" />
            <input className="bellum-input font-mono" value={dnsTarget} onChange={(e) => setDnsTarget(e.target.value)} placeholder="10.0.0.10 or v6 or serviceId" />
            <button
              className="bellum-btn"
              disabled={!roomId.trim() || !dnsName.trim() || !dnsTarget.trim()}
              onClick={() => {
                const v = dnsTarget.trim();
                const kind = v.includes(':') ? 'ipv6' : v.startsWith('10.') ? 'ipv4' : 'service';
                upsertDnsRecord(roomId.trim(), { name: dnsName.trim(), target: { kind: kind as any, value: v } });
                setDnsName('chat.local');
                setDnsTarget('10.0.0.10');
              }}
            >
              Save
            </button>
          </div>

          <div className="rounded-2xl border-2 border-white/10 overflow-hidden">
            <div className="grid grid-cols-[1fr_1fr_110px] bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-white/40 font-bold">
              <div>Name</div>
              <div>Target</div>
              <div>Actions</div>
            </div>
            <div className="divide-y divide-white/10">
              {dnsRecords.length === 0 ? (
                <div className="px-4 py-8 text-center text-white/45 text-sm">No DNS records yet.</div>
              ) : (
                dnsRecords.map((r) => (
                  <div key={r.name} className="grid grid-cols-[1fr_1fr_110px] px-4 py-3 items-center gap-3">
                    <div className="font-mono text-xs text-white/80 truncate">{r.name}</div>
                    <div className="font-mono text-xs text-white/70 truncate">
                      {r.target.kind}:{r.target.value}
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold"
                        onClick={() => copy(`${r.name} -> ${r.target.kind}:${r.target.value}`)}
                      >
                        Copy
                      </button>
                      <button
                        className="px-3 py-2 rounded-xl border-2 border-red-400/20 hover:border-red-300/40 bg-red-500/10 hover:bg-red-500/15 transition-all text-xs font-bold"
                        onClick={() => removeDnsRecord(roomId.trim(), r.name)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="bellum-card p-6 border-2 border-white/10 space-y-4">
          <div className="text-sm font-bold text-white/90">Gateway (virtual)</div>
          <div className="text-xs text-white/55">
            LOCALNET gateway is a virtual concept inside the overlay. Services can bind names and ports to routes.
          </div>
          <div className="rounded-2xl border-2 border-white/10 bg-black/20 p-4">
            <div className="text-xs text-white/55">
              gateway: <span className="font-mono text-white/80">{DEFAULT_LOCALNET_GATEWAY}</span>
            </div>
            <div className="text-xs text-white/55 mt-1">
              dns: <span className="font-mono text-white/80">{DEFAULT_LOCALNET_GATEWAY}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bellum-card p-6 border-2 border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-white/90">Allowlist (room)</div>
            <div className="text-xs text-white/55 mt-1">
              Applies to LOCALNET internal proxying surfaces for this room. Same-origin + LOCALNET ranges always work.
            </div>
          </div>
          <button
            type="button"
            className={`w-14 h-7 rounded-full border-2 transition-all ${
              lanAllowEnabled ? 'bg-sky-200/40 border-sky-200/40' : 'bg-white/5 border-white/20'
            }`}
            aria-pressed={lanAllowEnabled}
            aria-label="Enable room allowlist"
            onClick={() => {
              const rid = roomId.trim();
              if (!rid) return;
              const next = !lanAllowEnabled;
              setLanAllowEnabled(next);
              const cur = getRoomAllowlist(rid);
              setRoomAllowlist(rid, { ...cur, enabled: next });
            }}
          >
            <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${lanAllowEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>

        <div className="flex gap-2">
          <input className="bellum-input font-mono" value={lanAllowEntry} onChange={(e) => setLanAllowEntry(e.target.value)} placeholder="example.com / *.example.com / https://example.com" />
          <button
            className="bellum-btn"
            disabled={!roomId.trim() || !lanAllowEntry.trim()}
            onClick={() => {
              const rid = roomId.trim();
              if (!rid) return;
              const next = addAllowlistEntry(rid, lanAllowEntry);
              setLanAllowEntries(next.entries);
              setLanAllowEntry('*.localnet');
            }}
          >
            Add
          </button>
        </div>

        <div className="rounded-2xl border-2 border-white/10 overflow-hidden">
          <div className="grid grid-cols-[1fr_140px] bg-white/5 border-b border-white/10 px-4 py-3 text-xs uppercase tracking-widest text-white/40 font-bold">
            <div>Entry</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-white/10">
            {lanAllowEntries.length === 0 ? (
              <div className="px-4 py-6 text-center text-white/45 text-sm">No entries.</div>
            ) : (
              lanAllowEntries.map((e) => (
                <div key={e} className="grid grid-cols-[1fr_140px] px-4 py-3 items-center gap-3">
                  <div className="font-mono text-xs text-white/80 truncate">{e}</div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      className="px-3 py-2 rounded-xl border-2 border-white/10 hover:border-white/25 bg-white/5 hover:bg-white/10 transition-all text-xs font-bold"
                      onClick={() => copy(e)}
                    >
                      Copy
                    </button>
                    <button
                      className="px-3 py-2 rounded-xl border-2 border-red-400/20 hover:border-red-300/40 bg-red-500/10 hover:bg-red-500/15 transition-all text-xs font-bold"
                      onClick={() => {
                        const rid = roomId.trim();
                        if (!rid) return;
                        const next = removeAllowlistEntry(rid, e);
                        setLanAllowEntries(next.entries);
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-white/45">
        Note: “hotspot” and router DNS changes aren’t available from a web browser for security reasons. This panel creates the same *experience* (joinable LAN + shared services) using the overlay network.
      </motion.div>
    </div>
  );
}


