import { GpuLease, CreateLeaseRequest, ExtendLeaseRequest } from './types';

const leases = new Map<string, GpuLease>();

const MAX_MINUTES = 8 * 60;
const MIN_MINUTES = 5;

function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return MIN_MINUTES;
  return Math.max(MIN_MINUTES, Math.min(MAX_MINUTES, Math.floor(minutes)));
}

function nowIso(): string {
  return new Date().toISOString();
}

function addMinutes(base: Date, minutes: number): Date {
  return new Date(base.getTime() + minutes * 60_000);
}

export function createLease(userId: string, input: CreateLeaseRequest): GpuLease {
  const minutes = clampMinutes(input.minutes);
  const createdAt = new Date();
  const expiresAt = addMinutes(createdAt, minutes);
  const id = crypto.randomUUID();
  const token = crypto.randomUUID();
  const lease: GpuLease = {
    id,
    userId,
    token,
    createdAt: createdAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: 'active',
    minutes,
    workload: input.workload,
    notes: input.notes,
  };
  leases.set(id, lease);
  return lease;
}

export function listLeasesForUser(userId: string): GpuLease[] {
  return Array.from(leases.values()).filter((lease) => lease.userId === userId);
}

export function getLease(id: string): GpuLease | null {
  return leases.get(id) ?? null;
}

export function extendLease(id: string, input: ExtendLeaseRequest): GpuLease | null {
  const lease = leases.get(id);
  if (!lease) return null;
  if (lease.status !== 'active') return null;
  const minutes = clampMinutes(input.minutes);
  const newExpiry = addMinutes(new Date(lease.expiresAt), minutes);
  const updated: GpuLease = {
    ...lease,
    minutes: lease.minutes + minutes,
    expiresAt: newExpiry.toISOString(),
  };
  leases.set(id, updated);
  return updated;
}

export function releaseLease(id: string): GpuLease | null {
  const lease = leases.get(id);
  if (!lease) return null;
  const updated: GpuLease = { ...lease, status: 'released' };
  leases.set(id, updated);
  return updated;
}

export function validateLeaseToken(token: string): GpuLease | null {
  for (const lease of leases.values()) {
    if (lease.token === token) {
      if (lease.status !== 'active') return null;
      if (new Date(lease.expiresAt).getTime() <= Date.now()) {
        lease.status = 'expired';
        leases.set(lease.id, lease);
        return null;
      }
      return lease;
    }
  }
  return null;
}
