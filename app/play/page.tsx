
'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { colors } from '@/lib/ui/design-system';
import { AppRunner } from '@/components/AppRunner';

function PlayContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fileName = searchParams.get('file');

  if (!fileName) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        No file selected.
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black">
        <AppRunner 
            filePath={fileName} 
            onExit={() => router.push('/dashboard')}
        />
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div style={{ backgroundColor: '#000', height: '100vh' }} />}>
      <PlayContent />
    </Suspense>
  );
}
