'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GpuLease, GpuWorkloadKind } from '@/lib/gpu-rental/types';
import { runGpuRentalCompute } from '@/lib/gpu-rental/client';

type LeaseResponse = { lease: GpuLease };

const workloadOptions: GpuWorkloadKind[] = [
  'ai_inference',
  'ai_training',
  'site_hosting',
  'batch_compute',
  'custom',
];

export default function GpuRentalClient() {
  const [leases, setLeases] = useState<GpuLease[]>([]);
  const [minutes, setMinutes] = useState(30);
  const [workload, setWorkload] = useState<GpuWorkloadKind>('ai_inference');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [computeResult, setComputeResult] = useState<string>('');

  const activeLease = useMemo(
    () => leases.find((lease) => lease.status === 'active') || null,
    [leases],
  );

  async function refresh() {
    const res = await fetch('/api/gpu-rental/leases', { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { leases: GpuLease[] };
    setLeases(data.leases);
  }

  useEffect(() => {
    refresh().catch(() => undefined);
  }, []);

  async function createLease() {
    setBusy(true);
    try {
      const res = await fetch('/api/gpu-rental/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes, workload, notes }),
      });
      if (res.ok) {
        const data = (await res.json()) as LeaseResponse;
        setLeases((prev) => [data.lease, ...prev]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function extendLease(id: string, extraMinutes: number) {
    setBusy(true);
    try {
      const res = await fetch(`/api/gpu-rental/leases/${id}/extend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: extraMinutes }),
      });
      if (res.ok) await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function releaseLease(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/gpu-rental/leases/${id}/release`, { method: 'POST' });
      if (res.ok) await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function runGpuJob() {
    setBusy(true);
    setComputeResult('');
    try {
      const result = await runGpuRentalCompute(1_000_000);
      setComputeResult(`GPU work: ${result.workItems.toLocaleString()} items in ${result.durationMs.toFixed(2)}ms`);
    } catch (err) {
      setComputeResult(err instanceof Error ? err.message : 'GPU job failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10 text-white">
      <h1 className="text-3xl font-semibold">GPU Rental</h1>
      <p className="mt-2 text-sm text-white/70">
        Request a time-boxed GPU lease, run compute tasks, and release when done.
      </p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-medium">Request a lease</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Minutes</label>
            <input
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              type="number"
              min={5}
              max={480}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Workload</label>
            <select
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              value={workload}
              onChange={(e) => setWorkload(e.target.value as GpuWorkloadKind)}
            >
              {workloadOptions.map((option) => (
                <option key={option} value={option}>
                  {option.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs uppercase tracking-widest text-white/60">Notes</label>
            <input
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <button
          className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
          onClick={createLease}
          disabled={busy}
        >
          Create lease
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-medium">Active lease</h2>
        {activeLease ? (
          <div className="mt-4">
            <div className="text-sm text-white/80">
              Lease <span className="font-mono">{activeLease.id}</span> · {activeLease.workload} · Expires{' '}
              {new Date(activeLease.expiresAt).toLocaleString()}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                onClick={() => extendLease(activeLease.id, 30)}
                disabled={busy}
              >
                Extend 30m
              </button>
              <button
                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20"
                onClick={() => releaseLease(activeLease.id)}
                disabled={busy}
              >
                Release
              </button>
              <button
                className="rounded-lg bg-emerald-500/80 px-4 py-2 text-sm hover:bg-emerald-500"
                onClick={runGpuJob}
                disabled={busy}
              >
                Run GPU task
              </button>
            </div>
            {computeResult && <div className="mt-3 text-sm text-emerald-200">{computeResult}</div>}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">No active lease.</p>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-medium">Lease history</h2>
        <div className="mt-4 grid gap-3">
          {leases.map((lease) => (
            <div key={lease.id} className="rounded-lg border border-white/10 bg-black/20 p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-mono">{lease.id}</span>
                <span className="text-white/60">{lease.status}</span>
              </div>
              <div className="text-white/60">
                {lease.workload} · {lease.minutes}m · {new Date(lease.expiresAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
