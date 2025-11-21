'use client';

import { useState, useEffect } from 'react';
import { VMType, VMInstance } from '@/lib/vm/types';
import { vmManager } from '@/lib/vm/manager';

interface VMManagerProps {
  selectedVMId: string | null;
  onSelectVM: (id: string | null) => void;
  style?: React.CSSProperties;
}

export function VMManager({ selectedVMId, onSelectVM, style }: VMManagerProps) {
  const [vms, setVms] = useState<VMInstance[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVMName, setNewVMName] = useState('');
  const [newVMType, setNewVMType] = useState<VMType>(VMType.LINUX);

  useEffect(() => {
    const updateVMs = () => {
      setVms(vmManager.listVMs());
    };

    updateVMs();
    const interval = setInterval(updateVMs, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateVM = async () => {
    if (!newVMName.trim()) {
      return;
    }

    try {
      const config = {
        id: `vm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: newVMType,
        name: newVMName.trim(),
        memory: 512,
        diskSize: 1024,
        networkEnabled: true,
      };

      const vm = await vmManager.createVM(config);
      setVms(vmManager.listVMs());
      setShowCreateDialog(false);
      setNewVMName('');
      onSelectVM(vm.id);
    } catch (error) {
      console.error('Failed to create VM:', error);
      alert('Failed to create VM. Please try again.');
    }
  };

  const handleDeleteVM = async (id: string) => {
    if (!confirm('Are you sure you want to delete this VM? This action cannot be undone.')) {
      return;
    }

    try {
      await vmManager.deleteVM(id);
      setVms(vmManager.listVMs());
      if (selectedVMId === id) {
        onSelectVM(null);
      }
    } catch (error) {
      console.error('Failed to delete VM:', error);
      alert('Failed to delete VM. Please try again.');
    }
  };

  const getVMTypeIcon = (type: VMType) => {
    switch (type) {
      case VMType.LINUX:
        return '🐧';
      case VMType.WINDOWS:
        return '🪟';
      case VMType.ANDROID:
        return '🤖';
      case VMType.DOS:
        return '💾';
      case VMType.PLAYSTATION:
        return '🎮';
      case VMType.XBOX:
        return '🎮';
      default:
        return '💻';
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: '#111',
      ...style
    }}>
      <div style={{
        padding: '20px',
        borderBottom: '1px solid #333'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '10px',
          color: '#fff'
        }}>
          Bellum
        </h1>
        <button
          onClick={() => setShowCreateDialog(true)}
          style={{
            width: '100%',
            padding: '10px',
            background: '#0066ff',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#0052cc'}
          onMouseOut={(e) => e.currentTarget.style.background = '#0066ff'}
        >
          + Create VM
        </button>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '10px'
      }}>
        {vms.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
            color: '#666',
            fontSize: '14px'
          }}>
            No VMs yet. Create one to get started!
          </div>
        ) : (
          vms.map(vm => (
            <div
              key={vm.id}
              onClick={() => onSelectVM(vm.id)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: selectedVMId === vm.id ? '#1a1a1a' : '#151515',
                border: selectedVMId === vm.id ? '1px solid #0066ff' : '1px solid #333',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                if (selectedVMId !== vm.id) {
                  e.currentTarget.style.background = '#1a1a1a';
                  e.currentTarget.style.borderColor = '#444';
                }
              }}
              onMouseOut={(e) => {
                if (selectedVMId !== vm.id) {
                  e.currentTarget.style.background = '#151515';
                  e.currentTarget.style.borderColor = '#333';
                }
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>{getVMTypeIcon(vm.config.type)}</span>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#fff'
                  }}>
                    {vm.config.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteVM(vm.id);
                  }}
                  style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    color: '#ff4444',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #ff4444'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = '#ff4444';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#ff4444';
                  }}
                >
                  Delete
                </button>
              </div>
              <div style={{
                fontSize: '12px',
                color: '#888',
                marginTop: '4px'
              }}>
                {vm.state.isRunning ? (
                  <span style={{ color: '#0f0' }}>● Running</span>
                ) : vm.state.isPaused ? (
                  <span style={{ color: '#ffaa00' }}>⏸ Paused</span>
                ) : (
                  <span style={{ color: '#666' }}>○ Stopped</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a1a',
            padding: '24px',
            borderRadius: '8px',
            width: '90%',
            maxWidth: '400px',
            border: '1px solid #333'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              marginBottom: '20px',
              color: '#fff'
            }}>
              Create New VM
            </h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#ccc'
              }}>
                VM Name
              </label>
              <input
                type="text"
                value={newVMName}
                onChange={(e) => setNewVMName(e.target.value)}
                placeholder="My Virtual Machine"
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateVM();
                  }
                }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '6px',
                fontSize: '14px',
                color: '#ccc'
              }}>
                VM Type
              </label>
              <select
                value={newVMType}
                onChange={(e) => setNewVMType(e.target.value as VMType)}
                style={{
                  width: '100%',
                  padding: '10px',
                  background: '#111',
                  border: '1px solid #333',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '14px'
                }}
              >
                <option value={VMType.LINUX}>🐧 Linux</option>
                <option value={VMType.WINDOWS}>🪟 Windows</option>
                <option value={VMType.ANDROID}>🤖 Android</option>
                <option value={VMType.DOS}>💾 DOS</option>
                <option value={VMType.PLAYSTATION}>🎮 PlayStation</option>
                <option value={VMType.XBOX}>🎮 Xbox</option>
              </select>
            </div>
            <div style={{
              display: 'flex',
              gap: '10px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowCreateDialog(false);
                  setNewVMName('');
                }}
                style={{
                  padding: '10px 20px',
                  background: '#333',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVM}
                disabled={!newVMName.trim()}
                style={{
                  padding: '10px 20px',
                  background: newVMName.trim() ? '#0066ff' : '#333',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: newVMName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

