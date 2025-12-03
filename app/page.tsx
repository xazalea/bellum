'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/ui/design-system';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg.primary,
      color: colors.text.primary,
      overflow: 'hidden',
      paddingTop: '96px', // Added padding for Dynamic Island
    }}>
      {/* Hero Section */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '120px 24px',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <h1 style={{
          fontSize: 'clamp(64px, 10vw, 120px)',
          fontWeight: '800',
          marginBottom: '24px',
          letterSpacing: '-0.04em',
          background: `linear-gradient(to bottom right, ${colors.text.primary}, ${colors.text.secondary})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          lineHeight: 1,
        }}>
          nacho.
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(20px, 4vw, 28px)',
          color: colors.text.secondary,
          marginBottom: '48px',
          maxWidth: '600px',
          margin: '0 auto 64px',
          lineHeight: '1.5',
          fontWeight: '400',
        }}>
          Universal Static Recompiler.
          <br />
          <span style={{ color: colors.text.tertiary, fontSize: '0.8em' }}>
            Turn any binary into a web app. Instantly.
          </span>
        </p>

        {/* CTA Button */}
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            padding: '20px 60px',
            fontSize: '20px',
            fontWeight: '600',
            color: colors.bg.primary,
            backgroundColor: colors.accent.primary,
            border: 'none',
            borderRadius: '100px',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            boxShadow: `0 0 40px ${colors.accent.primary}40`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 0 60px ${colors.accent.primary}60`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 0 40px ${colors.accent.primary}40`;
          }}
        >
          Start Upload
        </button>

        {/* Feature Pills */}
        <div style={{
          marginTop: '80px',
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}>
          {['Windows .EXE', 'Android .APK', 'Linux .ELF', 'WASM Core'].map((tag) => (
            <div key={tag} style={{
              padding: '12px 24px',
              backgroundColor: colors.bg.secondary,
              border: `1px solid ${colors.border.secondary}`,
              borderRadius: '100px',
              color: colors.text.secondary,
              fontSize: '14px',
              fontWeight: '500',
            }}>
              {tag}
            </div>
          ))}
        </div>

        {/* Hero Video */}
        <div style={{
          marginTop: '80px',
          position: 'relative',
          borderRadius: '32px',
          overflow: 'hidden',
          border: `1px solid ${colors.border.primary}`,
          boxShadow: `0 20px 80px -20px ${colors.accent.primary}20`,
          maxWidth: '900px',
          margin: '80px auto 0',
        }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.2) 100%)',
            zIndex: 1,
            pointerEvents: 'none',
          }} />
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              background: colors.bg.secondary,
            }}
          >
            <source src="/back.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px',
        color: colors.text.tertiary,
        fontSize: '14px',
        borderTop: `1px solid ${colors.border.secondary}`,
      }}>
        <p>© 2024 nacho. Universal Runtime.</p>
      </footer>
    </div>
  );
}
