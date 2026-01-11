/**
 * WebView API Implementation
 * 
 * Provides Chrome/Chromium embedding via enhanced iframe delegation.
 * This is the most practical approach for browser-based emulation.
 */

export interface WebViewOptions {
  width?: number;
  height?: number;
  enableJavaScript?: boolean;
  enablePlugins?: boolean;
  userAgent?: string;
  allowPopups?: boolean;
  sandbox?: string[];
}

export interface NavigationEntry {
  url: string;
  title: string;
  timestamp: number;
}

export type NavigationCallback = (url: string) => void;
export type LoadCallback = (success: boolean) => void;
export type MessageCallback = (message: any) => void;

/**
 * WebView - Chrome/Browser embedding via iframe
 */
export class WebView {
  private iframe: HTMLIFrameElement;
  private container: HTMLDivElement;
  private history: NavigationEntry[] = [];
  private currentIndex: number = -1;
  private onNavigationCallbacks: NavigationCallback[] = [];
  private onLoadCallbacks: LoadCallback[] = [];
  private onMessageCallbacks: MessageCallback[] = [];
  private isLoading: boolean = false;

  constructor(private options: WebViewOptions = {}) {
    this.container = document.createElement('div');
    this.container.style.position = 'relative';
    this.container.style.width = `${options.width || 800}px`;
    this.container.style.height = `${options.height || 600}px`;
    this.container.style.overflow = 'hidden';
    this.container.style.backgroundColor = '#ffffff';

    this.iframe = document.createElement('iframe');
    this.iframe.style.width = '100%';
    this.iframe.style.height = '100%';
    this.iframe.style.border = 'none';
    
    // Set sandbox attributes for security
    if (options.sandbox && options.sandbox.length > 0) {
      this.iframe.sandbox.add(...options.sandbox);
    } else {
      // Default sandbox: allow scripts, forms, popups, same-origin
      this.iframe.sandbox.add('allow-scripts', 'allow-forms', 'allow-same-origin');
      if (options.allowPopups) {
        this.iframe.sandbox.add('allow-popups', 'allow-popups-to-escape-sandbox');
      }
    }

    // Set user agent via attribute (limited support)
    if (options.userAgent) {
      this.iframe.setAttribute('data-user-agent', options.userAgent);
    }

    this.setupEventListeners();
    this.container.appendChild(this.iframe);

    console.log("[WebView] Created with options:", options);
  }

  private setupEventListeners(): void {
    // Load event
    this.iframe.addEventListener('load', () => {
      this.isLoading = false;
      this.onLoadCallbacks.forEach(cb => cb(true));
      
      try {
        const url = this.iframe.contentWindow?.location.href || 'about:blank';
        const title = this.iframe.contentDocument?.title || 'Untitled';
        
        // Add to history
        if (url !== 'about:blank') {
          this.addToHistory(url, title);
        }
        
        this.onNavigationCallbacks.forEach(cb => cb(url));
      } catch (e) {
        // Cross-origin restriction
        console.warn("[WebView] Cannot access iframe content (cross-origin)");
      }
    });

    // Error event
    this.iframe.addEventListener('error', () => {
      this.isLoading = false;
      this.onLoadCallbacks.forEach(cb => cb(false));
    });

    // Message event for postMessage communication
    window.addEventListener('message', (event) => {
      // Verify message is from our iframe
      if (event.source === this.iframe.contentWindow) {
        this.onMessageCallbacks.forEach(cb => cb(event.data));
      }
    });
  }

  private addToHistory(url: string, title: string): void {
    // Remove forward history if navigating from middle
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    this.history.push({
      url,
      title,
      timestamp: Date.now(),
    });
    this.currentIndex = this.history.length - 1;
  }

  /**
   * Load a URL
   */
  loadURL(url: string): void {
    this.isLoading = true;
    
    // Ensure URL has protocol
    if (!url.match(/^https?:\/\//)) {
      url = 'https://' + url;
    }

    this.iframe.src = url;
    console.log(`[WebView] Loading URL: ${url}`);
  }

  /**
   * Load HTML content directly
   */
  loadHTML(html: string, baseURL?: string): void {
    this.isLoading = true;
    
    // Use srcdoc for inline HTML
    this.iframe.srcdoc = html;
    
    if (baseURL) {
      // Note: srcdoc doesn't support base URLs directly, would need a workaround
      console.warn("[WebView] Base URL not fully supported with loadHTML");
    }
    
    console.log("[WebView] Loading HTML content");
  }

  /**
   * Execute JavaScript in the webview context
   */
  async executeJavaScript(code: string): Promise<any> {
    try {
      // This only works for same-origin pages
      const contentWindow = this.iframe.contentWindow as any;
      const result = contentWindow?.eval(code);
      return result;
    } catch (e) {
      console.error("[WebView] Failed to execute JavaScript (cross-origin?):", e);
      throw e;
    }
  }

  /**
   * Post message to iframe content
   */
  postMessage(message: any, targetOrigin: string = '*'): void {
    this.iframe.contentWindow?.postMessage(message, targetOrigin);
  }

  /**
   * Navigation controls
   */
  goBack(): boolean {
    if (this.canGoBack()) {
      this.currentIndex--;
      const entry = this.history[this.currentIndex];
      this.iframe.src = entry.url;
      return true;
    }
    return false;
  }

  goForward(): boolean {
    if (this.canGoForward()) {
      this.currentIndex++;
      const entry = this.history[this.currentIndex];
      this.iframe.src = entry.url;
      return true;
    }
    return false;
  }

  reload(): void {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.location.reload();
    }
  }

  stop(): void {
    if (this.iframe.contentWindow) {
      this.iframe.contentWindow.stop();
    }
  }

  canGoBack(): boolean {
    return this.currentIndex > 0;
  }

  canGoForward(): boolean {
    return this.currentIndex < this.history.length - 1;
  }

  /**
   * Get current URL
   */
  getURL(): string {
    try {
      return this.iframe.contentWindow?.location.href || 'about:blank';
    } catch (e) {
      // Cross-origin
      return this.iframe.src || 'about:blank';
    }
  }

  /**
   * Get current page title
   */
  getTitle(): string {
    try {
      return this.iframe.contentDocument?.title || 'Untitled';
    } catch (e) {
      return 'Untitled';
    }
  }

  /**
   * Get navigation history
   */
  getHistory(): NavigationEntry[] {
    return [...this.history];
  }

  /**
   * Check if page is loading
   */
  isPageLoading(): boolean {
    return this.isLoading;
  }

  /**
   * Event listeners
   */
  onNavigation(callback: NavigationCallback): void {
    this.onNavigationCallbacks.push(callback);
  }

  onLoad(callback: LoadCallback): void {
    this.onLoadCallbacks.push(callback);
  }

  onMessage(callback: MessageCallback): void {
    this.onMessageCallbacks.push(callback);
  }

  /**
   * Resize the webview
   */
  resize(width: number, height: number): void {
    this.container.style.width = `${width}px`;
    this.container.style.height = `${height}px`;
  }

  /**
   * Get the DOM container element
   */
  getContainer(): HTMLDivElement {
    return this.container;
  }

  /**
   * Get the iframe element
   */
  getIFrame(): HTMLIFrameElement {
    return this.iframe;
  }

  /**
   * Clear all history
   */
  clearHistory(): void {
    this.history = [];
    this.currentIndex = -1;
  }

  /**
   * Clear cache (limited - can only clear current page)
   */
  clearCache(): void {
    this.reload();
  }

  /**
   * Set zoom level (limited support)
   */
  setZoom(zoomFactor: number): void {
    this.iframe.style.transform = `scale(${zoomFactor})`;
    this.iframe.style.transformOrigin = 'top left';
  }

  /**
   * Destroy the webview
   */
  destroy(): void {
    this.iframe.remove();
    this.container.remove();
    this.onNavigationCallbacks = [];
    this.onLoadCallbacks = [];
    this.onMessageCallbacks = [];
    console.log("[WebView] Destroyed");
  }
}

/**
 * WebView Manager - Manages multiple webview instances
 */
export class WebViewManager {
  private static instance: WebViewManager;
  private webviews: Map<number, WebView> = new Map();
  private nextId: number = 1;

  private constructor() {
    console.log("[WebViewManager] Initialized");
  }

  public static getInstance(): WebViewManager {
    if (!WebViewManager.instance) {
      WebViewManager.instance = new WebViewManager();
    }
    return WebViewManager.instance;
  }

  createWebView(options?: WebViewOptions): { id: number; webview: WebView } {
    const webview = new WebView(options);
    const id = this.nextId++;
    this.webviews.set(id, webview);
    console.log(`[WebViewManager] Created WebView ${id}`);
    return { id, webview };
  }

  getWebView(id: number): WebView | undefined {
    return this.webviews.get(id);
  }

  destroyWebView(id: number): boolean {
    const webview = this.webviews.get(id);
    if (webview) {
      webview.destroy();
      this.webviews.delete(id);
      console.log(`[WebViewManager] Destroyed WebView ${id}`);
      return true;
    }
    return false;
  }

  getAllWebViews(): Map<number, WebView> {
    return new Map(this.webviews);
  }

  destroyAll(): void {
    this.webviews.forEach(webview => webview.destroy());
    this.webviews.clear();
    console.log("[WebViewManager] Destroyed all WebViews");
  }
}

// Export singleton
export const webViewManager = WebViewManager.getInstance();

console.log("[WebView] Module loaded");
