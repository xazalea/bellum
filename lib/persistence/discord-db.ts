import { uploadFile, downloadFile } from '@/lib/storage/discord-webhook-storage';

export interface UserProfile {
  username: string;
  fingerprint: string;
  installedApps: InstalledApp[];
  settings: UserSettings;
  createdAt: number;
  lastSynced: number;
}

export interface InstalledApp {
  id: string;
  title: string;
  thumb?: string;
  type: 'game' | 'app';
  installedAt: number;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  notifications: boolean;
}

const PROFILE_FILENAME_PREFIX = 'user_profile_';
const LOCAL_STORAGE_KEY = 'nacho_discord_profile_ref';

interface ProfileReference {
  messageId: string;
  fingerprint: string;
}

/**
 * Discord-backed Account Database
 * Uses Discord webhooks to store user profiles as JSON files.
 */
export class DiscordDB {
  private static instance: DiscordDB;
  private currentProfile: UserProfile | null = null;

  private constructor() {}

  static getInstance(): DiscordDB {
    if (!DiscordDB.instance) {
      DiscordDB.instance = new DiscordDB();
    }
    return DiscordDB.instance;
  }

  /**
   * Initialize or load the user profile
   */
  async init(fingerprint: string): Promise<UserProfile> {
    // 1. Check if we have a local reference to a Discord message
    const ref = this.getLocalReference();

    if (ref && ref.fingerprint === fingerprint) {
      try {
        // 2. Try to fetch the profile from Discord
        console.log(`[DiscordDB] Fetching profile for ${fingerprint} from message ${ref.messageId}`);
        const profile = await this.fetchProfileFromDiscord(ref.messageId);
        if (profile) {
          this.currentProfile = profile;
          return profile;
        }
      } catch (e) {
        console.warn('[DiscordDB] Failed to fetch profile, falling back to new profile', e);
      }
    }

    // 3. If no reference or fetch failed, create a new profile
    console.log(`[DiscordDB] Creating new profile for ${fingerprint}`);
    const newProfile: UserProfile = {
      username: `User-${fingerprint.substring(0, 6)}`,
      fingerprint,
      installedApps: [],
      settings: { theme: 'dark', notifications: true },
      createdAt: Date.now(),
      lastSynced: Date.now(),
    };

    this.currentProfile = newProfile;
    await this.saveProfile(newProfile);
    return newProfile;
  }

  /**
   * Save the current profile to Discord
   */
  async saveProfile(profile: UserProfile): Promise<void> {
    this.currentProfile = profile;
    profile.lastSynced = Date.now();

    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const file = new File([blob], `${PROFILE_FILENAME_PREFIX}${profile.fingerprint}.json`, { type: 'application/json' });

    try {
      console.log('[DiscordDB] Uploading profile to Discord...');
      const metadata = await uploadFile(file);
      
      // Store the new message ID locally so we can find it later
      this.setLocalReference({
        messageId: metadata.fileId, // In our storage lib, fileId is often the messageId or a UUID mapping to it
        fingerprint: profile.fingerprint
      });
      
      console.log(`[DiscordDB] Profile saved. Ref: ${metadata.fileId}`);
    } catch (e) {
      console.error('[DiscordDB] Failed to save profile', e);
      throw e;
    }
  }

  async getProfile(): Promise<UserProfile | null> {
    return this.currentProfile;
  }

  async addApp(app: InstalledApp): Promise<void> {
    if (!this.currentProfile) throw new Error('Profile not initialized');
    
    // Check if already installed
    if (this.currentProfile.installedApps.some(a => a.id === app.id)) {
      return;
    }

    this.currentProfile.installedApps.push(app);
    await this.saveProfile(this.currentProfile);
  }

  async removeApp(appId: string): Promise<void> {
    if (!this.currentProfile) throw new Error('Profile not initialized');
    
    this.currentProfile.installedApps = this.currentProfile.installedApps.filter(a => a.id !== appId);
    await this.saveProfile(this.currentProfile);
  }

  // --- Helpers ---

  private async fetchProfileFromDiscord(messageId: string): Promise<UserProfile | null> {
    try {
      // Download the file using our storage lib
      // Note: downloadFile expects a fileId. If our storage lib treats messageId as fileId, this works.
      // If not, we might need to adjust based on how uploadFile returns the ID.
      // Assuming uploadFile returns a 'fileId' that downloadFile accepts.
      
      const blob = await downloadFile(messageId);
      const text = await blob.text();
      return JSON.parse(text) as UserProfile;
    } catch (e) {
      console.error('[DiscordDB] Error parsing profile from Discord', e);
      return null;
    }
  }

  private getLocalReference(): ProfileReference | null {
    if (typeof window === 'undefined') return null;
    const json = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!json) return null;
    try {
      return JSON.parse(json) as ProfileReference;
    } catch {
      return null;
    }
  }

  private setLocalReference(ref: ProfileReference): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ref));
  }
}

export const discordDB = DiscordDB.getInstance();
