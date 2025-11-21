'use client';

import { useEffect, useState } from 'react';
import { VMManager } from '@/components/VMManager';
import { VMViewer } from '@/components/VMViewer';
import { VMType } from '@/lib/vm/types';
import { vmManager } from '@/lib/vm/manager';

export default function Home() {
  const [selectedVMId, setSelectedVMId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load all VMs on mount
    const loadVMs = async () => {
      try {
        await vmManager.loadAllVMs();
      } catch (error) {
        console.error('Failed to load VMs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadVMs();
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        color: '#888'
      }}>
        Loading Bellum...
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden'
    }}>
      <VMManager
        selectedVMId={selectedVMId}
        onSelectVM={setSelectedVMId}
        style={{
          width: '300px',
          borderRight: '1px solid #333',
          overflowY: 'auto'
        }}
      />
      <VMViewer
        vmId={selectedVMId}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
      />
    </div>
  );
}

