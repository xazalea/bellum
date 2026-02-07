'use client';

import { Card } from '@/components/ui/Card';
import { ClusterIndicator } from '@/components/shell/ClusterIndicator';
import { Cpu, Globe, Zap, ShieldCheck } from 'lucide-react';

export default function ClusterPage() {
  return (
    <main className="mx-auto w-full max-w-7xl px-5 py-10">
      <header className="space-y-2 border-b border-nacho-border pb-6 mb-12">
        <h1 className="text-4xl font-bold text-nacho-primary tracking-tight">Cluster Status</h1>
        <p className="text-nacho-secondary text-lg">Distributed P2P compute network status.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <StatusCard
          icon={<Globe className="w-6 h-6 text-blue-400" />}
          label="Global Nodes"
          value="1,248"
          subValue="+12 in last hour"
        />
        <StatusCard
          icon={<Zap className="w-6 h-6 text-amber-400" />}
          label="Total Throughput"
          value="84.2 GB/s"
          subValue="98.9% efficiency"
        />
        <StatusCard
          icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
          label="Network Health"
          value="Optimal"
          subValue="All shards synced"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Local Node Status</h3>
            <ClusterIndicator />
          </div>

          <div className="space-y-4">
            <ProgressBar label="CPU Utilization" percent={32} />
            <ProgressBar label="Memory Usage" percent={45} />
            <ProgressBar label="P2P Bandwidth" percent={12} />
          </div>
        </Card>

        <Card className="p-8 space-y-6">
          <h3 className="text-xl font-bold">Recent Activity</h3>
          <div className="space-y-4">
            <ActivityItem time="Just now" action="Shard #482 synchronized" />
            <ActivityItem time="2 mins ago" action="P2P connection established with node 'Alpha'" />
            <ActivityItem time="5 mins ago" action="Discovery service updated" />
            <ActivityItem time="12 mins ago" action="New global node joined from Tokyo, JP" />
          </div>
        </Card>
      </div>
    </main>
  );
}

function StatusCard({ icon, label, value, subValue }: { icon: React.ReactNode; label: string; value: string; subValue: string }) {
  return (
    <Card className="p-6 flex items-center gap-6">
      <div className="p-3 rounded-xl bg-nacho-bg border border-nacho-border">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-nacho-muted uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-nacho-primary">{value}</p>
        <p className="text-[10px] text-nacho-accent mt-1">{subValue}</p>
      </div>
    </Card>
  );
}

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-nacho-secondary">{label}</span>
        <span className="text-nacho-primary font-bold">{percent}%</span>
      </div>
      <div className="h-1.5 bg-nacho-bg rounded-full overflow-hidden border border-nacho-border/50">
        <div className="h-full bg-nacho-accent" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}

function ActivityItem({ time, action }: { time: string; action: string }) {
  return (
    <div className="flex gap-4 text-sm border-b border-nacho-border/30 pb-3 last:border-0 last:pb-0">
      <span className="text-nacho-muted min-w-[80px]">{time}</span>
      <span className="text-nacho-secondary">{action}</span>
    </div>
  );
}
