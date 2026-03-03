/**
 * Android Broadcast Receiver
 * Handles system-wide broadcast announcements
 */

import { Intent } from './activity-manager';

export abstract class BroadcastReceiver {
  abstract onReceive(intent: Intent): void | Promise<void>;
}

export interface RegisteredReceiver {
  receiver: BroadcastReceiver;
  filter: IntentFilter;
  priority: number;
}

export interface IntentFilter {
  actions: Set<string>;
  categories: Set<string>;
  dataSchemes: Set<string>;
  priority: number;
}

/**
 * Broadcast Manager
 */
export class BroadcastManager {
  private receivers: RegisteredReceiver[] = [];
  private stickyBroadcasts: Map<string, Intent> = new Map();
  
  // Well-known broadcast actions
  static readonly ACTION_BOOT_COMPLETED = 'android.intent.action.BOOT_COMPLETED';
  static readonly ACTION_SCREEN_ON = 'android.intent.action.SCREEN_ON';
  static readonly ACTION_SCREEN_OFF = 'android.intent.action.SCREEN_OFF';
  static readonly ACTION_BATTERY_CHANGED = 'android.intent.action.BATTERY_CHANGED';
  static readonly ACTION_BATTERY_LOW = 'android.intent.action.BATTERY_LOW';
  static readonly ACTION_POWER_CONNECTED = 'android.intent.action.ACTION_POWER_CONNECTED';
  static readonly ACTION_POWER_DISCONNECTED = 'android.intent.action.ACTION_POWER_DISCONNECTED';
  static readonly ACTION_TIMEZONE_CHANGED = 'android.intent.action.TIMEZONE_CHANGED';
  static readonly ACTION_TIME_CHANGED = 'android.intent.action.TIME_SET';
  static readonly ACTION_LOCALE_CHANGED = 'android.intent.action.LOCALE_CHANGED';
  static readonly ACTION_PACKAGE_ADDED = 'android.intent.action.PACKAGE_ADDED';
  static readonly ACTION_PACKAGE_REMOVED = 'android.intent.action.PACKAGE_REMOVED';
  static readonly ACTION_AIRPLANE_MODE_CHANGED = 'android.intent.action.AIRPLANE_MODE';
  static readonly ACTION_WIFI_STATE_CHANGED = 'android.intent.action.WIFI_STATE_CHANGED';
  
  constructor() {
    console.log('[BroadcastManager] Initialized');
  }
  
  /**
   * Register broadcast receiver
   */
  registerReceiver(receiver: BroadcastReceiver, filter: IntentFilter): void {
    this.receivers.push({
      receiver,
      filter,
      priority: filter.priority,
    });
    
    // Sort by priority (higher first)
    this.receivers.sort((a, b) => b.priority - a.priority);
    
    console.log(`[BroadcastManager] Registered receiver for actions:`, Array.from(filter.actions));
  }
  
  /**
   * Unregister broadcast receiver
   */
  unregisterReceiver(receiver: BroadcastReceiver): void {
    const index = this.receivers.findIndex(r => r.receiver === receiver);
    if (index !== -1) {
      this.receivers.splice(index, 1);
      console.log('[BroadcastManager] Unregistered receiver');
    }
  }
  
  /**
   * Send broadcast
   */
  async sendBroadcast(intent: Intent): Promise<void> {
    console.log(`[BroadcastManager] Sending broadcast: ${intent.action}`);
    
    const matchingReceivers = this.receivers.filter(r => 
      this.matchesFilter(intent, r.filter)
    );
    
    for (const { receiver } of matchingReceivers) {
      try {
        await receiver.onReceive(intent);
      } catch (e) {
        console.error('[BroadcastManager] Receiver error:', e);
      }
    }
  }
  
  /**
   * Send ordered broadcast
   */
  async sendOrderedBroadcast(intent: Intent): Promise<void> {
    console.log(`[BroadcastManager] Sending ordered broadcast: ${intent.action}`);
    
    const matchingReceivers = this.receivers.filter(r => 
      this.matchesFilter(intent, r.filter)
    );
    
    // Process receivers in priority order
    for (const { receiver } of matchingReceivers) {
      try {
        await receiver.onReceive(intent);
        // In real Android, receiver can abort broadcast
      } catch (e) {
        console.error('[BroadcastManager] Receiver error:', e);
      }
    }
  }
  
  /**
   * Send sticky broadcast
   */
  async sendStickyBroadcast(intent: Intent): Promise<void> {
    if (!intent.action) {
      throw new Error('Sticky broadcast must have action');
    }
    
    console.log(`[BroadcastManager] Sending sticky broadcast: ${intent.action}`);
    
    // Store sticky broadcast
    this.stickyBroadcasts.set(intent.action, intent);
    
    // Send to current receivers
    await this.sendBroadcast(intent);
  }
  
  /**
   * Remove sticky broadcast
   */
  removeStickyBroadcast(intent: Intent): void {
    if (intent.action) {
      this.stickyBroadcasts.delete(intent.action);
    }
  }
  
  /**
   * Get sticky broadcast
   */
  getStickyBroadcast(action: string): Intent | null {
    return this.stickyBroadcasts.get(action) || null;
  }
  
  /**
   * Check if intent matches filter
   */
  private matchesFilter(intent: Intent, filter: IntentFilter): boolean {
    // Check action
    if (intent.action && !filter.actions.has(intent.action)) {
      return false;
    }
    
    // Check categories
    if (intent.category) {
      for (const category of intent.category) {
        if (!filter.categories.has(category)) {
          return false;
        }
      }
    }
    
    // Check data scheme
    if (intent.data && filter.dataSchemes.size > 0) {
      const scheme = intent.data.split(':')[0];
      if (!filter.dataSchemes.has(scheme)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Create intent filter
   */
  static createFilter(
    actions: string[],
    categories: string[] = [],
    dataSchemes: string[] = [],
    priority: number = 0
  ): IntentFilter {
    return {
      actions: new Set(actions),
      categories: new Set(categories),
      dataSchemes: new Set(dataSchemes),
      priority,
    };
  }
}
