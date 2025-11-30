'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#fff',
      padding: '2rem',
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0 0 1rem 0' }}>500</h1>
      <h2 style={{ fontSize: '2rem', margin: '0 0 1rem 0' }}>Something went wrong</h2>
      <p style={{ fontSize: '1.2rem', margin: '0 0 2rem 0', opacity: 0.8 }}>
        An error occurred while processing your request.
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '0.75rem 2rem',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'transform 0.2s',
          }}
        >
          Try Again
        </button>
        <Link 
          href="/"
          style={{
            padding: '0.75rem 2rem',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#fff',
            textDecoration: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            transition: 'transform 0.2s',
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}

