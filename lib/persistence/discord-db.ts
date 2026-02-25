/**
 * Discord-backed Storage Database
 * Uses Discord webhooks to store user profiles and files
 * Provides unlimited cloud storage via Discord CDN
 */

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
  type: "game" | "app" | "apk" | "exe";
  installedAt: number;
  fileUrl?: string;
  metadata?: Record<string, any>;
}

export interface UserSettings {
  theme: "dark" | "light";
  notifications: boolean;
  autoSync: boolean;
}

interface ProfileReference {
  messageId: string;
  fingerprint: string;
  timestamp: number;
}

const PROFILE_FILENAME_PREFIX = "user_profile_";
const LOCAL_STORAGE_KEY = "cd_discord_profile_ref";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Discord-backed Account Database
 * Singleton class for managing user profiles via Discord storage
 */
export class DiscordDB {
  private static instance: DiscordDB;
  private currentProfile: UserProfile | null = null;
  private profileCache: Map<
    string,
    { profile: UserProfile; timestamp: number }
  > = new Map();

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
    try {
      // Check cache first
      const cached = this.profileCache.get(fingerprint);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        this.currentProfile = cached.profile;
        return cached.profile;
      }

      // Check if we have a local reference to a Discord message
      const ref = this.getLocalReference();

      if (ref && ref.fingerprint === fingerprint) {
        try {
          const profile = await this.fetchProfileFromDiscord(ref.messageId);
          if (profile) {
            this.currentProfile = profile;
            this.cacheProfile(fingerprint, profile);
            return profile;
          }
        } catch (err) {
          console.warn(
            "[DiscordDB] Failed to fetch profile, creating new:",
            err,
          );
        }
      }

      // No reference or fetch failed — create new profile
      const newProfile = this.createNewProfile(fingerprint);
      this.currentProfile = newProfile;

      // Try to save to Discord (fails silently if not configured)
      this.saveProfile(newProfile).catch((err) => {
        console.warn("[DiscordDB] Failed to save new profile:", err);
      });

      return newProfile;
    } catch (err) {
      console.error("[DiscordDB] Init failed, using local-only profile:", err);
      return this.createNewProfile(fingerprint);
    }
  }

  /**
   * Create a new user profile
   */
  private createNewProfile(fingerprint: string): UserProfile {
    return {
      username: `User-${fingerprint.substring(0, 8)}`,
      fingerprint,
      installedApps: [],
      settings: {
        theme: "dark",
        notifications: true,
        autoSync: true,
      },
      createdAt: Date.now(),
      lastSynced: Date.now(),
    };
  }

  /**
   * Save the current profile to Discord
   */
  async saveProfile(profile: UserProfile): Promise<void> {
    try {
      this.currentProfile = profile;
      profile.lastSynced = Date.now();

      const blob = new Blob([JSON.stringify(profile, null, 2)], {
        type: "application/json",
      });
      const file = new File(
        [blob],
        `${PROFILE_FILENAME_PREFIX}${profile.fingerprint}.json`,
        { type: "application/json" },
      );

      const metadata = await this.uploadFile(file);

      if (metadata?.messageId) {
        this.saveLocalReference({
          messageId: metadata.messageId,
          fingerprint: profile.fingerprint,
          timestamp: Date.now(),
        });
        this.cacheProfile(profile.fingerprint, profile);
      }
    } catch (err) {
      console.error("[DiscordDB] Failed to save profile:", err);
      throw new Error("Failed to save profile to Discord storage");
    }
  }

  /**
   * Fetch profile from Discord by message ID
   */
  private async fetchProfileFromDiscord(
    messageId: string,
  ): Promise<UserProfile | null> {
    try {
      const response = await fetch(`/api/discord/file?messageId=${messageId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Download the file content
      if (data.url) {
        const fileResponse = await fetch(data.url);
        if (!fileResponse.ok) {
          throw new Error("Failed to download profile file");
        }
        const profile = await fileResponse.json();
        return profile as UserProfile;
      }

      return null;
    } catch (err) {
      console.error("[DiscordDB] Failed to fetch profile:", err);
      return null;
    }
  }

  /**
   * Upload a file to Discord
   */
  private async uploadFile(
    file: File,
  ): Promise<{ messageId: string; url: string } | null> {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/discord/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return {
        messageId: data.messageId,
        url: data.url,
      };
    } catch (err) {
      console.error("[DiscordDB] Upload failed:", err);
      throw err;
    }
  }

  /**
   * Get current profile
   */
  getProfile(): UserProfile | null {
    return this.currentProfile;
  }

  /**
   * Add an app to the user's library
   */
  async addApp(app: InstalledApp): Promise<void> {
    if (!this.currentProfile) {
      throw new Error("No profile loaded");
    }

    // Remove if already exists
    this.currentProfile.installedApps =
      this.currentProfile.installedApps.filter((a) => a.id !== app.id);

    // Add new app
    this.currentProfile.installedApps.push(app);

    // Save to Discord
    await this.saveProfile(this.currentProfile);
  }

  /**
   * Remove an app from the user's library
   */
  async removeApp(appId: string): Promise<void> {
    if (!this.currentProfile) {
      throw new Error("No profile loaded");
    }

    this.currentProfile.installedApps =
      this.currentProfile.installedApps.filter((a) => a.id !== appId);

    await this.saveProfile(this.currentProfile);
  }

  /**
   * Get all installed apps
   */
  getInstalledApps(): InstalledApp[] {
    return this.currentProfile?.installedApps || [];
  }

  /**
   * Update user settings
   */
  async updateSettings(settings: Partial<UserSettings>): Promise<void> {
    if (!this.currentProfile) {
      throw new Error("No profile loaded");
    }

    this.currentProfile.settings = {
      ...this.currentProfile.settings,
      ...settings,
    };

    await this.saveProfile(this.currentProfile);
  }

  /**
   * Update username
   */
  async updateUsername(username: string): Promise<void> {
    if (!this.currentProfile) {
      throw new Error("No profile loaded");
    }

    this.currentProfile.username = username;
    await this.saveProfile(this.currentProfile);
  }

  /**
   * Save reference to localStorage
   */
  private saveLocalReference(ref: ProfileReference): void {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ref));
      }
    } catch (err) {
      console.warn("[DiscordDB] Failed to save local reference:", err);
    }
  }

  /**
   * Get reference from localStorage
   */
  private getLocalReference(): ProfileReference | null {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (err) {
      console.warn("[DiscordDB] Failed to read local reference:", err);
    }
    return null;
  }

  /**
   * Cache profile in memory
   */
  private cacheProfile(fingerprint: string, profile: UserProfile): void {
    this.profileCache.set(fingerprint, {
      profile,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.profileCache.clear();
  }

  /**
   * Force sync profile
   */
  async forceSync(): Promise<void> {
    if (!this.currentProfile) {
      throw new Error("No profile to sync");
    }
    await this.saveProfile(this.currentProfile);
  }

  /**
   * Check if storage is available
   */
  async checkStorageAvailability(): Promise<boolean> {
    try {
      const response = await fetch("/api/discord/status");
      if (!response.ok) return false;
      const data = await response.json();
      return data.available === true;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const discordDB = DiscordDB.getInstance();

// Export helper functions
export async function initDiscordDB(fingerprint: string): Promise<UserProfile> {
  return discordDB.init(fingerprint);
}

export function getDiscordProfile(): UserProfile | null {
  return discordDB.getProfile();
}

export async function addAppToLibrary(app: InstalledApp): Promise<void> {
  return discordDB.addApp(app);
}

export async function removeAppFromLibrary(appId: string): Promise<void> {
  return discordDB.removeApp(appId);
}

export function getInstalledApps(): InstalledApp[] {
  return discordDB.getInstalledApps();
}
