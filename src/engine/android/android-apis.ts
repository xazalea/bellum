/**
 * Android API Stubs
 * Minimal implementation of essential Android APIs for simple app execution
 */

export class AndroidAPIs {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private activities: Map<string, Activity> = new Map();
  private views: Map<number, View> = new Map();
  private nextViewId = 1;

  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  getActivity(name: string): Activity {
    if (!this.activities.has(name)) {
      const activity = new Activity(name, this);
      this.activities.set(name, activity);
    }
    return this.activities.get(name)!;
  }

  createView(type: string): View {
    const id = this.nextViewId++;
    const view = new View(id, type, this);
    this.views.set(id, view);
    return view;
  }

  getCanvas(): CanvasRenderingContext2D | null {
    return this.ctx;
  }
}

// ===== android.app.Activity =====
export class Activity {
  private name: string;
  private apis: AndroidAPIs;
  private contentView: View | null = null;
  private isCreated = false;
  private isStarted = false;
  private isResumed = false;

  constructor(name: string, apis: AndroidAPIs) {
    this.name = name;
    this.apis = apis;
  }

  onCreate(savedInstanceState: any) {
    console.log(`[Activity] ${this.name}.onCreate()`);
    this.isCreated = true;
    
    // Draw activity background
    const ctx = this.apis.getCanvas();
    if (ctx && this.apis['canvas']) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, this.apis['canvas'].width, this.apis['canvas'].height);
    }
  }

  onStart() {
    console.log(`[Activity] ${this.name}.onStart()`);
    this.isStarted = true;
  }

  onResume() {
    console.log(`[Activity] ${this.name}.onResume()`);
    this.isResumed = true;
  }

  onPause() {
    console.log(`[Activity] ${this.name}.onPause()`);
    this.isResumed = false;
  }

  onStop() {
    console.log(`[Activity] ${this.name}.onStop()`);
    this.isStarted = false;
  }

  onDestroy() {
    console.log(`[Activity] ${this.name}.onDestroy()`);
    this.isCreated = false;
  }

  setContentView(view: View) {
    console.log(`[Activity] ${this.name}.setContentView()`);
    this.contentView = view;
    view.draw();
  }

  findViewById(id: number): View | null {
    return this.apis['views'].get(id) || null;
  }

  finish() {
    console.log(`[Activity] ${this.name}.finish()`);
    this.onPause();
    this.onStop();
    this.onDestroy();
  }

  getContentView(): View | null {
    return this.contentView;
  }
}

// ===== android.view.View =====
export class View {
  private id: number;
  private type: string;
  private apis: AndroidAPIs;
  private x = 0;
  private y = 0;
  private width = 100;
  private height = 100;
  private backgroundColor = '#CCCCCC';
  private visibility = 'visible';
  private children: View[] = [];
  private parent: View | null = null;
  private text = '';
  private textSize = 14;
  private textColor = '#000000';
  private clickListener: (() => void) | null = null;

  constructor(id: number, type: string, apis: AndroidAPIs) {
    this.id = id;
    this.type = type;
    this.apis = apis;
  }

  setX(x: number) { this.x = x; }
  setY(y: number) { this.y = y; }
  setWidth(w: number) { this.width = w; }
  setHeight(h: number) { this.height = h; }
  setBackgroundColor(color: string) { this.backgroundColor = color; }
  setVisibility(vis: string) { this.visibility = vis; }
  setText(text: string) { this.text = text; }
  setTextSize(size: number) { this.textSize = size; }
  setTextColor(color: string) { this.textColor = color; }
  
  getText(): string { return this.text; }
  getId(): number { return this.id; }
  getWidth(): number { return this.width; }
  getHeight(): number { return this.height; }

  addView(child: View) {
    this.children.push(child);
    child.parent = this;
  }

  removeView(child: View) {
    const index = this.children.indexOf(child);
    if (index > -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
  }

  setOnClickListener(listener: () => void) {
    this.clickListener = listener;
  }

  performClick() {
    if (this.clickListener) {
      console.log(`[View] Click on ${this.type}#${this.id}`);
      this.clickListener();
    }
  }

  draw() {
    if (this.visibility !== 'visible') return;

    const ctx = this.apis.getCanvas();
    if (!ctx) return;

    // Draw this view
    ctx.fillStyle = this.backgroundColor;
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw border
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 1;
    ctx.strokeRect(this.x, this.y, this.width, this.height);

    // Draw text if any
    if (this.text) {
      ctx.fillStyle = this.textColor;
      ctx.font = `${this.textSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.text, this.x + this.width / 2, this.y + this.height / 2);
    }

    // Draw children
    for (const child of this.children) {
      child.draw();
    }
  }
}

// ===== android.widget Subclasses =====
export class TextView extends View {
  constructor(id: number, apis: AndroidAPIs) {
    super(id, 'TextView', apis);
    this.setWidth(200);
    this.setHeight(40);
    this.setBackgroundColor('#FFFFFF');
  }
}

export class Button extends View {
  constructor(id: number, apis: AndroidAPIs) {
    super(id, 'Button', apis);
    this.setWidth(150);
    this.setHeight(50);
    this.setBackgroundColor('#2196F3');
    this.setTextColor('#FFFFFF');
  }

  draw() {
    const ctx = this.apis.getCanvas();
    if (!ctx) return super.draw();

    // Draw button with rounded corners
    const x = this['x'];
    const y = this['y'];
    const w = this['width'];
    const h = this['height'];
    const r = 8; // Border radius

    ctx.fillStyle = this['backgroundColor'];
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();

    // Draw text
    if (this['text']) {
      ctx.fillStyle = this['textColor'];
      ctx.font = `bold ${this['textSize']}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this['text'], x + w / 2, y + h / 2);
    }
  }
}

export class ImageView extends View {
  private imageSrc = '';

  constructor(id: number, apis: AndroidAPIs) {
    super(id, 'ImageView', apis);
    this.setWidth(100);
    this.setHeight(100);
    this.setBackgroundColor('#E0E0E0');
  }

  setImageResource(resId: number) {
    console.log(`[ImageView] setImageResource(${resId})`);
    // In real impl, would load from resources
  }

  setImageBitmap(bitmap: any) {
    console.log(`[ImageView] setImageBitmap()`);
  }
}

export class EditText extends TextView {
  private hint = '';

  constructor(id: number, apis: AndroidAPIs) {
    super(id, apis);
    this['type'] = 'EditText';
    this.setBackgroundColor('#F5F5F5');
  }

  setHint(hint: string) {
    this.hint = hint;
  }

  getHint(): string {
    return this.hint;
  }
}

// ===== android.graphics.Canvas =====
export class AndroidCanvas {
  private ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  drawColor(color: string) {
    const canvas = this.ctx.canvas;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawRect(left: number, top: number, right: number, bottom: number, paint: Paint) {
    this.ctx.fillStyle = paint.getColor();
    this.ctx.fillRect(left, top, right - left, bottom - top);
    
    if (paint.getStrokeWidth() > 0) {
      this.ctx.strokeStyle = paint.getColor();
      this.ctx.lineWidth = paint.getStrokeWidth();
      this.ctx.strokeRect(left, top, right - left, bottom - top);
    }
  }

  drawCircle(cx: number, cy: number, radius: number, paint: Paint) {
    this.ctx.fillStyle = paint.getColor();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    if (paint.getStrokeWidth() > 0) {
      this.ctx.strokeStyle = paint.getColor();
      this.ctx.lineWidth = paint.getStrokeWidth();
      this.ctx.stroke();
    }
  }

  drawText(text: string, x: number, y: number, paint: Paint) {
    this.ctx.fillStyle = paint.getColor();
    this.ctx.font = `${paint.getTextSize()}px sans-serif`;
    this.ctx.fillText(text, x, y);
  }

  drawLine(startX: number, startY: number, stopX: number, stopY: number, paint: Paint) {
    this.ctx.strokeStyle = paint.getColor();
    this.ctx.lineWidth = paint.getStrokeWidth();
    this.ctx.beginPath();
    this.ctx.moveTo(startX, startY);
    this.ctx.lineTo(stopX, stopY);
    this.ctx.stroke();
  }

  save() {
    this.ctx.save();
  }

  restore() {
    this.ctx.restore();
  }

  translate(dx: number, dy: number) {
    this.ctx.translate(dx, dy);
  }

  rotate(degrees: number) {
    this.ctx.rotate(degrees * Math.PI / 180);
  }

  scale(sx: number, sy: number) {
    this.ctx.scale(sx, sy);
  }
}

// ===== android.graphics.Paint =====
export class Paint {
  private color = '#000000';
  private textSize = 14;
  private strokeWidth = 0;
  private style = 'FILL'; // FILL, STROKE, FILL_AND_STROKE

  setColor(color: string) { this.color = color; }
  getColor(): string { return this.color; }
  
  setTextSize(size: number) { this.textSize = size; }
  getTextSize(): number { return this.textSize; }
  
  setStrokeWidth(width: number) { this.strokeWidth = width; }
  getStrokeWidth(): number { return this.strokeWidth; }
  
  setStyle(style: string) { this.style = style; }
  getStyle(): string { return this.style; }
}

// ===== android.util.Log =====
export class Log {
  static v(tag: string, msg: string) {
    console.log(`[VERBOSE/${tag}] ${msg}`);
  }

  static d(tag: string, msg: string) {
    console.log(`[DEBUG/${tag}] ${msg}`);
  }

  static i(tag: string, msg: string) {
    console.info(`[INFO/${tag}] ${msg}`);
  }

  static w(tag: string, msg: string) {
    console.warn(`[WARN/${tag}] ${msg}`);
  }

  static e(tag: string, msg: string, error?: any) {
    console.error(`[ERROR/${tag}] ${msg}`, error || '');
  }
}

// ===== java.lang Basics =====
export class JavaString {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  length(): number {
    return this.value.length;
  }

  charAt(index: number): string {
    return this.value.charAt(index);
  }

  substring(start: number, end?: number): JavaString {
    return new JavaString(this.value.substring(start, end));
  }

  toString(): string {
    return this.value;
  }

  equals(other: JavaString): boolean {
    return this.value === other.value;
  }

  toLowerCase(): JavaString {
    return new JavaString(this.value.toLowerCase());
  }

  toUpperCase(): JavaString {
    return new JavaString(this.value.toUpperCase());
  }

  indexOf(str: string): number {
    return this.value.indexOf(str);
  }

  replace(oldStr: string, newStr: string): JavaString {
    return new JavaString(this.value.replace(oldStr, newStr));
  }
}

export class JavaMath {
  static abs(x: number): number { return Math.abs(x); }
  static max(a: number, b: number): number { return Math.max(a, b); }
  static min(a: number, b: number): number { return Math.min(a, b); }
  static sqrt(x: number): number { return Math.sqrt(x); }
  static pow(base: number, exp: number): number { return Math.pow(base, exp); }
  static sin(x: number): number { return Math.sin(x); }
  static cos(x: number): number { return Math.cos(x); }
  static tan(x: number): number { return Math.tan(x); }
  static random(): number { return Math.random(); }
  static floor(x: number): number { return Math.floor(x); }
  static ceil(x: number): number { return Math.ceil(x); }
  static round(x: number): number { return Math.round(x); }
  
  static PI = Math.PI;
  static E = Math.E;
}

export class JavaSystem {
  static currentTimeMillis(): number {
    return Date.now();
  }

  static nanoTime(): number {
    return performance.now() * 1000000;
  }

  static exit(code: number) {
    console.log(`[System] exit(${code})`);
  }

  static gc() {
    console.log('[System] gc() - no-op in browser');
  }
}
