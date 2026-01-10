/**
 * Navigation and History Management
 * 
 * Handles browser-like navigation, history, and tab management.
 */

export interface Tab {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  createdAt: number;
  lastAccessedAt: number;
}

export interface NavigationOptions {
  replace?: boolean;
  userInitiated?: boolean;
}

export type TabChangeCallback = (tabId: number) => void;
export type TabCloseCallback = (tabId: number) => void;
export type NavigationCompleteCallback = (tabId: number, url: string) => void;

/**
 * Tab Manager - Manages multiple browser tabs
 */
export class TabManager {
  private tabs: Map<number, Tab> = new Map();
  private activeTabId: number | null = null;
  private nextTabId: number = 1;
  private onTabChangeCallbacks: TabChangeCallback[] = [];
  private onTabCloseCallbacks: TabCloseCallback[] = [];
  private onNavigationCompleteCallbacks: NavigationCompleteCallback[] = [];

  createTab(url: string = 'about:blank', activate: boolean = true): number {
    const tabId = this.nextTabId++;
    const tab: Tab = {
      id: tabId,
      title: 'New Tab',
      url: url,
      isLoading: false,
      canGoBack: false,
      canGoForward: false,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.tabs.set(tabId, tab);

    if (activate) {
      this.activateTab(tabId);
    }

    console.log(`[TabManager] Created tab ${tabId}: ${url}`);
    return tabId;
  }

  closeTab(tabId: number): boolean {
    if (!this.tabs.has(tabId)) {
      return false;
    }

    this.tabs.delete(tabId);
    this.onTabCloseCallbacks.forEach(cb => cb(tabId));

    // If closing active tab, activate another one
    if (this.activeTabId === tabId) {
      const remainingTabs = Array.from(this.tabs.keys());
      if (remainingTabs.length > 0) {
        this.activateTab(remainingTabs[0]);
      } else {
        this.activeTabId = null;
      }
    }

    console.log(`[TabManager] Closed tab ${tabId}`);
    return true;
  }

  activateTab(tabId: number): boolean {
    if (!this.tabs.has(tabId)) {
      return false;
    }

    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId)!;
    tab.lastAccessedAt = Date.now();

    this.onTabChangeCallbacks.forEach(cb => cb(tabId));
    console.log(`[TabManager] Activated tab ${tabId}`);
    return true;
  }

  getTab(tabId: number): Tab | undefined {
    return this.tabs.get(tabId);
  }

  getActiveTab(): Tab | undefined {
    return this.activeTabId !== null ? this.tabs.get(this.activeTabId) : undefined;
  }

  getAllTabs(): Tab[] {
    return Array.from(this.tabs.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  updateTab(tabId: number, updates: Partial<Tab>): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) {
      return false;
    }

    Object.assign(tab, updates);
    return true;
  }

  // Event listeners
  onTabChange(callback: TabChangeCallback): void {
    this.onTabChangeCallbacks.push(callback);
  }

  onTabClose(callback: TabCloseCallback): void {
    this.onTabCloseCallbacks.push(callback);
  }

  onNavigationComplete(callback: NavigationCompleteCallback): void {
    this.onNavigationCompleteCallbacks.push(callback);
  }

  notifyNavigationComplete(tabId: number, url: string): void {
    this.onNavigationCompleteCallbacks.forEach(cb => cb(tabId, url));
  }
}

/**
 * Navigation Controller - Handles navigation within a single tab/webview
 */
export class NavigationController {
  private history: string[] = [];
  private currentIndex: number = -1;

  navigate(url: string, options: NavigationOptions = {}): void {
    if (options.replace && this.currentIndex >= 0) {
      // Replace current entry
      this.history[this.currentIndex] = url;
    } else {
      // Add new entry
      // Remove forward history if navigating from middle
      if (this.currentIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.currentIndex + 1);
      }
      this.history.push(url);
      this.currentIndex = this.history.length - 1;
    }

    console.log(`[NavigationController] Navigate to: ${url} (replace: ${options.replace})`);
  }

  goBack(): string | null {
    if (this.canGoBack()) {
      this.currentIndex--;
      return this.getCurrentURL();
    }
    return null;
  }

  goForward(): string | null {
    if (this.canGoForward()) {
      this.currentIndex++;
      return this.getCurrentURL();
    }
    return null;
  }

  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  getCurrentURL(): string | null {
    return this.currentIndex >= 0 ? this.history[this.currentIndex] : null;
  }

  getHistory(): string[] {
    return [...this.history];
  }

  clear(): void {
    this.history = [];
    this.currentIndex = -1;
  }
}

/**
 * URL Parser and Validator
 */
export class URLParser {
  static parse(urlString: string): URL | null {
    try {
      // Add protocol if missing
      if (!urlString.match(/^https?:\/\//)) {
        urlString = 'https://' + urlString;
      }
      return new URL(urlString);
    } catch (e) {
      return null;
    }
  }

  static isValid(urlString: string): boolean {
    return this.parse(urlString) !== null;
  }

  static normalize(urlString: string): string {
    const url = this.parse(urlString);
    return url ? url.href : urlString;
  }

  static getDomain(urlString: string): string | null {
    const url = this.parse(urlString);
    return url ? url.hostname : null;
  }

  static getProtocol(urlString: string): string | null {
    const url = this.parse(urlString);
    return url ? url.protocol.replace(':', '') : null;
  }

  static isSecure(urlString: string): boolean {
    const protocol = this.getProtocol(urlString);
    return protocol === 'https' || protocol === 'wss';
  }
}

/**
 * Bookmark Manager
 */
export interface Bookmark {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  folder?: string;
  createdAt: number;
  tags?: string[];
}

export class BookmarkManager {
  private bookmarks: Map<number, Bookmark> = new Map();
  private nextId: number = 1;
  private folders: Set<string> = new Set(['Default']);

  addBookmark(title: string, url: string, folder: string = 'Default', tags?: string[]): number {
    const id = this.nextId++;
    const bookmark: Bookmark = {
      id,
      title,
      url,
      folder,
      createdAt: Date.now(),
      tags,
    };

    this.bookmarks.set(id, bookmark);
    this.folders.add(folder);

    console.log(`[BookmarkManager] Added bookmark ${id}: ${title}`);
    return id;
  }

  removeBookmark(id: number): boolean {
    const deleted = this.bookmarks.delete(id);
    if (deleted) {
      console.log(`[BookmarkManager] Removed bookmark ${id}`);
    }
    return deleted;
  }

  getBookmark(id: number): Bookmark | undefined {
    return this.bookmarks.get(id);
  }

  getAllBookmarks(): Bookmark[] {
    return Array.from(this.bookmarks.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  getBookmarksByFolder(folder: string): Bookmark[] {
    return this.getAllBookmarks().filter(b => b.folder === folder);
  }

  searchBookmarks(query: string): Bookmark[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllBookmarks().filter(b =>
      b.title.toLowerCase().includes(lowerQuery) ||
      b.url.toLowerCase().includes(lowerQuery) ||
      (b.tags && b.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  getFolders(): string[] {
    return Array.from(this.folders).sort();
  }

  createFolder(name: string): void {
    this.folders.add(name);
  }

  async exportBookmarks(): Promise<string> {
    const data = {
      bookmarks: this.getAllBookmarks(),
      folders: this.getFolders(),
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  async importBookmarks(jsonData: string): Promise<number> {
    try {
      const data = JSON.parse(jsonData);
      let count = 0;

      if (data.folders) {
        data.folders.forEach((folder: string) => this.folders.add(folder));
      }

      if (data.bookmarks) {
        data.bookmarks.forEach((bm: Bookmark) => {
          this.addBookmark(bm.title, bm.url, bm.folder, bm.tags);
          count++;
        });
      }

      console.log(`[BookmarkManager] Imported ${count} bookmarks`);
      return count;
    } catch (e) {
      console.error("[BookmarkManager] Failed to import bookmarks:", e);
      return 0;
    }
  }
}

/**
 * Download Manager
 */
export interface Download {
  id: number;
  url: string;
  filename: string;
  size: number;
  downloadedBytes: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export class DownloadManager {
  private downloads: Map<number, Download> = new Map();
  private nextId: number = 1;

  startDownload(url: string, filename?: string): number {
    const id = this.nextId++;
    const download: Download = {
      id,
      url,
      filename: filename || this.extractFilename(url),
      size: 0,
      downloadedBytes: 0,
      status: 'pending',
      startedAt: Date.now(),
    };

    this.downloads.set(id, download);
    this.performDownload(id);

    console.log(`[DownloadManager] Started download ${id}: ${url}`);
    return id;
  }

  private async performDownload(id: number): Promise<void> {
    const download = this.downloads.get(id);
    if (!download) return;

    try {
      download.status = 'downloading';

      const response = await fetch(download.url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const blob = await response.blob();
      download.size = blob.size;
      download.downloadedBytes = blob.size;
      download.status = 'completed';
      download.completedAt = Date.now();

      // Trigger browser download
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = download.filename;
      a.click();
      URL.revokeObjectURL(blobUrl);

      console.log(`[DownloadManager] Completed download ${id}`);
    } catch (e: any) {
      download.status = 'failed';
      download.error = e.message;
      console.error(`[DownloadManager] Failed download ${id}:`, e);
    }
  }

  cancelDownload(id: number): boolean {
    const download = this.downloads.get(id);
    if (download && download.status === 'downloading') {
      download.status = 'cancelled';
      console.log(`[DownloadManager] Cancelled download ${id}`);
      return true;
    }
    return false;
  }

  getDownload(id: number): Download | undefined {
    return this.downloads.get(id);
  }

  getAllDownloads(): Download[] {
    return Array.from(this.downloads.values()).sort((a, b) => b.startedAt - a.startedAt);
  }

  clearCompleted(): void {
    for (const [id, download] of this.downloads.entries()) {
      if (download.status === 'completed') {
        this.downloads.delete(id);
      }
    }
  }

  private extractFilename(url: string): string {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;
      return pathname.substring(pathname.lastIndexOf('/') + 1) || 'download';
    } catch (e) {
      return 'download';
    }
  }
}

console.log("[Navigation] Module loaded");
