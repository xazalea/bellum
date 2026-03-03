/**
 * Android Window Manager
 * Manages app windows, surfaces, and display
 */

export interface WindowParams {
  width: number;
  height: number;
  x: number;
  y: number;
  flags: number;
  type: WindowType;
  format: PixelFormat;
  gravity: number;
  title?: string;
}

export enum WindowType {
  TYPE_APPLICATION = 1,
  TYPE_APPLICATION_STARTING = 2,
  TYPE_APPLICATION_PANEL = 1000,
  TYPE_APPLICATION_MEDIA = 1001,
  TYPE_APPLICATION_SUB_PANEL = 1002,
  TYPE_STATUS_BAR = 2000,
  TYPE_SEARCH_BAR = 2001,
  TYPE_SYSTEM_ALERT = 2003,
  TYPE_TOAST = 2005,
  TYPE_SYSTEM_OVERLAY = 2006,
}

export enum PixelFormat {
  RGBA_8888 = 1,
  RGBX_8888 = 2,
  RGB_888 = 3,
  RGB_565 = 4,
  TRANSLUCENT = -3,
  TRANSPARENT = -2,
  OPAQUE = -1,
}

export enum WindowFlag {
  FLAG_ALLOW_LOCK_WHILE_SCREEN_ON = 0x00000001,
  FLAG_DIM_BEHIND = 0x00000002,
  FLAG_BLUR_BEHIND = 0x00000004,
  FLAG_NOT_FOCUSABLE = 0x00000008,
  FLAG_NOT_TOUCHABLE = 0x00000010,
  FLAG_NOT_TOUCH_MODAL = 0x00000020,
  FLAG_TOUCHABLE_WHEN_WAKING = 0x00000040,
  FLAG_KEEP_SCREEN_ON = 0x00000080,
  FLAG_LAYOUT_IN_SCREEN = 0x00000100,
  FLAG_FULLSCREEN = 0x00000400,
  FLAG_FORCE_NOT_FULLSCREEN = 0x00000800,
  FLAG_SECURE = 0x00002000,
  FLAG_SCALED = 0x00004000,
}

export interface Window {
  id: string;
  params: WindowParams;
  surface: Surface | null;
  canvas: HTMLCanvasElement | null;
  visible: boolean;
  focused: boolean;
  decorView: View | null;
}

export interface Surface {
  id: string;
  width: number;
  height: number;
  format: PixelFormat;
  buffer: ImageData | null;
}

export interface View {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  children: View[];
  parent: View | null;
}

export interface DisplayMetrics {
  widthPixels: number;
  heightPixels: number;
  density: number;
  densityDpi: number;
  scaledDensity: number;
  xdpi: number;
  ydpi: number;
}

/**
 * Window Manager Service
 */
export class WindowManager {
  private windows: Map<string, Window> = new Map();
  private nextWindowId = 1;
  private displayMetrics: DisplayMetrics;
  private rootCanvas: HTMLCanvasElement | null = null;
  
  constructor(canvas?: HTMLCanvasElement) {
    this.rootCanvas = canvas || null;
    
    // Initialize display metrics
    this.displayMetrics = {
      widthPixels: canvas?.width || 1920,
      heightPixels: canvas?.height || 1080,
      density: 2.0,
      densityDpi: 320,
      scaledDensity: 2.0,
      xdpi: 320,
      ydpi: 320,
    };
    
    console.log('[WindowManager] Initialized', this.displayMetrics);
  }
  
  /**
   * Add window
   */
  addWindow(params: Partial<WindowParams>): Window {
    const windowId = `window_${this.nextWindowId++}`;
    
    const fullParams: WindowParams = {
      width: params.width || this.displayMetrics.widthPixels,
      height: params.height || this.displayMetrics.heightPixels,
      x: params.x || 0,
      y: params.y || 0,
      flags: params.flags || 0,
      type: params.type || WindowType.TYPE_APPLICATION,
      format: params.format || PixelFormat.RGBA_8888,
      gravity: params.gravity || 0,
      title: params.title,
    };
    
    // Create canvas for window
    let canvas: HTMLCanvasElement | null = null;
    if (this.rootCanvas) {
      // Use provided canvas
      canvas = this.rootCanvas;
    } else {
      // Create offscreen canvas
      canvas = document.createElement('canvas');
      canvas.width = fullParams.width;
      canvas.height = fullParams.height;
    }
    
    const window: Window = {
      id: windowId,
      params: fullParams,
      surface: this.createSurface(fullParams),
      canvas,
      visible: true,
      focused: false,
      decorView: null,
    };
    
    this.windows.set(windowId, window);
    console.log(`[WindowManager] Added window: ${windowId}`, fullParams);
    
    return window;
  }
  
  /**
   * Remove window
   */
  removeWindow(windowId: string): void {
    const window = this.windows.get(windowId);
    if (!window) return;
    
    console.log(`[WindowManager] Removing window: ${windowId}`);
    this.windows.delete(windowId);
  }
  
  /**
   * Update window params
   */
  updateWindowParams(windowId: string, params: Partial<WindowParams>): void {
    const window = this.windows.get(windowId);
    if (!window) return;
    
    Object.assign(window.params, params);
    
    // Update canvas if size changed
    if (window.canvas && (params.width || params.height)) {
      window.canvas.width = window.params.width;
      window.canvas.height = window.params.height;
    }
    
    // Recreate surface if format changed
    if (params.format) {
      window.surface = this.createSurface(window.params);
    }
  }
  
  /**
   * Get window
   */
  getWindow(windowId: string): Window | null {
    return this.windows.get(windowId) || null;
  }
  
  /**
   * Get all windows
   */
  getAllWindows(): Window[] {
    return Array.from(this.windows.values());
  }
  
  /**
   * Set window visibility
   */
  setWindowVisibility(windowId: string, visible: boolean): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.visible = visible;
    }
  }
  
  /**
   * Set window focus
   */
  setWindowFocus(windowId: string, focused: boolean): void {
    // Clear focus from all windows
    for (const win of this.windows.values()) {
      win.focused = false;
    }
    
    // Set focus to specified window
    const window = this.windows.get(windowId);
    if (window) {
      window.focused = focused;
    }
  }
  
  /**
   * Get display metrics
   */
  getDisplayMetrics(): DisplayMetrics {
    return { ...this.displayMetrics };
  }
  
  /**
   * Update display metrics
   */
  updateDisplayMetrics(metrics: Partial<DisplayMetrics>): void {
    Object.assign(this.displayMetrics, metrics);
  }
  
  /**
   * Create surface for window
   */
  private createSurface(params: WindowParams): Surface {
    const surfaceId = `surface_${Date.now()}`;
    
    return {
      id: surfaceId,
      width: params.width,
      height: params.height,
      format: params.format,
      buffer: null,
    };
  }
  
  /**
   * Lock surface for drawing
   */
  lockSurface(windowId: string): ImageData | null {
    const window = this.windows.get(windowId);
    if (!window || !window.surface || !window.canvas) return null;
    
    const ctx = window.canvas.getContext('2d');
    if (!ctx) return null;
    
    window.surface.buffer = ctx.getImageData(
      0, 0,
      window.surface.width,
      window.surface.height
    );
    
    return window.surface.buffer;
  }
  
  /**
   * Unlock surface and post to display
   */
  unlockSurfaceAndPost(windowId: string): void {
    const window = this.windows.get(windowId);
    if (!window || !window.surface || !window.canvas) return;
    
    if (window.surface.buffer) {
      const ctx = window.canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(window.surface.buffer, 0, 0);
      }
    }
  }
  
  /**
   * Set decor view (root view hierarchy)
   */
  setDecorView(windowId: string, view: View): void {
    const window = this.windows.get(windowId);
    if (window) {
      window.decorView = view;
    }
  }
  
  /**
   * Get default display size
   */
  getDefaultDisplay(): { width: number; height: number } {
    return {
      width: this.displayMetrics.widthPixels,
      height: this.displayMetrics.heightPixels,
    };
  }
}
