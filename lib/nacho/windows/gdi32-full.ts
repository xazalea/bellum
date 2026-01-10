/**
 * GDI32.dll - Graphics Device Interface
 * 2D graphics rendering and drawing operations
 */

export class GDI32 {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private dcContexts: Map<number, GDIContext> = new Map();
  private gdiObjects: Map<number, GDIObject> = new Map();
  private nextObjectId = 0x10000;
  
  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }
  
  // ===== DEVICE CONTEXT =====
  
  CreateCompatibleDC(hdc: number): number {
    const newDc = this.nextObjectId++;
    this.dcContexts.set(newDc, {
      hdc: newDc,
      pen: 0,
      brush: 0,
      font: 0,
      bitmap: 0,
      textColor: '#000000',
      backgroundColor: '#FFFFFF',
    });
    return newDc;
  }
  
  DeleteDC(hdc: number): boolean {
    this.dcContexts.delete(hdc);
    return true;
  }
  
  SaveDC(hdc: number): number {
    if (this.ctx) {
      this.ctx.save();
    }
    return 1;
  }
  
  RestoreDC(hdc: number, savedDc: number): boolean {
    if (this.ctx) {
      this.ctx.restore();
    }
    return true;
  }
  
  // ===== PEN OPERATIONS =====
  
  CreatePen(style: number, width: number, color: number): number {
    const penId = this.nextObjectId++;
    this.gdiObjects.set(penId, {
      type: 'pen',
      style,
      width,
      color: this.colorRefToHex(color),
    });
    return penId;
  }
  
  CreatePenIndirect(logPen: any): number {
    return this.CreatePen(0, 1, 0);
  }
  
  // ===== BRUSH OPERATIONS =====
  
  CreateSolidBrush(color: number): number {
    const brushId = this.nextObjectId++;
    this.gdiObjects.set(brushId, {
      type: 'brush',
      style: 0, // BS_SOLID
      color: this.colorRefToHex(color),
    });
    return brushId;
  }
  
  CreateBrushIndirect(logBrush: any): number {
    return this.CreateSolidBrush(0);
  }
  
  // ===== FONT OPERATIONS =====
  
  CreateFontA(
    height: number,
    width: number,
    escapement: number,
    orientation: number,
    weight: number,
    italic: boolean,
    underline: boolean,
    strikeOut: boolean,
    charSet: number,
    outputPrecision: number,
    clipPrecision: number,
    quality: number,
    pitchAndFamily: number,
    faceName: string
  ): number {
    const fontId = this.nextObjectId++;
    this.gdiObjects.set(fontId, {
      type: 'font',
      height,
      weight,
      italic,
      faceName,
    });
    return fontId;
  }
  
  CreateFontIndirectA(logFont: any): number {
    return this.CreateFontA(16, 0, 0, 0, 400, false, false, false, 0, 0, 0, 0, 0, 'Arial');
  }
  
  // ===== BITMAP OPERATIONS =====
  
  CreateBitmap(width: number, height: number, planes: number, bitCount: number, bits: any): number {
    const bitmapId = this.nextObjectId++;
    this.gdiObjects.set(bitmapId, {
      type: 'bitmap',
      width,
      height,
      data: null, // Would store bitmap data
    });
    return bitmapId;
  }
  
  CreateCompatibleBitmap(hdc: number, width: number, height: number): number {
    return this.CreateBitmap(width, height, 1, 32, null);
  }
  
  DeleteObject(object: number): boolean {
    this.gdiObjects.delete(object);
    return true;
  }
  
  SelectObject(hdc: number, object: number): number {
    const context = this.dcContexts.get(hdc);
    if (!context) return 0;
    
    const gdiObj = this.gdiObjects.get(object);
    if (!gdiObj) return 0;
    
    let oldObject = 0;
    
    switch (gdiObj.type) {
      case 'pen':
        oldObject = context.pen;
        context.pen = object;
        if (this.ctx) {
          this.ctx.strokeStyle = gdiObj.color as string;
          this.ctx.lineWidth = gdiObj.width as number;
        }
        break;
      case 'brush':
        oldObject = context.brush;
        context.brush = object;
        if (this.ctx) {
          this.ctx.fillStyle = gdiObj.color as string;
        }
        break;
      case 'font':
        oldObject = context.font;
        context.font = object;
        if (this.ctx) {
          const weight = (gdiObj.weight as number) >= 700 ? 'bold' : 'normal';
          const style = gdiObj.italic ? 'italic' : 'normal';
          this.ctx.font = `${style} ${weight} ${gdiObj.height}px ${gdiObj.faceName}`;
        }
        break;
      case 'bitmap':
        oldObject = context.bitmap;
        context.bitmap = object;
        break;
    }
    
    return oldObject;
  }
  
  GetStockObject(index: number): number {
    // Stock objects: WHITE_BRUSH=0, BLACK_BRUSH=4, NULL_PEN=8, etc.
    const stockId = 0x80000000 | index;
    
    if (!this.gdiObjects.has(stockId)) {
      switch (index) {
        case 0: // WHITE_BRUSH
          this.gdiObjects.set(stockId, { type: 'brush', style: 0, color: '#FFFFFF' });
          break;
        case 4: // BLACK_BRUSH
          this.gdiObjects.set(stockId, { type: 'brush', style: 0, color: '#000000' });
          break;
        case 8: // NULL_PEN
          this.gdiObjects.set(stockId, { type: 'pen', style: 5, width: 0, color: '#000000' });
          break;
      }
    }
    
    return stockId;
  }
  
  // ===== DRAWING OPERATIONS =====
  
  Rectangle(hdc: number, left: number, top: number, right: number, bottom: number): boolean {
    if (!this.ctx) return false;
    
    const width = right - left;
    const height = bottom - top;
    
    this.ctx.fillRect(left, top, width, height);
    this.ctx.strokeRect(left, top, width, height);
    
    return true;
  }
  
  Ellipse(hdc: number, left: number, top: number, right: number, bottom: number): boolean {
    if (!this.ctx) return false;
    
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const radiusX = (right - left) / 2;
    const radiusY = (bottom - top) / 2;
    
    this.ctx.beginPath();
    this.ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    return true;
  }
  
  Polygon(hdc: number, points: any[], count: number): boolean {
    if (!this.ctx || count < 3) return false;
    
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < count; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.stroke();
    
    return true;
  }
  
  MoveToEx(hdc: number, x: number, y: number, point: any): boolean {
    // Would save current position for LineTo
    return true;
  }
  
  LineTo(hdc: number, x: number, y: number): boolean {
    if (!this.ctx) return false;
    
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    
    return true;
  }
  
  // ===== TEXT OPERATIONS =====
  
  TextOutA(hdc: number, x: number, y: number, text: string, length: number): boolean {
    if (!this.ctx) return false;
    
    this.ctx.fillText(text.substring(0, length), x, y);
    
    return true;
  }
  
  TextOutW(...args: any[]): boolean {
    return this.TextOutA(...args);
  }
  
  DrawTextA(hdc: number, text: string, count: number, rect: any, format: number): number {
    if (!this.ctx) return 0;
    
    // DT_LEFT=0, DT_CENTER=1, DT_RIGHT=2, DT_VCENTER=4, etc.
    const textAlign = (format & 0x03) === 1 ? 'center' : (format & 0x03) === 2 ? 'right' : 'left';
    this.ctx.textAlign = textAlign as CanvasTextAlign;
    
    const x = rect.left + (textAlign === 'center' ? (rect.right - rect.left) / 2 : 0);
    const y = rect.top + 20; // Simplified
    
    this.ctx.fillText(text.substring(0, count), x, y);
    
    return 20; // Text height
  }
  
  SetTextColor(hdc: number, color: number): number {
    const context = this.dcContexts.get(hdc);
    if (!context) return 0;
    
    const oldColor = context.textColor;
    context.textColor = this.colorRefToHex(color);
    
    if (this.ctx) {
      this.ctx.fillStyle = context.textColor;
    }
    
    return this.hexToColorRef(oldColor);
  }
  
  SetBkColor(hdc: number, color: number): number {
    const context = this.dcContexts.get(hdc);
    if (!context) return 0;
    
    const oldColor = context.backgroundColor;
    context.backgroundColor = this.colorRefToHex(color);
    
    return this.hexToColorRef(oldColor);
  }
  
  SetBkMode(hdc: number, mode: number): number {
    // TRANSPARENT=1, OPAQUE=2
    return 1;
  }
  
  GetTextMetricsA(hdc: number, metrics: any): boolean {
    // Would populate TEXTMETRIC structure
    return true;
  }
  
  // ===== BIT BLOCK TRANSFER =====
  
  BitBlt(
    hdcDest: number,
    xDest: number,
    yDest: number,
    width: number,
    height: number,
    hdcSrc: number,
    xSrc: number,
    ySrc: number,
    rop: number
  ): boolean {
    if (!this.ctx || !this.canvas) return false;
    
    // SRCCOPY=0x00CC0020, SRCPAINT=0x00EE0086, etc.
    // Simplified - just copy pixels
    try {
      const imageData = this.ctx.getImageData(xSrc, ySrc, width, height);
      this.ctx.putImageData(imageData, xDest, yDest);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  StretchBlt(
    hdcDest: number,
    xDest: number,
    yDest: number,
    wDest: number,
    hDest: number,
    hdcSrc: number,
    xSrc: number,
    ySrc: number,
    wSrc: number,
    hSrc: number,
    rop: number
  ): boolean {
    // Similar to BitBlt but with stretching
    return this.BitBlt(hdcDest, xDest, yDest, wDest, hDest, hdcSrc, xSrc, ySrc, rop);
  }
  
  // ===== COLOR CONVERSION =====
  
  private colorRefToHex(colorRef: number): string {
    const r = colorRef & 0xFF;
    const g = (colorRef >> 8) & 0xFF;
    const b = (colorRef >> 16) & 0xFF;
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  private hexToColorRef(hex: string): number {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r | (g << 8) | (b << 16);
  }
}

interface GDIContext {
  hdc: number;
  pen: number;
  brush: number;
  font: number;
  bitmap: number;
  textColor: string;
  backgroundColor: string;
}

interface GDIObject {
  type: 'pen' | 'brush' | 'font' | 'bitmap';
  [key: string]: any;
}
