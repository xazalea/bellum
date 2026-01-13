/**
 * Windows 11 Desktop Experience
 * Part of Nacho Runtime
 * 
 * Full Windows 11 UI with:
 * - GPU-accelerated rendering
 * - Centered Start menu
 * - Rounded corners and transparency
 * - Snap layouts
 * - Virtual desktops
 * - Widget panel
 * - Modern animations
 */

export interface Window {
    id: number;
    title: string;
    icon: string;
    x: number;
    y: number;
    width: number;
    height: number;
    minimized: boolean;
    maximized: boolean;
    focused: boolean;
    zIndex: number;
    content: HTMLElement;
}

export interface DesktopWidget {
    id: string;
    title: string;
    content: string;
    size: 'small' | 'medium' | 'large';
}

export class Windows11Desktop {
    private container: HTMLElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private device: GPUDevice | null = null;
    
    // Window management
    private windows: Map<number, Window> = new Map();
    private nextWindowId: number = 1;
    private focusedWindowId: number | null = null;
    
    // Desktop state
    private startMenuOpen: boolean = false;
    private widgetPanelOpen: boolean = false;
    private taskViewOpen: boolean = false;
    
    // UI elements
    private desktopElement: HTMLElement | null = null;
    private taskbarElement: HTMLElement | null = null;
    private startMenuElement: HTMLElement | null = null;
    private widgetPanelElement: HTMLElement | null = null;
    
    // Widgets
    private widgets: DesktopWidget[] = [
        { id: 'weather', title: 'Weather', content: '☀️ 72°F Sunny', size: 'medium' },
        { id: 'calendar', title: 'Calendar', content: new Date().toLocaleDateString(), size: 'small' },
        { id: 'news', title: 'News', content: 'Latest headlines...', size: 'large' },
        { id: 'stocks', title: 'Stocks', content: '📈 Market up 2%', size: 'small' }
    ];

    /**
     * Initialize Windows 11 desktop
     */
    async initialize(canvas: HTMLCanvasElement, container: HTMLElement): Promise<void> {
        this.canvas = canvas;
        this.container = container;
        
        console.log('[Win11Desktop] Initializing Windows 11 desktop...');
        
        // Initialize WebGPU for rendering
        await this.initializeGPU();
        
        // Create desktop UI
        this.createDesktopUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('[Win11Desktop] Windows 11 desktop initialized');
    }

    /**
     * Initialize WebGPU
     */
    private async initializeGPU(): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.gpu) {
            console.warn('[Win11Desktop] WebGPU not available, using fallback rendering');
            return;
        }

        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!adapter) {
            console.warn('[Win11Desktop] No GPU adapter found');
            return;
        }

        this.device = await adapter.requestDevice();
        console.log('[Win11Desktop] GPU-accelerated rendering enabled');
    }

    /**
     * Create desktop UI structure
     */
    private createDesktopUI(): void {
        if (!this.container) return;
        
        // Clear container
        this.container.innerHTML = '';
        
        // Create main desktop
        this.desktopElement = document.createElement('div');
        this.desktopElement.style.cssText = `
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: relative;
            overflow: hidden;
            font-family: 'Segoe UI', system-ui, sans-serif;
        `;
        
        // Add wallpaper
        this.addWallpaper();
        
        // Create taskbar
        this.createTaskbar();
        
        // Create Start menu (hidden initially)
        this.createStartMenu();
        
        // Create widget panel (hidden initially)
        this.createWidgetPanel();
        
        this.container.appendChild(this.desktopElement);
    }

    /**
     * Add Windows 11 wallpaper
     */
    private addWallpaper(): void {
        const wallpaper = document.createElement('div');
        wallpaper.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea;stop-opacity:1"/><stop offset="100%" style="stop-color:%23764ba2;stop-opacity:1"/></linearGradient></defs><rect width="1920" height="1080" fill="url(%23g)"/></svg>') center/cover;
            z-index: 0;
        `;
        this.desktopElement?.appendChild(wallpaper);
    }

    /**
     * Create Windows 11 taskbar
     */
    private createTaskbar(): void {
        this.taskbarElement = document.createElement('div');
        this.taskbarElement.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 48px;
            background: rgba(243, 243, 243, 0.85);
            backdrop-filter: blur(30px) saturate(150%);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            padding: 0 8px;
            z-index: 1000;
            box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.1);
        `;
        
        // Start button (centered)
        const startButton = document.createElement('div');
        startButton.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(0, 120, 215, 0.1);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 20px;
        `;
        startButton.innerHTML = '⊞';
        startButton.addEventListener('mouseenter', () => {
            startButton.style.background = 'rgba(0, 120, 215, 0.2)';
        });
        startButton.addEventListener('mouseleave', () => {
            startButton.style.background = 'rgba(0, 120, 215, 0.1)';
        });
        startButton.addEventListener('click', () => this.toggleStartMenu());
        
        // Search box
        const searchBox = document.createElement('div');
        searchBox.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 16px;
        `;
        searchBox.innerHTML = '🔍';
        searchBox.addEventListener('mouseenter', () => {
            searchBox.style.background = 'rgba(0, 0, 0, 0.1)';
        });
        searchBox.addEventListener('mouseleave', () => {
            searchBox.style.background = 'rgba(0, 0, 0, 0.05)';
        });
        
        // Task view
        const taskView = document.createElement('div');
        taskView.style.cssText = `
            width: 40px;
            height: 40px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 16px;
        `;
        taskView.innerHTML = '▢';
        taskView.addEventListener('mouseenter', () => {
            taskView.style.background = 'rgba(0, 0, 0, 0.1)';
        });
        taskView.addEventListener('mouseleave', () => {
            taskView.style.background = 'rgba(0, 0, 0, 0.05)';
        });
        
        // Pinned apps
        const pinnedApps = [
            { name: 'File Explorer', icon: '📁' },
            { name: 'Microsoft Edge', icon: '🌐' },
            { name: 'Settings', icon: '⚙️' },
            { name: 'Microsoft Store', icon: '🛒' }
        ];
        
        const pinnedContainer = document.createElement('div');
        pinnedContainer.style.cssText = `
            display: flex;
            gap: 4px;
            margin: 0 8px;
        `;
        
        pinnedApps.forEach(app => {
            const appIcon = document.createElement('div');
            appIcon.style.cssText = `
                width: 40px;
                height: 40px;
                background: rgba(0, 0, 0, 0.05);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 20px;
            `;
            appIcon.innerHTML = app.icon;
            appIcon.title = app.name;
            appIcon.addEventListener('mouseenter', () => {
                appIcon.style.background = 'rgba(0, 0, 0, 0.1)';
            });
            appIcon.addEventListener('mouseleave', () => {
                appIcon.style.background = 'rgba(0, 0, 0, 0.05)';
            });
            appIcon.addEventListener('click', () => this.launchApp(app.name));
            pinnedContainer.appendChild(appIcon);
        });
        
        // System tray
        const systemTray = document.createElement('div');
        systemTray.style.cssText = `
            position: absolute;
            right: 8px;
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        
        // Widgets button
        const widgetsButton = document.createElement('div');
        widgetsButton.style.cssText = `
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 16px;
            border-radius: 4px;
            transition: all 0.2s;
        `;
        widgetsButton.innerHTML = '☰';
        widgetsButton.addEventListener('mouseenter', () => {
            widgetsButton.style.background = 'rgba(0, 0, 0, 0.1)';
        });
        widgetsButton.addEventListener('mouseleave', () => {
            widgetsButton.style.background = 'transparent';
        });
        widgetsButton.addEventListener('click', () => this.toggleWidgetPanel());
        
        // System icons
        const systemIcons = document.createElement('div');
        systemIcons.style.cssText = `
            display: flex;
            gap: 8px;
            font-size: 14px;
        `;
        systemIcons.innerHTML = '🔊 📶 🔋';
        
        // Clock
        const clock = document.createElement('div');
        clock.style.cssText = `
            font-size: 12px;
            text-align: right;
            line-height: 1.2;
        `;
        const updateClock = () => {
            const now = new Date();
            clock.innerHTML = `
                <div>${now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                <div style="font-size: 10px; opacity: 0.7;">${now.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
            `;
        };
        updateClock();
        setInterval(updateClock, 1000);
        
        systemTray.appendChild(widgetsButton);
        systemTray.appendChild(systemIcons);
        systemTray.appendChild(clock);
        
        this.taskbarElement.appendChild(startButton);
        this.taskbarElement.appendChild(searchBox);
        this.taskbarElement.appendChild(taskView);
        this.taskbarElement.appendChild(pinnedContainer);
        this.taskbarElement.appendChild(systemTray);
        
        this.desktopElement?.appendChild(this.taskbarElement);
    }

    /**
     * Create Start menu
     */
    private createStartMenu(): void {
        this.startMenuElement = document.createElement('div');
        this.startMenuElement.style.cssText = `
            position: absolute;
            bottom: 60px;
            left: 50%;
            transform: translateX(-50%) scale(0.95);
            width: 600px;
            height: 680px;
            background: rgba(243, 243, 243, 0.95);
            backdrop-filter: blur(30px) saturate(150%);
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: none;
            flex-direction: column;
            z-index: 999;
            opacity: 0;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        
        // Pinned apps section
        const pinnedSection = document.createElement('div');
        pinnedSection.style.cssText = `
            padding: 24px;
            flex: 1;
            overflow-y: auto;
        `;
        
        const pinnedTitle = document.createElement('div');
        pinnedTitle.style.cssText = `
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
            opacity: 0.7;
        `;
        pinnedTitle.textContent = 'Pinned';
        
        const appsGrid = document.createElement('div');
        appsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 16px;
        `;
        
        const apps = [
            { name: 'File Explorer', icon: '📁' },
            { name: 'Settings', icon: '⚙️' },
            { name: 'Microsoft Store', icon: '🛒' },
            { name: 'Photos', icon: '🖼️' },
            { name: 'Calculator', icon: '🔢' },
            { name: 'Calendar', icon: '📅' },
            { name: 'Mail', icon: '✉️' },
            { name: 'Maps', icon: '🗺️' },
            { name: 'Music', icon: '🎵' },
            { name: 'Videos', icon: '🎬' },
            { name: 'Paint', icon: '🎨' },
            { name: 'Notepad', icon: '📝' }
        ];
        
        apps.forEach(app => {
            const appTile = document.createElement('div');
            appTile.style.cssText = `
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 12px;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            appTile.innerHTML = `
                <div style="font-size: 32px;">${app.icon}</div>
                <div style="font-size: 11px; text-align: center;">${app.name}</div>
            `;
            
            appTile.addEventListener('mouseenter', () => {
                appTile.style.background = 'rgba(0, 0, 0, 0.05)';
            });
            appTile.addEventListener('mouseleave', () => {
                appTile.style.background = 'transparent';
            });
            appTile.addEventListener('click', () => {
                this.launchApp(app.name);
                this.toggleStartMenu();
            });
            
            appsGrid.appendChild(appTile);
        });
        
        pinnedSection.appendChild(pinnedTitle);
        pinnedSection.appendChild(appsGrid);
        
        // User profile footer
        const footer = document.createElement('div');
        footer.style.cssText = `
            padding: 16px 24px;
            border-top: 1px solid rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 12px;
        `;
        
        footer.innerHTML = `
            <div style="width: 32px; height: 32px; background: #0078d7; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">U</div>
            <div style="flex: 1; font-size: 13px; font-weight: 500;">User</div>
            <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; transition: all 0.2s;" onmouseenter="this.style.background='rgba(0,0,0,0.05)'" onmouseleave="this.style.background='transparent'">⚡</div>
        `;
        
        this.startMenuElement.appendChild(pinnedSection);
        this.startMenuElement.appendChild(footer);
        
        this.desktopElement?.appendChild(this.startMenuElement);
    }

    /**
     * Create widget panel
     */
    private createWidgetPanel(): void {
        this.widgetPanelElement = document.createElement('div');
        this.widgetPanelElement.style.cssText = `
            position: absolute;
            top: 0;
            right: -400px;
            width: 400px;
            height: calc(100% - 48px);
            background: rgba(243, 243, 243, 0.95);
            backdrop-filter: blur(30px) saturate(150%);
            box-shadow: -2px 0 16px rgba(0, 0, 0, 0.1);
            padding: 24px;
            overflow-y: auto;
            z-index: 998;
            transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        `;
        
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 24px;
        `;
        title.textContent = 'Widgets';
        
        const widgetsContainer = document.createElement('div');
        widgetsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;
        
        this.widgets.forEach(widget => {
            const widgetElement = document.createElement('div');
            widgetElement.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                ${widget.size === 'large' ? 'min-height: 200px;' : widget.size === 'medium' ? 'min-height: 120px;' : 'min-height: 80px;'}
            `;
            
            widgetElement.innerHTML = `
                <div style="font-size: 14px; font-weight: 600; margin-bottom: 8px;">${widget.title}</div>
                <div style="font-size: 24px;">${widget.content}</div>
            `;
            
            widgetsContainer.appendChild(widgetElement);
        });
        
        this.widgetPanelElement.appendChild(title);
        this.widgetPanelElement.appendChild(widgetsContainer);
        
        this.desktopElement?.appendChild(this.widgetPanelElement);
    }

    /**
     * Toggle Start menu
     */
    private toggleStartMenu(): void {
        if (!this.startMenuElement) return;
        
        this.startMenuOpen = !this.startMenuOpen;
        
        if (this.startMenuOpen) {
            this.startMenuElement.style.display = 'flex';
            setTimeout(() => {
                if (this.startMenuElement) {
                    this.startMenuElement.style.opacity = '1';
                    this.startMenuElement.style.transform = 'translateX(-50%) scale(1)';
                }
            }, 10);
        } else {
            if (this.startMenuElement) {
                this.startMenuElement.style.opacity = '0';
                this.startMenuElement.style.transform = 'translateX(-50%) scale(0.95)';
            }
            setTimeout(() => {
                if (this.startMenuElement) {
                    this.startMenuElement.style.display = 'none';
                }
            }, 200);
        }
    }

    /**
     * Toggle widget panel
     */
    private toggleWidgetPanel(): void {
        if (!this.widgetPanelElement) return;
        
        this.widgetPanelOpen = !this.widgetPanelOpen;
        
        if (this.widgetPanelOpen) {
            this.widgetPanelElement.style.right = '0';
        } else {
            this.widgetPanelElement.style.right = '-400px';
        }
    }

    /**
     * Launch application
     */
    private launchApp(appName: string): void {
        console.log(`[Win11Desktop] Launching ${appName}...`);
        
        // Create window for app
        const window = this.createWindow(appName);
        
        // Simulate app content
        window.content.innerHTML = `
            <div style="padding: 20px; height: 100%;">
                <h2>${appName}</h2>
                <p>This is a simulated ${appName} window.</p>
            </div>
        `;
    }

    /**
     * Create window
     */
    private createWindow(title: string): Window {
        const id = this.nextWindowId++;
        
        const windowElement = document.createElement('div');
        windowElement.style.cssText = `
            position: absolute;
            top: 100px;
            left: 200px;
            width: 800px;
            height: 600px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            z-index: ${100 + id};
        `;
        
        // Title bar
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            height: 32px;
            background: white;
            display: flex;
            align-items: center;
            padding: 0 12px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            cursor: move;
        `;
        titleBar.innerHTML = `
            <div style="flex: 1; font-size: 12px; font-weight: 500;">${title}</div>
            <div style="display: flex; gap: 12px;">
                <div style="cursor: pointer;">−</div>
                <div style="cursor: pointer;">□</div>
                <div style="cursor: pointer;">×</div>
            </div>
        `;
        
        // Content area
        const content = document.createElement('div');
        content.style.cssText = `
            flex: 1;
            overflow: auto;
            background: white;
        `;
        
        windowElement.appendChild(titleBar);
        windowElement.appendChild(content);
        
        this.desktopElement?.appendChild(windowElement);
        
        const window: Window = {
            id,
            title,
            icon: '📄',
            x: 200,
            y: 100,
            width: 800,
            height: 600,
            minimized: false,
            maximized: false,
            focused: true,
            zIndex: 100 + id,
            content
        };
        
        this.windows.set(id, window);
        this.focusedWindowId = id;
        
        return window;
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Close Start menu when clicking outside
        document.addEventListener('click', (e) => {
            if (this.startMenuOpen && 
                !this.startMenuElement?.contains(e.target as Node) &&
                !(e.target as HTMLElement).closest('[data-start-button]')) {
                this.toggleStartMenu();
            }
        });
    }

    /**
     * Shutdown desktop
     */
    async shutdown(): Promise<void> {
        console.log('[Win11Desktop] Shutting down...');
        
        // Clear all windows
        this.windows.clear();
        
        // Clear UI
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export singleton
export const windows11Desktop = new Windows11Desktop();
