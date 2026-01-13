/**
 * Windows Explorer Shell
 * Complete Windows 11 desktop environment
 * 
 * Components:
 * - Desktop with icons
 * - Taskbar with Start button, running apps, system tray
 * - Start Menu with app launcher and search
 * - File Explorer for browsing file system
 * - Window management (minimize, maximize, close, drag)
 * 
 * Target: Render full desktop in <100ms
 */

import { win32Subsystem } from './win32-subsystem';
import { ntKernelGPU } from './nt-kernel-gpu';

export interface DesktopIcon {
    id: string;
    name: string;
    icon: string;
    x: number;
    y: number;
    executable: string;
}

export interface TaskbarApp {
    id: string;
    name: string;
    icon: string;
    hwnd: number;
    isActive: boolean;
}

export interface StartMenuItem {
    id: string;
    name: string;
    icon: string;
    executable: string;
    category: string;
}

export class ExplorerShell {
    private isInitialized: boolean = false;
    private desktopElement: HTMLElement | null = null;
    private taskbarElement: HTMLElement | null = null;
    private startMenuElement: HTMLElement | null = null;
    
    private desktopIcons: DesktopIcon[] = [];
    private taskbarApps: TaskbarApp[] = [];
    private startMenuItems: StartMenuItem[] = [];
    private isStartMenuOpen: boolean = false;
    
    private wallpaperUrl: string = '/back.mp4'; // Default wallpaper

    /**
     * Initialize Explorer shell
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('[Explorer] Already initialized');
            return;
        }

        const startTime = performance.now();
        console.log('[Explorer] Initializing Windows Explorer shell...');

        // Create desktop
        this.createDesktop();
        
        // Create taskbar
        this.createTaskbar();
        
        // Create Start Menu (hidden initially)
        this.createStartMenu();
        
        // Populate desktop icons
        this.populateDesktopIcons();
        
        // Populate Start Menu
        this.populateStartMenu();
        
        // Set up event listeners
        this.setupEventListeners();

        this.isInitialized = true;
        
        const elapsed = performance.now() - startTime;
        console.log(`[Explorer] Shell initialized in ${elapsed.toFixed(2)}ms (Target: <100ms)`);
    }

    /**
     * Create desktop element
     */
    private createDesktop(): void {
        this.desktopElement = document.createElement('div');
        this.desktopElement.id = 'windows-desktop';
        this.desktopElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: calc(100vh - 48px);
            background: linear-gradient(135deg, #0078d4 0%, #1e3a8a 100%);
            overflow: hidden;
            z-index: 0;
        `;

        // Add wallpaper (video or image)
        const wallpaper = document.createElement('video');
        wallpaper.src = this.wallpaperUrl;
        wallpaper.autoplay = true;
        wallpaper.loop = true;
        wallpaper.muted = true;
        wallpaper.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.3;
            pointer-events: none;
        `;
        this.desktopElement.appendChild(wallpaper);

        // Desktop icon container
        const iconContainer = document.createElement('div');
        iconContainer.id = 'desktop-icons';
        iconContainer.style.cssText = `
            position: absolute;
            top: 16px;
            left: 16px;
            display: grid;
            grid-template-columns: repeat(auto-fill, 96px);
            grid-gap: 16px;
            padding: 8px;
        `;
        this.desktopElement.appendChild(iconContainer);

        document.body.appendChild(this.desktopElement);
    }

    /**
     * Create taskbar element
     */
    private createTaskbar(): void {
        this.taskbarElement = document.createElement('div');
        this.taskbarElement.id = 'windows-taskbar';
        this.taskbarElement.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100vw;
            height: 48px;
            background: rgba(32, 32, 32, 0.85);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            padding: 0 8px;
            z-index: 10000;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        `;

        // Start button
        const startButton = document.createElement('button');
        startButton.id = 'start-button';
        startButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z"/>
            </svg>
        `;
        startButton.style.cssText = `
            width: 48px;
            height: 48px;
            background: transparent;
            border: none;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s;
        `;
        startButton.addEventListener('mouseenter', () => {
            startButton.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        startButton.addEventListener('mouseleave', () => {
            startButton.style.background = 'transparent';
        });
        startButton.addEventListener('click', () => {
            this.toggleStartMenu();
        });
        this.taskbarElement.appendChild(startButton);

        // Search box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search apps, settings, and documents';
        searchBox.style.cssText = `
            flex: 1;
            max-width: 400px;
            height: 32px;
            margin: 0 8px;
            padding: 0 12px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            color: white;
            font-size: 14px;
            outline: none;
        `;
        this.taskbarElement.appendChild(searchBox);

        // Running apps container
        const appsContainer = document.createElement('div');
        appsContainer.id = 'taskbar-apps';
        appsContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 4px;
            flex: 1;
        `;
        this.taskbarElement.appendChild(appsContainer);

        // System tray
        const systemTray = document.createElement('div');
        systemTray.id = 'system-tray';
        systemTray.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 0 8px;
            color: white;
            font-size: 12px;
        `;

        // Clock
        const clock = document.createElement('div');
        clock.id = 'taskbar-clock';
        clock.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            transition: background 0.2s;
        `;
        clock.addEventListener('mouseenter', () => {
            clock.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        clock.addEventListener('mouseleave', () => {
            clock.style.background = 'transparent';
        });
        
        const updateClock = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
            clock.innerHTML = `<div style="font-weight: 500;">${timeStr}</div><div style="font-size: 10px; opacity: 0.8;">${dateStr}</div>`;
        };
        updateClock();
        setInterval(updateClock, 1000);
        
        systemTray.appendChild(clock);
        this.taskbarElement.appendChild(systemTray);

        document.body.appendChild(this.taskbarElement);
    }

    /**
     * Create Start Menu element
     */
    private createStartMenu(): void {
        this.startMenuElement = document.createElement('div');
        this.startMenuElement.id = 'start-menu';
        this.startMenuElement.style.cssText = `
            position: fixed;
            bottom: 56px;
            left: 8px;
            width: 600px;
            height: 600px;
            background: rgba(32, 32, 32, 0.95);
            backdrop-filter: blur(40px);
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
            display: none;
            flex-direction: column;
            overflow: hidden;
            z-index: 20000;
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;

        // Pinned apps section
        const pinnedSection = document.createElement('div');
        pinnedSection.style.cssText = `
            padding: 24px;
            flex: 1;
            overflow-y: auto;
        `;

        const pinnedTitle = document.createElement('div');
        pinnedTitle.textContent = 'Pinned';
        pinnedTitle.style.cssText = `
            color: white;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 16px;
            opacity: 0.7;
        `;
        pinnedSection.appendChild(pinnedTitle);

        const pinnedGrid = document.createElement('div');
        pinnedGrid.id = 'start-menu-pinned';
        pinnedGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 16px;
        `;
        pinnedSection.appendChild(pinnedGrid);

        this.startMenuElement.appendChild(pinnedSection);

        // Power button section
        const powerSection = document.createElement('div');
        powerSection.style.cssText = `
            display: flex;
            justify-content: flex-end;
            padding: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const powerButton = document.createElement('button');
        powerButton.innerHTML = '⏻';
        powerButton.title = 'Power';
        powerButton.style.cssText = `
            width: 40px;
            height: 40px;
            background: transparent;
            border: none;
            color: white;
            font-size: 20px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
        `;
        powerButton.addEventListener('mouseenter', () => {
            powerButton.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        powerButton.addEventListener('mouseleave', () => {
            powerButton.style.background = 'transparent';
        });
        powerSection.appendChild(powerButton);

        this.startMenuElement.appendChild(powerSection);

        document.body.appendChild(this.startMenuElement);
    }

    /**
     * Populate desktop with icons
     */
    private populateDesktopIcons(): void {
        this.desktopIcons = [
            {
                id: 'this-pc',
                name: 'This PC',
                icon: '🖥️',
                x: 16,
                y: 16,
                executable: 'explorer.exe',
            },
            {
                id: 'recycle-bin',
                name: 'Recycle Bin',
                icon: '🗑️',
                x: 16,
                y: 128,
                executable: '',
            },
            {
                id: 'notepad',
                name: 'Notepad',
                icon: '📝',
                x: 16,
                y: 240,
                executable: 'notepad.exe',
            },
            {
                id: 'calculator',
                name: 'Calculator',
                icon: '🔢',
                x: 16,
                y: 352,
                executable: 'calc.exe',
            },
            {
                id: 'minesweeper',
                name: 'Minesweeper',
                icon: '💣',
                x: 16,
                y: 464,
                executable: 'minesweeper.exe',
            },
        ];

        const iconContainer = document.getElementById('desktop-icons');
        if (!iconContainer) return;

        for (const icon of this.desktopIcons) {
            const iconElement = this.createDesktopIcon(icon);
            iconContainer.appendChild(iconElement);
        }
    }

    /**
     * Create desktop icon element
     */
    private createDesktopIcon(icon: DesktopIcon): HTMLElement {
        const element = document.createElement('div');
        element.className = 'desktop-icon';
        element.style.cssText = `
            width: 96px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            padding: 8px;
            border-radius: 4px;
            transition: background 0.2s;
            user-select: none;
        `;

        const iconImage = document.createElement('div');
        iconImage.textContent = icon.icon;
        iconImage.style.cssText = `
            font-size: 48px;
            filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        `;
        element.appendChild(iconImage);

        const iconName = document.createElement('div');
        iconName.textContent = icon.name;
        iconName.style.cssText = `
            color: white;
            font-size: 12px;
            text-align: center;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
            word-wrap: break-word;
            max-width: 100%;
        `;
        element.appendChild(iconName);

        // Hover effect
        element.addEventListener('mouseenter', () => {
            element.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        element.addEventListener('mouseleave', () => {
            element.style.background = 'transparent';
        });

        // Double-click to launch
        let clickCount = 0;
        let clickTimer: number | null = null;
        element.addEventListener('click', () => {
            clickCount++;
            if (clickCount === 1) {
                clickTimer = window.setTimeout(() => {
                    clickCount = 0;
                }, 300);
            } else if (clickCount === 2) {
                if (clickTimer) clearTimeout(clickTimer);
                clickCount = 0;
                this.launchApplication(icon.executable);
            }
        });

        return element;
    }

    /**
     * Populate Start Menu with apps
     */
    private populateStartMenu(): void {
        this.startMenuItems = [
            { id: 'notepad', name: 'Notepad', icon: '📝', executable: 'notepad.exe', category: 'Accessories' },
            { id: 'calc', name: 'Calculator', icon: '🔢', executable: 'calc.exe', category: 'Accessories' },
            { id: 'paint', name: 'Paint', icon: '🎨', executable: 'mspaint.exe', category: 'Accessories' },
            { id: 'explorer', name: 'File Explorer', icon: '📁', executable: 'explorer.exe', category: 'System' },
            { id: 'cmd', name: 'Command Prompt', icon: '⌨️', executable: 'cmd.exe', category: 'System' },
            { id: 'minesweeper', name: 'Minesweeper', icon: '💣', executable: 'minesweeper.exe', category: 'Games' },
            { id: 'solitaire', name: 'Solitaire', icon: '🃏', executable: 'solitaire.exe', category: 'Games' },
            { id: 'settings', name: 'Settings', icon: '⚙️', executable: 'settings.exe', category: 'System' },
        ];

        const pinnedGrid = document.getElementById('start-menu-pinned');
        if (!pinnedGrid) return;

        for (const item of this.startMenuItems) {
            const itemElement = this.createStartMenuItem(item);
            pinnedGrid.appendChild(itemElement);
        }
    }

    /**
     * Create Start Menu item element
     */
    private createStartMenuItem(item: StartMenuItem): HTMLElement {
        const element = document.createElement('div');
        element.className = 'start-menu-item';
        element.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            padding: 16px;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
            user-select: none;
        `;

        const icon = document.createElement('div');
        icon.textContent = item.icon;
        icon.style.cssText = `
            font-size: 32px;
        `;
        element.appendChild(icon);

        const name = document.createElement('div');
        name.textContent = item.name;
        name.style.cssText = `
            color: white;
            font-size: 11px;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        element.appendChild(name);

        element.addEventListener('mouseenter', () => {
            element.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        element.addEventListener('mouseleave', () => {
            element.style.background = 'transparent';
        });
        element.addEventListener('click', () => {
            this.launchApplication(item.executable);
            this.toggleStartMenu();
        });

        return element;
    }

    /**
     * Toggle Start Menu visibility
     */
    private toggleStartMenu(): void {
        if (!this.startMenuElement) return;

        this.isStartMenuOpen = !this.isStartMenuOpen;

        if (this.isStartMenuOpen) {
            this.startMenuElement.style.display = 'flex';
        } else {
            this.startMenuElement.style.display = 'none';
        }
    }

    /**
     * Launch application
     */
    private async launchApplication(executable: string): Promise<void> {
        if (!executable) {
            console.warn('[Explorer] No executable specified');
            return;
        }

        console.log(`[Explorer] Launching application: ${executable}`);

        // Create a simple window for the app
        const hwnd = win32Subsystem.CreateWindowExA(
            0, // exStyle
            'DefaultWindowClass', // className
            executable, // windowName
            0x00CF0000, // style (WS_OVERLAPPEDWINDOW)
            100, // x
            100, // y
            800, // width
            600, // height
            0, // parent
            0, // menu
            0x400000, // instance
            0 // param
        );

        if (hwnd) {
            win32Subsystem.ShowWindow(hwnd, 1); // SW_SHOWNORMAL
            win32Subsystem.UpdateWindow(hwnd);

            // Add to taskbar
            this.addToTaskbar({
                id: `app-${hwnd}`,
                name: executable,
                icon: this.getIconForExecutable(executable),
                hwnd,
                isActive: true,
            });

            console.log(`[Explorer] Launched ${executable} with HWND: ${hwnd}`);
        } else {
            console.error(`[Explorer] Failed to launch ${executable}`);
        }
    }

    /**
     * Get icon for executable
     */
    private getIconForExecutable(executable: string): string {
        const iconMap: Record<string, string> = {
            'notepad.exe': '📝',
            'calc.exe': '🔢',
            'mspaint.exe': '🎨',
            'explorer.exe': '📁',
            'cmd.exe': '⌨️',
            'minesweeper.exe': '💣',
            'solitaire.exe': '🃏',
            'settings.exe': '⚙️',
        };
        return iconMap[executable] || '📄';
    }

    /**
     * Add app to taskbar
     */
    private addToTaskbar(app: TaskbarApp): void {
        this.taskbarApps.push(app);

        const appsContainer = document.getElementById('taskbar-apps');
        if (!appsContainer) return;

        const appButton = document.createElement('button');
        appButton.id = `taskbar-app-${app.id}`;
        appButton.innerHTML = `<span style="font-size: 20px;">${app.icon}</span>`;
        appButton.title = app.name;
        appButton.style.cssText = `
            width: 48px;
            height: 48px;
            background: ${app.isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent'};
            border: none;
            border-bottom: ${app.isActive ? '2px solid #0078d4' : '2px solid transparent'};
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        `;

        appButton.addEventListener('mouseenter', () => {
            appButton.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        appButton.addEventListener('mouseleave', () => {
            appButton.style.background = app.isActive ? 'rgba(255, 255, 255, 0.1)' : 'transparent';
        });
        appButton.addEventListener('click', () => {
            // Focus or minimize window
            const window = win32Subsystem.getWindow(app.hwnd);
            if (window) {
                if (window.visible) {
                    win32Subsystem.ShowWindow(app.hwnd, 6); // SW_MINIMIZE
                } else {
                    win32Subsystem.ShowWindow(app.hwnd, 9); // SW_RESTORE
                }
            }
        });

        appsContainer.appendChild(appButton);
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Close Start Menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.startMenuElement || !this.isStartMenuOpen) return;

            const startButton = document.getElementById('start-button');
            if (
                !this.startMenuElement.contains(e.target as Node) &&
                !startButton?.contains(e.target as Node)
            ) {
                this.toggleStartMenu();
            }
        });

        // Desktop right-click context menu (placeholder)
        this.desktopElement?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            console.log('[Explorer] Desktop context menu (not implemented)');
        });
    }

    /**
     * Shutdown shell
     */
    shutdown(): void {
        console.log('[Explorer] Shutting down Explorer shell...');

        this.desktopElement?.remove();
        this.taskbarElement?.remove();
        this.startMenuElement?.remove();

        this.desktopIcons = [];
        this.taskbarApps = [];
        this.startMenuItems = [];
        this.isInitialized = false;

        console.log('[Explorer] Explorer shell shutdown complete.');
    }

    /**
     * Get initialization status
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}

export const explorerShell = new ExplorerShell();
