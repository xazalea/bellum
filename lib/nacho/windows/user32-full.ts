/**
 * User32.dll - Window Management and UI APIs
 * Handles windows, messages, input, and UI elements
 */

export class User32 {
  private windows: Map<number, WindowInfo> = new Map();
  private nextHwnd = 0x00010000;
  private messageQueue: WindowMessage[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  
  setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }
  
  // ===== WINDOW CREATION =====
  
  CreateWindowExA(
    exStyle: number,
    className: string,
    windowName: string,
    style: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: number,
    menu: number,
    instance: number,
    param: any
  ): number {
    const hwnd = this.nextHwnd++;
    
    const window: WindowInfo = {
      hwnd,
      className,
      title: windowName,
      style,
      exStyle,
      x, y, width, height,
      parent,
      visible: false,
      enabled: true,
      children: [],
    };
    
    this.windows.set(hwnd, window);
    
    // Draw window on canvas if visible
    if (this.ctx && this.canvas) {
      this.drawWindow(window);
    }
    
    console.log(`[User32] CreateWindowEx: ${windowName} (${hwnd.toString(16)})`);
    return hwnd;
  }
  
  CreateWindowExW(
    exStyle: number,
    className: string,
    windowName: string,
    style: number,
    x: number,
    y: number,
    width: number,
    height: number,
    parent: number,
    menu: number,
    instance: number,
    param: any
  ): number {
    return this.CreateWindowExA(exStyle, className, windowName, style, x, y, width, height, parent, menu, instance, param);
  }
  
  DestroyWindow(hwnd: number): boolean {
    const window = this.windows.get(hwnd);
    if (!window) return false;
    
    // Destroy children
    for (const childHwnd of window.children) {
      this.DestroyWindow(childHwnd);
    }
    
    this.windows.delete(hwnd);
    console.log(`[User32] DestroyWindow: ${hwnd.toString(16)}`);
    return true;
  }
  
  // ===== WINDOW PROPERTIES =====
  
  ShowWindow(hwnd: number, cmdShow: number): boolean {
    const window = this.windows.get(hwnd);
    if (!window) return false;
    
    // SW_HIDE=0, SW_SHOWNORMAL=1, SW_SHOWMINIMIZED=2, SW_SHOWMAXIMIZED=3
    window.visible = cmdShow !== 0;
    
    if (window.visible && this.ctx) {
      this.drawWindow(window);
    }
    
    return true;
  }
  
  UpdateWindow(hwnd: number): boolean {
    const window = this.windows.get(hwnd);
    if (!window || !window.visible) return false;
    
    if (this.ctx) {
      this.drawWindow(window);
    }
    
    return true;
  }
  
  IsWindowVisible(hwnd: number): boolean {
    const window = this.windows.get(hwnd);
    return window?.visible || false;
  }
  
  EnableWindow(hwnd: number, enable: boolean): boolean {
    const window = this.windows.get(hwnd);
    if (!window) return false;
    
    const wasEnabled = window.enabled;
    window.enabled = enable;
    return !wasEnabled;
  }
  
  IsWindowEnabled(hwnd: number): boolean {
    const window = this.windows.get(hwnd);
    return window?.enabled || false;
  }
  
  SetWindowTextA(hwnd: number, text: string): boolean {
    const window = this.windows.get(hwnd);
    if (!window) return false;
    
    window.title = text;
    if (window.visible && this.ctx) {
      this.drawWindow(window);
    }
    
    return true;
  }
  
  GetWindowTextA(hwnd: number, buffer: number, maxCount: number): number {
    const window = this.windows.get(hwnd);
    if (!window) return 0;
    
    // Would copy to buffer
    return Math.min(window.title.length, maxCount - 1);
  }
  
  SetWindowPos(
    hwnd: number,
    hwndInsertAfter: number,
    x: number,
    y: number,
    cx: number,
    cy: number,
    flags: number
  ): boolean {
    const window = this.windows.get(hwnd);
    if (!window) return false;
    
    // SWP_NOSIZE=0x0001, SWP_NOMOVE=0x0002, SWP_NOZORDER=0x0004
    if (!(flags & 0x0002)) {
      window.x = x;
      window.y = y;
    }
    if (!(flags & 0x0001)) {
      window.width = cx;
      window.height = cy;
    }
    
    if (window.visible && this.ctx) {
      this.drawWindow(window);
    }
    
    return true;
  }
  
  MoveWindow(hwnd: number, x: number, y: number, width: number, height: number, repaint: boolean): boolean {
    return this.SetWindowPos(hwnd, 0, x, y, width, height, 0);
  }
  
  GetWindowRect(hwnd: number, rect: any): boolean {
    const window = this.windows.get(hwnd);
    if (!window) return false;
    
    // Would populate RECT structure
    return true;
  }
  
  GetClientRect(hwnd: number, rect: any): boolean {
    const window = this.windows.get(hwnd);
    if (!window) return false;
    
    // Would populate RECT structure (client area)
    return true;
  }
  
  // ===== MESSAGE HANDLING =====
  
  GetMessageA(msg: any, hwnd: number, msgFilterMin: number, msgFilterMax: number): number {
    // Simplified message loop
    if (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      // Would populate MSG structure
      return 1;
    }
    return 0;
  }
  
  PeekMessageA(msg: any, hwnd: number, msgFilterMin: number, msgFilterMax: number, removeMsg: number): boolean {
    if (this.messageQueue.length > 0) {
      // Would populate MSG structure
      if (removeMsg & 0x0001) { // PM_REMOVE
        this.messageQueue.shift();
      }
      return true;
    }
    return false;
  }
  
  TranslateMessage(msg: any): boolean {
    // Translate virtual-key messages into character messages
    return true;
  }
  
  DispatchMessageA(msg: any): number {
    // Dispatch message to window procedure
    return 0;
  }
  
  PostMessageA(hwnd: number, msg: number, wParam: number, lParam: number): boolean {
    this.messageQueue.push({ hwnd, msg, wParam, lParam });
    return true;
  }
  
  SendMessageA(hwnd: number, msg: number, wParam: number, lParam: number): number {
    // Synchronously send message to window procedure
    return 0;
  }
  
  PostQuitMessage(exitCode: number): void {
    console.log(`[User32] PostQuitMessage(${exitCode})`);
    // Would post WM_QUIT message
  }
  
  // ===== WINDOW PROCEDURE =====
  
  DefWindowProcA(hwnd: number, msg: number, wParam: number, lParam: number): number {
    // Default window procedure
    return 0;
  }
  
  CallWindowProcA(
    prevWndFunc: number,
    hwnd: number,
    msg: number,
    wParam: number,
    lParam: number
  ): number {
    // Call previous window procedure
    return 0;
  }
  
  // ===== WINDOW CLASS =====
  
  RegisterClassA(wndClass: any): number {
    // Would register window class
    return 0xC000 + Math.floor(Math.random() * 0x1000);
  }
  
  RegisterClassExA(wndClass: any): number {
    return this.RegisterClassA(wndClass);
  }
  
  UnregisterClassA(className: string, instance: number): boolean {
    return true;
  }
  
  GetClassInfoA(instance: number, className: string, wndClass: any): boolean {
    // Would populate WNDCLASS structure
    return true;
  }
  
  // ===== INPUT =====
  
  GetCursorPos(point: any): boolean {
    // Would populate POINT structure with cursor position
    return true;
  }
  
  SetCursorPos(x: number, y: number): boolean {
    console.log(`[User32] SetCursorPos(${x}, ${y})`);
    return true;
  }
  
  GetKeyState(virtualKey: number): number {
    // Would return key state (high bit = pressed)
    return 0;
  }
  
  GetAsyncKeyState(virtualKey: number): number {
    // Would return async key state
    return 0;
  }
  
  SetCapture(hwnd: number): number {
    // Capture mouse input
    return 0;
  }
  
  ReleaseCapture(): boolean {
    // Release mouse capture
    return true;
  }
  
  // ===== DIALOG BOXES =====
  
  MessageBoxA(hwnd: number, text: string, caption: string, type: number): number {
    console.log(`[MessageBox] ${caption}: ${text}`);
    
    // Draw message box on canvas
    if (this.ctx && this.canvas) {
      const x = this.canvas.width / 2 - 150;
      const y = this.canvas.height / 2 - 75;
      
      // Background
      this.ctx.fillStyle = '#F0F0F0';
      this.ctx.fillRect(x, y, 300, 150);
      
      // Border
      this.ctx.strokeStyle = '#0078D4';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(x, y, 300, 150);
      
      // Title bar
      this.ctx.fillStyle = '#0078D4';
      this.ctx.fillRect(x, y, 300, 30);
      
      // Caption
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '14px sans-serif';
      this.ctx.fillText(caption, x + 10, y + 20);
      
      // Text
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '12px sans-serif';
      this.wrapText(text, x + 10, y + 50, 280, 16);
      
      // OK button
      this.ctx.fillStyle = '#0078D4';
      this.ctx.fillRect(x + 110, y + 110, 80, 30);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('OK', x + 140, y + 130);
    }
    
    // MB_OK=0, MB_OKCANCEL=1, MB_YESNO=4, etc.
    return 1; // IDOK
  }
  
  MessageBoxW(hwnd: number, text: string, caption: string, type: number): number {
    return this.MessageBoxA(hwnd, text, caption, type);
  }
  
  // ===== DEVICE CONTEXT =====
  
  GetDC(hwnd: number): number {
    // Return device context handle
    return 0x00100000 + hwnd;
  }
  
  ReleaseDC(hwnd: number, hdc: number): number {
    return 1;
  }
  
  BeginPaint(hwnd: number, paintStruct: any): number {
    // Would populate PAINTSTRUCT
    return this.GetDC(hwnd);
  }
  
  EndPaint(hwnd: number, paintStruct: any): boolean {
    return true;
  }
  
  InvalidateRect(hwnd: number, rect: any, erase: boolean): boolean {
    // Mark window for repainting
    return true;
  }
  
  // ===== MENUS =====
  
  CreateMenu(): number {
    return 0x00200000 + Math.floor(Math.random() * 0x10000);
  }
  
  CreatePopupMenu(): number {
    return this.CreateMenu();
  }
  
  AppendMenuA(menu: number, flags: number, id: number, text: string): boolean {
    console.log(`[User32] AppendMenu: ${text}`);
    return true;
  }
  
  SetMenu(hwnd: number, menu: number): boolean {
    return true;
  }
  
  // ===== SYSTEM METRICS =====
  
  GetSystemMetrics(index: number): number {
    // SM_CXSCREEN=0, SM_CYSCREEN=1, etc.
    switch (index) {
      case 0: return this.canvas?.width || 1920;  // Screen width
      case 1: return this.canvas?.height || 1080; // Screen height
      default: return 0;
    }
  }
  
  // ===== HELPER =====
  
  private drawWindow(window: WindowInfo) {
    if (!this.ctx) return;
    
    // Background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(window.x, window.y, window.width, window.height);
    
    // Title bar
    this.ctx.fillStyle = '#0078D4';
    this.ctx.fillRect(window.x, window.y, window.width, 30);
    
    // Title text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = '14px sans-serif';
    this.ctx.fillText(window.title, window.x + 10, window.y + 20);
    
    // Border
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(window.x, window.y, window.width, window.height);
  }
  
  private wrapText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    if (!this.ctx) return;
    
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line) {
        this.ctx.fillText(line, x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    
    this.ctx.fillText(line, x, currentY);
  }
}

interface WindowInfo {
  hwnd: number;
  className: string;
  title: string;
  style: number;
  exStyle: number;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: number;
  visible: boolean;
  enabled: boolean;
  children: number[];
}

interface WindowMessage {
  hwnd: number;
  msg: number;
  wParam: number;
  lParam: number;
}
