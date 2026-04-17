/**
 * Android Activity / View Rendering Pipeline
 * Implements View hierarchy, layout, widgets, and Activity lifecycle
 * rendering to a WebGL2 surface.
 */

import { WebGL2Renderer, type RenderSurface } from '../graphics/webgl2-renderer';

// ── View constants ───────────────────────────────────────────────────────────
export const VISIBLE = 0;
export const INVISIBLE = 4;
export const GONE = 8;

export interface Margins {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Padding {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// ── Base View ────────────────────────────────────────────────────────────────

export class View {
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  measuredWidth = 0;
  measuredHeight = 0;
  padding: Padding = { left: 0, top: 0, right: 0, bottom: 0 };
  margin: Margins = { left: 0, top: 0, right: 0, bottom: 0 };
  visibility = VISIBLE;
  backgroundColor = 0x00000000; // ARGB
  onClick: ((v: View) => void) | null = null;
  id = 0;
  tag = '';
  enabled = true;

  private static nextId = 1;

  constructor() {
    this.id = View.nextId++;
  }

  isVisible(): boolean { return this.visibility === VISIBLE; }

  /** Measure this view. Default: use width/height if set, else 0. */
  measure(specW: number, specH: number): void {
    this.measuredWidth = this.width || Math.max(0, specW - this.margin.left - this.margin.right);
    this.measuredHeight = this.height || Math.max(0, specH - this.margin.top - this.margin.bottom);
  }

  /** Layout: assign absolute position */
  layout(l: number, t: number, r: number, b: number): void {
    this.x = l;
    this.y = t;
    this.width = r - l;
    this.height = b - t;
  }

  /** Draw to surface */
  draw(surface: RenderSurface): void {
    if (!this.isVisible()) return;
    const argb = this.backgroundColor;
    if ((argb >>> 24) === 0) return; // fully transparent
    const a = (argb >>> 24) & 0xFF;
    const r = (argb >>> 16) & 0xFF;
    const g = (argb >>> 8) & 0xFF;
    const b = argb & 0xFF;
    this.fillRect(surface, this.x, this.y, this.width, this.height, r, g, b, a);
  }

  /** Hit test */
  hitTest(px: number, py: number): boolean {
    return px >= this.x && px < this.x + this.width && py >= this.y && py < this.y + this.height;
  }

  protected fillRect(surf: RenderSurface, x: number, y: number, w: number, h: number, r: number, g: number, b: number, a: number): void {
    const sx = Math.max(0, x | 0);
    const sy = Math.max(0, y | 0);
    const ex = Math.min(surf.width, (x + w) | 0);
    const ey = Math.min(surf.height, (y + h) | 0);
    for (let row = sy; row < ey; row++) {
      const rowOff = row * surf.stride;
      for (let col = sx; col < ex; col++) {
        const idx = (rowOff + col * 4) | 0;
        if (a === 255) {
          surf.pixels[idx] = r;
          surf.pixels[idx + 1] = g;
          surf.pixels[idx + 2] = b;
          surf.pixels[idx + 3] = 255;
        } else {
          // Alpha blend
          const da = surf.pixels[idx + 3];
          const ia = a / 255, ida = da / 255;
          const oa = ia + ida * (1 - ia);
          if (oa > 0) {
            surf.pixels[idx] = (r * ia + surf.pixels[idx] * ida * (1 - ia)) / oa | 0;
            surf.pixels[idx + 1] = (g * ia + surf.pixels[idx + 1] * ida * (1 - ia)) / oa | 0;
            surf.pixels[idx + 2] = (b * ia + surf.pixels[idx + 2] * ida * (1 - ia)) / oa | 0;
            surf.pixels[idx + 3] = (oa * 255) | 0;
          }
        }
      }
    }
    surf.dirty = true;
  }

  protected drawText(surf: RenderSurface, text: string, x: number, y: number, r: number, g: number, b: number): void {
    for (let i = 0; i < text.length; i++) {
      const cx = x + i * 8;
      const ch = text.charCodeAt(i);
      // Procedural 8x8 font
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
          const px = cx + col, py = y + row;
          if (px < 0 || px >= surf.width || py < 0 || py >= surf.height) continue;
          // Simple pattern: border for digits, hash pattern for letters
          let on = false;
          if (ch >= 48 && ch <= 57) {
            // Digit: box with top/bottom bars
            on = row === 1 || row === 6 || col === 1 || col === 6;
          } else if (ch >= 65 && ch <= 90) {
            // Uppercase: hash pattern
            on = ((ch * 31 + row * 7 + col * 3) & 7) > 2;
          } else if (ch >= 97 && ch <= 122) {
            // Lowercase: lighter pattern
            on = ((ch * 23 + row * 5 + col * 11) & 7) > 3;
          } else if (ch === 32) {
            on = false; // space
          } else {
            on = ((ch + row + col) % 3) === 0;
          }
          if (on) {
            const idx = (py * surf.stride + px * 4) | 0;
            surf.pixels[idx] = r;
            surf.pixels[idx + 1] = g;
            surf.pixels[idx + 2] = b;
            surf.pixels[idx + 3] = 255;
          }
        }
      }
    }
    surf.dirty = true;
  }
}

// ── Layouts ───────────────────────────────────────────────────────────────────

export class LinearLayout extends View {
  children: View[] = [];
  orientation: 'vertical' | 'horizontal';

  constructor(orientation: 'vertical' | 'horizontal' = 'vertical') {
    super();
    this.orientation = orientation;
  }

  addChild(v: View): void { this.children.push(v); }

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    const innerW = Math.max(0, specW - this.margin.left - this.margin.right - this.padding.left - this.padding.right);
    const innerH = Math.max(0, specH - this.margin.top - this.margin.bottom - this.padding.top - this.padding.bottom);

    let totalW = 0, totalH = 0;
    for (const child of this.children) {
      if (child.visibility === GONE) continue;
      child.measure(innerW, innerH);
      if (this.orientation === 'vertical') {
        totalH += child.measuredHeight + child.margin.top + child.margin.bottom;
        totalW = Math.max(totalW, child.measuredWidth + child.margin.left + child.margin.right);
      } else {
        totalW += child.measuredWidth + child.margin.left + child.margin.right;
        totalH = Math.max(totalH, child.measuredHeight + child.margin.top + child.margin.bottom);
      }
    }
    this.measuredWidth = this.width || (totalW + this.padding.left + this.padding.right);
    this.measuredHeight = this.height || (totalH + this.padding.top + this.padding.bottom);
  }

  layout(l: number, t: number, r: number, b: number): void {
    super.layout(l, t, r, b);
    let cx = this.x + this.padding.left;
    let cy = this.y + this.padding.top;
    for (const child of this.children) {
      if (child.visibility === GONE) continue;
      const cl = cx + child.margin.left;
      const ct = cy + child.margin.top;
      const cr = cl + child.measuredWidth;
      const cb = ct + child.measuredHeight;
      child.layout(cl, ct, cr, cb);
      if (this.orientation === 'vertical') {
        cy += child.measuredHeight + child.margin.top + child.margin.bottom;
      } else {
        cx += child.measuredWidth + child.margin.left + child.margin.right;
      }
    }
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible()) return;
    super.draw(surface);
    for (const child of this.children) {
      child.draw(surface);
    }
  }
}

export class FrameLayout extends View {
  children: View[] = [];

  addChild(v: View): void { this.children.push(v); }

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    const innerW = Math.max(0, specW - this.margin.left - this.margin.right - this.padding.left - this.padding.right);
    const innerH = Math.max(0, specH - this.margin.top - this.margin.bottom - this.padding.top - this.padding.bottom);
    let maxW = 0, maxH = 0;
    for (const child of this.children) {
      if (child.visibility === GONE) continue;
      child.measure(innerW, innerH);
      maxW = Math.max(maxW, child.measuredWidth + child.margin.left + child.margin.right);
      maxH = Math.max(maxH, child.measuredHeight + child.margin.top + child.margin.bottom);
    }
    this.measuredWidth = this.width || (maxW + this.padding.left + this.padding.right);
    this.measuredHeight = this.height || (maxH + this.padding.top + this.padding.bottom);
  }

  layout(l: number, t: number, r: number, b: number): void {
    super.layout(l, t, r, b);
    for (const child of this.children) {
      if (child.visibility === GONE) continue;
      child.layout(this.x + this.padding.left + child.margin.left,
                    this.y + this.padding.top + child.margin.top,
                    this.x + this.padding.left + child.margin.left + child.measuredWidth,
                    this.y + this.padding.top + child.margin.top + child.measuredHeight);
    }
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible()) return;
    super.draw(surface);
    for (const child of this.children) child.draw(surface);
  }
}

export class RelativeLayout extends View {
  children: View[] = [];

  addChild(v: View): void { this.children.push(v); }

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    for (const child of this.children) {
      if (child.visibility === GONE) continue;
      child.measure(specW, specH);
    }
    this.measuredWidth = this.width || (specW - this.margin.left - this.margin.right);
    this.measuredHeight = this.height || (specH - this.margin.top - this.margin.bottom);
  }

  layout(l: number, t: number, r: number, b: number): void {
    super.layout(l, t, r, b);
    for (const child of this.children) {
      if (child.visibility === GONE) continue;
      child.layout(this.x + child.margin.left, this.y + child.margin.top,
                    this.x + child.margin.left + child.measuredWidth,
                    this.y + child.margin.top + child.measuredHeight);
    }
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible()) return;
    super.draw(surface);
    for (const child of this.children) child.draw(surface);
  }
}

// ── Widgets ───────────────────────────────────────────────────────────────────

export class TextView extends View {
  text = '';
  textColor = 0xFF000000; // ARGB
  textSize = 14;
  private charWidth = 8;
  private charHeight = 8;

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    const lines = this.text.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length));
    this.measuredWidth = this.width || (maxLen * this.charWidth + this.padding.left + this.padding.right);
    this.measuredHeight = this.height || (lines.length * this.charHeight + this.padding.top + this.padding.bottom);
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible()) return;
    super.draw(surface);
    const tr = (this.textColor >>> 16) & 0xFF;
    const tg = (this.textColor >>> 8) & 0xFF;
    const tb = this.textColor & 0xFF;
    const lines = this.text.split('\n');
    for (let li = 0; li < lines.length; li++) {
      this.drawText(surface, lines[li], this.x + this.padding.left, this.y + this.padding.top + li * this.charHeight, tr, tg, tb);
    }
  }
}

export class ImageView extends View {
  pixels: Uint8Array | null = null;
  imgWidth = 0;
  imgHeight = 0;
  scaleType: 'fitXY' | 'center' = 'fitXY';

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    this.measuredWidth = this.width || this.imgWidth || (specW - this.margin.left - this.margin.right);
    this.measuredHeight = this.height || this.imgHeight || (specH - this.margin.top - this.margin.bottom);
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible() || !this.pixels) return;
    super.draw(surface);
    // Blit image
    if (this.scaleType === 'fitXY') {
      // Nearest-neighbor stretch to fit
      for (let row = 0; row < this.height; row++) {
        const srcY = (row * this.imgHeight / this.height) | 0;
        if (srcY >= this.imgHeight) continue;
        for (let col = 0; col < this.width; col++) {
          const srcX = (col * this.imgWidth / this.width) | 0;
          if (srcX >= this.imgWidth) continue;
          const si = (srcY * this.imgWidth + srcX) * 4;
          const di = ((this.y + row) * surface.stride + (this.x + col) * 4) | 0;
          const px = this.x + col, py = this.y + row;
          if (px < 0 || px >= surface.width || py < 0 || py >= surface.height) continue;
          if (si + 3 < this.pixels.length && di + 3 < surface.pixels.length) {
            surface.pixels[di] = this.pixels[si];
            surface.pixels[di + 1] = this.pixels[si + 1];
            surface.pixels[di + 2] = this.pixels[si + 2];
            surface.pixels[di + 3] = this.pixels[si + 3];
          }
        }
      }
    } else {
      // Center: blit at 1:1 centered
      const ox = this.x + ((this.width - this.imgWidth) >> 1);
      const oy = this.y + ((this.height - this.imgHeight) >> 1);
      for (let row = 0; row < this.imgHeight; row++) {
        const srcOff = row * this.imgWidth * 4;
        const dstOff = ((oy + row) * surface.stride + ox * 4) | 0;
        const py = oy + row;
        if (py < 0 || py >= surface.height) continue;
        const copyLen = Math.min(this.imgWidth * 4, (surface.width - ox) * 4);
        if (copyLen <= 0 || dstOff + copyLen > surface.pixels.length) continue;
        surface.pixels.set(this.pixels.subarray(srcOff, srcOff + copyLen), dstOff);
      }
    }
    surface.dirty = true;
  }
}

export class Button extends View {
  text = '';
  textColor = 0xFFFFFFFF;
  pressed = false;
  cornerRadius = 4;

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    this.measuredWidth = this.width || Math.max(88, this.text.length * 8 + 32);
    this.measuredHeight = this.height || 36;
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible()) return;
    // Material-style button background
    const bg = this.pressed ? 0xFF1565C0 : 0xFF1976D2;
    const bgr = (bg >>> 16) & 0xFF, bgg = (bg >>> 8) & 0xFF, bgb = bg & 0xFF;
    this.fillRect(surface, this.x, this.y, this.width, this.height, bgr, bgg, bgb, 255);
    // Draw text centered
    const tr = (this.textColor >>> 16) & 0xFF;
    const tg = (this.textColor >>> 8) & 0xFF;
    const tb = this.textColor & 0xFF;
    const tx = this.x + ((this.width - this.text.length * 8) >> 1);
    const ty = this.y + ((this.height - 8) >> 1);
    this.drawText(surface, this.text, tx, ty, tr, tg, tb);
  }

  hitTest(px: number, py: number): boolean {
    if (super.hitTest(px, py)) {
      this.pressed = true;
      this.onClick?.(this);
      setTimeout(() => { this.pressed = false; }, 150);
      return true;
    }
    return false;
  }
}

export class ProgressBar extends View {
  progress = 0; // 0..100
  max = 100;
  trackColor = 0xFFE0E0E0;
  fillColor = 0xFF4CAF50;

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    this.measuredWidth = this.width || (specW - this.margin.left - this.margin.right);
    this.measuredHeight = this.height || 4;
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible()) return;
    // Track
    const tc = this.trackColor;
    this.fillRect(surface, this.x, this.y, this.width, this.height, (tc >>> 16) & 0xFF, (tc >>> 8) & 0xFF, tc & 0xFF, 255);
    // Fill
    const fillW = (this.width * this.progress / this.max) | 0;
    const fc = this.fillColor;
    this.fillRect(surface, this.x, this.y, fillW, this.height, (fc >>> 16) & 0xFF, (fc >>> 8) & 0xFF, fc & 0xFF, 255);
  }
}

export class SurfaceView extends View {
  surface: RenderSurface | null = null;

  measure(specW: number, specH: number): void {
    if (!this.isVisible()) { this.measuredWidth = 0; this.measuredHeight = 0; return; }
    this.measuredWidth = this.width || (specW - this.margin.left - this.margin.right);
    this.measuredHeight = this.height || (specH - this.margin.top - this.margin.bottom);
  }

  draw(surface: RenderSurface): void {
    if (!this.isVisible() || !this.surface) return;
    // Blit the GLES surface to the main surface
    const src = this.surface;
    for (let row = 0; row < Math.min(this.height, src.height); row++) {
      const srcOff = row * src.stride;
      const dstOff = ((this.y + row) * surface.stride + this.x * 4) | 0;
      const py = this.y + row;
      if (py < 0 || py >= surface.height) continue;
      const copyLen = Math.min(this.width * 4, src.stride, (surface.width - this.x) * 4);
      if (copyLen <= 0) continue;
      if (dstOff + copyLen <= surface.pixels.length && srcOff + copyLen <= src.pixels.length) {
        surface.pixels.set(src.pixels.subarray(srcOff, srcOff + copyLen), dstOff);
      }
    }
    surface.dirty = true;
  }
}

// ── Activity ──────────────────────────────────────────────────────────────────

export class Activity {
  className: string;
  contentView: View | null = null;
  state: 'created' | 'started' | 'resumed' | 'paused' | 'stopped' | 'destroyed' = 'created';
  title = '';

  constructor(className: string) {
    this.className = className;
  }

  setContentView(view: View): void { this.contentView = view; }
  getTitle(): string { return this.title || this.className; }

  onCreate(): void { this.state = 'created'; }
  onStart(): void { this.state = 'started'; }
  onResume(): void { this.state = 'resumed'; }
  onPause(): void { this.state = 'paused'; }
  onStop(): void { this.state = 'stopped'; }
  onDestroy(): void { this.state = 'destroyed'; }

  draw(surface: RenderSurface): void {
    if (this.contentView) this.contentView.draw(surface);
  }
}

// ── Activity Manager ─────────────────────────────────────────────────────────

const STATUS_BAR_HEIGHT = 25;
const NAV_BAR_HEIGHT = 48;

export class ActivityManager {
  private activities: Activity[] = [];
  private renderer: WebGL2Renderer;
  private statusBarColor = 0xFF212121;
  private navBarColor = 0xFF000000;

  constructor(renderer: WebGL2Renderer) {
    this.renderer = renderer;
  }

  startActivity(activity: Activity): void {
    if (this.activities.length > 0) {
      this.activities[this.activities.length - 1].onPause();
    }
    this.activities.push(activity);
    activity.onCreate();
    activity.onStart();
    activity.onResume();
  }

  finishActivity(): void {
    if (this.activities.length === 0) return;
    const activity = this.activities.pop()!;
    activity.onPause();
    activity.onStop();
    activity.onDestroy();
    if (this.activities.length > 0) {
      this.activities[this.activities.length - 1].onResume();
    }
  }

  getCurrentActivity(): Activity | null {
    return this.activities.length > 0 ? this.activities[this.activities.length - 1] : null;
  }

  getActivityCount(): number { return this.activities.length; }

  renderFrame(): void {
    const surf = this.renderer.getSurface();
    this.renderer.clear(0, 0, 0); // Black background

    // Status bar
    this.drawStatusBar(surf);

    // Activity content area
    const contentY = STATUS_BAR_HEIGHT;
    const contentH = surf.height - STATUS_BAR_HEIGHT - NAV_BAR_HEIGHT;

    const activity = this.getCurrentActivity();
    if (activity && activity.contentView) {
      // Measure and layout the content view
      activity.contentView.measure(surf.width, contentH);
      activity.contentView.layout(0, contentY, surf.width, contentY + contentH);
      activity.draw(surf);
    } else {
      // No activity: show "No Activity" text
      const tx = (surf.width - 80) >> 1;
      const ty = contentY + (contentH >> 1);
      for (let i = 0; i < 11; i++) {
        const ch = 'No Activity '.charCodeAt(i);
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            const on = ((ch * 31 + row * 7 + col * 3) & 7) > 2;
            if (on) {
              const px = tx + i * 8 + col, py = ty + row;
              if (px >= 0 && px < surf.width && py >= 0 && py < surf.height) {
                const idx = (py * surf.stride + px * 4) | 0;
                surf.pixels[idx] = 128; surf.pixels[idx + 1] = 128; surf.pixels[idx + 2] = 128; surf.pixels[idx + 3] = 255;
              }
            }
          }
        }
      }
      surf.dirty = true;
    }

    // Navigation bar
    this.drawNavBar(surf);
  }

  dispatchTouchEvent(x: number, y: number): void {
    const activity = this.getCurrentActivity();
    if (!activity || !activity.contentView) return;
    // Forward to content view hierarchy
    this.dispatchTouchToView(activity.contentView, x, y);
  }

  private dispatchTouchToView(view: View, x: number, y: number): void {
    if (view instanceof LinearLayout || view instanceof FrameLayout || view instanceof RelativeLayout) {
      const children = view.children;
      for (let i = children.length - 1; i >= 0; i--) {
        if (children[i].hitTest(x, y)) {
          if (children[i].onClick) {
            children[i].onClick!(children[i]);
            return;
          }
          this.dispatchTouchToView(children[i], x, y);
          return;
        }
      }
    } else if (view.hitTest(x, y)) {
      view.onClick?.(view);
    }
  }

  private drawStatusBar(surf: RenderSurface): void {
    const r = (this.statusBarColor >>> 16) & 0xFF;
    const g = (this.statusBarColor >>> 8) & 0xFF;
    const b = this.statusBarColor & 0xFF;
    for (let row = 0; row < STATUS_BAR_HEIGHT && row < surf.height; row++) {
      const rowOff = row * surf.stride;
      for (let col = 0; col < surf.width; col++) {
        const idx = (rowOff + col * 4) | 0;
        surf.pixels[idx] = r; surf.pixels[idx + 1] = g; surf.pixels[idx + 2] = b; surf.pixels[idx + 3] = 255;
      }
    }
    // Time text (right side)
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (let i = 0; i < timeStr.length; i++) {
      const ch = timeStr.charCodeAt(i);
      const cx = surf.width - 40 + i * 8;
      for (let row = 2; row < 10; row++) {
        for (let col = 0; col < 8; col++) {
          const on = ((ch * 31 + row * 7 + col * 3) & 7) > 2;
          if (on) {
            const px = cx + col, py = row;
            if (px >= 0 && px < surf.width && py >= 0 && py < surf.height) {
              const idx = (py * surf.stride + px * 4) | 0;
              surf.pixels[idx] = 255; surf.pixels[idx + 1] = 255; surf.pixels[idx + 2] = 255; surf.pixels[idx + 3] = 255;
            }
          }
        }
      }
    }
    surf.dirty = true;
  }

  private drawNavBar(surf: RenderSurface): void {
    const r = (this.navBarColor >>> 16) & 0xFF;
    const g = (this.navBarColor >>> 8) & 0xFF;
    const b = this.navBarColor & 0xFF;
    const startY = surf.height - NAV_BAR_HEIGHT;
    for (let row = startY; row < surf.height; row++) {
      const rowOff = row * surf.stride;
      for (let col = 0; col < surf.width; col++) {
        const idx = (rowOff + col * 4) | 0;
        surf.pixels[idx] = r; surf.pixels[idx + 1] = g; surf.pixels[idx + 2] = b; surf.pixels[idx + 3] = 255;
      }
    }
    // Back, Home, Recent buttons (triangles/circles)
    const cy = startY + (NAV_BAR_HEIGHT >> 1);
    // Back button (left triangle)
    this.drawTriangle(surf, surf.width / 4, cy, 8, 180, 180, 180, 'left');
    // Home button (circle)
    this.drawCircle(surf, surf.width / 2, cy, 8, 180, 180, 180);
    // Recent button (square)
    this.drawRect(surf, 3 * surf.width / 4, cy, 8, 180, 180, 180);
    surf.dirty = true;
  }

  private drawTriangle(surf: RenderSurface, cx: number, cy: number, size: number, r: number, g: number, b: number, dir: string): void {
    // Simple triangle pointing left
    for (let row = -size; row <= size; row++) {
      const halfW = size - Math.abs(row);
      for (let col = -halfW; col <= halfW; col++) {
        const px = (cx + col) | 0, py = (cy + row) | 0;
        if (px >= 0 && px < surf.width && py >= 0 && py < surf.height) {
          const idx = (py * surf.stride + px * 4) | 0;
          surf.pixels[idx] = r; surf.pixels[idx + 1] = g; surf.pixels[idx + 2] = b; surf.pixels[idx + 3] = 255;
        }
      }
    }
  }

  private drawCircle(surf: RenderSurface, cx: number, cy: number, radius: number, r: number, g: number, b: number): void {
    for (let row = -radius; row <= radius; row++) {
      for (let col = -radius; col <= radius; col++) {
        if (row * row + col * col <= radius * radius) {
          const px = (cx + col) | 0, py = (cy + row) | 0;
          if (px >= 0 && px < surf.width && py >= 0 && py < surf.height) {
            const idx = (py * surf.stride + px * 4) | 0;
            surf.pixels[idx] = r; surf.pixels[idx + 1] = g; surf.pixels[idx + 2] = b; surf.pixels[idx + 3] = 255;
          }
        }
      }
    }
  }

  private drawRect(surf: RenderSurface, cx: number, cy: number, size: number, r: number, g: number, b: number): void {
    for (let row = -size; row <= size; row++) {
      for (let col = -size; col <= size; col++) {
        if (Math.abs(row) >= size - 1 || Math.abs(col) >= size - 1) {
          const px = (cx + col) | 0, py = (cy + row) | 0;
          if (px >= 0 && px < surf.width && py >= 0 && py < surf.height) {
            const idx = (py * surf.stride + px * 4) | 0;
            surf.pixels[idx] = r; surf.pixels[idx + 1] = g; surf.pixels[idx + 2] = b; surf.pixels[idx + 3] = 255;
          }
        }
      }
    }
  }
}
