'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 30%, #2e0a4e 50%, #1a0a2e 70%, #0a0a0a 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 30%, rgba(255, 0, 255, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(0, 255, 255, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, rgba(138, 43, 226, 0.1) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        animation: 'pulse 4s ease-in-out infinite',
      }} />

      {/* Grid pattern overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(255, 0, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 0, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '80px 20px',
      }}>
        {/* Header */}
        <header style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '100px',
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 30px rgba(255, 0, 255, 0.5)',
          }}>
            nacho.
          </div>
          <nav style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
            <Link href="/dashboard" style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '16px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ff00ff';
              e.currentTarget.style.textShadow = '0 0 10px rgba(255, 0, 255, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.textShadow = 'none';
            }}
            >
              Dashboard
            </Link>
            <Link href="/games" style={{
              color: 'rgba(255, 255, 255, 0.8)',
              textDecoration: 'none',
              fontSize: '16px',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00ffff';
              e.currentTarget.style.textShadow = '0 0 10px rgba(0, 255, 255, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.textShadow = 'none';
            }}
            >
              Games
            </Link>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 30px rgba(255, 0, 255, 0.5)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(255, 0, 255, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 0, 255, 0.5)';
              }}
            >
              Get Started
            </button>
          </nav>
        </header>

        {/* Hero Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '120px',
        }}>
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 96px)',
            fontWeight: 'bold',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #ff00ff, #00ffff, #ff00ff)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'gradient 3s ease infinite',
            textShadow: '0 0 40px rgba(255, 0, 255, 0.5)',
          }}>
            nacho.
          </h1>
          <p style={{
            fontSize: 'clamp(20px, 3vw, 32px)',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '16px',
            fontWeight: '300',
          }}>
            Universal Static Recompiler
          </p>
          <p style={{
            fontSize: 'clamp(16px, 2vw, 24px)',
            color: 'rgba(255, 255, 255, 0.7)',
            maxWidth: '800px',
            margin: '0 auto 48px',
            lineHeight: '1.6',
          }}>
            Run Android, Windows, Linux, and popular games like Roblox, Fortnite, and Call of Duty directly in your browser. Zero lag. High performance. Unlimited storage.
          </p>
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                padding: '16px 48px',
                background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 40px rgba(255, 0, 255, 0.6)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 10px 50px rgba(255, 0, 255, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) translateY(0)';
                e.currentTarget.style.boxShadow = '0 0 40px rgba(255, 0, 255, 0.6)';
              }}
            >
              Launch Dashboard
            </button>
            <button
              onClick={() => router.push('/games')}
              style={{
                padding: '16px 48px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255, 0, 255, 0.5)',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '18px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 0, 255, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.8)';
                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 0, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.5)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              Browse Games
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '120px',
        }}>
          {[
            { title: 'Zero Lag Gaming', desc: 'Run Roblox, Fortnite, Call of Duty with zero lag', icon: '⚡' },
            { title: 'Universal Emulator', desc: 'Android, Windows, Linux all in one platform', icon: '🖥️' },
            { title: 'Unlimited Storage', desc: 'Never worry about storage limits again', icon: '☁️' },
            { title: 'High Performance', desc: 'Feels like a high-end gaming PC', icon: '🚀' },
            { title: 'Web-Based', desc: 'No downloads, runs entirely in your browser', icon: '🌐' },
            { title: 'Game Library', desc: 'Access thousands of games instantly', icon: '🎮' },
          ].map((feature, i) => (
            <div
              key={i}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))',
                backdropFilter: 'blur(20px)',
                border: '2px solid rgba(255, 0, 255, 0.3)',
                borderRadius: '16px',
                padding: '32px',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.6)';
                e.currentTarget.style.boxShadow = '0 10px 40px rgba(255, 0, 255, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'rgba(255, 0, 255, 0.3)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>{feature.icon}</div>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#fff',
              }}>{feature.title}</h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                lineHeight: '1.6',
              }}>{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '60px 20px',
          borderTop: '1px solid rgba(255, 0, 255, 0.2)',
        }}>
          <p style={{
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '14px',
          }}>
            © 2024 nacho. Universal Compiler Platform.
          </p>
        </footer>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
}
