'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/ui/design-system';

export default function DashboardPage() {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFile = useCallback((file: File) => {
    // In a real app, we'd upload this or store it in IndexedDB/Cache API
    // For now, we simulate the flow by passing the filename to the runner
    // Using a query param is a simplification; normally we'd use a persistent ID
    const fileId = encodeURIComponent(file.name);
    router.push(`/play?file=${fileId}`);
  }, [router]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg.primary,
      color: colors.text.primary,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '60px', textAlign: 'center' }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          background: `linear-gradient(to right, ${colors.accent.primary}, ${colors.accent.secondary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '16px',
          letterSpacing: '-0.02em',
        }}>
          nacho.
        </h1>
        <p style={{ color: colors.text.secondary, fontSize: '18px' }}>
          Universal Runtime Environment
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          width: '100%',
          maxWidth: '600px',
          height: '300px',
          backgroundColor: isDragging ? colors.bg.elevated : colors.bg.secondary,
          border: `2px dashed ${isDragging ? colors.accent.primary : colors.border.secondary}`,
          borderRadius: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          position: 'relative',
          boxShadow: isDragging ? `0 0 30px ${colors.accent.primary}20` : 'none',
        }}
      >
        <input 
          type="file" 
          style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
          onChange={(e) => e.target.files && handleFile(e.target.files[0])}
        />
        
        <div style={{ 
          fontSize: '64px', 
          marginBottom: '24px',
          opacity: isDragging ? 1 : 0.5,
          transition: 'opacity 0.2s',
        }}>
          📂
        </div>
        
        <h3 style={{ 
          fontSize: '20px', 
          fontWeight: '600', 
          marginBottom: '8px',
          color: colors.text.primary 
        }}>
          {isDragging ? 'Drop to Run' : 'Upload Executable'}
        </h3>
        
        <p style={{ 
          color: colors.text.tertiary,
          fontSize: '14px',
          textAlign: 'center',
          maxWidth: '300px',
          lineHeight: '1.5'
        }}>
          Supports .apk, .exe, .iso, .bin
          <br />
          Drag & Drop or Click to Browse
        </p>
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '40px', display: 'flex', gap: '24px', color: colors.text.tertiary, fontSize: '14px' }}>
        <span>Zero Lag</span>
        <span>•</span>
        <span>Matte UI</span>
        <span>•</span>
        <span>Universal Core</span>
      </div>
    </div>
  );
}
