/**
 * Compute Token Economy — Challenger Deep
 * 
 * Users earn compute tokens by:
 * 1. Screen time (active on site)
 * 2. Idle compute contributions (mesh network)
 * 3. Referrals (inviting new users)
 * 4. Daily streaks
 * 5. Quests/achievements
 * 
 * Tokens can be spent on:
 * - Extra mesh compute power for heavy games
 * - Cloud storage upgrades
 * - Priority game launches
 * - Cosmetic upgrades
 * 
 * IMPORTANT: Compute tokens are OPTIONAL. All gaming on Challenger Deep 
 * works perfectly without tokens. Tokens just make it BETTER.
 */

import { getFingerprint } from '@/lib/tracking';

// --- Types ---

export interface ComputeTokenBalance {
  tokens: number;
  earnedLifetime: number;
  spentLifetime: number;
}

export interface EarningRate {
  perMinuteActive: number;      // Tokens per minute while active on tab
  perMinuteIdle: number;        // Tokens per minute while idle/background
  perMinuteCompute: number;     // Tokens per minute contributing to mesh
  streakBonusMultiplier: number; // Multiplier based on streak
  referralBonus: number;        // Tokens per successful referral
}

export interface TokenTransaction {
  id: string;
  type: 'earn' | 'spend';
  category: 'screen_time' | 'idle_compute' | 'mesh_compute' | 'referral' | 'streak' | 'quest' | 'purchase' | 'upgrade';
  amount: number;
  description: string;
  timestamp: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string; // YYYY-MM-DD
  todayEarned: boolean;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  reward: number;
  requirement: number;
  progress: number;
  category: 'play' | 'social' | 'compute' | 'explore';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  resetInterval?: 'daily' | 'weekly' | 'monthly' | 'never';
  completedAt?: number;
}

export interface ReferralData {
  code: string;
  referredUsers: string[];
  earnedTokens: number;
}

// --- Constants ---

const DEFAULT_EARNING_RATE: EarningRate = {
  perMinuteActive: 1,           // 1 token/min while actively using site
  perMinuteIdle: 2,             // 2 tokens/min while idle (background compute)
  perMinuteCompute: 3,          // 3 tokens/min while contributing to mesh
  streakBonusMultiplier: 1,     // Base multiplier, increases with streak
  referralBonus: 500,           // 500 tokens per referral
};

const STORAGE_KEYS = {
  balance: 'cd_token_balance',
  transactions: 'cd_token_transactions',
  streak: 'cd_streak',
  quests: 'cd_quests',
  referral: 'cd_referral',
  earningState: 'cd_earning_state',
};

// --- Token Economy Engine ---

export class TokenEconomyEngine {
  private static instance: TokenEconomyEngine;
  private balance: ComputeTokenBalance = { tokens: 0, earnedLifetime: 0, spentLifetime: 0 };
  private transactions: TokenTransaction[] = [];
  private streak: StreakData = { currentStreak: 0, longestStreak: 0, lastActiveDate: '', todayEarned: false };
  private referral: ReferralData = { code: '', referredUsers: [], earnedTokens: 0 };
  private quests: QuestDefinition[] = [];
  private earningInterval: ReturnType<typeof setInterval> | null = null;
  private earningRate: EarningRate = { ...DEFAULT_EARNING_RATE };
  private isTabVisible = true;
  private isComputing = false;
  private isUserIdle = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners: Set<() => void> = new Set();
  private initialized = false;
  private fingerprint: string | null = null;

  private constructor() {
    if (typeof window === 'undefined') return;
  }

  static getInstance(): TokenEconomyEngine {
    if (!TokenEconomyEngine.instance) {
      TokenEconomyEngine.instance = new TokenEconomyEngine();
    }
    return TokenEconomyEngine.instance;
  }

  async init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.fingerprint = await getFingerprint();
    this.loadState();
    this.updateStreak();
    this.generateReferralCode();
    this.initializeQuests();
    this.startEarningLoop();
    this.setupActivityListeners();
  }

  // --- Balance Management ---

  getBalance(): ComputeTokenBalance {
    return { ...this.balance };
  }

  getEarningRate(): EarningRate {
    return { ...this.earningRate };
  }

  getCurrentEarningRate(): { tokensPerMinute: number; source: string } {
    const streakMult = this.getStreakMultiplier();
    
    if (this.isComputing && this.isTabVisible) {
      return { tokensPerMinute: this.earningRate.perMinuteCompute * streakMult, source: 'Mesh Compute' };
    }
    if (this.isUserIdle || !this.isTabVisible) {
      return { tokensPerMinute: this.earningRate.perMinuteIdle * streakMult, source: 'Idle/Background' };
    }
    return { tokensPerMinute: this.earningRate.perMinuteActive * streakMult, source: 'Active' };
  }

  canAfford(cost: number): boolean {
    return this.balance.tokens >= cost;
  }

  spendTokens(amount: number, category: TokenTransaction['category'], description: string): boolean {
    if (!this.canAfford(amount)) return false;
    this.balance.tokens -= amount;
    this.balance.spentLifetime += amount;
    this.addTransaction('spend', category, amount, description);
    this.saveState();
    this.notifyListeners();
    return true;
  }

  // --- Streak System ---

  getStreak(): StreakData {
    return { ...this.streak };
  }

  getStreakMultiplier(): number {
    const s = this.streak.currentStreak;
    if (s >= 30) return 3.0;
    if (s >= 14) return 2.0;
    if (s >= 7) return 1.5;
    if (s >= 3) return 1.2;
    return 1.0;
  }

  private updateStreak() {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.streak.lastActiveDate === today) {
      // Already active today
      return;
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (this.streak.lastActiveDate === yesterday) {
      // Continue streak
      this.streak.currentStreak++;
    } else if (this.streak.lastActiveDate) {
      // Streak broken
      this.streak.currentStreak = 1;
    } else {
      // First time
      this.streak.currentStreak = 1;
    }

    this.streak.lastActiveDate = today;
    this.streak.todayEarned = false;
    
    if (this.streak.currentStreak > this.streak.longestStreak) {
      this.streak.longestStreak = this.streak.currentStreak;
    }

    // Streak bonus tokens
    if (!this.streak.todayEarned && this.streak.currentStreak >= 3) {
      const bonus = Math.min(this.streak.currentStreak * 10, 300);
      this.earnTokens(bonus, 'streak', `${this.streak.currentStreak}-day streak bonus!`);
      this.streak.todayEarned = true;
    }

    this.earningRate.streakBonusMultiplier = this.getStreakMultiplier();
    this.saveState();
  }

  // --- Referral System ---

  getReferral(): ReferralData {
    return { ...this.referral };
  }

  getReferralLink(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}?ref=${this.referral.code}`;
  }

  private generateReferralCode() {
    if (this.referral.code) return;
    // Generate a unique 8-char code based on fingerprint
    const fp = this.fingerprint || Math.random().toString(36).slice(2);
    const code = fp.slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
    this.referral.code = code;
    this.saveState();
  }

  async processReferral(refCode: string): Promise<boolean> {
    if (!refCode || refCode === this.referral.code) return false;
    if (this.referral.referredUsers.includes(refCode)) return false;
    
    // In production, this would verify the referral code via API
    this.referral.referredUsers.push(refCode);
    
    // Award bonus to the referrer would happen on the referrer's side
    // For the new user, give a welcome bonus
    this.earnTokens(100, 'referral', `Welcome bonus! You were referred by ${refCode}`);
    this.saveState();
    this.notifyListeners();
    return true;
  }

  awardReferralBonus(newUsername: string) {
    this.referral.referredUsers.push(newUsername);
    this.referral.earnedTokens += this.earningRate.referralBonus;
    this.earnTokens(this.earningRate.referralBonus, 'referral', `Referral bonus: ${newUsername} joined!`);
    this.saveState();
  }

  // --- Quest System ---

  getQuests(): QuestDefinition[] {
    return [...this.quests];
  }

  private initializeQuests() {
    if (this.quests.length > 0) return;
    
    this.quests = [
      // Daily Quests
      { id: 'q_play_1', title: 'Warm Up', description: 'Play 1 game today', icon: 'sports_esports', reward: 50, requirement: 1, progress: 0, category: 'play', rarity: 'common', resetInterval: 'daily' },
      { id: 'q_play_3', title: 'Gaming Session', description: 'Play 3 different games', icon: 'games', reward: 150, requirement: 3, progress: 0, category: 'play', rarity: 'rare', resetInterval: 'daily' },
      { id: 'q_idle_10', title: 'Night Watch', description: 'Contribute 10 min of idle compute', icon: 'bedtime', reward: 100, requirement: 10, progress: 0, category: 'compute', rarity: 'common', resetInterval: 'daily' },
      { id: 'q_mesh_30', title: 'Power Grid', description: 'Contribute 30 min to mesh', icon: 'hub', reward: 300, requirement: 30, progress: 0, category: 'compute', rarity: 'epic', resetInterval: 'daily' },
      { id: 'q_browse_5', title: 'Explorer', description: 'Visit 5 different pages', icon: 'explore', reward: 75, requirement: 5, progress: 0, category: 'explore', rarity: 'common', resetInterval: 'daily' },
      // Weekly Quests
      { id: 'q_week_play_10', title: 'Weekend Warrior', description: 'Play 10 games this week', icon: 'stadia_controller', reward: 500, requirement: 10, progress: 0, category: 'play', rarity: 'rare', resetInterval: 'weekly' },
      { id: 'q_week_refer_1', title: 'Recruiter', description: 'Refer 1 friend this week', icon: 'person_add', reward: 750, requirement: 1, progress: 0, category: 'social', rarity: 'epic', resetInterval: 'weekly' },
      { id: 'q_week_compute_60', title: 'Distributed Hero', description: '60 min of mesh compute', icon: 'cloud_sync', reward: 800, requirement: 60, progress: 0, category: 'compute', rarity: 'epic', resetInterval: 'weekly' },
      // One-time Quests
      { id: 'q_first_game', title: 'First Launch', description: 'Play your first game', icon: 'rocket_launch', reward: 200, requirement: 1, progress: 0, category: 'play', rarity: 'common', resetInterval: 'never' },
      { id: 'q_10_games', title: 'Library Builder', description: 'Play 10 different games', icon: 'library_add', reward: 500, requirement: 10, progress: 0, category: 'play', rarity: 'rare', resetInterval: 'never' },
      { id: 'q_50_games', title: 'Gaming Veteran', description: 'Play 50 different games', icon: 'military_tech', reward: 2000, requirement: 50, progress: 0, category: 'play', rarity: 'legendary', resetInterval: 'never' },
      { id: 'q_first_referral', title: 'Networker', description: 'Refer your first friend', icon: 'group_add', reward: 1000, requirement: 1, progress: 0, category: 'social', rarity: 'epic', resetInterval: 'never' },
      { id: 'q_streak_7', title: 'Weekly Devotee', description: 'Reach a 7-day streak', icon: 'local_fire_department', reward: 1000, requirement: 7, progress: 0, category: 'explore', rarity: 'epic', resetInterval: 'never' },
      { id: 'q_streak_30', title: 'Monthly Master', description: 'Reach a 30-day streak', icon: 'whatshot', reward: 5000, requirement: 30, progress: 0, category: 'explore', rarity: 'legendary', resetInterval: 'never' },
      { id: 'q_tokens_1000', title: 'Token Hoarder', description: 'Earn 1000 tokens total', icon: 'token', reward: 500, requirement: 1000, progress: 0, category: 'compute', rarity: 'rare', resetInterval: 'never' },
      { id: 'q_tokens_10000', title: 'Token Tycoon', description: 'Earn 10,000 tokens total', icon: 'diamond', reward: 3000, requirement: 10000, progress: 0, category: 'compute', rarity: 'legendary', resetInterval: 'never' },
    ];
    this.saveState();
  }

  updateQuestProgress(questId: string, increment: number = 1) {
    const quest = this.quests.find(q => q.id === questId);
    if (!quest || quest.completedAt) return;
    
    quest.progress = Math.min(quest.progress + increment, quest.requirement);
    
    if (quest.progress >= quest.requirement && !quest.completedAt) {
      quest.completedAt = Date.now();
      this.earnTokens(quest.reward, 'quest', `Quest completed: ${quest.title}`);
    }
    this.saveState();
    this.notifyListeners();
  }

  // Also update quests by category (for generic increments)
  incrementQuestCategory(category: QuestDefinition['category'], increment: number = 1) {
    this.quests.forEach(q => {
      if (q.category === category && !q.completedAt) {
        // Don't auto-increment category quests - they need specific logic
        // This is a placeholder for more sophisticated quest tracking
      }
    });
  }

  // --- Earning Loop ---

  setComputeState(isComputing: boolean) {
    this.isComputing = isComputing;
  }

  private startEarningLoop() {
    if (typeof window === 'undefined') return;
    
    // Earn tokens every 60 seconds
    this.earningInterval = setInterval(() => {
      const streakMult = this.getStreakMultiplier();
      let earned = 0;
      let category: TokenTransaction['category'] = 'screen_time';
      let desc = '';

      if (this.isComputing) {
        earned = this.earningRate.perMinuteCompute * streakMult;
        category = 'mesh_compute';
        desc = 'Mesh compute contribution';
      } else if (this.isUserIdle || !this.isTabVisible) {
        earned = this.earningRate.perMinuteIdle * streakMult;
        category = 'idle_compute';
        desc = 'Idle/background compute';
      } else {
        earned = this.earningRate.perMinuteActive * streakMult;
        category = 'screen_time';
        desc = 'Active screen time';
      }

      if (earned > 0) {
        this.earnTokens(earned, category, desc);
        // Update idle compute quest
        if (category === 'idle_compute' || category === 'mesh_compute') {
          this.updateQuestProgress('q_idle_10', 1);
        }
        if (category === 'mesh_compute') {
          this.updateQuestProgress('q_mesh_30', 1);
          this.updateQuestProgress('q_week_compute_60', 1);
        }
      }
    }, 60000); // Every 60 seconds
  }

  private earnTokens(amount: number, category: TokenTransaction['category'], description: string) {
    this.balance.tokens += amount;
    this.balance.earnedLifetime += amount;
    this.addTransaction('earn', category, amount, description);
    this.saveState();
    this.notifyListeners();
  }

  private addTransaction(type: TokenTransaction['type'], category: TokenTransaction['category'], amount: number, description: string) {
    this.transactions.unshift({
      id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      category,
      amount,
      description,
      timestamp: Date.now(),
    });
    // Keep last 100 transactions
    if (this.transactions.length > 100) this.transactions = this.transactions.slice(0, 100);
  }

  getTransactions(limit: number = 20): TokenTransaction[] {
    return this.transactions.slice(0, limit);
  }

  // --- Activity Listeners ---

  private setupActivityListeners() {
    if (typeof window === 'undefined') return;

    // Tab visibility
    document.addEventListener('visibilitychange', () => {
      this.isTabVisible = !document.hidden;
    });

    // User activity detection
    const resetIdle = () => {
      this.isUserIdle = false;
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => {
        this.isUserIdle = true;
      }, 300000); // 5 min idle = idle mode
    };

    ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'].forEach(evt =>
      window.addEventListener(evt, resetIdle, { passive: true })
    );

    resetIdle();
  }

  // --- State Persistence ---

  private loadState() {
    if (typeof window === 'undefined') return;
    try {
      const balance = localStorage.getItem(STORAGE_KEYS.balance);
      if (balance) this.balance = JSON.parse(balance);
      
      const transactions = localStorage.getItem(STORAGE_KEYS.transactions);
      if (transactions) this.transactions = JSON.parse(transactions);
      
      const streak = localStorage.getItem(STORAGE_KEYS.streak);
      if (streak) this.streak = JSON.parse(streak);
      
      const referral = localStorage.getItem(STORAGE_KEYS.referral);
      if (referral) this.referral = JSON.parse(referral);
      
      const quests = localStorage.getItem(STORAGE_KEYS.quests);
      if (quests) this.quests = JSON.parse(quests);
    } catch (e) {
      console.error('Failed to load token economy state:', e);
    }
  }

  private saveState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEYS.balance, JSON.stringify(this.balance));
      localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(this.transactions));
      localStorage.setItem(STORAGE_KEYS.streak, JSON.stringify(this.streak));
      localStorage.setItem(STORAGE_KEYS.referral, JSON.stringify(this.referral));
      localStorage.setItem(STORAGE_KEYS.quests, JSON.stringify(this.quests));
    } catch (e) {
      console.error('Failed to save token economy state:', e);
    }
  }

  // --- Listener Pattern ---

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  // --- Compute Power Tiers ---

  getComputeTier(): ComputeTier {
    const tokens = this.balance.tokens;
    if (tokens >= 50000) return { name: 'Omega', maxMeshNodes: 16, storageGB: 20, priority: 'highest', color: 'hsl(280 100% 70%)' };
    if (tokens >= 20000) return { name: 'Ultra', maxMeshNodes: 8, storageGB: 10, priority: 'high', color: 'hsl(220 100% 60%)' };
    if (tokens >= 5000) return { name: 'Pro', maxMeshNodes: 4, storageGB: 5, priority: 'medium', color: 'hsl(142 71% 45%)' };
    if (tokens >= 1000) return { name: 'Plus', maxMeshNodes: 2, storageGB: 3, priority: 'low', color: 'hsl(45 100% 51%)' };
    return { name: 'Free', maxMeshNodes: 1, storageGB: 1, priority: 'normal', color: 'hsl(0 0% 60%)' };
  }
}

export interface ComputeTier {
  name: string;
  maxMeshNodes: number;
  storageGB: number;
  priority: 'normal' | 'low' | 'medium' | 'high' | 'highest';
  color: string;
}

// --- Singleton ---

export const tokenEconomy: TokenEconomyEngine | null =
  typeof window !== 'undefined' ? TokenEconomyEngine.getInstance() : null;

export default TokenEconomyEngine;
