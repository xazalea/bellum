'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { VMType } from '@/lib/vm/types';

export default function DashboardPage() {
  const router = useRouter();
  const [vms, setVms] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVMs: 0,
    runningVMs: 0,
    totalStorage: '0 GB',
    gamesInstalled: 0,
  });

  useEffect(() => {
    // Load VMs
    import('@/lib/vm/manager').then(({ vmManager }) => {
      const vmList = vmManager.listVMs();
      setVms(vmList);
      setStats({
        totalVMs: vmList.length,
        runningVMs: vmList.filter(vm => vm.state.isRunning).length,
        totalStorage: '∞', // Unlimited storage
        gamesInstalled: 0, // TODO: Load from game library
      });
    });
  }, []);

  const emulatorTypes = [
    { type: VMType.ANDROID, name: 'Android', icon: '🤖', color: '#00ff88', path: '/android' },
    { type: VMType.WINDOWS, name: 'Windows', icon: '⊞', color: '#00d4ff', path: '/windows' },
    { type: VMType.LINUX, name: 'Linux', icon: '🐧', color: '#ff6b9d', path: '/linux' },
    { type: VMType.CODE, name: 'Compiler', icon: '⚡', color: '#ffff00', path: '/compiler' },
    { type: VMType.XBOX, name: 'Xbox', icon: '🎮', color: '#ffaa00', path: '/emulator/xbox' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 30%, #2e0a4e 50%, #1a0a2e 70%, #0a0a0a 100%)',
      position: 'relative',
      overflow: 'auto',
    }}>
      {/* Background effects */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `
          radial-gradient(circle at 20% 30%, rgba(255, 0, 255, 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(0, 255, 255, 0.15) 0%, transparent 50%)
        `,
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* Navigation */}
      <nav style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 10, 10, 0.8)',
        backdropFilter: 'blur(20px)',
        borderBottom: '2px solid rgba(255, 0, 255, 0.3)',
        padding: '20px 40px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/" style={{
          fontSize: '28px',
          fontWeight: 'bold',
          background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textDecoration: 'none',
        }}>
          nacho.
        </Link>
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <Link href="/games" style={{
            color: 'rgba(255, 255, 255, 0.8)',
            textDecoration: 'none',
            fontSize: '16px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#ff00ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
          >
            Games
          </Link>
          <Link href="/dashboard" style={{
            color: '#ff00ff',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '600',
          }}>
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px',
      }}>
        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '40px',
        }}>
          {[
            { label: 'Total VMs', value: stats.totalVMs, icon: '🖥️', color: '#ff00ff' },
            { label: 'Running', value: stats.runningVMs, icon: '⚡', color: '#00ffff' },
            { label: 'Storage', value: stats.totalStorage, icon: '☁️', color: '#8a2be2' },
            { label: 'Games', value: stats.gamesInstalled, icon: '🎮', color: '#ff6b9d' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))',
                backdropFilter: 'blur(20px)',
                border: `2px solid ${stat.color}40`,
                borderRadius: '16px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{stat.icon}</div>
              <div style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: stat.color,
                marginBottom: '4px',
              }}>{stat.value}</div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
              }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Emulator Types */}
        <h2 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '24px',
          color: '#fff',
        }}>Choose Your Emulator</h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '40px',
        }}>
          {emulatorTypes.map((emulator) => (
            <Link
              key={emulator.type}
              href={emulator.path}
              style={{
                textDecoration: 'none',
                display: 'block',
              }}
            >
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))',
                  backdropFilter: 'blur(20px)',
                  border: `2px solid ${emulator.color}40`,
                  borderRadius: '16px',
                  padding: '32px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = `${emulator.color}80`;
                  e.currentTarget.style.boxShadow = `0 10px 40px ${emulator.color}40`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = `${emulator.color}40`;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px', textAlign: 'center' }}>
                  {emulator.icon}
                </div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#fff',
                  textAlign: 'center',
                }}>{emulator.name}</h3>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                }}>Launch {emulator.name} emulator</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Recent VMs */}
        {vms.length > 0 && (
          <>
            <h2 style={{
              fontSize: '32px',
              fontWeight: 'bold',
              marginBottom: '24px',
              color: '#fff',
            }}>Your Virtual Machines</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
            }}>
              {vms.map((vm) => (
                <div
                  key={vm.id}
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))',
                    backdropFilter: 'blur(20px)',
                    border: '2px solid rgba(255, 0, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '24px',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}>
                    <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '600' }}>
                      {vm.config.name || vm.id}
                    </h3>
                    <span style={{
                      padding: '4px 12px',
                      background: vm.state.isRunning ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: vm.state.isRunning ? '#00ff88' : 'rgba(255, 255, 255, 0.7)',
                    }}>
                      {vm.state.isRunning ? 'Running' : 'Stopped'}
                    </span>
                  </div>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '14px',
                    marginBottom: '16px',
                  }}>
                    Type: {vm.config.type}
                  </p>
                  <button
                    onClick={() => router.push(`/emulator/${vm.id}`)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Open VM
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

