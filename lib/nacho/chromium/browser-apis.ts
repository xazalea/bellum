/**
 * Browser API Emulation
 * 
 * Provides browser API stubs for applications that expect browser-like environments.
 * Includes DOM manipulation, storage, networking, and other web APIs.
 */

/**
 * localStorage/sessionStorage Bridge
 */
export class StorageBridge {
  private storage: Map<string, string>;
  private isSession: boolean;

  constructor(isSessionStorage: boolean = false) {
    this.storage = new Map();
    this.isSession = isSessionStorage;
  }

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
    if (!this.isSession) {
      // Persist to IndexedDB for localStorage
      this.persist();
    }
  }

  removeItem(key: string): void {
    this.storage.delete(key);
    if (!this.isSession) {
      this.persist();
    }
  }

  clear(): void {
    this.storage.clear();
    if (!this.isSession) {
      this.persist();
    }
  }

  key(index: number): string | null {
    const keys = Array.from(this.storage.keys());
    return keys[index] || null;
  }

  get length(): number {
    return this.storage.size;
  }

  private async persist(): Promise<void> {
    // Persist to IndexedDB
    try {
      const db = await this.openDB();
      const tx = db.transaction('storage', 'readwrite');
      const store = tx.objectStore('storage');
      
      for (const [key, value] of this.storage.entries()) {
        await store.put({ key, value });
      }
      
      await tx.done;
    } catch (e) {
      console.error("[StorageBridge] Failed to persist:", e);
    }
  }

  private async openDB(): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BrowserStorage', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('storage')) {
          db.createObjectStore('storage', { keyPath: 'key' });
        }
      };
    });
  }

  async load(): Promise<void> {
    if (this.isSession) return; // Session storage is not persisted

    try {
      const db = await this.openDB();
      const tx = db.transaction('storage', 'readonly');
      const store = tx.objectStore('storage');
      const all = await store.getAll();
      
      for (const item of all) {
        this.storage.set(item.key, item.value);
      }
    } catch (e) {
      console.error("[StorageBridge] Failed to load:", e);
    }
  }
}

/**
 * Cookie Manager
 */
export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export class CookieManager {
  private cookies: Map<string, Cookie> = new Map();

  setCookie(cookie: Cookie): void {
    const key = this.getCookieKey(cookie.name, cookie.domain, cookie.path);
    this.cookies.set(key, cookie);
    console.log(`[CookieManager] Set cookie: ${cookie.name}`);
  }

  getCookie(name: string, domain?: string, path?: string): Cookie | null {
    const key = this.getCookieKey(name, domain, path);
    return this.cookies.get(key) || null;
  }

  getAllCookies(domain?: string): Cookie[] {
    const result: Cookie[] = [];
    
    for (const cookie of this.cookies.values()) {
      if (!domain || cookie.domain === domain || this.domainMatches(cookie.domain, domain)) {
        // Check if not expired
        if (!this.isExpired(cookie)) {
          result.push(cookie);
        }
      }
    }
    
    return result;
  }

  deleteCookie(name: string, domain?: string, path?: string): boolean {
    const key = this.getCookieKey(name, domain, path);
    return this.cookies.delete(key);
  }

  clearAll(): void {
    this.cookies.clear();
    console.log("[CookieManager] Cleared all cookies");
  }

  parseCookieString(cookieString: string, domain: string): void {
    const parts = cookieString.split(';').map(p => p.trim());
    
    if (parts.length === 0) return;
    
    const [nameValue] = parts[0].split('=');
    const cookie: Cookie = {
      name: nameValue,
      value: parts[0].substring(nameValue.length + 1),
      domain: domain,
      path: '/',
    };
    
    for (let i = 1; i < parts.length; i++) {
      const [key, value] = parts[i].split('=');
      const lowerKey = key.toLowerCase();
      
      if (lowerKey === 'domain') {
        cookie.domain = value;
      } else if (lowerKey === 'path') {
        cookie.path = value;
      } else if (lowerKey === 'expires') {
        cookie.expires = new Date(value);
      } else if (lowerKey === 'max-age') {
        cookie.maxAge = parseInt(value, 10);
      } else if (lowerKey === 'secure') {
        cookie.secure = true;
      } else if (lowerKey === 'httponly') {
        cookie.httpOnly = true;
      } else if (lowerKey === 'samesite') {
        cookie.sameSite = value as 'Strict' | 'Lax' | 'None';
      }
    }
    
    this.setCookie(cookie);
  }

  toCookieString(domain: string, path: string = '/'): string {
    const cookies = this.getAllCookies(domain);
    return cookies
      .filter(c => this.pathMatches(c.path, path))
      .map(c => `${c.name}=${c.value}`)
      .join('; ');
  }

  private getCookieKey(name: string, domain?: string, path?: string): string {
    return `${name}|${domain || ''}|${path || '/'}`;
  }

  private isExpired(cookie: Cookie): boolean {
    if (cookie.expires && cookie.expires < new Date()) {
      return true;
    }
    if (cookie.maxAge !== undefined && cookie.maxAge <= 0) {
      return true;
    }
    return false;
  }

  private domainMatches(cookieDomain: string | undefined, requestDomain: string): boolean {
    if (!cookieDomain) return true;
    return requestDomain.endsWith(cookieDomain);
  }

  private pathMatches(cookiePath: string | undefined, requestPath: string): boolean {
    if (!cookiePath) return true;
    return requestPath.startsWith(cookiePath);
  }
}

/**
 * XMLHttpRequest/Fetch Interceptor
 */
export class NetworkInterceptor {
  private requestInterceptors: Array<(request: Request) => Request | Promise<Request>> = [];
  private responseInterceptors: Array<(response: Response) => Response | Promise<Response>> = [];

  onRequest(interceptor: (request: Request) => Request | Promise<Request>): void {
    this.requestInterceptors.push(interceptor);
  }

  onResponse(interceptor: (response: Response) => Response | Promise<Response>): void {
    this.responseInterceptors.push(interceptor);
  }

  async fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let request = new Request(input, init);

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      request = await interceptor(request);
    }

    // Perform actual fetch
    let response = await fetch(request);

    // Apply response interceptors
    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
    }

    return response;
  }
}

/**
 * History API Emulation
 */
export interface HistoryState {
  state: any;
  title: string;
  url: string;
}

export class HistoryManager {
  private stack: HistoryState[] = [];
  private currentIndex: number = -1;
  private onPopStateCallbacks: Array<(state: any) => void> = [];

  pushState(state: any, title: string, url: string): void {
    // Remove forward history
    if (this.currentIndex < this.stack.length - 1) {
      this.stack = this.stack.slice(0, this.currentIndex + 1);
    }

    this.stack.push({ state, title, url });
    this.currentIndex = this.stack.length - 1;
    
    console.log(`[HistoryManager] Push state: ${url}`);
  }

  replaceState(state: any, title: string, url: string): void {
    if (this.currentIndex >= 0) {
      this.stack[this.currentIndex] = { state, title, url };
    } else {
      this.pushState(state, title, url);
    }
    
    console.log(`[HistoryManager] Replace state: ${url}`);
  }

  back(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const entry = this.stack[this.currentIndex];
      this.triggerPopState(entry.state);
    }
  }

  forward(): void {
    if (this.currentIndex < this.stack.length - 1) {
      this.currentIndex++;
      const entry = this.stack[this.currentIndex];
      this.triggerPopState(entry.state);
    }
  }

  go(delta: number): void {
    const newIndex = this.currentIndex + delta;
    if (newIndex >= 0 && newIndex < this.stack.length) {
      this.currentIndex = newIndex;
      const entry = this.stack[this.currentIndex];
      this.triggerPopState(entry.state);
    }
  }

  get length(): number {
    return this.stack.length;
  }

  get state(): any {
    return this.currentIndex >= 0 ? this.stack[this.currentIndex].state : null;
  }

  onPopState(callback: (state: any) => void): void {
    this.onPopStateCallbacks.push(callback);
  }

  private triggerPopState(state: any): void {
    this.onPopStateCallbacks.forEach(cb => cb(state));
  }
}

/**
 * Notification API Stub
 */
export class NotificationManager {
  private permission: NotificationPermission = 'default';

  async requestPermission(): Promise<NotificationPermission> {
    // In emulated environment, auto-grant
    this.permission = 'granted';
    return this.permission;
  }

  showNotification(title: string, options?: NotificationOptions): void {
    console.log(`[NotificationManager] Show notification: ${title}`, options);
    // In a real implementation, this would show a custom notification UI
  }

  get permissionStatus(): NotificationPermission {
    return this.permission;
  }
}

/**
 * Geolocation API Stub
 */
export class GeolocationManager {
  getCurrentPosition(
    success: (position: GeolocationPosition) => void,
    error?: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): void {
    // Return dummy position (San Francisco)
    const position: GeolocationPosition = {
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
    
    setTimeout(() => success(position), 100);
  }

  watchPosition(
    success: (position: GeolocationPosition) => void,
    error?: (error: GeolocationPositionError) => void,
    options?: PositionOptions
  ): number {
    // Return watch ID
    return Math.floor(Math.random() * 1000000);
  }

  clearWatch(watchId: number): void {
    console.log(`[GeolocationManager] Clear watch: ${watchId}`);
  }
}

/**
 * Browser API Manager - Aggregates all browser APIs
 */
export class BrowserAPIManager {
  private static instance: BrowserAPIManager;
  
  public localStorage: StorageBridge;
  public sessionStorage: StorageBridge;
  public cookies: CookieManager;
  public network: NetworkInterceptor;
  public history: HistoryManager;
  public notifications: NotificationManager;
  public geolocation: GeolocationManager;

  private constructor() {
    this.localStorage = new StorageBridge(false);
    this.sessionStorage = new StorageBridge(true);
    this.cookies = new CookieManager();
    this.network = new NetworkInterceptor();
    this.history = new HistoryManager();
    this.notifications = new NotificationManager();
    this.geolocation = new GeolocationManager();

    // Load localStorage from persistence
    this.localStorage.load();

    console.log("[BrowserAPIManager] Initialized");
  }

  public static getInstance(): BrowserAPIManager {
    if (!BrowserAPIManager.instance) {
      BrowserAPIManager.instance = new BrowserAPIManager();
    }
    return BrowserAPIManager.instance;
  }

  /**
   * Inject APIs into a window context (for iframe)
   */
  injectAPIs(targetWindow: Window): void {
    try {
      // Override localStorage
      Object.defineProperty(targetWindow, 'localStorage', {
        value: this.localStorage,
        writable: false,
      });

      // Override sessionStorage
      Object.defineProperty(targetWindow, 'sessionStorage', {
        value: this.sessionStorage,
        writable: false,
      });

      // Override fetch
      const originalFetch = targetWindow.fetch.bind(targetWindow);
      targetWindow.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
        return this.network.fetch(input, init);
      }) as typeof fetch;

      console.log("[BrowserAPIManager] Injected APIs into window context");
    } catch (e) {
      console.error("[BrowserAPIManager] Failed to inject APIs (cross-origin?):", e);
    }
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.localStorage.clear();
    this.sessionStorage.clear();
    this.cookies.clearAll();
    console.log("[BrowserAPIManager] Cleared all data");
  }
}

// Export singleton
export const browserAPIManager = BrowserAPIManager.getInstance();

console.log("[BrowserAPIs] Module loaded");
