'use client';

import { useState, useEffect } from 'react';

interface MetricCardProps {
  label: string;
  value: string;
  unit: string;
  percentage: number;
  icon: React.ReactNode;
  color?: string;
}

export function MetricCard({ label, value, unit, percentage, icon, color }: MetricCardProps) {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const barColor = color || 'hsl(var(--primary))';
  const clampedPercentage = Math.min(100, Math.max(0, percentage));

  return (
    <div className="p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-muted-foreground/50">{icon}</div>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">
            {label}
          </span>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </span>
          <span className="text-[10px] text-muted-foreground/50 ml-0.5">{unit}</span>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: animated ? `${clampedPercentage}%` : '0%',
            backgroundColor: barColor,
          }}
        />
      </div>
    </div>
  );
}

export function CPUMonitor() {
  // Simulated CPU usage - in production this would read from actual metrics
  const [cpuUsage, setCpuUsage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCpuUsage(prev => {
        const delta = (Math.random() - 0.5) * 20;
        return Math.min(100, Math.max(0, prev + delta));
      });
    }, 2000);
    setCpuUsage(30 + Math.random() * 25);
    return () => clearInterval(interval);
  }, []);

  return (
    <MetricCard
      label="CPU"
      value={Math.round(cpuUsage).toString()}
      unit="%"
      percentage={cpuUsage}
      color={cpuUsage > 80 ? 'hsl(0 72% 51%)' : cpuUsage > 50 ? 'hsl(38 92% 50%)' : 'hsl(142 71% 45%)'}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <rect x="9" y="9" width="6" height="6" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
        </svg>
      }
    />
  );
}

export function RAMMonitor() {
  const [ramUsage, setRamUsage] = useState(0);
  const totalMB = 512;

  useEffect(() => {
    const interval = setInterval(() => {
      setRamUsage(prev => {
        const delta = (Math.random() - 0.5) * 30;
        return Math.min(totalMB, Math.max(0, prev + delta));
      });
    }, 3000);
    setRamUsage(180 + Math.random() * 80);
    return () => clearInterval(interval);
  }, []);

  const usedMB = Math.round(ramUsage);
  const percentage = (ramUsage / totalMB) * 100;

  return (
    <MetricCard
      label="RAM"
      value={usedMB.toString()}
      unit={`/ ${totalMB}MB`}
      percentage={percentage}
      color={percentage > 80 ? 'hsl(0 72% 51%)' : percentage > 50 ? 'hsl(38 92% 50%)' : 'hsl(210 90% 55%)'}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 19v-4M10 19v-8M14 19v-6M18 19v-2M4 22h16" />
          <rect x="3" y="6" width="18" height="4" rx="1" />
        </svg>
      }
    />
  );
}

export function LatencyMonitor() {
  const [latency, setLatency] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLatency(prev => {
        const delta = (Math.random() - 0.5) * 15;
        return Math.min(200, Math.max(5, prev + delta));
      });
    }, 1500);
    setLatency(20 + Math.random() * 30);
    return () => clearInterval(interval);
  }, []);

  const ms = Math.round(latency);
  const percentage = Math.min(100, (latency / 200) * 100);

  return (
    <MetricCard
      label="Latency"
      value={ms.toString()}
      unit="ms"
      percentage={percentage}
      color={latency > 100 ? 'hsl(0 72% 51%)' : latency > 50 ? 'hsl(38 92% 50%)' : 'hsl(142 71% 45%)'}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      }
    />
  );
}

export function FPSMonitor() {
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFps(prev => {
        const delta = (Math.random() - 0.5) * 8;
        return Math.min(120, Math.max(0, prev + delta));
      });
    }, 1000);
    setFps(35 + Math.random() * 15);
    return () => clearInterval(interval);
  }, []);

  const percentage = (fps / 60) * 100;

  return (
    <MetricCard
      label="FPS"
      value={Math.round(fps).toString()}
      unit="/ 60"
      percentage={Math.min(100, percentage)}
      color={fps < 20 ? 'hsl(0 72% 51%)' : fps < 40 ? 'hsl(38 92% 50%)' : 'hsl(142 71% 45%)'}
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12h4M6 12a6 6 0 0112 0M18 12h4" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      }
    />
  );
}
