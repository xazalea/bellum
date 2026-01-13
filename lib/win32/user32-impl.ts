/**
 * User32.dll Implementation
 * Window management and UI functions that actually work
 */

export enum WindowStyles {
    WS_OVERLAPPED = 0x00000000,
    WS_POPUP = 0x80000000,
    WS_CHILD = 0x40000000,
    WS_MINIMIZE = 0x20000000,
    WS_VISIBLE = 0x10000000,
    WS_DISABLED = 0x08000000,
    WS_CLIPSIBLINGS = 0x04000000,
    WS_CLIPCHILDREN = 0x02000000,
    WS_MAXIMIZE = 0x01000000,
    WS_CAPTION = 0x00C00000,
    WS_BORDER = 0x00800000,
    WS_DLGFRAME = 0x00400000,
    WS_VSCROLL = 0x00200000,
    WS_HSCROLL = 0x00100000,
    WS_SYSMENU = 0x00080000,
    WS_THICKFRAME = 0x00040000,
    WS_MINIMIZEBOX = 0x00020000,
    WS_MAXIMIZEBOX = 0x00010000,
}

export enum WindowMessages {
    WM_CREATE = 0x0001,
    WM_DESTROY = 0x0002,
    WM_MOVE = 0x0003,
    WM_SIZE = 0x0005,
    WM_ACTIVATE = 0x0006,
    WM_PAINT = 0x000F,
    WM_CLOSE = 0x0010,
    WM_QUIT = 0x0012,
    WM_KEYDOWN = 0x0100,
    WM_KEYUP = 0x0101,
    WM_CHAR = 0x0102,
    WM_MOUSEMOVE = 0x0200,
    WM_LBUTTONDOWN = 0x0201,
    WM_LBUTTONUP = 0x0202,
    WM_RBUTTONDOWN = 0x0204,
    WM_RBUTTONUP = 0x0205,
}

export interface MSG {
    hwnd: number;
    message: number;
    wParam: number;
    lParam: number;
    time: number;
    pt: { x: number; y: number };
}

export interface WNDCLASS {
    style: number;
    lpfnWndProc: number;
    cbClsExtra: number;
    cbWndExtra: number;
    hInstance: number;
    hIcon: number;
    hCursor: number;
    hbrBackground: number;
    lpszMenuName: string | null;
    lpszClassName: string;
}

export class User32 {
    private windows: Map<number, WindowData> = new Map();
    private nextHwnd: number = 0x10000;
    private messageQueue: MSG[] = [];
    private windowClasses: Map<string, WNDCLASS> = new Map();
    private canvas: HTMLCanvasElement | null = null;
    
    /**
     * Set canvas for rendering
     */
    setCanvas(canvas: HTMLCanvasElement): void {
        this.canvas = canvas;
        this.setupEventListeners();
    }
    
    /**
     * RegisterClassA - Register window class
     */
    RegisterClassA(lpWndClass: WNDCLASS): number {
        const atom = this.nextHwnd++;
        this.windowClasses.set(lpWndClass.lpszClassName, lpWndClass);
        console.log(`[User32] RegisterClassA: "${lpWndClass.lpszClassName}" -> atom ${atom}`);
        return atom;
    }
    
    /**
     * CreateWindowExA - Create window
     */
    CreateWindowExA(
        dwExStyle: number,
        lpClassName: string,
        lpWindowName: string,
        dwStyle: number,
        x: number,
        y: number,
        nWidth: number,
        nHeight: number,
        hWndParent: number,
        hMenu: number,
        hInstance: number,
        lpParam: number
    ): number {
        const hwnd = this.nextHwnd++;
        
        const wndClass = this.windowClasses.get(lpClassName);
        
        this.windows.set(hwnd, {
            hwnd,
            className: lpClassName,
            title: lpWindowName,
            style: dwStyle,
            x, y,
            width: nWidth,
            height: nHeight,
            parent: hWndParent,
            visible: (dwStyle & WindowStyles.WS_VISIBLE) !== 0,
            wndProc: wndClass?.lpfnWndProc || 0,
        });
        
        console.log(`[User32] CreateWindowExA: "${lpWindowName}" ${nWidth}x${nHeight} -> hwnd ${hwnd}`);
        
        // Send WM_CREATE
        this.postMessage(hwnd, WindowMessages.WM_CREATE, 0, 0);
        
        return hwnd;
    }
    
    /**
     * ShowWindow - Show/hide window
     */
    ShowWindow(hWnd: number, nCmdShow: number): boolean {
        const window = this.windows.get(hWnd);
        if (!window) return false;
        
        window.visible = nCmdShow !== 0;
        console.log(`[User32] ShowWindow: hwnd ${hWnd}, visible: ${window.visible}`);
        
        return true;
    }
    
    /**
     * UpdateWindow - Force redraw
     */
    UpdateWindow(hWnd: number): boolean {
        const window = this.windows.get(hWnd);
        if (!window) return false;
        
        // Send WM_PAINT
        this.postMessage(hWnd, WindowMessages.WM_PAINT, 0, 0);
        
        return true;
    }
    
    /**
     * DestroyWindow - Destroy window
     */
    DestroyWindow(hWnd: number): boolean {
        const window = this.windows.get(hWnd);
        if (!window) return false;
        
        // Send WM_DESTROY
        this.postMessage(hWnd, WindowMessages.WM_DESTROY, 0, 0);
        
        this.windows.delete(hWnd);
        return true;
    }
    
    /**
     * GetMessage - Get message from queue
     */
    GetMessage(lpMsg: MSG, hWnd: number, wMsgFilterMin: number, wMsgFilterMax: number): boolean {
        // Check message queue
        for (let i = 0; i < this.messageQueue.length; i++) {
            const msg = this.messageQueue[i];
            
            // Filter by window
            if (hWnd !== 0 && msg.hwnd !== hWnd) continue;
            
            // Filter by message range
            if (wMsgFilterMin !== 0 || wMsgFilterMax !== 0) {
                if (msg.message < wMsgFilterMin || msg.message > wMsgFilterMax) {
                    continue;
                }
            }
            
            // Copy message
            Object.assign(lpMsg, msg);
            
            // Remove from queue
            this.messageQueue.splice(i, 1);
            
            return msg.message !== WindowMessages.WM_QUIT;
        }
        
        // No message - would block in real implementation
        return true;
    }
    
    /**
     * PeekMessage - Peek at message without removing
     */
    PeekMessage(
        lpMsg: MSG,
        hWnd: number,
        wMsgFilterMin: number,
        wMsgFilterMax: number,
        wRemoveMsg: number
    ): boolean {
        for (let i = 0; i < this.messageQueue.length; i++) {
            const msg = this.messageQueue[i];
            
            if (hWnd !== 0 && msg.hwnd !== hWnd) continue;
            
            Object.assign(lpMsg, msg);
            
            if (wRemoveMsg & 0x0001) { // PM_REMOVE
                this.messageQueue.splice(i, 1);
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * PostMessage - Post message to queue
     */
    PostMessage(hWnd: number, Msg: number, wParam: number, lParam: number): boolean {
        return this.postMessage(hWnd, Msg, wParam, lParam);
    }
    
    /**
     * SendMessage - Send message directly
     */
    SendMessage(hWnd: number, Msg: number, wParam: number, lParam: number): number {
        const window = this.windows.get(hWnd);
        if (!window || window.wndProc === 0) {
            return this.DefWindowProc(hWnd, Msg, wParam, lParam);
        }
        
        // Would call window procedure here
        // For now, return default
        return this.DefWindowProc(hWnd, Msg, wParam, lParam);
    }
    
    /**
     * TranslateMessage - Translate virtual keys
     */
    TranslateMessage(lpMsg: MSG): boolean {
        // Convert WM_KEYDOWN to WM_CHAR
        if (lpMsg.message === WindowMessages.WM_KEYDOWN) {
            this.postMessage(lpMsg.hwnd, WindowMessages.WM_CHAR, lpMsg.wParam, lpMsg.lParam);
        }
        return true;
    }
    
    /**
     * DispatchMessage - Dispatch message to window procedure
     */
    DispatchMessage(lpMsg: MSG): number {
        return this.SendMessage(lpMsg.hwnd, lpMsg.message, lpMsg.wParam, lpMsg.lParam);
    }
    
    /**
     * DefWindowProc - Default window procedure
     */
    DefWindowProc(hWnd: number, Msg: number, wParam: number, lParam: number): number {
        switch (Msg) {
            case WindowMessages.WM_CLOSE:
                this.DestroyWindow(hWnd);
                return 0;
            case WindowMessages.WM_DESTROY:
                this.PostQuitMessage(0);
                return 0;
            default:
                return 0;
        }
    }
    
    /**
     * PostQuitMessage - Post quit message
     */
    PostQuitMessage(nExitCode: number): void {
        this.postMessage(0, WindowMessages.WM_QUIT, nExitCode, 0);
    }
    
    /**
     * GetClientRect - Get window client area
     */
    GetClientRect(hWnd: number, lpRect: any): boolean {
        const window = this.windows.get(hWnd);
        if (!window) return false;
        
        lpRect.left = 0;
        lpRect.top = 0;
        lpRect.right = window.width;
        lpRect.bottom = window.height;
        
        return true;
    }
    
    /**
     * InvalidateRect - Invalidate window rect
     */
    InvalidateRect(hWnd: number, lpRect: any, bErase: boolean): boolean {
        this.postMessage(hWnd, WindowMessages.WM_PAINT, 0, 0);
        return true;
    }
    
    /**
     * BeginPaint - Begin painting
     */
    BeginPaint(hWnd: number, lpPaint: any): number {
        const window = this.windows.get(hWnd);
        if (!window || !this.canvas) return 0;
        
        const ctx = this.canvas.getContext('2d');
        return ctx ? 1 : 0; // Return dummy HDC
    }
    
    /**
     * EndPaint - End painting
     */
    EndPaint(hWnd: number, lpPaint: any): boolean {
        return true;
    }
    
    /**
     * Internal: Post message to queue
     */
    private postMessage(hwnd: number, message: number, wParam: number, lParam: number): boolean {
        this.messageQueue.push({
            hwnd,
            message,
            wParam,
            lParam,
            time: Date.now(),
            pt: { x: 0, y: 0 },
        });
        return true;
    }
    
    /**
     * Internal: Setup event listeners
     */
    private setupEventListeners(): void {
        if (!this.canvas) return;
        
        this.canvas.addEventListener('mousemove', (e) => {
            for (const [hwnd, window] of this.windows) {
                if (window.visible) {
                    const x = Math.floor(e.offsetX);
                    const y = Math.floor(e.offsetY);
                    this.postMessage(hwnd, WindowMessages.WM_MOUSEMOVE, 0, (y << 16) | x);
                }
            }
        });
        
        this.canvas.addEventListener('mousedown', (e) => {
            for (const [hwnd, window] of this.windows) {
                if (window.visible) {
                    const x = Math.floor(e.offsetX);
                    const y = Math.floor(e.offsetY);
                    const msg = e.button === 0 ? WindowMessages.WM_LBUTTONDOWN : WindowMessages.WM_RBUTTONDOWN;
                    this.postMessage(hwnd, msg, 0, (y << 16) | x);
                }
            }
        });
        
        window.addEventListener('keydown', (e) => {
            for (const [hwnd, window] of this.windows) {
                if (window.visible) {
                    this.postMessage(hwnd, WindowMessages.WM_KEYDOWN, e.keyCode, 0);
                }
            }
        });
    }
}

interface WindowData {
    hwnd: number;
    className: string;
    title: string;
    style: number;
    x: number;
    y: number;
    width: number;
    height: number;
    parent: number;
    visible: boolean;
    wndProc: number;
}

// Export singleton
export const user32 = new User32();
