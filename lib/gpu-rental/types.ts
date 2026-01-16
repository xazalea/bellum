export type GpuWorkloadKind =
  | 'ai_inference'
  | 'ai_training'
  | 'site_hosting'
  | 'batch_compute'
  | 'custom';

export type GpuLeaseStatus = 'active' | 'expired' | 'released';

export interface GpuLease {
  id: string;
  userId: string;
  token: string;
  createdAt: string;
  expiresAt: string;
  status: GpuLeaseStatus;
  minutes: number;
  workload: GpuWorkloadKind;
  notes?: string;
}

export interface CreateLeaseRequest {
  minutes: number;
  workload: GpuWorkloadKind;
  notes?: string;
}

export interface ExtendLeaseRequest {
  minutes: number;
}
