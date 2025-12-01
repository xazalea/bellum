'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Game {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  platform: string;
  status: 'available' | 'coming-soon';
}

const games: Game[] = [
  // Popular Games
  { id: 'roblox', name: 'Roblox', description: 'Create, play, and explore millions of games', category: 'Sandbox', icon: '🎮', color: '#ff00ff', platform: 'Web', status: 'available' },
  { id: 'fortnite', name: 'Fortnite', description: 'Battle Royale and Creative mode', category: 'Battle Royale', icon: '🔫', color: '#00ffff', platform: 'Windows', status: 'available' },
  { id: 'cod', name: 'Call of Duty', description: 'Modern Warfare and Warzone', category: 'FPS', icon: '🎯', color: '#ff6b9d', platform: 'Windows', status: 'available' },
  { id: 'chrome', name: 'Google Chrome', description: 'Full browser experience', category: 'Browser', icon: '🌐', color: '#8a2be2', platform: 'Windows', status: 'available' },
  { id: 'minecraft', name: 'Minecraft', description: 'Build, explore, and survive', category: 'Sandbox', icon: '⛏️', color: '#00ff88', platform: 'Windows', status: 'available' },
  { id: 'gta5', name: 'GTA V', description: 'Open-world action adventure', category: 'Action', icon: '🚗', color: '#ffaa00', platform: 'Windows', status: 'coming-soon' },
  { id: 'valorant', name: 'Valorant', description: 'Tactical FPS shooter', category: 'FPS', icon: '🎯', color: '#ff4444', platform: 'Windows', status: 'available' },
  { id: 'apex', name: 'Apex Legends', description: 'Battle Royale hero shooter', category: 'Battle Royale', icon: '🏃', color: '#00d4ff', platform: 'Windows', status: 'available' },
  { id: 'cs2', name: 'Counter-Strike 2', description: 'Competitive FPS', category: 'FPS', icon: '💣', color: '#ff6b9d', platform: 'Windows', status: 'available' },
  { id: 'amongus', name: 'Among Us', description: 'Social deduction game', category: 'Party', icon: '👾', color: '#ff00ff', platform: 'Android', status: 'available' },
  { id: 'pubg', name: 'PUBG Mobile', description: 'Battle Royale on mobile', category: 'Battle Royale', icon: '📱', color: '#00ffff', platform: 'Android', status: 'available' },
  { id: 'genshin', name: 'Genshin Impact', description: 'Open-world action RPG', category: 'RPG', icon: '⚔️', color: '#8a2be2', platform: 'Android', status: 'available' },
  { id: 'pokemon', name: 'Pokemon Go', description: 'AR Pokemon catching', category: 'AR', icon: '⚡', color: '#ffaa00', platform: 'Android', status: 'available' },
  { id: 'clash', name: 'Clash Royale', description: 'Real-time strategy', category: 'Strategy', icon: '👑', color: '#ff6b9d', platform: 'Android', status: 'available' },
  { id: 'subway', name: 'Subway Surfers', description: 'Endless runner', category: 'Arcade', icon: '🏃', color: '#00ff88', platform: 'Android', status: 'available' },
  { id: 'candy', name: 'Candy Crush', description: 'Match-3 puzzle game', category: 'Puzzle', icon: '🍬', color: '#ff00ff', platform: 'Android', status: 'available' },
];

const categories = ['All', 'FPS', 'Battle Royale', 'Sandbox', 'Strategy', 'RPG', 'Action', 'Puzzle', 'Arcade', 'Browser'];

export default function GamesPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredGames = games.filter(game => {
    const matchesCategory = selectedCategory === 'All' || game.category === selectedCategory;
    const matchesSearch = game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         game.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleLaunchGame = (game: Game) => {
    if (game.status === 'available') {
      // Route to appropriate emulator
      if (game.platform === 'Android') {
        router.push(`/android?game=${game.id}`);
      } else if (game.platform === 'Windows') {
        router.push(`/windows?game=${game.id}`);
      } else {
        router.push(`/dashboard?game=${game.id}`);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 30%, #2e0a4e 50%, #1a0a2e 70%, #0a0a0a 100%)',
      position: 'relative',
      overflow: 'auto',
    }}>
      {/* Background */}
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
            color: '#ff00ff',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: '600',
          }}>
            Games
          </Link>
          <Link href="/dashboard" style={{
            color: 'rgba(255, 255, 255, 0.8)',
            textDecoration: 'none',
            fontSize: '16px',
            transition: 'all 0.3s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#00ffff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
          }}
          >
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
        {/* Header */}
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <h1 style={{
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Game Library
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '18px',
          }}>
            Launch your favorite games instantly. Zero lag. High performance.
          </p>
        </div>

        {/* Search and Filters */}
        <div style={{
          marginBottom: '40px',
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              minWidth: '300px',
              padding: '12px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '2px solid rgba(255, 0, 255, 0.3)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              backdropFilter: 'blur(10px)',
            }}
          />
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '10px 20px',
                  background: selectedCategory === cat
                    ? 'linear-gradient(135deg, #ff00ff, #00ffff)'
                    : 'rgba(255, 255, 255, 0.1)',
                  border: `2px solid ${selectedCategory === cat ? 'transparent' : 'rgba(255, 0, 255, 0.3)'}`,
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (selectedCategory !== cat) {
                    e.currentTarget.style.background = 'rgba(255, 0, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCategory !== cat) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Games Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          {filteredGames.map((game) => (
            <div
              key={game.id}
              style={{
                background: 'linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))',
                backdropFilter: 'blur(20px)',
                border: `2px solid ${game.color}40`,
                borderRadius: '16px',
                padding: '24px',
                transition: 'all 0.3s ease',
                cursor: game.status === 'available' ? 'pointer' : 'default',
                opacity: game.status === 'coming-soon' ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (game.status === 'available') {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.borderColor = `${game.color}80`;
                  e.currentTarget.style.boxShadow = `0 10px 40px ${game.color}40`;
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = `${game.color}40`;
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => handleLaunchGame(game)}
            >
              <div style={{
                fontSize: '64px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>{game.icon}</div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '8px',
                color: '#fff',
                textAlign: 'center',
              }}>{game.name}</h3>
              <p style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '14px',
                marginBottom: '16px',
                textAlign: 'center',
                lineHeight: '1.5',
              }}>{game.description}</p>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}>
                <span style={{
                  padding: '4px 12px',
                  background: `${game.color}30`,
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: game.color,
                }}>{game.category}</span>
                <span style={{
                  padding: '4px 12px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.7)',
                }}>{game.platform}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleLaunchGame(game);
                }}
                disabled={game.status === 'coming-soon'}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: game.status === 'available'
                    ? `linear-gradient(135deg, ${game.color}, ${game.color}dd)`
                    : 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontWeight: '600',
                  cursor: game.status === 'available' ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={(e) => {
                  if (game.status === 'available') {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                {game.status === 'available' ? 'Launch' : 'Coming Soon'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

