/**
 * Achievements System
 * Handles achievement definitions, unlocking, and notifications
 */

export interface Achievement {
  id: string;
  gameId?: string;
  name: string;
  description: string;
  icon: string;
  category: 'gameplay' | 'social' | 'platform' | 'hidden';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  points: number;
  progress?: {
    current: number;
    target: number;
  };
  unlockedAt?: number;
  isSecret: boolean;
  prerequisites?: string[];
}

export interface UserAchievement {
  achievementId: string;
  userId: string;
  unlockedAt: number;
  progress: number;
  notified: boolean;
}

export interface AchievementNotification {
  achievement: Achievement;
  timestamp: number;
}

type AchievementCallback = (achievement: Achievement) => void;
type NotificationCallback = (notification: AchievementNotification) => void;

// Predefined achievements
const PLATFORM_ACHIEVEMENTS: Omit<Achievement, 'unlockedAt'>[] = [
  {
    id: 'first_game',
    name: 'First Steps',
    description: 'Play your first game',
    icon: 'gamepad',
    category: 'platform',
    rarity: 'common',
    points: 10,
    isSecret: false,
  },
  {
    id: 'ten_games',
    name: 'Getting Started',
    description: 'Play 10 different games',
    icon: 'target',
    category: 'platform',
    rarity: 'uncommon',
    points: 25,
    progress: { current: 0, target: 10 },
    isSecret: false,
  },
  {
    id: 'hundred_games',
    name: 'Gaming Enthusiast',
    description: 'Play 100 games',
    icon: 'trophy',
    category: 'platform',
    rarity: 'rare',
    points: 100,
    progress: { current: 0, target: 100 },
    isSecret: false,
  },
  {
    id: 'first_friend',
    name: 'Social Butterfly',
    description: 'Add your first friend',
    icon: 'users',
    category: 'social',
    rarity: 'common',
    points: 10,
    isSecret: false,
  },
  {
    id: 'five_friends',
    name: 'Popular',
    description: 'Have 5 friends',
    icon: 'star',
    category: 'social',
    rarity: 'uncommon',
    points: 25,
    progress: { current: 0, target: 5 },
    isSecret: false,
  },
  {
    id: 'first_session',
    name: 'Party Time',
    description: 'Create or join your first game session',
    icon: 'party',
    category: 'social',
    rarity: 'common',
    points: 10,
    isSecret: false,
  },
  {
    id: 'apk_master',
    name: 'Android Master',
    description: 'Successfully run 10 APK files',
    icon: 'bot',
    category: 'platform',
    rarity: 'uncommon',
    points: 50,
    progress: { current: 0, target: 10 },
    isSecret: false,
  },
  {
    id: 'exe_master',
    name: 'Windows Wizard',
    description: 'Successfully run 10 EXE files',
    icon: 'monitor',
    category: 'platform',
    rarity: 'uncommon',
    points: 50,
    progress: { current: 0, target: 10 },
    isSecret: false,
  },
  {
    id: 'streamer',
    name: 'Stream Star',
    description: 'Stream a game for the first time',
    icon: 'radio',
    category: 'platform',
    rarity: 'rare',
    points: 75,
    isSecret: false,
  },
  {
    id: 'speedrun',
    name: 'Speed Demon',
    description: 'Complete a game in under 10 minutes',
    icon: 'zap',
    category: 'gameplay',
    rarity: 'rare',
    points: 100,
    isSecret: true,
  },
  {
    id: 'marathon',
    name: 'Marathon Runner',
    description: 'Play for 4 hours straight',
    icon: 'timer',
    category: 'gameplay',
    rarity: 'epic',
    points: 150,
    isSecret: false,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Play a game between 2 AM and 5 AM',
    icon: 'moon',
    category: 'hidden',
    rarity: 'uncommon',
    points: 25,
    isSecret: true,
  },
  {
    id: 'cloud_saver',
    name: 'Cloud Saver',
    description: 'Save your first game to the cloud',
    icon: 'cloud',
    category: 'platform',
    rarity: 'common',
    points: 10,
    isSecret: false,
  },
  {
    id: 'ai_pioneer',
    name: 'AI Pioneer',
    description: 'Have a conversation with the AI assistant',
    icon: 'bot',
    category: 'platform',
    rarity: 'common',
    points: 10,
    isSecret: false,
  },
  {
    id: 'collector',
    name: 'Game Collector',
    description: 'Have 50 games in your library',
    icon: 'library',
    category: 'platform',
    rarity: 'rare',
    points: 100,
    progress: { current: 0, target: 50 },
    isSecret: false,
  },
];

class AchievementManager {
  private achievements: Map<string, Achievement> = new Map();
  private userAchievements: Map<string, UserAchievement> = new Map();
  private unlockCallbacks: Set<AchievementCallback> = new Set();
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private pendingNotifications: AchievementNotification[] = [];
  private userId: string | null = null;

  constructor() {
    this.initializeAchievements();
  }

  /**
   * Initialize predefined achievements
   */
  private initializeAchievements(): void {
    PLATFORM_ACHIEVEMENTS.forEach(achievement => {
      this.achievements.set(achievement.id, { ...achievement, unlockedAt: undefined });
    });
  }

  /**
   * Initialize user achievements
   */
  async initialize(userId: string): Promise<void> {
    this.userId = userId;
    await this.loadUserAchievements();
  }

  /**
   * Load user achievements from server
   */
  private async loadUserAchievements(): Promise<void> {
    if (!this.userId) return;

    try {
      const response = await fetch('/api/achievements');
      if (response.ok) {
        const data = await response.json();
        data.achievements.forEach((ua: UserAchievement) => {
          this.userAchievements.set(ua.achievementId, ua);
          
          // Update achievement progress
          const achievement = this.achievements.get(ua.achievementId);
          if (achievement && ua.progress > 0) {
            achievement.progress = {
              current: ua.progress,
              target: achievement.progress?.target || ua.progress,
            };
          }
        });
      }
    } catch (error) {
      console.error('[AchievementManager] Failed to load achievements:', error);
    }
  }

  /**
   * Check and unlock an achievement
   */
  async unlock(achievementId: string): Promise<boolean> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement) return false;

    // Check if already unlocked
    if (this.userAchievements.has(achievementId)) return false;

    // Check prerequisites
    if (achievement.prerequisites) {
      const allMet = achievement.prerequisites.every(
        prereq => this.userAchievements.has(prereq)
      );
      if (!allMet) return false;
    }

    // Unlock the achievement
    const userAchievement: UserAchievement = {
      achievementId,
      userId: this.userId || '',
      unlockedAt: Date.now(),
      progress: achievement.progress?.target || 1,
      notified: false,
    };

    this.userAchievements.set(achievementId, userAchievement);
    achievement.unlockedAt = Date.now();

    // Notify server
    try {
      await fetch('/api/achievements/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievementId }),
      });
    } catch (error) {
      console.error('[AchievementManager] Failed to sync achievement:', error);
    }

    // Trigger callbacks
    this.unlockCallbacks.forEach(cb => cb(achievement));

    // Add to pending notifications
    const notification: AchievementNotification = {
      achievement,
      timestamp: Date.now(),
    };
    this.pendingNotifications.push(notification);
    this.notificationCallbacks.forEach(cb => cb(notification));

    return true;
  }

  /**
   * Update progress on an achievement
   */
  async updateProgress(achievementId: string, progress: number): Promise<void> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement || !achievement.progress) return;

    achievement.progress.current = Math.min(progress, achievement.progress.target);

    // Check if target reached
    if (achievement.progress.current >= achievement.progress.target) {
      await this.unlock(achievementId);
    } else {
      // Sync progress to server
      try {
        await fetch('/api/achievements/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementId, progress: achievement.progress.current }),
        });
      } catch (error) {
        console.error('[AchievementManager] Failed to sync progress:', error);
      }
    }
  }

  /**
   * Increment progress on an achievement
   */
  async incrementProgress(achievementId: string, amount: number = 1): Promise<void> {
    const achievement = this.achievements.get(achievementId);
    if (!achievement?.progress) return;

    await this.updateProgress(achievementId, achievement.progress.current + amount);
  }

  /**
   * Get all achievements
   */
  getAchievements(): Achievement[] {
    return Array.from(this.achievements.values());
  }

  /**
   * Get unlocked achievements
   */
  getUnlockedAchievements(): Achievement[] {
    return this.getAchievements().filter(a => a.unlockedAt);
  }

  /**
   * Get locked achievements (excluding secret ones that haven't been unlocked)
   */
  getLockedAchievements(): Achievement[] {
    return this.getAchievements().filter(a => !a.unlockedAt && (!a.isSecret || a.unlockedAt));
  }

  /**
   * Get achievement by ID
   */
  getAchievement(id: string): Achievement | undefined {
    return this.achievements.get(id);
  }

  /**
   * Get total achievement points
   */
  getTotalPoints(): number {
    return this.getUnlockedAchievements().reduce((sum, a) => sum + a.points, 0);
  }

  /**
   * Get completion percentage
   */
  getCompletionPercentage(): number {
    const total = this.achievements.size;
    const unlocked = this.userAchievements.size;
    return Math.round((unlocked / total) * 100);
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): AchievementNotification[] {
    return this.pendingNotifications;
  }

  /**
   * Clear pending notifications
   */
  clearNotifications(): void {
    this.pendingNotifications = [];
  }

  /**
   * Subscribe to achievement unlocks
   */
  onUnlock(callback: AchievementCallback): () => void {
    this.unlockCallbacks.add(callback);
    return () => this.unlockCallbacks.delete(callback);
  }

  /**
   * Subscribe to achievement notifications
   */
  onNotification(callback: NotificationCallback): () => void {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  /**
   * Check game-specific achievements
   */
  async checkGameAchievements(gameId: string, event: string, data: Record<string, unknown>): Promise<void> {
    // This would be implemented per-game with specific achievement logic
    // For now, we'll handle common events
    
    switch (event) {
      case 'game_start':
        await this.incrementProgress('first_game');
        await this.incrementProgress('ten_games');
        await this.incrementProgress('hundred_games');
        break;

      case 'game_complete':
        if (data.time && (data.time as number) < 600000) { // 10 minutes in ms
          await this.unlock('speedrun');
        }
        break;

      case 'apk_run':
        await this.incrementProgress('apk_master');
        break;

      case 'exe_run':
        await this.incrementProgress('exe_master');
        break;

      case 'stream_start':
        await this.unlock('streamer');
        break;

      case 'cloud_save':
        await this.unlock('cloud_saver');
        break;

      case 'ai_chat':
        await this.unlock('ai_pioneer');
        break;
    }

    // Check time-based achievements
    const hour = new Date().getHours();
    if (hour >= 2 && hour < 5) {
      await this.unlock('night_owl');
    }
  }

  /**
   * Add a custom achievement (for game-specific achievements)
   */
  addAchievement(achievement: Omit<Achievement, 'unlockedAt'>): void {
    this.achievements.set(achievement.id, { ...achievement, unlockedAt: undefined });
  }
}

// Singleton instance
export const achievementManager = new AchievementManager();

// Hook for React components
export function useAchievements() {
  return achievementManager;
}