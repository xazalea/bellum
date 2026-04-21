'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  TokenEconomyEngine,
  ComputeTokenBalance,
  StreakData,
  QuestDefinition,
  ReferralData,
  ComputeTier,
  TokenTransaction,
} from '@/lib/compute/token-economy';

interface ComputeContextType {
  // Balance
  balance: ComputeTokenBalance;
  tier: ComputeTier;
  earningRate: { tokensPerMinute: number; source: string };
  
  // Streak
  streak: StreakData;
  streakMultiplier: number;
  
  // Quests
  quests: QuestDefinition[];
  
  // Referral
  referral: ReferralData;
  referralLink: string;
  
  // Transactions
  recentTransactions: TokenTransaction[];
  
  // Actions
  spendTokens: (amount: number, category: TokenTransaction['category'], description: string) => boolean;
  canAfford: (cost: number) => boolean;
  updateQuestProgress: (questId: string, increment?: number) => void;
  setComputeState: (isComputing: boolean) => void;
  
  // Status
  isInitialized: boolean;
}

const ComputeContext = createContext<ComputeContextType | undefined>(undefined);

export function ComputeProvider({ children }: { children: ReactNode }) {
  const [engine, setEngine] = useState<TokenEconomyEngine | null>(null);
  const [balance, setBalance] = useState<ComputeTokenBalance>({ tokens: 0, earnedLifetime: 0, spentLifetime: 0 });
  const [streak, setStreak] = useState<StreakData>({ currentStreak: 0, longestStreak: 0, lastActiveDate: '', todayEarned: false });
  const [quests, setQuests] = useState<QuestDefinition[]>([]);
  const [referral, setReferral] = useState<ReferralData>({ code: '', referredUsers: [], earnedTokens: 0 });
  const [referralLink, setReferralLink] = useState('');
  const [tier, setTier] = useState<ComputeTier>({ name: 'Free', maxMeshNodes: 1, storageGB: 1, priority: 'normal', color: 'hsl(0 0% 60%)' });
  const [earningRate, setEarningRate] = useState<{ tokensPerMinute: number; source: string }>({ tokensPerMinute: 1, source: 'Active' });
  const [recentTransactions, setRecentTransactions] = useState<TokenTransaction[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    import('@/lib/compute/token-economy').then(mod => {
      const eng = mod.TokenEconomyEngine.getInstance();
      setEngine(eng);
      eng.init().then(() => {
        setIsInitialized(true);
        refreshState(eng);
        
        // Process referral code from URL ?ref= param
        try {
          const params = new URLSearchParams(window.location.search);
          const refCode = params.get('ref');
          if (refCode) {
            eng.processReferral(refCode).then(success => {
              if (success) refreshState(eng);
            });
            // Clean up the URL so the referral param doesn't persist
            const url = new URL(window.location.href);
            url.searchParams.delete('ref');
            window.history.replaceState({}, '', url.toString());
          }
        } catch { /* ignore URL parse errors */ }
      });
      
      // Subscribe to updates
      const unsub = eng.subscribe(() => refreshState(eng));
      return unsub;
    });
  }, []);

  const refreshState = useCallback((eng: TokenEconomyEngine) => {
    setBalance(eng.getBalance());
    setStreak(eng.getStreak());
    setQuests(eng.getQuests());
    setReferral(eng.getReferral());
    setReferralLink(eng.getReferralLink());
    setTier(eng.getComputeTier());
    setEarningRate(eng.getCurrentEarningRate());
    setRecentTransactions(eng.getTransactions(10));
  }, []);

  // Update earning rate every 30s
  useEffect(() => {
    if (!engine || !isInitialized) return;
    const interval = setInterval(() => {
      setEarningRate(engine.getCurrentEarningRate());
      setBalance(engine.getBalance());
      setTier(engine.getComputeTier());
    }, 30000);
    return () => clearInterval(interval);
  }, [engine, isInitialized]);

  const spendTokens = useCallback((amount: number, category: TokenTransaction['category'], description: string) => {
    if (!engine) return false;
    const result = engine.spendTokens(amount, category, description);
    if (result) refreshState(engine);
    return result;
  }, [engine]);

  const canAfford = useCallback((cost: number) => {
    return engine?.canAfford(cost) ?? false;
  }, [engine]);

  const updateQuestProgress = useCallback((questId: string, increment?: number) => {
    if (!engine) return;
    engine.updateQuestProgress(questId, increment);
    refreshState(engine);
  }, [engine]);

  const setComputeState = useCallback((isComputing: boolean) => {
    engine?.setComputeState(isComputing);
  }, [engine]);

  const value: ComputeContextType = {
    balance,
    tier,
    earningRate,
    streak,
    streakMultiplier: engine?.getStreakMultiplier() ?? 1,
    quests,
    referral,
    referralLink,
    recentTransactions,
    spendTokens,
    canAfford,
    updateQuestProgress,
    setComputeState,
    isInitialized,
  };

  return (
    <ComputeContext.Provider value={value}>
      {children}
    </ComputeContext.Provider>
  );
}

export function useCompute(): ComputeContextType {
  const context = useContext(ComputeContext);
  if (context === undefined) {
    throw new Error('useCompute must be used within a ComputeProvider');
  }
  return context;
}
