'use client';

import { Card } from '@/components/ui/Card';
import { ClusterIndicator } from '@/components/shell/ClusterIndicator';
import { Globe, Zap, ShieldCheck } from 'lucide-react';

export default function ClusterPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-10">
      <header className="space-y-1 border-b border-ocean-border pb-6 mb-10">
        <h1 className="text-2xl font-semibold text-ocean-primary tracking-tight">Cluster Status</h1>
        <p className="text-sm text-ocean-secondary">Distributed P2P compute network.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatusCard
          icon={<Globe className="w-5 h-5 text-ocean-accent" />}
          label="Global Nodes"
          value="1,248"
          subValue="+12 in last hour"
        />
        <StatusCard
          icon={<Zap className="w-5 h-5 text-ocean-accent" />}
          label="Total Throughput"
          value="84.2 GB/s"
          subValue="98.9% efficiency"
        />
        <StatusCard
          icon={<ShieldCheck className="w-5 h-5 text-ocean-accent" />}
          label="Network Health"
          value="Optimal"
          subValue="All shards synced"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-ocean-primary">Local Node</h3>
            <ClusterIndicator />
          </div>

          <div className="space-y-4">
            <ProgressBar label="CPU Utilization" percent={32} />
            <ProgressBar label="Memory Usage" percent={45} />
            <ProgressBar label="P2P Bandwidth" percent={12} />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="text-sm font-medium text-ocean-primary">Recent Activity</h3>
          <div className="space-y-3">
            <ActivityItem time="Just now" action="Shard #482 synchronized" />
            <ActivityItem time="2m ago" action="P2P connection with node 'Alpha'" />
            <ActivityItem time="5m ago" action="Discovery service updated" />
            <ActivityItem time="12m ago" action="New node joined from Tokyo, JP" />
          </div>
        </Card>
      </div>
    </main>
  );
}

function StatusCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue: string }) {
  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="p-2 rounded-md bg-ocean-accent/8 border border-ocean-accent/10">
        {icon}
      </div>
      <div>
        <p className="text-xs text-ocean-muted uppercase tracking-wider">{label}</p>
        <p className="text-xl font-semibold text-ocean-primary">{value}</p>
        <p className="text-[11px] text-ocean-accent mt-0.5">{subValue}</p>
      </div>
    </Card>
  );
}

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-ocean-muted">{label}</span>
        <span className="text-ocean-primary">{percent}%</span>
      </div>
      <div className="h-1 bg-ocean-bg rounded-full overflow-hidden">
        <div className="h-full bg-ocean-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ActivityItem({ time, action }: { time: string; action: string }) {
  return (
    <div className="flex gap-4 text-sm border-b border-ocean-border/50 pb-3 last:border-0 last:pb-0">
      <span className="text-ocean-muted min-w-[60px] text-xs">{time}</span>
      <span className="text-ocean-secondary text-xs">{action}</span>
    </div>
  );
}
