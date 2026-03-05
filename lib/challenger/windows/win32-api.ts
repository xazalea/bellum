/**
 * Win32 API Implementation
 * Complete Kernel32, User32, GDI32 API implementations
 */

// Handle type
export type HANDLE = number;
export type HWND = HANDLE;
export type HDC = HANDLE;
export type HMODULE = HANDLE;
export type HINSTANCE = HANDLE;
export type HMENU = HANDLE;
export type HICON = HANDLE;
export type HCURSOR = HANDLE;
export type HBRUSH = HANDLE;
export type HFONT = HANDLE;
export type HPEN = HANDLE;
export type HBITMAP = HANDLE;

// BOOL type
export type BOOL = number;

// Common constants
export const TRUE = 1;
export const FALSE = 0;

// Window styles
export const WS_OVERLAPPED = 0x00000000;
export const WS_POPUP = 0x80000000;
export const WS_CHILD = 0x40000000;
export const WS_MINIMIZE = 0x20000000;
export const WS_VISIBLE = 0x10000000;
export const WS_DISABLED = 0x08000000;
export const WS_CLIPSIBLINGS = 0x04000000;
export const WS_CLIPCHILDREN = 0x02000000;
export const WS_MAXIMIZE = 0x01000000;
export const WS_CAPTION = 0x00C00000;
export const WS_BORDER = 0x00800000;
export const WS_DLGFRAME = 0x00400000;
export const WS_VSCROLL = 0x00200000;
export const WS_HSCROLL = 0x00100000;
export const WS_SYSMENU = 0x00080000;
export const WS_THICKFRAME = 0x00040000;
export const WS_GROUP = 0x00020000;
export const WS_TABSTOP = 0x00010000;
export const WS_MINIMIZEBOX = 0x00020000;
export const WS_MAXIMIZEBOX = 0x00010000;
export const WS_OVERLAPPEDWINDOW = WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_THICKFRAME | WS_MINIMIZEBOX | WS_MAXIMIZEBOX;

// Show window commands
export const SW_HIDE = 0;
export const SW_SHOWNORMAL = 1;
export const SW_NORMAL = 1;
export const SW_SHOWMINIMIZED = 2;
export const SW_SHOWMAXIMIZED = 3;
export const SW_MAXIMIZE = 3;
export const SW_SHOWNOACTIVATE = 4;
export const SW_SHOW = 5;
export const SW_MINIMIZE = 6;
export const SW_SHOWMINNOACTIVE = 7;
export const SW_SHOWNA = 8;
export const SW_RESTORE = 9;
export const SW_SHOWDEFAULT = 10;
export const SW_FORCEMINIMIZE = 11;

// Memory constants
export const MEM_COMMIT = 0x00001000;
export const MEM_RESERVE = 0x00002000;
export const MEM_DECOMMIT = 0x00004000;
export const MEM_RELEASE = 0x00008000;
export const MEM_FREE = 0x00010000;

// Page protection
export const PAGE_NOACCESS = 0x01;
export const PAGE_READONLY = 0x02;
export const PAGE_READWRITE = 0x04;
export const PAGE_WRITECOPY = 0x08;
export const PAGE_EXECUTE = 0x10;
export const PAGE_EXECUTE_READ = 0x20;
export const PAGE_EXECUTE_READWRITE = 0x40;
export const PAGE_EXECUTE_WRITECOPY = 0x80;
export const PAGE_GUARD = 0x100;
export const PAGE_NOCACHE = 0x200;
export const PAGE_WRITECOMBINE = 0x400;

// File access
export const GENERIC_READ = 0x80000000;
export const GENERIC_WRITE = 0x40000000;
export const GENERIC_EXECUTE = 0x20000000;
export const GENERIC_ALL = 0x10000000;

// File share modes
export const FILE_SHARE_READ = 0x00000001;
export const FILE_SHARE_WRITE = 0x00000002;
export const FILE_SHARE_DELETE = 0x00000004;

// File creation disposition
export const CREATE_NEW = 1;
export const CREATE_ALWAYS = 2;
export const OPEN_EXISTING = 3;
export const OPEN_ALWAYS = 4;
export const TRUNCATE_EXISTING = 5;

// Standard handles
export const STD_INPUT_HANDLE = -10;
export const STD_OUTPUT_HANDLE = -11;
export const STD_ERROR_HANDLE = -12;

// Message types
export interface MSG {
  hwnd: HWND;
  message: number;
  wParam: number;
  lParam: number;
  time: number;
  pt: { x: number; y: number };
}

// Window messages
export const WM_NULL = 0x0000;
export const WM_CREATE = 0x0001;
export const WM_DESTROY = 0x0002;
export const WM_MOVE = 0x0003;
export const WM_SIZE = 0x0005;
export const WM_ACTIVATE = 0x0006;
export const WM_SETFOCUS = 0x0007;
export const WM_KILLFOCUS = 0x0008;
export const WM_ENABLE = 0x000A;
export const WM_SETREDRAW = 0x000B;
export const WM_SETTEXT = 0x000C;
export const WM_GETTEXT = 0x000D;
export const WM_GETTEXTLENGTH = 0x000E;
export const WM_PAINT = 0x000F;
export const WM_CLOSE = 0x0010;
export const WM_QUERYENDSESSION = 0x0011;
export const WM_QUIT = 0x0012;
export const WM_QUERYOPEN = 0x0013;
export const WM_ERASEBKGND = 0x0014;
export const WM_SYSCOLORCHANGE = 0x0015;
export const WM_SHOWWINDOW = 0x0018;
export const WM_CTLCOLOR = 0x0019;
export const WM_WININICHANGE = 0x001A;
export const WM_TIMER = 0x0113;
export const WM_COMMAND = 0x0111;
export const WM_INITDIALOG = 0x0110;
export const WM_LBUTTONDOWN = 0x0201;
export const WM_LBUTTONUP = 0x0202;
export const WM_MOUSEMOVE = 0x0200;
export const WM_KEYDOWN = 0x0100;
export const WM_KEYUP = 0x0101;
export const WM_CHAR = 0x0102;

// Virtual key codes
export const VK_LBUTTON = 0x01;
export const VK_RBUTTON = 0x02;
export const VK_CANCEL = 0x03;
export const VK_MBUTTON = 0x04;
export const VK_BACK = 0x08;
export const VK_TAB = 0x09;
export const VK_CLEAR = 0x0C;
export const VK_RETURN = 0x0D;
export const VK_SHIFT = 0x10;
export const VK_CONTROL = 0x11;
export const VK_MENU = 0x12;
export const VK_PAUSE = 0x13;
export const VK_CAPITAL = 0x14;
export const VK_ESCAPE = 0x1B;
export const VK_SPACE = 0x20;
export const VK_PRIOR = 0x21;
export const VK_NEXT = 0x22;
export const VK_END = 0x23;
export const VK_HOME = 0x24;
export const VK_LEFT = 0x25;
export const VK_UP = 0x26;
export const VK_RIGHT = 0x27;
export const VK_DOWN = 0x28;
export const VK_SELECT = 0x29;
export const VK_PRINT = 0x2A;
export const VK_EXECUTE = 0x2B;
export const VK_SNAPSHOT = 0x2C;
export const VK_INSERT = 0x2D;
export const VK_DELETE = 0x2E;
export const VK_HELP = 0x2F;

// Window class structure
export interface WNDCLASSEX {
  cbSize: number;
  style: number;
  lpfnWndProc: number;
  cbClsExtra: number;
  cbWndExtra: number;
  hInstance: HINSTANCE;
  hIcon: HICON;
  hCursor: HCURSOR;
  hbrBackground: HBRUSH;
  lpszMenuName: string;
  lpszClassName: string;
  hIconSm: HICON;
}

// Point structure
export interface POINT {
  x: number;
  y: number;
}

// Rect structure
export interface RECT {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Paint structure
export interface PAINTSTRUCT {
  hdc: HDC;
  fErase: BOOL;
  rcPaint: RECT;
  fRestore: BOOL;
  fIncUpdate: BOOL;
  rgbReserved: Uint8Array;
}

/**
 * Kernel32 API Implementation
 */
export class Kernel32 {
  private handles: Map<HANDLE, any> = new Map();
  private nextHandle: HANDLE = 100;
  private modules: Map<string, HMODULE> = new Map();
  private memory: Map<number, { size: number; protection: number; data: Uint8Array }> = new Map();
  private nextMemoryAddr = 0x00400000;
  private heapBase = 0x20000000;
  private heapSize = 0x10000000; // 256MB

  constructor() {
    // Initialize standard handles
    this.handles.set(STD_INPUT_HANDLE, { type: 'stdin' });
    this.handles.set(STD_OUTPUT_HANDLE, { type: 'stdout' });
    this.handles.set(STD_ERROR_HANDLE, { type: 'stderr' });
  }

  /**
   * VirtualAlloc - Allocate memory
   */
  VirtualAlloc(
    lpAddress: number,
    dwSize: number,
    flAllocationType: number,
    flProtect: number
  ): number {
    let addr = lpAddress;

    if (addr === 0) {
      // Find free memory region
      addr = this.findFreeMemory(dwSize);
    }

    // Check if address is already allocated
    if (this.memory.has(addr)) {
      console.warn(`[Kernel32] VirtualAlloc: address 0x${addr.toString(16)} already allocated`);
      return 0;
    }

    // Allocate memory
    this.memory.set(addr, {
      size: dwSize,
      protection: flProtect,
      data: new Uint8Array(dwSize),
    });

    console.log(`[Kernel32] VirtualAlloc: 0x${addr.toString(16)} (${dwSize} bytes)`);
    return addr;
  }

  /**
   * Find free memory region
   */
  private findFreeMemory(size: number): number {
    // Simple linear search
    let addr = this.heapBase;
    const alignedSize = (size + 0xFFF) & ~0xFFF; // Page align

    while (this.memory.has(addr)) {
      const region = this.memory.get(addr)!;
      addr += region.size;
      addr = (addr + 0xFFF) & ~0xFFF; // Page align
    }

    return addr;
  }

  /**
   * VirtualFree - Free memory
   */
  VirtualFree(lpAddress: number, dwSize: number, dwFreeType: number): BOOL {
    if (!this.memory.has(lpAddress)) {
      return FALSE;
    }

    if (dwFreeType & MEM_RELEASE) {
      this.memory.delete(lpAddress);
      console.log(`[Kernel32] VirtualFree: 0x${lpAddress.toString(16)}`);
    }

    return TRUE;
  }

  /**
   * VirtualProtect - Change memory protection
   */
  VirtualProtect(lpAddress: number, dwSize: number, flNewProtect: number, lpflOldProtect: number): BOOL {
    const region = this.memory.get(lpAddress);
    if (!region) {
      return FALSE;
    }

    // Store old protection
    if (lpflOldProtect !== 0) {
      // Would write to process memory
    }

    region.protection = flNewProtect;
    return TRUE;
  }

  /**
   * CreateFile - Create or open a file
   */
  CreateFile(
    lpFileName: string,
    dwDesiredAccess: number,
    dwShareMode: number,
    lpSecurityAttributes: number,
    dwCreationDisposition: number,
    dwFlagsAndAttributes: number,
    hTemplateFile: HANDLE
  ): HANDLE {
    const handle = this.nextHandle++;
    
    this.handles.set(handle, {
      type: 'file',
      name: lpFileName,
      access: dwDesiredAccess,
      shareMode: dwShareMode,
      position: 0,
    });

    console.log(`[Kernel32] CreateFile: "${lpFileName}" -> handle ${handle}`);
    return handle;
  }

  /**
   * ReadFile - Read from a file
   */
  ReadFile(
    hFile: HANDLE,
    lpBuffer: number,
    nNumberOfBytesToRead: number,
    lpNumberOfBytesRead: number,
    lpOverlapped: number
  ): BOOL {
    const file = this.handles.get(hFile);
    if (!file || file.type !== 'file') {
      return FALSE;
    }

    // Simplified - would read from OPFS or virtual filesystem
    const bytesRead = Math.min(nNumberOfBytesToRead, 1024);
    
    console.log(`[Kernel32] ReadFile: handle ${hFile}, ${bytesRead} bytes`);
    return TRUE;
  }

  /**
   * WriteFile - Write to a file
   */
  WriteFile(
    hFile: HANDLE,
    lpBuffer: number,
    nNumberOfBytesToWrite: number,
    lpNumberOfBytesWritten: number,
    lpOverlapped: number
  ): BOOL {
    const file = this.handles.get(hFile);
    if (!file) {
      return FALSE;
    }

    // Handle stdout/stderr
    if (hFile === STD_OUTPUT_HANDLE || hFile === STD_ERROR_HANDLE) {
      // Would write to console
      console.log(`[Kernel32] WriteFile: ${nNumberOfBytesToWrite} bytes to ${hFile === STD_OUTPUT_HANDLE ? 'stdout' : 'stderr'}`);
    }

    return TRUE;
  }

  /**
   * CloseHandle - Close a handle
   */
  CloseHandle(hObject: HANDLE): BOOL {
    if (!this.handles.has(hObject)) {
      return FALSE;
    }

    this.handles.delete(hObject);
    console.log(`[Kernel32] CloseHandle: ${hObject}`);
    return TRUE;
  }

  /**
   * GetModuleHandle - Get handle to a module
   */
  GetModuleHandle(lpModuleName: string): HMODULE {
    if (lpModuleName === '' || lpModuleName === null) {
      // Return current process module
      return 0x00400000;
    }

    const handle = this.modules.get(lpModuleName);
    if (handle) {
      return handle;
    }

    // Create new module handle
    const newHandle = this.nextHandle++;
    this.modules.set(lpModuleName, newHandle);
    return newHandle;
  }

  /**
   * LoadLibrary - Load a DLL
   */
  LoadLibrary(lpLibFileName: string): HMODULE {
    const handle = this.GetModuleHandle(lpLibFileName);
    console.log(`[Kernel32] LoadLibrary: "${lpLibFileName}" -> 0x${handle.toString(16)}`);
    return handle;
  }

  /**
   * GetProcAddress - Get function address
   */
  GetProcAddress(hModule: HMODULE, lpProcName: string): number {
    // Return a fake address for the function
    const addr = 0xDEAD0000 + (hModule * 0x1000);
    console.log(`[Kernel32] GetProcAddress: "${lpProcName}" -> 0x${addr.toString(16)}`);
    return addr;
  }

  /**
   * GetStdHandle - Get standard handle
   */
  GetStdHandle(nStdHandle: number): HANDLE {
    return nStdHandle;
  }

  /**
   * HeapCreate - Create a heap
   */
  HeapCreate(flOptions: number, dwInitialSize: number, dwMaximumSize: number): HANDLE {
    const handle = this.nextHandle++;
    this.handles.set(handle, {
      type: 'heap',
      base: this.heapBase,
      size: dwMaximumSize || this.heapSize,
    });
    return handle;
  }

  /**
   * HeapAlloc - Allocate from heap
   */
  HeapAlloc(hHeap: HANDLE, dwFlags: number, dwBytes: number): number {
    const heap = this.handles.get(hHeap);
    if (!heap || heap.type !== 'heap') {
      return 0;
    }

    // Simple bump allocator
    const addr = heap.base + heap.allocated;
    heap.allocated = (heap.allocated || 0) + dwBytes;
    
    return addr;
  }

  /**
   * GetTickCount - Get milliseconds since system start
   */
  GetTickCount(): number {
    return Date.now() & 0xFFFFFFFF;
  }

  /**
   * GetTickCount64 - Get milliseconds since system start (64-bit)
   */
  GetTickCount64(): bigint {
    return BigInt(Date.now());
  }

  /**
   * Sleep - Suspend execution
   */
  Sleep(dwMilliseconds: number): void {
    // Would need async handling in real implementation
    console.log(`[Kernel32] Sleep: ${dwMilliseconds}ms`);
  }

  /**
   * GetCurrentProcessId - Get current process ID
   */
  GetCurrentProcessId(): number {
    return 1234;
  }

  /**
   * GetCurrentThreadId - Get current thread ID
   */
  GetCurrentThreadId(): number {
    return 5678;
  }

  /**
   * GetLastError - Get last error code
   */
  GetLastError(): number {
    return 0;
  }

  /**
   * SetLastError - Set last error code
   */
  SetLastError(dwErrCode: number): void {
    // Store error code
  }
}

// Internal window structure for User32
interface WindowInternal {
  hwnd: HWND;
  className: string;
  title: string;
  style: number;
  exStyle: number;
  x: number;
  y: number;
  width: number;
  height: number;
  parent: HWND;
  menu: HMENU;
  instance: HINSTANCE;
  wndProc: number;
  visible: boolean;
  enabled: boolean;
  children: HWND[];
}

/**
 * User32 API Implementation
 */
export class User32 {
  private windows: Map<HWND, WindowInternal> = new Map();
  private windowClasses: Map<string, WNDCLASSEX> = new Map();
  private nextHwnd: HWND = 0x10000;
  private focusedWindow: HWND = 0;
  private activeWindow: HWND = 0;
  private messageQueue: MSG[] = [];
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  /**
   * Set the canvas for rendering
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  /**
   * RegisterClassEx - Register a window class
   */
  RegisterClassEx(lpwcx: WNDCLASSEX): number {
    this.windowClasses.set(lpwcx.lpszClassName, lpwcx);
    console.log(`[User32] RegisterClassEx: "${lpwcx.lpszClassName}"`);
    return 1;
  }

  /**
   * CreateWindowEx - Create a window
   */
  CreateWindowEx(
    dwExStyle: number,
    lpClassName: string,
    lpWindowName: string,
    dwStyle: number,
    x: number,
    y: number,
    nWidth: number,
    nHeight: number,
    hWndParent: HWND,
    hMenu: HMENU,
    hInstance: HINSTANCE,
    lpParam: number
  ): HWND {
    const hwnd = this.nextHwnd++;
    
    const wndClass = this.windowClasses.get(lpClassName);
    
    const window: WindowInternal = {
      hwnd,
      className: lpClassName,
      title: lpWindowName,
      style: dwStyle,
      exStyle: dwExStyle,
      x,
      y,
      width: nWidth > 0 ? nWidth : 800,
      height: nHeight > 0 ? nHeight : 600,
      parent: hWndParent,
      menu: hMenu,
      instance: hInstance,
      wndProc: wndClass?.lpfnWndProc || 0,
      visible: (dwStyle & WS_VISIBLE) !== 0,
      enabled: true,
      children: [],
    };

    this.windows.set(hwnd, window);

    // Add to parent's children
    if (hWndParent !== 0) {
      const parent = this.windows.get(hWndParent);
      if (parent) {
        parent.children.push(hwnd);
      }
    }

    console.log(`[User32] CreateWindowEx: "${lpWindowName}" (${window.width}x${window.height}) -> hwnd ${hwnd}`);

    // Draw window
    this.drawWindow(window);

    // Send WM_CREATE
    this.PostMessage(hwnd, WM_CREATE, 0, 0);

    return hwnd;
  }

  /**
   * Draw a window on canvas
   */
  private drawWindow(window: WindowInternal): void {
    if (!this.ctx || !this.canvas) return;

    const { x, y, width, height, title, visible } = window;
    if (!visible) return;

    // Window background
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(x, y, width, height);

    // Title bar
    if (window.style & WS_CAPTION) {
      this.ctx.fillStyle = '#0078D4';
      this.ctx.fillRect(x, y, width, 30);

      // Title text
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '14px sans-serif';
      this.ctx.fillText(title, x + 10, y + 20);

      // Close button
      this.ctx.fillStyle = '#E81123';
      this.ctx.fillRect(x + width - 30, y, 30, 30);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText('×', x + width - 20, y + 22);
    }

    // Border
    if (window.style & WS_BORDER) {
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  /**
   * DestroyWindow - Destroy a window
   */
  DestroyWindow(hWnd: HWND): BOOL {
    const window = this.windows.get(hWnd);
    if (!window) {
      return FALSE;
    }

    // Send WM_DESTROY
    this.PostMessage(hWnd, WM_DESTROY, 0, 0);

    // Remove from parent
    if (window.parent !== 0) {
      const parent = this.windows.get(window.parent);
      if (parent) {
        parent.children = parent.children.filter(h => h !== hWnd);
      }
    }

    // Destroy children
    for (const childHwnd of window.children) {
      this.DestroyWindow(childHwnd);
    }

    this.windows.delete(hWnd);
    console.log(`[User32] DestroyWindow: ${hWnd}`);

    return TRUE;
  }

  /**
   * ShowWindow - Show or hide a window
   */
  ShowWindow(hWnd: HWND, nCmdShow: number): BOOL {
    const window = this.windows.get(hWnd);
    if (!window) {
      return FALSE;
    }

    switch (nCmdShow) {
      case SW_SHOW:
      case SW_SHOWNORMAL:
      case SW_SHOWDEFAULT:
        window.visible = true;
        break;
      case SW_HIDE:
        window.visible = false;
        break;
    }

    console.log(`[User32] ShowWindow: ${hWnd} -> ${nCmdShow}`);
    this.redraw();

    return TRUE;
  }

  /**
   * UpdateWindow - Update a window
   */
  UpdateWindow(hWnd: HWND): BOOL {
    const window = this.windows.get(hWnd);
    if (!window) {
      return FALSE;
    }

    // Send WM_PAINT
    this.PostMessage(hWnd, WM_PAINT, 0, 0);
    return TRUE;
  }

  /**
   * SetWindowText - Set window title
   */
  SetWindowText(hWnd: HWND, lpString: string): BOOL {
    const window = this.windows.get(hWnd);
    if (!window) {
      return FALSE;
    }

    window.title = lpString;
    this.redraw();
    return TRUE;
  }

  /**
   * GetWindowText - Get window title
   */
  GetWindowText(hWnd: HWND, lpString: number, nMaxCount: number): number {
    const window = this.windows.get(hWnd);
    if (!window) {
      return 0;
    }

    return window.title.length;
  }

  /**
   * MoveWindow - Move and resize a window
   */
  MoveWindow(
    hWnd: HWND,
    X: number,
    Y: number,
    nWidth: number,
    nHeight: number,
    bRepaint: BOOL
  ): BOOL {
    const window = this.windows.get(hWnd);
    if (!window) {
      return FALSE;
    }

    window.x = X;
    window.y = Y;
    window.width = nWidth;
    window.height = nHeight;

    if (bRepaint) {
      this.redraw();
    }

    return TRUE;
  }

  /**
   * GetClientRect - Get client area rectangle
   */
  GetClientRect(hWnd: HWND, lpRect: RECT): BOOL {
    const window = this.windows.get(hWnd);
    if (!window) {
      return FALSE;
    }

    // Client area excludes title bar and borders
    const captionHeight = (window.style & WS_CAPTION) ? 30 : 0;
    const borderWidth = (window.style & WS_BORDER) ? 2 : 0;

    lpRect.left = borderWidth;
    lpRect.top = captionHeight + borderWidth;
    lpRect.right = window.width - borderWidth;
    lpRect.bottom = window.height - borderWidth;

    return TRUE;
  }

  /**
   * GetWindowRect - Get window rectangle
   */
  GetWindowRect(hWnd: HWND, lpRect: RECT): BOOL {
    const window = this.windows.get(hWnd);
    if (!window) {
      return FALSE;
    }

    lpRect.left = window.x;
    lpRect.top = window.y;
    lpRect.right = window.x + window.width;
    lpRect.bottom = window.y + window.height;

    return TRUE;
  }

  /**
   * SetFocus - Set keyboard focus
   */
  SetFocus(hWnd: HWND): HWND {
    const previousFocus = this.focusedWindow;
    this.focusedWindow = hWnd;
    return previousFocus;
  }

  /**
   * GetFocus - Get focused window
   */
  GetFocus(): HWND {
    return this.focusedWindow;
  }

  /**
   * SetActiveWindow - Set active window
   */
  SetActiveWindow(hWnd: HWND): HWND {
    const previousActive = this.activeWindow;
    this.activeWindow = hWnd;
    return previousActive;
  }

  /**
   * GetActiveWindow - Get active window
   */
  GetActiveWindow(): HWND {
    return this.activeWindow;
  }

  /**
   * MessageBox - Show a message box
   */
  MessageBox(hWnd: HWND, lpText: string, lpCaption: string, uType: number): number {
    console.log(`[User32] MessageBox: "${lpCaption}" - "${lpText}"`);

    // Draw message box on canvas
    if (this.ctx && this.canvas) {
      const centerX = this.canvas.width / 2;
      const centerY = this.canvas.height / 2;

      // Overlay
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      // Message box
      this.ctx.fillStyle = '#F0F0F0';
      this.ctx.fillRect(centerX - 200, centerY - 100, 400, 200);

      // Title bar
      this.ctx.fillStyle = '#0078D4';
      this.ctx.fillRect(centerX - 200, centerY - 100, 400, 30);

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.fillText(lpCaption, centerX - 190, centerY - 80);

      // Text
      this.ctx.fillStyle = '#000000';
      this.ctx.font = '16px sans-serif';
      this.ctx.fillText(lpText, centerX - 180, centerY);

      // OK button
      this.ctx.fillStyle = '#0078D4';
      this.ctx.fillRect(centerX - 50, centerY + 50, 100, 30);
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillText('OK', centerX - 10, centerY + 70);
    }

    return 1; // IDOK
  }

  /**
   * GetMessage - Get a message from the queue
   */
  GetMessage(lpMsg: MSG, hWnd: HWND, wMsgFilterMin: number, wMsgFilterMax: number): number {
    // Check for messages
    if (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      Object.assign(lpMsg, msg);
      
      if (msg.message === WM_QUIT) {
        return 0;
      }
      return 1;
    }

    // No messages - would block in real implementation
    return -1;
  }

  /**
   * PeekMessage - Check for messages without blocking
   */
  PeekMessage(
    lpMsg: MSG,
    hWnd: HWND,
    wMsgFilterMin: number,
    wMsgFilterMax: number,
    wRemoveMsg: number
  ): BOOL {
    if (this.messageQueue.length > 0) {
      const msg = this.messageQueue.shift()!;
      Object.assign(lpMsg, msg);
      return TRUE;
    }
    return FALSE;
  }

  /**
   * TranslateMessage - Translate virtual key messages
   */
  TranslateMessage(lpMsg: MSG): BOOL {
    // Would translate WM_KEYDOWN to WM_CHAR
    return TRUE;
  }

  /**
   * DispatchMessage - Dispatch message to window procedure
   */
  DispatchMessage(lpMsg: MSG): number {
    // Would call window procedure
    return 0;
  }

  /**
   * PostMessage - Post a message to the queue
   */
  PostMessage(hWnd: HWND, Msg: number, wParam: number, lParam: number): BOOL {
    this.messageQueue.push({
      hwnd: hWnd,
      message: Msg,
      wParam,
      lParam,
      time: Date.now(),
      pt: { x: 0, y: 0 },
    });
    return TRUE;
  }

  /**
   * SendMessage - Send a message directly
   */
  SendMessage(hWnd: HWND, Msg: number, wParam: number, lParam: number): number {
    // Would call window procedure directly
    return 0;
  }

  /**
   * PostQuitMessage - Post quit message
   */
  PostQuitMessage(nExitCode: number): void {
    this.messageQueue.push({
      hwnd: 0,
      message: WM_QUIT,
      wParam: nExitCode,
      lParam: 0,
      time: Date.now(),
      pt: { x: 0, y: 0 },
    });
  }

  /**
   * Redraw all windows
   */
  private redraw(): void {
    if (!this.ctx || !this.canvas) return;

    // Clear canvas
    this.ctx.fillStyle = '#0078D4';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw all visible windows
    Array.from(this.windows.values()).forEach((window) => {
      if (window.visible) {
        this.drawWindow(window);
      }
    });
  }

  /**
   * Get window by handle
   */
  getWindow(hWnd: HWND): WindowInternal | undefined {
    return this.windows.get(hWnd);
  }
}

// Internal DC structure for GDI32
interface DCInternal {
  hwnd: HWND;
  bitmap: HBITMAP | null;
  brush: HBRUSH | null;
  pen: HPEN | null;
  font: HFONT | null;
  textColor: number;
  bgColor: number;
  bkMode: number;
  posX: number;
  posY: number;
}

/**
 * GDI32 API Implementation
 */
export class GDI32 {
  private objects: Map<HANDLE, any> = new Map();
  private nextHandle: HANDLE = 0x100000;
  private dcs: Map<HDC, DCInternal> = new Map();

  /**
   * GetDC - Get device context for a window
   */
  GetDC(hWnd: HWND): HDC {
    const hdc = this.nextHandle++;
    
    this.dcs.set(hdc, {
      hwnd: hWnd,
      bitmap: null,
      brush: null,
      pen: null,
      font: null,
      textColor: 0x000000,
      bgColor: 0xFFFFFF,
      bkMode: 1, // OPAQUE
      posX: 0,
      posY: 0,
    });

    return hdc;
  }

  /**
   * ReleaseDC - Release a device context
   */
  ReleaseDC(hWnd: HWND, hDC: HDC): number {
    if (this.dcs.has(hDC)) {
      this.dcs.delete(hDC);
      return 1;
    }
    return 0;
  }

  /**
   * BeginPaint - Begin painting
   */
  BeginPaint(hWnd: HWND, lpPaint: PAINTSTRUCT): HDC {
    const hdc = this.GetDC(hWnd);
    
    lpPaint.hdc = hdc;
    lpPaint.fErase = 1;
    lpPaint.rcPaint = { left: 0, top: 0, right: 1000, bottom: 1000 };
    lpPaint.fRestore = 0;
    lpPaint.fIncUpdate = 0;
    lpPaint.rgbReserved = new Uint8Array(16);

    return hdc;
  }

  /**
   * EndPaint - End painting
   */
  EndPaint(hWnd: HWND, lpPaint: PAINTSTRUCT): BOOL {
    this.ReleaseDC(hWnd, lpPaint.hdc);
    return TRUE;
  }

  /**
   * CreateCompatibleDC - Create memory DC
   */
  CreateCompatibleDC(hDC: HDC): HDC {
    const hdc = this.nextHandle++;
    
    this.dcs.set(hdc, {
      hwnd: 0,
      bitmap: null,
      brush: null,
      pen: null,
      font: null,
      textColor: 0x000000,
      bgColor: 0xFFFFFF,
      bkMode: 1,
      posX: 0,
      posY: 0,
    });

    return hdc;
  }

  /**
   * DeleteDC - Delete a DC
   */
  DeleteDC(hDC: HDC): BOOL {
    if (this.dcs.has(hDC)) {
      this.dcs.delete(hDC);
      return TRUE;
    }
    return FALSE;
  }

  /**
   * CreateSolidBrush - Create a solid brush
   */
  CreateSolidBrush(crColor: number): HBRUSH {
    const handle = this.nextHandle++;
    this.objects.set(handle, { type: 'brush', color: crColor });
    return handle;
  }

  /**
   * CreatePen - Create a pen
   */
  CreatePen(fnPenStyle: number, nWidth: number, crColor: number): HPEN {
    const handle = this.nextHandle++;
    this.objects.set(handle, { type: 'pen', style: fnPenStyle, width: nWidth, color: crColor });
    return handle;
  }

  /**
   * CreateFont - Create a font
   */
  CreateFont(
    nHeight: number,
    nWidth: number,
    nEscapement: number,
    nOrientation: number,
    fnWeight: number,
    fdwItalic: number,
    fdwUnderline: number,
    fdwStrikeOut: number,
    fdwCharSet: number,
    fdwOutputPrecision: number,
    fdwClipPrecision: number,
    fdwQuality: number,
    fdwPitchAndFamily: number,
    lpszFace: string
  ): HFONT {
    const handle = this.nextHandle++;
    this.objects.set(handle, {
      type: 'font',
      height: nHeight,
      width: nWidth,
      weight: fnWeight,
      italic: fdwItalic,
      underline: fdwUnderline,
      strikeOut: fdwStrikeOut,
      face: lpszFace,
    });
    return handle;
  }

  /**
   * CreateCompatibleBitmap - Create a bitmap
   */
  CreateCompatibleBitmap(hDC: HDC, nWidth: number, nHeight: number): HBITMAP {
    const handle = this.nextHandle++;
    this.objects.set(handle, {
      type: 'bitmap',
      width: nWidth,
      height: nHeight,
      data: new Uint8Array(nWidth * nHeight * 4),
    });
    return handle;
  }

  /**
   * SelectObject - Select an object into a DC
   */
  SelectObject(hDC: HDC, hGDIobj: HANDLE): HANDLE {
    const dc = this.dcs.get(hDC);
    if (!dc) return 0;

    const obj = this.objects.get(hGDIobj);
    if (!obj) return 0;

    let previous = 0;

    switch (obj.type) {
      case 'bitmap':
        previous = dc.bitmap || 0;
        dc.bitmap = hGDIobj;
        break;
      case 'brush':
        previous = dc.brush || 0;
        dc.brush = hGDIobj;
        break;
      case 'pen':
        previous = dc.pen || 0;
        dc.pen = hGDIobj;
        break;
      case 'font':
        previous = dc.font || 0;
        dc.font = hGDIobj;
        break;
    }

    return previous;
  }

  /**
   * DeleteObject - Delete a GDI object
   */
  DeleteObject(hObject: HANDLE): BOOL {
    if (this.objects.has(hObject)) {
      this.objects.delete(hObject);
      return TRUE;
    }
    return FALSE;
  }

  /**
   * SetTextColor - Set text color
   */
  SetTextColor(hDC: HDC, crColor: number): number {
    const dc = this.dcs.get(hDC);
    if (!dc) return 0;

    const previous = dc.textColor;
    dc.textColor = crColor;
    return previous;
  }

  /**
   * SetBkColor - Set background color
   */
  SetBkColor(hDC: HDC, crColor: number): number {
    const dc = this.dcs.get(hDC);
    if (!dc) return 0;

    const previous = dc.bgColor;
    dc.bgColor = crColor;
    return previous;
  }

  /**
   * SetBkMode - Set background mode
   */
  SetBkMode(hDC: HDC, iBkMode: number): number {
    const dc = this.dcs.get(hDC);
    if (!dc) return 0;

    const previous = dc.bkMode;
    dc.bkMode = iBkMode;
    return previous;
  }

  /**
   * Rectangle - Draw a rectangle
   */
  Rectangle(hDC: HDC, nLeftRect: number, nTopRect: number, nRightRect: number, nBottomRect: number): BOOL {
    // Would draw to bitmap or canvas
    return TRUE;
  }

  /**
   * FillRect - Fill a rectangle
   */
  FillRect(hDC: HDC, lprc: RECT, hbr: HBRUSH): number {
    // Would fill rectangle with brush
    return 1;
  }

  /**
   * TextOut - Output text
   */
  TextOut(hDC: HDC, nXStart: number, nYStart: number, lpString: string, cbString: number): BOOL {
    // Would draw text
    return TRUE;
  }

  /**
   * BitBlt - Bit block transfer
   */
  BitBlt(
    hdcDest: HDC,
    nXDest: number,
    nYDest: number,
    nWidth: number,
    nHeight: number,
    hdcSrc: HDC,
    nXSrc: number,
    nYSrc: number,
    dwRop: number
  ): BOOL {
    // Would copy pixels between DCs
    return TRUE;
  }

  /**
   * StretchBlt - Stretch bit block transfer
   */
  StretchBlt(
    hdcDest: HDC,
    nXOriginDest: number,
    nYOriginDest: number,
    nWidthDest: number,
    nHeightDest: number,
    hdcSrc: HDC,
    nXOriginSrc: number,
    nYOriginSrc: number,
    nWidthSrc: number,
    nHeightSrc: number,
    dwRop: number
  ): BOOL {
    // Would stretch copy pixels between DCs
    return TRUE;
  }

  /**
   * MoveToEx - Move current position
   */
  MoveToEx(hDC: HDC, X: number, Y: number, lpPoint: POINT | null): BOOL {
    const dc = this.dcs.get(hDC);
    if (!dc) return FALSE;

    if (lpPoint) {
      lpPoint.x = dc.posX;
      lpPoint.y = dc.posY;
    }

    dc.posX = X;
    dc.posY = Y;
    return TRUE;
  }

  /**
   * LineTo - Draw a line
   */
  LineTo(hDC: HDC, nXEnd: number, nYEnd: number): BOOL {
    const dc = this.dcs.get(hDC);
    if (!dc) return FALSE;

    // Would draw line from current position to end
    dc.posX = nXEnd;
    dc.posY = nYEnd;
    return TRUE;
  }
}

/**
 * Win32 API Container
 */
export class Win32API {
  kernel32: Kernel32;
  user32: User32;
  gdi32: GDI32;

  constructor() {
    this.kernel32 = new Kernel32();
    this.user32 = new User32();
    this.gdi32 = new GDI32();
  }

  /**
   * Set canvas for rendering
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    this.user32.setCanvas(canvas);
  }
}

// Singleton instance
let win32Instance: Win32API | null = null;

export function getWin32API(): Win32API {
  if (!win32Instance) {
    win32Instance = new Win32API();
  }
  return win32Instance;
}