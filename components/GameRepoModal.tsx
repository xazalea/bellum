import React, { useState, useEffect } from 'react';
import { gameRepoService, GameRepository, GameEntry } from '@/lib/nacho/modules/game-repository';
import { clusterService } from '@/lib/nacho/modules/distributed-compute';
import { X, FolderPlus, Gamepad2, Globe, Lock, Download, Share2 } from 'lucide-react';
import { vmManager } from '@/lib/vm/manager';
import { VMType } from '@/lib/vm/types';

interface GameRepoModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function GameRepoModal({ isOpen, onClose }: GameRepoModalProps) {
    const [view, setView] = useState<'browse' | 'create' | 'details'>('browse');
    const [repos, setRepos] = useState<GameRepository[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<GameRepository | null>(null);
    const [myRepos, setMyRepos] = useState<GameRepository[]>([]);
    
    // Create Form
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [isPublic, setIsPublic] = useState(true);

    const user = clusterService.getCurrentUser();

    useEffect(() => {
        if (isOpen) {
            loadRepos();
        }
    }, [isOpen]);

    const loadRepos = async () => {
        const publicRepos = await gameRepoService.getPublicRepositories();
        setRepos(publicRepos);
        if (user) {
            const mine = await gameRepoService.getMyRepositories();
            setMyRepos(mine);
        }
    };

    const handleCreate = async () => {
        const res = await gameRepoService.createRepository(newName, newDesc, isPublic);
        if (res.success) {
            setView('browse');
            loadRepos();
        } else {
            alert(res.message);
        }
    };

    const handleInstallGame = async (game: GameEntry) => {
        // Mock install - in reality would download from CloudDatabase
        await vmManager.createVM({
            id: `installed-${Date.now()}`,
            type: game.type as VMType,
            name: game.name,
            memory: 1024
        });
        alert(`Installed ${game.name} to Dashboard`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl h-[80vh] bg-[#0f0f0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Gamepad2 className="text-purple-400" size={20} />
                            Game Repositories
                        </h2>
                        <div className="flex bg-black/50 rounded-lg p-1">
                            <button 
                                onClick={() => setView('browse')}
                                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${view === 'browse' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                            >
                                Browse
                            </button>
                            {user && (
                                <button 
                                    onClick={() => setView('create')}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${view === 'create' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Create New
                                </button>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {view === 'browse' && (
                        <div className="space-y-8">
                            {/* My Repos */}
                            {user && myRepos.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">My Repositories</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {myRepos.map(repo => (
                                            <RepoCard 
                                                key={repo.id} 
                                                repo={repo} 
                                                onClick={() => { setSelectedRepo(repo); setView('details'); }} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Public Repos */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase mb-4">Community Repositories</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {repos.map(repo => (
                                        <RepoCard 
                                            key={repo.id} 
                                            repo={repo} 
                                            onClick={() => { setSelectedRepo(repo); setView('details'); }} 
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {view === 'create' && (
                        <div className="max-w-md mx-auto space-y-6">
                            <h3 className="text-xl font-bold text-white">Create Repository</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs text-gray-400 uppercase font-bold mb-2">Name</label>
                                    <input 
                                        type="text" 
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. My Retro Games"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-400 uppercase font-bold mb-2">Description</label>
                                    <textarea 
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 h-24 resize-none"
                                        value={newDesc}
                                        onChange={(e) => setNewDesc(e.target.value)}
                                        placeholder="What's in this collection?"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="checkbox" 
                                        id="isPublic"
                                        checked={isPublic}
                                        onChange={(e) => setIsPublic(e.target.checked)}
                                        className="rounded bg-black/50 border-white/10 text-purple-600"
                                    />
                                    <label htmlFor="isPublic" className="text-white text-sm">Make Public</label>
                                </div>
                                <button 
                                    onClick={handleCreate}
                                    className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 rounded-lg font-medium transition-colors"
                                >
                                    Create Repository
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'details' && selectedRepo && (
                        <div className="space-y-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <button 
                                        onClick={() => setView('browse')}
                                        className="text-gray-400 text-xs hover:text-white mb-2"
                                    >
                                        ← Back to list
                                    </button>
                                    <h2 className="text-3xl font-bold text-white">{selectedRepo.name}</h2>
                                    <p className="text-gray-400 mt-2">{selectedRepo.description}</p>
                                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                                        <span>Owner: {selectedRepo.ownerName}</span>
                                        <span>•</span>
                                        <span>{selectedRepo.games.length} Games</span>
                                    </div>
                                </div>
                                {user && selectedRepo.ownerName === user.username && (
                                    <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm font-medium">
                                        + Add Game
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {selectedRepo.games.length > 0 ? (
                                    selectedRepo.games.map(game => (
                                        <div key={game.id} className="bg-white/5 border border-white/5 p-4 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold">
                                                    {game.type.slice(0, 3).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-white">{game.name}</div>
                                                    <div className="text-xs text-gray-500">{(game.size / 1024 / 1024).toFixed(1)} MB</div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => handleInstallGame(game)}
                                                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-white text-sm font-medium flex items-center gap-2"
                                            >
                                                <Download size={16} />
                                                Install
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-white/5 rounded-2xl">
                                        No games in this repository yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

const RepoCard = ({ repo, onClick }: { repo: GameRepository, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className="bg-white/5 border border-white/5 hover:border-purple-500/50 hover:bg-white/10 p-4 rounded-xl cursor-pointer transition-all group"
    >
        <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-white font-bold group-hover:from-purple-600 group-hover:to-pink-600 transition-colors">
                <FolderPlus size={20} />
            </div>
            {repo.isPublic ? <Globe size={16} className="text-gray-500" /> : <Lock size={16} className="text-gray-500" />}
        </div>
        <h4 className="font-bold text-white mb-1">{repo.name}</h4>
        <p className="text-xs text-gray-400 line-clamp-2 mb-3">{repo.description}</p>
        <div className="flex items-center justify-between text-[10px] text-gray-500 uppercase font-bold">
            <span>{repo.ownerName}</span>
            <span>{repo.games.length} items</span>
        </div>
    </div>
);
