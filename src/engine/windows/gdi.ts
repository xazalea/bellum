/**
 * Windows GDI / UI Virtualization (WebGL2-backed)
 *
 * Provides a complete Win32 GDI emulation layer backed by CPU pixel
 * buffers (RenderSurface) that are blitted to screen through the
 * WebGL2Renderer.  No WebGPU dependency.
 *
 * Covers Items:
 *  305. GDI drawing primitives → pixel-buffer translation
 *  381. Map HWNDs to virtual surfaces
 *  401. Emulate DPI scaling
 */

import { WebGL2Renderer, RenderSurface } from '../graphics/webgl2-renderer';

// ---------------------------------------------------------------------------
// ROP codes
// ---------------------------------------------------------------------------

export const SRCCOPY    = 0x00cc0020;
export const SRCAND    = 0x008800c6;
export const SRCINVERT = 0x00660046;
export const SRCPAINT  = 0x00ee0086;
export const DSTINVERT = 0x00550009;
export const BLACKNESS = 0x00000042;
export const WHITENESS = 0x00ff0062;
export const PATINVERT = 0x005A0049;
export const PATCOPY   = 0x00f00021;

// ---------------------------------------------------------------------------
// Handle / object types
// ---------------------------------------------------------------------------

export interface Hwnd {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: number;
  surface: RenderSurface;
}

export interface Hdc {
  id: number;
  hwndId: number | null;          // null for memory DCs
  surface: RenderSurface;
  textColor: number;              // 0x00bbggrr
  bgColor: number;                // 0x00bbggrr
  brushColor: number;             // 0x00bbggrr
  penColor: number;               // 0x00bbggrr
  penWidth: number;
  font: Uint8Array[] | null;
  rop2: number;
  viewportOrgX: number;
  viewportOrgY: number;
  // Current position for MoveToEx/LineTo
  currentPosX: number;
  currentPosY: number;
}

export interface Hbrush {
  id: number;
  color: number;                  // 0x00bbggrr
  hatchStyle: number;             // 0 = solid, >0 = hatch index
}

export interface Hpen {
  id: number;
  color: number;                  // 0x00bbggrr
  width: number;
  style: number;                  // PS_SOLID=0, PS_DASH=1 …
}

export interface Hbitmap {
  id: number;
  width: number;
  height: number;
  pixels: Uint8Array;             // RGBA
}

// ---------------------------------------------------------------------------
// Default 8×8 bitmap font (CP 437-ish subset)
// ---------------------------------------------------------------------------

function buildDefaultFont(): Uint8Array[] {
  const font: Uint8Array[] = new Array(256);
  for (let c = 0; c < 256; c++) {
    const glyph = new Uint8Array(8);
    // Procedural font: simple blocky glyphs
    if (c >= 0x21 && c <= 0x7e) {
      // Printable ASCII – generate a minimal readable shape
      const v = c - 0x20;
      for (let row = 0; row < 8; row++) {
        let bits = 0;
        // Use char code bits to create varied glyph shapes
        const shift = (row + v) & 7;
        bits = ((v << shift) | (v >> (8 - shift))) & 0xff;
        // Add a baseline stroke for row 7
        if (row === 7) bits |= 0x7e;
        // Ensure at least some pixels for every printable char
        if (row >= 1 && row <= 6) bits |= (1 << ((v + row) % 8));
        glyph[row] = bits & 0xfe; // clear bit 0 for side-bearing
      }
    } else if (c === 0x20) {
      // Space – all zero
    } else {
      // Control / high chars – simple block
      for (let row = 1; row < 7; row++) glyph[row] = 0x7c;
    }
    font[c] = glyph;
  }
  return font;
}

// ---------------------------------------------------------------------------
// Colour helpers
// ---------------------------------------------------------------------------

function unpackRGB(c: number): [number, number, number] {
  return [(c) & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff];
}

// ---------------------------------------------------------------------------
// WindowManager
// ---------------------------------------------------------------------------

export class WindowManager {
  private renderer: WebGL2Renderer | null;
  private windows  = new Map<number, Hwnd>();
  private dcs      = new Map<number, Hdc>();
  private brushes  = new Map<number, Hbrush>();
  private pens     = new Map<number, Hpen>();
  private bitmaps  = new Map<number, Hbitmap>();

  private nextHwnd = 0x1000;
  private nextHdc  = 0x2000;
  private nextObj  = 0x8000;

  private defaultFont: Uint8Array[];

  constructor(renderer: WebGL2Renderer | null = null) {
    this.renderer = renderer;
    this.defaultFont = buildDefaultFont();
  }

  // -----------------------------------------------------------------------
  // Window management
  // -----------------------------------------------------------------------

  createWindow(title: string, w: number, h: number): number {
    const id = this.nextHwnd++;
    const surface: RenderSurface = {
      width:  w,
      height: h,
      pixels: new Uint8Array(w * h * 4),
      dirty:  true,
      stride: w * 4,
    };
    this.windows.set(id, { id, title, x: 0, y: 0, width: w, height: h, style: 0, surface });
    return id;
  }

  getWindow(id: number): Hwnd | undefined {
    return this.windows.get(id);
  }

  destroyWindow(id: number): void {
    this.windows.delete(id);
  }

  // -----------------------------------------------------------------------
  // DC management
  // -----------------------------------------------------------------------

  getDC(hwndId: number): number {
    const hwnd = this.windows.get(hwndId);
    if (!hwnd) return 0;
    const dcId = this.nextHdc++;
    this.dcs.set(dcId, {
      id: dcId,
      hwndId,
      surface: hwnd.surface,
      textColor: 0x00ffffff,
      bgColor:   0x00000000,
      brushColor: 0x00ffffff,
      penColor:  0x00ffffff,
      penWidth: 1,
      font: this.defaultFont,
      rop2: 13,            // R2_COPYPEN
      viewportOrgX: 0,
      viewportOrgY: 0,
      currentPosX: 0,
      currentPosY: 0,
    });
    return dcId;
  }

  releaseDC(dcId: number): void {
    this.dcs.delete(dcId);
  }

  createCompatibleDC(srcDcId: number): number {
    const src = this.dcs.get(srcDcId);
    const dcId = this.nextHdc++;
    // Memory DC starts with a 1×1 monochrome surface; select a bitmap later.
    const surface: RenderSurface = {
      width: 1,
      height: 1,
      pixels: new Uint8Array(4),
      dirty: true,
      stride: 4,
    };
    this.dcs.set(dcId, {
      id: dcId,
      hwndId: null,
      surface,
      textColor:  src?.textColor  ?? 0x00ffffff,
      bgColor:    src?.bgColor    ?? 0x00000000,
      brushColor: src?.brushColor ?? 0x00ffffff,
      penColor:   src?.penColor   ?? 0x00ffffff,
      penWidth:   src?.penWidth   ?? 1,
      font:       src?.font       ?? this.defaultFont,
      rop2:       src?.rop2       ?? 13,
      viewportOrgX: 0,
      viewportOrgY: 0,
      currentPosX: 0,
      currentPosY: 0,
    });
    return dcId;
  }

  deleteDC(dcId: number): void {
    this.dcs.delete(dcId);
  }

  getDCRecord(dcId: number): Hdc | undefined {
    return this.dcs.get(dcId);
  }

  /** Look up a brush's color by handle. Returns 0x00FFFFFF if not found. */
  getBrushColor(brushId: number): number {
    const brush = this.brushes.get(brushId);
    return brush ? brush.color : 0x00FFFFFF;
  }

  /** Look up a pen by handle. */
  getPen(penId: number): Hpen | undefined {
    return this.pens.get(penId);
  }

  /** Set the current position for MoveToEx. Returns previous position. */
  moveToEx(dcId: number, x: number, y: number): { x: number; y: number } {
    const dc = this.dcs.get(dcId);
    if (!dc) return { x: 0, y: 0 };
    const prev = { x: dc.currentPosX, y: dc.currentPosY };
    dc.currentPosX = x;
    dc.currentPosY = y;
    return prev;
  }

  /** Get the current position for a DC. */
  getCurrentPos(dcId: number): { x: number; y: number } {
    const dc = this.dcs.get(dcId);
    return dc ? { x: dc.currentPosX, y: dc.currentPosY } : { x: 0, y: 0 };
  }

  // -----------------------------------------------------------------------
  // DC state setters
  // -----------------------------------------------------------------------

  setTextColor(dcId: number, color: number): number {
    const dc = this.dcs.get(dcId);
    if (!dc) return 0;
    const prev = dc.textColor;
    dc.textColor = color;
    return prev;
  }

  setBkColor(dcId: number, color: number): number {
    const dc = this.dcs.get(dcId);
    if (!dc) return 0;
    const prev = dc.bgColor;
    dc.bgColor = color;
    return prev;
  }

  private bkModes: Map<number, number> = new Map(); // dcId → bkMode (1=TRANSPARENT, 2=OPAQUE)

  setBkMode(dcId: number, mode: number): number {
    const prev = this.bkModes.get(dcId) ?? 2; // default OPAQUE
    this.bkModes.set(dcId, mode);
    return prev;
  }

  getBkMode(dcId: number): number {
    return this.bkModes.get(dcId) ?? 2; // default OPAQUE
  }

  setROP2(dcId: number, mode: number): number {
    const dc = this.dcs.get(dcId);
    if (!dc) return 0;
    const prev = dc.rop2;
    dc.rop2 = mode;
    return prev;
  }

  setViewportOrgEx(dcId: number, x: number, y: number): { x: number; y: number } {
    const dc = this.dcs.get(dcId);
    if (!dc) return { x: 0, y: 0 };
    const prev = { x: dc.viewportOrgX, y: dc.viewportOrgY };
    dc.viewportOrgX = x;
    dc.viewportOrgY = y;
    return prev;
  }

  // -----------------------------------------------------------------------
  // GDI object management
  // -----------------------------------------------------------------------

  createSolidBrush(color: number): number {
    const id = this.nextObj++;
    this.brushes.set(id, { id, color, hatchStyle: 0 });
    return id;
  }

  createHatchBrush(hatchStyle: number, color: number): number {
    const id = this.nextObj++;
    this.brushes.set(id, { id, color, hatchStyle });
    return id;
  }

  createPen(style: number, width: number, color: number): number {
    const id = this.nextObj++;
    this.pens.set(id, { id, color, width, style });
    return id;
  }

  createBitmap(w: number, h: number): number {
    const id = this.nextObj++;
    this.bitmaps.set(id, { id, width: w, height: h, pixels: new Uint8Array(w * h * 4) });
    return id;
  }

  selectObject(dcId: number, objId: number): number {
    const dc = this.dcs.get(dcId);
    if (!dc) return 0;

    const brush = this.brushes.get(objId);
    if (brush) {
      const prev = dc.brushColor;
      dc.brushColor = brush.color;
      return prev;
    }

    const pen = this.pens.get(objId);
    if (pen) {
      const prevColor = dc.penColor;
      dc.penColor = pen.color;
      dc.penWidth = pen.width;
      return prevColor;
    }

    const bmp = this.bitmaps.get(objId);
    if (bmp) {
      dc.surface = {
        width: bmp.width,
        height: bmp.height,
        pixels: bmp.pixels,
        dirty: true,
        stride: bmp.width * 4,
      };
      return objId;
    }

    return 0;
  }

  deleteObject(objId: number): boolean {
    if (this.brushes.delete(objId)) return true;
    if (this.pens.delete(objId))   return true;
    if (this.bitmaps.delete(objId)) return true;
    return false;
  }

  // -----------------------------------------------------------------------
  // Internal pixel helpers
  // -----------------------------------------------------------------------

  private setPixelSafe(surf: RenderSurface, x: number, y: number, r: number, g: number, b: number, a = 255): void {
    if (x < 0 || x >= surf.width || y < 0 || y >= surf.height) return;
    const idx = (y * surf.stride + x * 4) | 0;
    surf.pixels[idx]     = r;
    surf.pixels[idx + 1] = g;
    surf.pixels[idx + 2] = b;
    surf.pixels[idx + 3] = a;
    surf.dirty = true;
  }

  private getPixelSafe(surf: RenderSurface, x: number, y: number): [number, number, number, number] {
    if (x < 0 || x >= surf.width || y < 0 || y >= surf.height) return [0, 0, 0, 0];
    const idx = (y * surf.stride + x * 4) | 0;
    return [surf.pixels[idx], surf.pixels[idx + 1], surf.pixels[idx + 2], surf.pixels[idx + 3]];
  }

  /** Apply ROP2 to a pixel (simplified – covers common modes). */
  private applyROP2(dc: Hdc, r: number, g: number, b: number, _a: number): [number, number, number] {
    // For simplicity we only handle R2_COPYPEN (13) and R2_XORPEN (7)
    switch (dc.rop2) {
      case 7:  // R2_XORPEN
        return [r ^ 0xff, g ^ 0xff, b ^ 0xff];
      case 13: // R2_COPYPEN
      default:
        return [r, g, b];
    }
  }

  // -----------------------------------------------------------------------
  // GDI drawing operations
  // -----------------------------------------------------------------------

  gdiFillRect(dcId: number, left: number, top: number, right: number, bottom: number, r: number, g: number, b: number): void {
    const dc = this.dcs.get(dcId);
    if (!dc) return;
    const surf = dc.surface;
    const ox = dc.viewportOrgX, oy = dc.viewportOrgY;
    const sx = Math.max(0, (left + ox) | 0);
    const sy = Math.max(0, (top  + oy) | 0);
    const ex = Math.min(surf.width,  (right  + ox) | 0);
    const ey = Math.min(surf.height, (bottom + oy) | 0);

    for (let row = sy; row < ey; row++) {
      const rowOff = row * surf.stride;
      for (let col = sx; col < ex; col++) {
        const idx = (rowOff + col * 4) | 0;
        surf.pixels[idx]     = r;
        surf.pixels[idx + 1] = g;
        surf.pixels[idx + 2] = b;
        surf.pixels[idx + 3] = 255;
      }
    }
    surf.dirty = true;
  }

  // -- BitBlt with ROP support ------------------------------------------

  gdiBitBlt(
    dcId: number, xDst: number, yDst: number, w: number, h: number,
    srcDcId: number, xSrc: number, ySrc: number, rop: number,
  ): boolean {
    const dst = this.dcs.get(dcId);
    const src = this.dcs.get(srcDcId);
    if (!dst || !src) return false;

    const dSurf = dst.surface;
    const sSurf = src.surface;

    const ox = dst.viewportOrgX, oy = dst.viewportOrgY;
    const dx0 = xDst + ox, dy0 = yDst + oy;

    for (let row = 0; row < h; row++) {
      const sy = ySrc + row;
      const dy = dy0 + row;
      if (sy < 0 || sy >= sSurf.height || dy < 0 || dy >= dSurf.height) continue;

      for (let col = 0; col < w; col++) {
        const sx = xSrc + col;
        const dx = dx0 + col;
        if (sx < 0 || sx >= sSurf.width || dx < 0 || dx >= dSurf.width) continue;

        const sIdx = (sy * sSurf.stride + sx * 4) | 0;
        const dIdx = (dy * dSurf.stride + dx * 4) | 0;

        const sr = sSurf.pixels[sIdx], sg = sSurf.pixels[sIdx + 1], sb = sSurf.pixels[sIdx + 2], sa = sSurf.pixels[sIdx + 3];
        const dr = dSurf.pixels[dIdx], dg = dSurf.pixels[dIdx + 1], db = dSurf.pixels[dIdx + 2];

        let nr: number, ng: number, nb: number;

        switch (rop) {
          case SRCCOPY:    nr = sr; ng = sg; nb = sb; break;
          case SRCAND:     nr = dr & sr; ng = dg & sg; nb = db & sb; break;
          case SRCINVERT:  nr = dr ^ sr; ng = dg ^ sg; nb = db ^ sb; break;
          case SRCPAINT:   nr = dr | sr; ng = dg | sg; nb = db | sb; break;
          case DSTINVERT:  nr = ~dr & 0xff; ng = ~dg & 0xff; nb = ~db & 0xff; break;
          case BLACKNESS:  nr = 0; ng = 0; nb = 0; break;
          case WHITENESS:  nr = 255; ng = 255; nb = 255; break;
          case PATCOPY: {
            const [br, bg, bb] = unpackRGB(dst.brushColor);
            nr = br; ng = bg; nb = bb; break;
          }
          default: nr = sr; ng = sg; nb = sb;
        }

        dSurf.pixels[dIdx]     = nr & 0xff;
        dSurf.pixels[dIdx + 1] = ng & 0xff;
        dSurf.pixels[dIdx + 2] = nb & 0xff;
        dSurf.pixels[dIdx + 3] = 255;
      }
    }
    dSurf.dirty = true;
    return true;
  }

  // -- StretchBlt (nearest-neighbour) -----------------------------------

  gdiStretchBlt(
    dcId: number, xDst: number, yDst: number, wDst: number, hDst: number,
    srcDcId: number, xSrc: number, ySrc: number, wSrc: number, hSrc: number,
    rop: number,
  ): boolean {
    const dst = this.dcs.get(dcId);
    const src = this.dcs.get(srcDcId);
    if (!dst || !src) return false;

    const dSurf = dst.surface;
    const sSurf = src.surface;
    const ox = dst.viewportOrgX, oy = dst.viewportOrgY;

    for (let y = 0; y < hDst; y++) {
      const sy = hSrc === 0 ? ySrc : ((y * hSrc / hDst) | 0) + ySrc;
      const dy = yDst + oy + y;
      if (sy < 0 || sy >= sSurf.height || dy < 0 || dy >= dSurf.height) continue;

      for (let x = 0; x < wDst; x++) {
        const sx = wSrc === 0 ? xSrc : ((x * wSrc / wDst) | 0) + xSrc;
        const dx = xDst + ox + x;
        if (sx < 0 || sx >= sSurf.width || dx < 0 || dx >= dSurf.width) continue;

        const sIdx = (sy * sSurf.stride + sx * 4) | 0;
        const dIdx = (dy * dSurf.stride + dx * 4) | 0;

        const sr = sSurf.pixels[sIdx], sg = sSurf.pixels[sIdx + 1], sb = sSurf.pixels[sIdx + 2];
        const dr = dSurf.pixels[dIdx], dg = dSurf.pixels[dIdx + 1], db = dSurf.pixels[dIdx + 2];

        let nr: number, ng: number, nb: number;
        switch (rop) {
          case SRCCOPY:   nr = sr; ng = sg; nb = sb; break;
          case SRCAND:    nr = dr & sr; ng = dg & sg; nb = db & sb; break;
          case SRCINVERT: nr = dr ^ sr; ng = dg ^ sg; nb = db ^ sb; break;
          case SRCPAINT:  nr = dr | sr; ng = dg | sg; nb = db | sb; break;
          case BLACKNESS: nr = 0; ng = 0; nb = 0; break;
          case WHITENESS: nr = 255; ng = 255; nb = 255; break;
          default:        nr = sr; ng = sg; nb = sb;
        }

        dSurf.pixels[dIdx]     = nr & 0xff;
        dSurf.pixels[dIdx + 1] = ng & 0xff;
        dSurf.pixels[dIdx + 2] = nb & 0xff;
        dSurf.pixels[dIdx + 3] = 255;
      }
    }
    dSurf.dirty = true;
    return true;
  }

  // -- TextOut (8×8 bitmap font) ----------------------------------------

  gdiTextOut(dcId: number, x: number, y: number, text: string): boolean {
    const dc = this.dcs.get(dcId);
    if (!dc) return false;

    const surf = dc.surface;
    const [tr, tg, tb] = unpackRGB(dc.textColor);
    const [br, bg, bb] = unpackRGB(dc.bgColor);
    const font = dc.font ?? this.defaultFont;
    const ox = dc.viewportOrgX, oy = dc.viewportOrgY;
    const bkMode = this.bkModes.get(dcId) ?? 2; // 1=TRANSPARENT, 2=OPAQUE
    const opaque = bkMode === 2;

    for (let i = 0; i < text.length; i++) {
      const glyph = font[text.charCodeAt(i)];
      if (!glyph) continue;
      const cx = x + ox + i * 8;
      const cy = y + oy;

      for (let row = 0; row < 8; row++) {
        const py = cy + row;
        for (let col = 0; col < 8; col++) {
          const px = cx + col;
          if (glyph[row] & (1 << (7 - col))) {
            this.setPixelSafe(surf, px, py, tr, tg, tb);
          } else if (opaque) {
            // Only fill background in OPAQUE mode
            this.setPixelSafe(surf, px, py, br, bg, bb);
          }
          // TRANSPARENT mode: skip background pixels entirely
        }
      }
    }
    surf.dirty = true;
    return true;
  }

  // -- GetPixel ---------------------------------------------------------

  gdiGetPixel(dcId: number, x: number, y: number): number {
    const dc = this.dcs.get(dcId);
    if (!dc) return 0;
    const [r, g, b, a] = this.getPixelSafe(dc.surface, x + dc.viewportOrgX, y + dc.viewportOrgY);
    // Return as 0x00bbggrr (Windows COLORREF format)
    return ((b << 16) | (g << 8) | r) >>> 0;
  }

  // -- PatBlt -----------------------------------------------------------

  gdiPatBlt(dcId: number, x: number, y: number, w: number, h: number, rop: number): void {
    const dc = this.dcs.get(dcId);
    if (!dc) return;
    const surf = dc.surface;
    const ox = dc.viewportOrgX, oy = dc.viewportOrgY;

    switch (rop) {
      case WHITENESS:
        this.gdiFillRect(dcId, x, y, x + w, y + h, 255, 255, 255);
        break;
      case BLACKNESS:
        this.gdiFillRect(dcId, x, y, x + w, y + h, 0, 0, 0);
        break;
      case PATCOPY: {
        const [r, g, b] = unpackRGB(dc.brushColor);
        this.gdiFillRect(dcId, x, y, x + w, y + h, r, g, b);
        break;
      }
      case DSTINVERT: {
        // Invert existing pixels in the rect
        const sx = Math.max(0, (x + ox) | 0);
        const sy = Math.max(0, (y + oy) | 0);
        const ex = Math.min(surf.width, (x + w + ox) | 0);
        const ey = Math.min(surf.height, (y + h + oy) | 0);
        for (let row = sy; row < ey; row++) {
          for (let col = sx; col < ex; col++) {
            const idx = (row * surf.stride + col * 4) | 0;
            surf.pixels[idx] = ~surf.pixels[idx] & 0xff;
            surf.pixels[idx + 1] = ~surf.pixels[idx + 1] & 0xff;
            surf.pixels[idx + 2] = ~surf.pixels[idx + 2] & 0xff;
          }
        }
        surf.dirty = true;
        break;
      }
      case PATINVERT: {
        // XOR brush color with existing pixels
        const [br, bg, bb] = unpackRGB(dc.brushColor);
        const sx = Math.max(0, (x + ox) | 0);
        const sy = Math.max(0, (y + oy) | 0);
        const ex = Math.min(surf.width, (x + w + ox) | 0);
        const ey = Math.min(surf.height, (y + h + oy) | 0);
        for (let row = sy; row < ey; row++) {
          for (let col = sx; col < ex; col++) {
            const idx = (row * surf.stride + col * 4) | 0;
            surf.pixels[idx] = (surf.pixels[idx] ^ br) & 0xff;
            surf.pixels[idx + 1] = (surf.pixels[idx + 1] ^ bg) & 0xff;
            surf.pixels[idx + 2] = (surf.pixels[idx + 2] ^ bb) & 0xff;
          }
        }
        surf.dirty = true;
        break;
      }
      default:
        // For unsupported ROPs, treat as PATCOPY
        const [r, g, b] = unpackRGB(dc.brushColor);
        this.gdiFillRect(dcId, x, y, x + w, y + h, r, g, b);
        break;
    }
  }

  // -- SetPixel ---------------------------------------------------------

  gdiSetPixel(dcId: number, x: number, y: number, r: number, g: number, b: number): void {
    const dc = this.dcs.get(dcId);
    if (!dc) return;
    const [pr, pg, pb] = this.applyROP2(dc, r, g, b, 255);
    this.setPixelSafe(dc.surface, x + dc.viewportOrgX, y + dc.viewportOrgY, pr, pg, pb);
  }

  // -- LineTo (Bresenham with pen width) ---------------------------------

  gdiLineTo(dcId: number, x1: number, y1: number, x2: number, y2: number): void {
    const dc = this.dcs.get(dcId);
    if (!dc) return;

    const [r, g, b] = unpackRGB(dc.penColor);
    const pw = dc.penWidth;
    const ox = dc.viewportOrgX, oy = dc.viewportOrgY;
    x1 += ox; y1 += oy; x2 += ox; y2 += oy;

    // Bresenham
    let dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
    let dy = -Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
    let err = dx + dy;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Draw a filled circle of radius pw at each point for thick lines
      const hw = (pw - 1) >> 1;
      for (let py = -hw; py <= hw; py++) {
        for (let px = -hw; px <= hw; px++) {
          if (px * px + py * py <= hw * hw + hw) {
            this.setPixelSafe(dc.surface, x1 + px, y1 + py, r, g, b);
          }
        }
      }
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x1 += sx; }
      if (e2 <= dx) { err += dx; y1 += sy; }
    }
    dc.surface.dirty = true;
  }

  // -- Ellipse (midpoint) -----------------------------------------------

  gdiEllipse(dcId: number, left: number, top: number, right: number, bottom: number): void {
    const dc = this.dcs.get(dcId);
    if (!dc) return;

    const surf = dc.surface;
    const ox = dc.viewportOrgX, oy = dc.viewportOrgY;
    const cx = ((left + right) / 2 + ox) | 0;
    const cy = ((top + bottom) / 2 + oy) | 0;
    const rx = Math.abs(right - left) >> 1;
    const ry = Math.abs(bottom - top) >> 1;

    // Fill interior with brush color using scanline flood fill
    if (rx > 0 && ry > 0) {
      const [br, bg, bb] = unpackRGB(dc.brushColor);
      for (let y = -ry; y <= ry; y++) {
        const xExtent = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
        for (let x = -xExtent; x <= xExtent; x++) {
          this.setPixelSafe(surf, cx + x, cy + y, br, bg, bb);
        }
      }
    }

    const [r, g, b] = unpackRGB(dc.penColor);
    if (rx === 0 || ry === 0) return;

    // Midpoint ellipse algorithm
    let x = 0, y = ry;
    let rxSq = rx * rx, rySq = ry * ry;
    let px = 0, py = 2 * rxSq * y;

    // Region 1
    let p = rySq - rxSq * ry + 0.25 * rxSq;
    while (px < py) {
      this.setPixelSafe(surf, cx + x, cy + y, r, g, b);
      this.setPixelSafe(surf, cx - x, cy + y, r, g, b);
      this.setPixelSafe(surf, cx + x, cy - y, r, g, b);
      this.setPixelSafe(surf, cx - x, cy - y, r, g, b);
      x++; px += 2 * rySq;
      if (p < 0) {
        p += rySq + px;
      } else {
        y--; py -= 2 * rxSq;
        p += rySq + px - py;
      }
    }

    // Region 2
    p = rySq * (x + 0.5) * (x + 0.5) + rxSq * (y - 1) * (y - 1) - rxSq * rySq;
    while (y >= 0) {
      this.setPixelSafe(surf, cx + x, cy + y, r, g, b);
      this.setPixelSafe(surf, cx - x, cy + y, r, g, b);
      this.setPixelSafe(surf, cx + x, cy - y, r, g, b);
      this.setPixelSafe(surf, cx - x, cy - y, r, g, b);
      y--; py -= 2 * rxSq;
      if (p > 0) {
        p += rxSq - py;
      } else {
        x++; px += 2 * rySq;
        p += rxSq - py + px;
      }
    }
    surf.dirty = true;
  }

  // -- Rectangle --------------------------------------------------------

  gdiRectangle(dcId: number, left: number, top: number, right: number, bottom: number): void {
    const dc = this.dcs.get(dcId);
    if (!dc) return;

    // Fill interior with brush color first
    const [br, bg, bb] = unpackRGB(dc.brushColor);
    this.gdiFillRect(dcId, left + 1, top + 1, right - 1, bottom - 1, br, bg, bb);

    // Draw four sides with the pen
    this.gdiLineTo(dc.id, left,  top,    right - 1, top);
    this.gdiLineTo(dc.id, right - 1, top, right - 1, bottom - 1);
    this.gdiLineTo(dc.id, right - 1, bottom - 1, left, bottom - 1);
    this.gdiLineTo(dc.id, left,  bottom - 1, left, top);
  }

  // -- RoundRect ---------------------------------------------------------

  gdiRoundRect(dcId: number, left: number, top: number, right: number, bottom: number, rw: number, rh: number): void {
    const dc = this.dcs.get(dcId);
    if (!dc) return;

    // Fill interior with brush color
    const [br, bg, bb] = unpackRGB(dc.brushColor);
    this.gdiFillRect(dcId, left + rw, top + 1, right - rw, bottom - 1, br, bg, bb);
    this.gdiFillRect(dcId, left + 1, top + rh, right - 1, bottom - rh, br, bg, bb);

    // Draw the four straight edges
    this.gdiLineTo(dc.id, left + rw, top, right - rw, top);
    this.gdiLineTo(dc.id, right, top + rh, right, bottom - rh);
    this.gdiLineTo(dc.id, right - rw, bottom, left + rw, bottom);
    this.gdiLineTo(dc.id, left, bottom - rh, left, top + rh);

    // Draw the four corner arcs (quarter-ellipses)
    // Top-left
    this.gdiEllipseArc(dc, left, top, left + 2 * rw, top + 2 * rh, Math.PI, 1.5 * Math.PI);
    // Top-right
    this.gdiEllipseArc(dc, right - 2 * rw, top, right, top + 2 * rh, 1.5 * Math.PI, 2 * Math.PI);
    // Bottom-right
    this.gdiEllipseArc(dc, right - 2 * rw, bottom - 2 * rh, right, bottom, 0, 0.5 * Math.PI);
    // Bottom-left
    this.gdiEllipseArc(dc, left, bottom - 2 * rh, left + 2 * rw, bottom, 0.5 * Math.PI, Math.PI);
  }

  /** Helper: draw an arc of an ellipse from angleStart to angleEnd (radians). */
  private gdiEllipseArc(dc: Hdc, left: number, top: number, right: number, bottom: number, angleStart: number, angleEnd: number): void {
    const [r, g, b] = unpackRGB(dc.penColor);
    const surf = dc.surface;
    const cx = ((left + right) / 2 + dc.viewportOrgX) | 0;
    const cy = ((top + bottom) / 2 + dc.viewportOrgY) | 0;
    const rx = Math.abs(right - left) / 2;
    const ry = Math.abs(bottom - top) / 2;
    if (rx < 1 || ry < 1) return;

    const steps = Math.max(16, Math.ceil(Math.max(rx, ry) * Math.abs(angleEnd - angleStart)));
    for (let i = 0; i <= steps; i++) {
      const a = angleStart + (angleEnd - angleStart) * i / steps;
      const px = Math.round(cx + rx * Math.cos(a));
      const py = Math.round(cy + ry * Math.sin(a));
      this.setPixelSafe(surf, px, py, r, g, b);
    }
  }

  // -----------------------------------------------------------------------
  // System metrics / DPI
  // -----------------------------------------------------------------------

  getSystemMetrics(index: number): number {
    // SM_CXSCREEN=0, SM_CYSCREEN=1, SM_CXVSCREEN=78, SM_CYVSCREEN=79
    switch (index) {
      case 0:  return Math.round(window.innerWidth  * window.devicePixelRatio);
      case 1:  return Math.round(window.innerHeight * window.devicePixelRatio);
      case 78: return Math.round(screen.width  * window.devicePixelRatio);
      case 79: return Math.round(screen.height * window.devicePixelRatio);
      default: return 0;
    }
  }

  // -----------------------------------------------------------------------
  // Present – blit a window's surface to the WebGL2 renderer
  // -----------------------------------------------------------------------

  present(hwndId: number): void {
    const hwnd = this.windows.get(hwndId);
    if (!hwnd || !this.renderer) return;

    const dst = this.renderer.getSurface();
    const src = hwnd.surface;

    for (let row = 0; row < src.height; row++) {
      const dy = hwnd.y + row;
      if (dy < 0 || dy >= dst.height) continue;
      const srcOff = row * src.stride;
      const dstOff = (dy * dst.stride + hwnd.x * 4) | 0;
      const copyLen = Math.min(src.width * 4, (dst.width - hwnd.x) * 4);
      if (copyLen <= 0 || dstOff < 0 || dstOff + copyLen > dst.pixels.length) continue;
      dst.pixels.set(src.pixels.subarray(srcOff, srcOff + copyLen), dstOff);
    }
    dst.dirty = true;
  }
}
