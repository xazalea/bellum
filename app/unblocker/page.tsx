'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { colors } from '@/lib/ui/design-system';
import { motion } from 'framer-motion';

// List of games from Arsenic submodule
const GAMES = [
    { id: '5b', name: '5b' },
    { id: 'animal-arena', name: 'Animal Arena' },
    { id: 'animals-volleyball', name: 'Animals Volleyball' },
    { id: 'armed-forces-io', name: 'Armed Forces IO' },
    { id: 'bacon-may-die', name: 'Bacon May Die' },
    { id: 'ball-dodge', name: 'Ball Dodge' },
    { id: 'bank-robbery', name: 'Bank Robbery' },
    { id: 'bank-robbery-2', name: 'Bank Robbery 2' },
    { id: 'bank-robbery-3', name: 'Bank Robbery 3' },
    { id: 'basket-random', name: 'Basket Random' },
    { id: 'battle-wheels', name: 'Battle Wheels' },
    { id: 'bitlife', name: 'BitLife' },
    { id: 'blumgi-ball', name: 'Blumgi Ball' },
    { id: 'blumgi-bloom', name: 'Blumgi Bloom' },
    { id: 'blumgi-castle', name: 'Blumgi Castle' },
    { id: 'blumgi-dragon', name: 'Blumgi Dragon' },
    { id: 'blumgi-paintball', name: 'Blumgi Paintball' },
    { id: 'blumgi-racers', name: 'Blumgi Racers' },
    { id: 'blumgi-rocket', name: 'Blumgi Rocket' },
    { id: 'blumgi-slime', name: 'Blumgi Slime' },
];

export default function UnblockerPage() {
    const router = useRouter();
    const [selectedGame, setSelectedGame] = useState<string | null>(null);

    return (
        <div style={{ width: '100vw', height: '100vh', background: colors.bg.primary, display: 'flex', flexDirection: 'column' }}>
            {/* Navigation Header */}
            <div style={{ 
                padding: '10px 20px', 
                background: colors.bg.secondary, 
                borderBottom: `1px solid ${colors.border.primary}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', gap: '20px' }}>
                    <div 
                        style={{ padding: '5px 10px', color: colors.text.secondary, cursor: 'pointer' }}
                        onClick={() => router.push('/dashboard')}
                    >
                        Dashboard
                    </div>
                    <div 
                        style={{ padding: '5px 10px', borderBottom: `2px solid ${colors.accent.primary}`, cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        Unblocker
                    </div>
                </div>
                <div style={{ fontSize: '12px', color: colors.text.secondary }}>
                    nacho. Unblocker
                </div>
            </div>

            {selectedGame ? (
                <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
                     <div style={{ 
                         padding: '10px', 
                         background: '#000', 
                         color: '#fff', 
                         display: 'flex', 
                         justifyContent: 'space-between',
                         alignItems: 'center'
                     }}>
                         <button 
                            onClick={() => setSelectedGame(null)}
                            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '14px' }}
                         >
                             ← Back to Library
                         </button>
                         <span>{GAMES.find(g => g.id === selectedGame)?.name}</span>
                         <div />
                     </div>
                     <iframe 
                        src={`/unblocker/assets/games/${selectedGame}/index.html`}
                        style={{ flex: 1, border: 'none', width: '100%', background: '#fff' }}
                        title={selectedGame}
                        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals allow-presentation allow-downloads"
                     />
                </div>
            ) : (
                <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '30px', color: colors.text.primary }}>
                            Unblocked Games
                        </h1>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
                            {GAMES.map(game => (
                                <motion.div
                                    key={game.id}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedGame(game.id)}
                                    style={{
                                        background: colors.bg.secondary,
                                        borderRadius: '12px',
                                        border: `1px solid ${colors.border.primary}`,
                                        cursor: 'pointer',
                                        overflow: 'hidden',
                                        aspectRatio: '1/1',
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                >
                                    <div style={{ flex: 1, background: colors.bg.tertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '40px' }}>
                                        🎮
                                    </div>
                                    <div style={{ padding: '15px', background: colors.bg.secondary, borderTop: `1px solid ${colors.border.primary}` }}>
                                        <div style={{ fontWeight: 'bold', color: colors.text.primary }}>{game.name}</div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Credit */}
            <div style={{ 
                padding: '10px', 
                textAlign: 'center', 
                fontSize: '10px', 
                color: colors.text.secondary, 
                borderTop: `1px solid ${colors.border.primary}` 
            }}>
                Credit to smartfoloo
            </div>
        </div>
    );
}
