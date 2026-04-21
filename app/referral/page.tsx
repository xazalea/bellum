'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useCompute } from '@/components/providers/compute-provider';
import { useAuth } from '@/components/providers/auth-provider';
import { useAnimeScope, animate, stagger, spring, ease, dur } from '@/lib/hooks/use-anime';
import { Users, Link2, UserPlus, Sprout, TreePine, Trees, Mountain, CalendarDays, CalendarRange, Trophy, CirclePlus, CircleMinus, Gamepad2, Handshake, PiggyBank, Globe, Zap, Crown, Check } from 'lucide-react';
import { getLucideIcon } from '@/lib/lucide-icons';

export default function ReferralPage() {
  const { referral, referralLink, balance, tier, streak, quests, recentTransactions } = useCompute();
  const { user } = useAuth();
  const { root, run } = useAnimeScope();
  const animatedRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'referral' | 'quests' | 'history' | 'badges'>('referral');

  useEffect(() => {
    if (animatedRef.current) return;
    animatedRef.current = true;
    run(s => {
      s.add(self => {
        animate('[data-anime="ref-header"]', {
          translateY: [-12, 0], opacity: [0, 1], ease: ease.out, duration: dur.base,
        });
        animate('[data-anime="ref-card"]', {
          translateY: [20, 0], opacity: [0, 1], ease: ease.out, duration: dur.reveal,
          delay: stagger(100, { start: 200 }),
        });
      });
    });
  }, [run]);

  const copyReferralLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = referralLink;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [referralLink]);

  const onCardEnter = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: -1, ease: spring({ bounce: 0.2 }), duration: dur.fast });
  }, []);
  const onCardLeave = useCallback((e: React.MouseEvent) => {
    animate(e.currentTarget, { translateY: 0, ease: ease.out, duration: dur.fast });
  }, []);

  const dailyQuests = quests.filter(q => q.resetInterval === 'daily');
  const weeklyQuests = quests.filter(q => q.resetInterval === 'weekly');
  const lifetimeQuests = quests.filter(q => q.resetInterval === 'never');
  const completedQuests = quests.filter(q => q.completedAt);
  const inProgressQuests = quests.filter(q => !q.completedAt && q.progress > 0);

  const rarityColor = (r: string) => {
    switch (r) {
      case 'common': return 'text-muted-foreground/50';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      default: return 'text-muted-foreground/50';
    }
  };

  const tabs = [
    { id: 'referral' as const, label: 'Referral', icon: Users },
    { id: 'quests' as const, label: 'Quests', icon: Trophy },
    { id: 'history' as const, label: 'History', icon: CalendarDays },
    { id: 'badges' as const, label: 'Badges', icon: Crown },
  ];

  return (
    <div ref={root} className="min-h-screen">
      <div className="cd-container py-8">
        {/* Header */}
        <div data-anime="ref-header" className="mb-6" style={{ opacity: 0 }}>
          <div className="flex items-center gap-3 mb-1">
            <Users size={22} className="text-primary" />
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Rewards</h1>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Earn tokens · Complete quests · Refer friends
          </p>
        </div>

        {/* Quick Stats */}
        <div data-anime="ref-card" style={{ opacity: 0 }} className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Tokens', value: Math.round(balance.tokens).toLocaleString(), sub: tier.name, color: tier.color },
            { label: 'Streak', value: `${streak.currentStreak}d`, sub: streak.currentStreak >= 3 ? 'Bonus active' : '3d for bonus', color: 'hsl(250 60% 65%)' },
            { label: 'Referrals', value: referral.referredUsers.length, sub: `${referral.earnedTokens} earned`, color: 'hsl(230 60% 60%)' },
            { label: 'Quests', value: `${completedQuests.length}/${quests.length}`, sub: `${inProgressQuests.length} active`, color: 'hsl(270 80% 75%)' },
          ].map(stat => (
            <div key={stat.label} className="glass-card rounded-lg p-3 text-center" onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
              <p className="text-lg font-bold tracking-tighter text-foreground">{stat.value}</p>
              <p className="text-[9px] text-muted-foreground/50 uppercase tracking-wider">{stat.label}</p>
              <p className="text-[8px]" style={{ color: stat.color }}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 mb-6 border-b border-border/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-foreground border-primary'
                  : 'text-muted-foreground/50 border-transparent hover:text-foreground/70'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Referral Tab */}
        {activeTab === 'referral' && (
          <div className="space-y-4">
            <div data-anime="ref-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Link2 size={16} className="text-primary/60" />
                <h3 className="text-xs font-medium text-foreground">Referral Link</h3>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-card border border-border text-[11px] text-muted-foreground font-mono truncate">
                  {referralLink}
                </div>
                <button
                  onClick={copyReferralLink}
                  className={`px-4 h-9 rounded-lg text-xs font-medium transition-all ${
                    copied
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {copied ? <><Check size={12} className="mr-1" />Copied</> : 'Copy'}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/40 mt-2">
                Share this link. You both earn 500 tokens when they sign up.
              </p>
            </div>

            <div data-anime="ref-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus size={16} className="text-primary/60" />
                <h3 className="text-xs font-medium text-foreground">Referral Code</h3>
              </div>
              <div className="flex items-center justify-center py-4">
                <div className="px-6 py-3 rounded-xl bg-card border border-dashed border-primary/25">
                  <p className="text-2xl font-bold tracking-[0.2em] text-primary font-mono">{referral.code || 'LOADING'}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/40 text-center">
                Friends can enter this code during signup for a welcome bonus
              </p>
            </div>

            <div data-anime="ref-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5">
              <h3 className="text-xs font-medium text-foreground mb-3">Referral Tiers</h3>
              <div className="space-y-2">
                {[
                  { count: 1, bonus: '500 tokens + 1 mesh node', icon: Sprout },
                  { count: 5, bonus: '2,500 tokens + Pro tier', icon: TreePine },
                  { count: 25, bonus: '12,500 tokens + Ultra tier', icon: Trees },
                  { count: 100, bonus: '50,000 tokens + Omega tier + Recruiter badge', icon: Mountain },
                ].map(t => (
                  <div key={t.count} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/30" onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                    <t.icon size={16} className="text-primary/40" />
                    <span className="text-[11px] font-medium text-foreground">{t.count} referrals</span>
                    <span className="text-[10px] text-muted-foreground/50 ml-auto">{t.bonus}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Quests Tab */}
        {activeTab === 'quests' && (
          <div className="space-y-6">
            {dailyQuests.length > 0 && (
              <div data-anime="ref-card" style={{ opacity: 0 }}>
                <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-2">
                  <CalendarDays size={14} className="text-yellow-400/70" />
                  Daily
                </h3>
                <div className="space-y-2">
                  {dailyQuests.map(q => {
                    const QIcon = getLucideIcon(q.icon);
                    return (
                    <div key={q.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${q.completedAt ? 'border-primary/20 bg-primary/5' : 'border-border/30'}`} onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                      <QIcon size={18} className={rarityColor(q.rarity)} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium ${q.completedAt ? 'text-primary line-through' : 'text-foreground'}`}>{q.title}</p>
                        <p className="text-[9px] text-muted-foreground/40">{q.description}</p>
                        {!q.completedAt && (
                          <div className="mt-1.5 h-1 rounded-full bg-border/50 overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${(q.progress / q.requirement) * 100}%` }} />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium ${q.completedAt ? 'text-primary' : 'text-muted-foreground/40'}`}>
                        {q.completedAt ? <Check size={12} className="text-primary" /> : `${q.progress}/${q.requirement}`}
                      </span>
                      <span className="text-[9px] text-primary/60">{q.reward}t</span>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {weeklyQuests.length > 0 && (
              <div data-anime="ref-card" style={{ opacity: 0 }}>
                <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-2">
                  <CalendarRange size={14} className="text-blue-400/70" />
                  Weekly
                </h3>
                <div className="space-y-2">
                  {weeklyQuests.map(q => {
                    const QIcon = getLucideIcon(q.icon);
                    return (
                    <div key={q.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${q.completedAt ? 'border-primary/20 bg-primary/5' : 'border-border/30'}`} onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                      <QIcon size={18} className={rarityColor(q.rarity)} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium ${q.completedAt ? 'text-primary line-through' : 'text-foreground'}`}>{q.title}</p>
                        <p className="text-[9px] text-muted-foreground/40">{q.description}</p>
                        {!q.completedAt && (
                          <div className="mt-1.5 h-1 rounded-full bg-border/50 overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${(q.progress / q.requirement) * 100}%` }} />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium ${q.completedAt ? 'text-primary' : 'text-muted-foreground/40'}`}>
                        {q.completedAt ? <Check size={12} className="text-primary" /> : `${q.progress}/${q.requirement}`}
                      </span>
                      <span className="text-[9px] text-primary/60">{q.reward}t</span>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}

            {lifetimeQuests.length > 0 && (
              <div data-anime="ref-card" style={{ opacity: 0 }}>
                <h3 className="text-xs font-medium text-foreground mb-3 flex items-center gap-2">
                  <Trophy size={14} className="text-purple-400/70" />
                  Lifetime
                </h3>
                <div className="space-y-2">
                  {lifetimeQuests.map(q => {
                    const QIcon = getLucideIcon(q.icon);
                    return (
                    <div key={q.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${q.completedAt ? 'border-primary/20 bg-primary/5' : 'border-border/30'}`} onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                      <QIcon size={18} className={rarityColor(q.rarity)} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-[11px] font-medium ${q.completedAt ? 'text-primary line-through' : 'text-foreground'}`}>{q.title}</p>
                        <p className="text-[9px] text-muted-foreground/40">{q.description}</p>
                        {!q.completedAt && (
                          <div className="mt-1.5 h-1 rounded-full bg-border/50 overflow-hidden">
                            <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${(q.progress / q.requirement) * 100}%` }} />
                          </div>
                        )}
                      </div>
                      <span className={`text-[10px] font-medium ${q.completedAt ? 'text-primary' : 'text-muted-foreground/40'}`}>
                        {q.completedAt ? <Check size={12} className="text-primary" /> : `${q.progress}/${q.requirement}`}
                      </span>
                      <span className="text-[9px] text-primary/60">{q.reward}t</span>
                    </div>
                  );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div data-anime="ref-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5">
            <h3 className="text-xs font-medium text-foreground mb-3">Recent Transactions</h3>
            {recentTransactions.length === 0 ? (
              <p className="text-[10px] text-muted-foreground/30 text-center py-8">No transactions yet. Start earning!</p>
            ) : (
              <div className="space-y-1">
                {recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-accent/20 transition-colors">
                    {tx.type === 'earn' ? <CirclePlus size={14} className="text-primary" /> : <CircleMinus size={14} className="text-destructive" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-foreground truncate">{tx.description}</p>
                      <p className="text-[8px] text-muted-foreground/30">{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    <span className={`text-[11px] font-mono font-medium ${tx.type === 'earn' ? 'text-primary' : 'text-destructive'}`}>
                      {tx.type === 'earn' ? '+' : '-'}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Badges Tab */}
        {activeTab === 'badges' && (
          <div className="space-y-4">
            <div data-anime="ref-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5">
              <h3 className="text-xs font-medium text-foreground mb-3">Streak Badges</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: '3-Day Streak', icon: Zap, unlocked: streak.longestStreak >= 3 },
                  { name: '7-Day Streak', icon: TreePine, unlocked: streak.longestStreak >= 7 },
                  { name: '14-Day Streak', icon: Crown, unlocked: streak.longestStreak >= 14 },
                  { name: '30-Day Streak', icon: Mountain, unlocked: streak.longestStreak >= 30 },
                ].map(badge => (
                  <div key={badge.name} className={`p-3 rounded-lg border text-center ${badge.unlocked ? 'border-primary/25 bg-primary/5' : 'border-border/30 opacity-40'}`} onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                    <badge.icon size={24} className={badge.unlocked ? 'text-primary' : 'text-muted-foreground/30'} />
                    <p className="text-[10px] font-medium text-foreground mt-1">{badge.name}</p>
                    <p className="text-[8px] text-muted-foreground/40">{badge.unlocked ? 'Unlocked' : 'Locked'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div data-anime="ref-card" style={{ opacity: 0 }} className="glass-card rounded-xl p-5">
              <h3 className="text-xs font-medium text-foreground mb-3">Achievement Badges</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'First Game', icon: Gamepad2, unlocked: completedQuests.some(q => q.id === 'q_first_game') },
                  { name: 'Networker', icon: Handshake, unlocked: completedQuests.some(q => q.id === 'q_first_referral') },
                  { name: 'Token Hoarder', icon: PiggyBank, unlocked: completedQuests.some(q => q.id === 'q_tokens_1000') },
                  { name: 'Veteran', icon: Crown, unlocked: completedQuests.some(q => q.id === 'q_50_games') },
                  { name: 'Mesh Lord', icon: Globe, unlocked: balance.earnedLifetime >= 10000 },
                  { name: 'Referral King', icon: Users, unlocked: referral.referredUsers.length >= 10 },
                  { name: 'Omega Tier', icon: Zap, unlocked: tier.name === 'Omega' },
                  { name: 'Completionist', icon: Trophy, unlocked: completedQuests.length === quests.length && quests.length > 0 },
                ].map(badge => (
                  <div key={badge.name} className={`p-3 rounded-lg border text-center ${badge.unlocked ? 'border-primary/25 bg-primary/5' : 'border-border/30 opacity-40'}`} onMouseEnter={onCardEnter} onMouseLeave={onCardLeave}>
                    <badge.icon size={24} className={badge.unlocked ? 'text-primary' : 'text-muted-foreground/30'} />
                    <p className="text-[10px] font-medium text-foreground mt-1">{badge.name}</p>
                    <p className="text-[8px] text-muted-foreground/40">{badge.unlocked ? 'Unlocked' : 'Locked'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
