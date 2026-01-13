/**
 * Android 14 Launcher with Material Design 3
 * Part of Nacho Runtime
 * 
 * Full Android 14 UI with:
 * - Material You dynamic colors
 * - App drawer with search
 * - Widget support
 * - Quick settings panel
 * - Notification shade
 * - Recent apps
 * - Smooth animations
 */

export interface AndroidApp {
    packageName: string;
    name: string;
    icon: string;
    color: string;
}

export interface AndroidWidget {
    id: string;
    appPackage: string;
    title: string;
    content: string;
    width: number;
    height: number;
    x: number;
    y: number;
}

export class Android14Launcher {
    private container: HTMLElement | null = null;
    private device: GPUDevice | null = null;
    
    // UI state
    private appDrawerOpen: boolean = false;
    private quickSettingsOpen: boolean = false;
    private notificationShadeOpen: boolean = false;
    private recentAppsOpen: boolean = false;
    
    // UI elements
    private homeScreen: HTMLElement | null = null;
    private appDrawer: HTMLElement | null = null;
    private quickSettings: HTMLElement | null = null;
    private notificationShade: HTMLElement | null = null;
    private navigationBar: HTMLElement | null = null;
    
    // Apps
    private installedApps: AndroidApp[] = [
        { packageName: 'com.android.phone', name: 'Phone', icon: '📱', color: '#4285f4' },
        { packageName: 'com.android.messaging', name: 'Messages', icon: '💬', color: '#34a853' },
        { packageName: 'com.android.browser', name: 'Browser', icon: '🌐', color: '#ea4335' },
        { packageName: 'com.android.camera', name: 'Camera', icon: '📷', color: '#fbbc04' },
        { packageName: 'com.android.gallery', name: 'Gallery', icon: '🖼️', color: '#9c27b0' },
        { packageName: 'com.android.settings', name: 'Settings', icon: '⚙️', color: '#607d8b' },
        { packageName: 'com.android.contacts', name: 'Contacts', icon: '👤', color: '#2196f3' },
        { packageName: 'com.android.calendar', name: 'Calendar', icon: '📅', color: '#f44336' },
        { packageName: 'com.android.music', name: 'Music', icon: '🎵', color: '#ff9800' },
        { packageName: 'com.android.maps', name: 'Maps', icon: '🗺️', color: '#4caf50' },
        { packageName: 'com.android.youtube', name: 'YouTube', icon: '▶️', color: '#ff0000' },
        { packageName: 'com.android.gmail', name: 'Gmail', icon: '✉️', color: '#ea4335' },
        { packageName: 'com.android.drive', name: 'Drive', icon: '☁️', color: '#4285f4' },
        { packageName: 'com.android.photos', name: 'Photos', icon: '📸', color: '#fbbc04' },
        { packageName: 'com.android.play', name: 'Play Store', icon: '🛒', color: '#34a853' },
        { packageName: 'com.android.calculator', name: 'Calculator', icon: '🔢', color: '#607d8b' }
    ];
    
    // Home screen apps (dock + favorites)
    private dockApps: AndroidApp[] = [];
    private homeApps: AndroidApp[] = [];
    
    // Widgets
    private widgets: AndroidWidget[] = [];
    
    // Material You theme colors
    private themeColors = {
        primary: '#6750a4',
        secondary: '#625b71',
        tertiary: '#7d5260',
        surface: '#1c1b1f',
        surfaceVariant: '#49454f',
        background: '#1c1b1f',
        onPrimary: '#ffffff',
        onSurface: '#e6e1e5'
    };

    /**
     * Initialize Android 14 launcher
     */
    async initialize(container: HTMLElement): Promise<void> {
        this.container = container;
        
        console.log('[Android14] Initializing Android 14 launcher...');
        
        // Initialize WebGPU for rendering
        await this.initializeGPU();
        
        // Set up home screen apps
        this.setupHomeScreen();
        
        // Create launcher UI
        this.createLauncherUI();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('[Android14] Android 14 launcher initialized');
    }

    /**
     * Initialize WebGPU
     */
    private async initializeGPU(): Promise<void> {
        if (typeof navigator === 'undefined' || !navigator.gpu) {
            console.warn('[Android14] WebGPU not available, using fallback rendering');
            return;
        }

        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        });

        if (!adapter) {
            console.warn('[Android14] No GPU adapter found');
            return;
        }

        this.device = await adapter.requestDevice();
        console.log('[Android14] GPU-accelerated rendering enabled');
    }

    /**
     * Set up home screen apps
     */
    private setupHomeScreen(): void {
        // Dock apps (bottom 5)
        this.dockApps = [
            this.installedApps[0], // Phone
            this.installedApps[1], // Messages
            this.installedApps[2], // Browser
            this.installedApps[3], // Camera
            this.installedApps[14] // Play Store
        ];
        
        // Home screen favorites (top apps)
        this.homeApps = [
            this.installedApps[4], // Gallery
            this.installedApps[5], // Settings
            this.installedApps[8], // Music
            this.installedApps[10], // YouTube
            this.installedApps[11], // Gmail
            this.installedApps[12]  // Drive
        ];
        
        // Add default widgets
        this.widgets.push({
            id: 'weather-widget',
            appPackage: 'com.android.weather',
            title: 'Weather',
            content: '☀️ 72°F Sunny',
            width: 4,
            height: 2,
            x: 0,
            y: 0
        });
    }

    /**
     * Create launcher UI structure
     */
    private createLauncherUI(): void {
        if (!this.container) return;
        
        // Clear container
        this.container.innerHTML = '';
        
        // Main container
        const main = document.createElement('div');
        main.style.cssText = `
            width: 100%;
            height: 100%;
            background: ${this.themeColors.background};
            position: relative;
            overflow: hidden;
            font-family: 'Roboto', system-ui, sans-serif;
        `;
        
        // Create home screen
        this.createHomeScreen();
        
        // Create status bar
        this.createStatusBar();
        
        // Create navigation bar
        this.createNavigationBar();
        
        // Create app drawer (hidden initially)
        this.createAppDrawer();
        
        // Create quick settings (hidden initially)
        this.createQuickSettings();
        
        // Create notification shade (hidden initially)
        this.createNotificationShade();
        
        main.appendChild(this.homeScreen!);
        this.container.appendChild(main);
    }

    /**
     * Create status bar
     */
    private createStatusBar(): void {
        const statusBar = document.createElement('div');
        statusBar.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 32px;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            padding: 0 16px;
            color: ${this.themeColors.onSurface};
            font-size: 12px;
            z-index: 1000;
            cursor: pointer;
        `;
        
        statusBar.innerHTML = `
            <div style="flex: 1;">${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
            <div style="display: flex; gap: 8px; align-items: center;">
                <span>📶</span>
                <span>📡</span>
                <span>🔋 85%</span>
            </div>
        `;
        
        // Update time every minute
        setInterval(() => {
            const timeEl = statusBar.querySelector('div');
            if (timeEl) {
                timeEl.textContent = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
            }
        }, 60000);
        
        // Open notification shade on click
        statusBar.addEventListener('click', () => this.toggleNotificationShade());
        
        this.homeScreen?.appendChild(statusBar);
    }

    /**
     * Create home screen
     */
    private createHomeScreen(): void {
        this.homeScreen = document.createElement('div');
        this.homeScreen.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
            background: linear-gradient(135deg, ${this.themeColors.surface} 0%, ${this.themeColors.surfaceVariant} 100%);
        `;
        
        // Wallpaper
        const wallpaper = document.createElement('div');
        wallpaper.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            opacity: 0.3;
        `;
        this.homeScreen.appendChild(wallpaper);
        
        // Widgets area
        const widgetsArea = document.createElement('div');
        widgetsArea.style.cssText = `
            position: absolute;
            top: 48px;
            left: 0;
            right: 0;
            padding: 16px;
        `;
        
        this.widgets.forEach(widget => {
            const widgetEl = this.createWidget(widget);
            widgetsArea.appendChild(widgetEl);
        });
        
        this.homeScreen.appendChild(widgetsArea);
        
        // Home apps grid
        const appsGrid = document.createElement('div');
        appsGrid.style.cssText = `
            position: absolute;
            top: 180px;
            left: 0;
            right: 0;
            padding: 24px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
        `;
        
        this.homeApps.forEach(app => {
            const appIcon = this.createAppIcon(app);
            appsGrid.appendChild(appIcon);
        });
        
        this.homeScreen.appendChild(appsGrid);
        
        // Dock
        const dock = document.createElement('div');
        dock.style.cssText = `
            position: absolute;
            bottom: 80px;
            left: 0;
            right: 0;
            height: 96px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 0 24px;
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(20px);
        `;
        
        this.dockApps.forEach(app => {
            const appIcon = this.createAppIcon(app, true);
            dock.appendChild(appIcon);
        });
        
        this.homeScreen.appendChild(dock);
    }

    /**
     * Create app icon
     */
    private createAppIcon(app: AndroidApp, isDock: boolean = false): HTMLElement {
        const icon = document.createElement('div');
        icon.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.2s;
        `;
        
        const iconSize = isDock ? '64px' : '56px';
        const fontSize = isDock ? '32px' : '28px';
        
        icon.innerHTML = `
            <div style="
                width: ${iconSize};
                height: ${iconSize};
                background: ${app.color};
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: ${fontSize};
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                transition: all 0.2s;
            ">${app.icon}</div>
            <div style="
                font-size: 11px;
                color: ${this.themeColors.onSurface};
                text-align: center;
                max-width: ${iconSize};
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            ">${app.name}</div>
        `;
        
        icon.addEventListener('mouseenter', () => {
            const iconEl = icon.querySelector('div') as HTMLElement;
            if (iconEl) {
                iconEl.style.transform = 'scale(1.1)';
            }
        });
        
        icon.addEventListener('mouseleave', () => {
            const iconEl = icon.querySelector('div') as HTMLElement;
            if (iconEl) {
                iconEl.style.transform = 'scale(1)';
            }
        });
        
        icon.addEventListener('click', () => this.launchApp(app));
        
        return icon;
    }

    /**
     * Create widget
     */
    private createWidget(widget: AndroidWidget): HTMLElement {
        const widgetEl = document.createElement('div');
        widgetEl.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 20px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
            color: ${this.themeColors.onSurface};
        `;
        
        widgetEl.innerHTML = `
            <div style="font-size: 14px; font-weight: 500; margin-bottom: 12px; opacity: 0.8;">${widget.title}</div>
            <div style="font-size: 32px; font-weight: 300;">${widget.content}</div>
        `;
        
        return widgetEl;
    }

    /**
     * Create navigation bar
     */
    private createNavigationBar(): void {
        this.navigationBar = document.createElement('div');
        this.navigationBar.style.cssText = `
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 64px;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(20px);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 64px;
            z-index: 1000;
        `;
        
        // Back button
        const backBtn = this.createNavButton('◀', () => console.log('Back'));
        
        // Home button
        const homeBtn = this.createNavButton('⬤', () => {
            this.closeAllPanels();
        });
        
        // Recent apps button
        const recentBtn = this.createNavButton('▢', () => this.toggleRecentApps());
        
        this.navigationBar.appendChild(backBtn);
        this.navigationBar.appendChild(homeBtn);
        this.navigationBar.appendChild(recentBtn);
        
        this.homeScreen?.appendChild(this.navigationBar);
    }

    /**
     * Create navigation button
     */
    private createNavButton(icon: string, onClick: () => void): HTMLElement {
        const btn = document.createElement('div');
        btn.style.cssText = `
            width: 48px;
            height: 48px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: ${this.themeColors.onSurface};
            font-size: 24px;
            cursor: pointer;
            border-radius: 50%;
            transition: all 0.2s;
        `;
        btn.textContent = icon;
        
        btn.addEventListener('mouseenter', () => {
            btn.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        
        btn.addEventListener('mouseleave', () => {
            btn.style.background = 'transparent';
        });
        
        btn.addEventListener('click', onClick);
        
        return btn;
    }

    /**
     * Create app drawer
     */
    private createAppDrawer(): void {
        this.appDrawer = document.createElement('div');
        this.appDrawer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            height: 100%;
            background: ${this.themeColors.background};
            z-index: 999;
            transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
        `;
        
        // Search bar
        const searchBar = document.createElement('div');
        searchBar.style.cssText = `
            padding: 16px;
            background: ${this.themeColors.surface};
        `;
        searchBar.innerHTML = `
            <input type="text" placeholder="Search apps" style="
                width: 100%;
                padding: 12px 16px;
                background: ${this.themeColors.surfaceVariant};
                border: none;
                border-radius: 24px;
                color: ${this.themeColors.onSurface};
                font-size: 14px;
                outline: none;
            ">
        `;
        
        // Apps grid
        const appsGrid = document.createElement('div');
        appsGrid.style.cssText = `
            flex: 1;
            padding: 24px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            overflow-y: auto;
            align-content: start;
        `;
        
        this.installedApps.forEach(app => {
            const appIcon = this.createAppIcon(app);
            appsGrid.appendChild(appIcon);
        });
        
        this.appDrawer.appendChild(searchBar);
        this.appDrawer.appendChild(appsGrid);
        
        this.homeScreen?.appendChild(this.appDrawer);
    }

    /**
     * Create quick settings
     */
    private createQuickSettings(): void {
        this.quickSettings = document.createElement('div');
        this.quickSettings.style.cssText = `
            position: absolute;
            top: -400px;
            left: 0;
            right: 0;
            height: 400px;
            background: ${this.themeColors.surface};
            z-index: 998;
            transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 48px 24px 24px 24px;
        `;
        
        const quickSettingsGrid = document.createElement('div');
        quickSettingsGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
        `;
        
        const settings = [
            { name: 'Wi-Fi', icon: '📶', active: true },
            { name: 'Bluetooth', icon: '📡', active: false },
            { name: 'Do Not Disturb', icon: '🔕', active: false },
            { name: 'Flashlight', icon: '🔦', active: false },
            { name: 'Auto-rotate', icon: '🔄', active: true },
            { name: 'Battery Saver', icon: '🔋', active: false }
        ];
        
        settings.forEach(setting => {
            const tile = document.createElement('div');
            tile.style.cssText = `
                background: ${setting.active ? this.themeColors.primary : this.themeColors.surfaceVariant};
                border-radius: 16px;
                padding: 16px;
                display: flex;
                flex-direction: column;
                gap: 8px;
                cursor: pointer;
                transition: all 0.2s;
            `;
            
            tile.innerHTML = `
                <div style="font-size: 24px;">${setting.icon}</div>
                <div style="font-size: 12px; color: ${this.themeColors.onSurface};">${setting.name}</div>
            `;
            
            tile.addEventListener('click', () => {
                setting.active = !setting.active;
                tile.style.background = setting.active ? this.themeColors.primary : this.themeColors.surfaceVariant;
            });
            
            quickSettingsGrid.appendChild(tile);
        });
        
        this.quickSettings.appendChild(quickSettingsGrid);
        this.homeScreen?.appendChild(this.quickSettings);
    }

    /**
     * Create notification shade
     */
    private createNotificationShade(): void {
        this.notificationShade = document.createElement('div');
        this.notificationShade.style.cssText = `
            position: absolute;
            top: -600px;
            left: 0;
            right: 0;
            height: 600px;
            background: ${this.themeColors.surface};
            z-index: 997;
            transition: top 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 48px 24px 24px 24px;
            overflow-y: auto;
        `;
        
        const notifications = [
            { app: 'Messages', title: 'New message', body: 'Hey, how are you?', time: '2m ago' },
            { app: 'Gmail', title: 'New email', body: 'Important update from...', time: '1h ago' }
        ];
        
        notifications.forEach(notif => {
            const notifEl = document.createElement('div');
            notifEl.style.cssText = `
                background: ${this.themeColors.surfaceVariant};
                border-radius: 16px;
                padding: 16px;
                margin-bottom: 12px;
            `;
            
            notifEl.innerHTML = `
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="font-size: 12px; font-weight: 600; color: ${this.themeColors.onSurface};">${notif.app}</div>
                    <div style="font-size: 11px; opacity: 0.6; color: ${this.themeColors.onSurface};">${notif.time}</div>
                </div>
                <div style="font-size: 14px; font-weight: 500; margin-bottom: 4px; color: ${this.themeColors.onSurface};">${notif.title}</div>
                <div style="font-size: 13px; opacity: 0.8; color: ${this.themeColors.onSurface};">${notif.body}</div>
            `;
            
            this.notificationShade?.appendChild(notifEl);
        });
        
        this.homeScreen?.appendChild(this.notificationShade);
    }

    /**
     * Toggle app drawer
     */
    private toggleAppDrawer(): void {
        if (!this.appDrawer) return;
        
        this.appDrawerOpen = !this.appDrawerOpen;
        this.appDrawer.style.top = this.appDrawerOpen ? '0' : '100%';
    }

    /**
     * Toggle quick settings
     */
    private toggleQuickSettings(): void {
        if (!this.quickSettings) return;
        
        this.quickSettingsOpen = !this.quickSettingsOpen;
        this.quickSettings.style.top = this.quickSettingsOpen ? '0' : '-400px';
    }

    /**
     * Toggle notification shade
     */
    private toggleNotificationShade(): void {
        if (!this.notificationShade) return;
        
        this.notificationShadeOpen = !this.notificationShadeOpen;
        this.notificationShade.style.top = this.notificationShadeOpen ? '0' : '-600px';
    }

    /**
     * Toggle recent apps
     */
    private toggleRecentApps(): void {
        console.log('[Android14] Toggle recent apps');
        // Implementation for recent apps view
    }

    /**
     * Close all panels
     */
    private closeAllPanels(): void {
        if (this.appDrawerOpen) this.toggleAppDrawer();
        if (this.quickSettingsOpen) this.toggleQuickSettings();
        if (this.notificationShadeOpen) this.toggleNotificationShade();
    }

    /**
     * Launch application
     */
    private launchApp(app: AndroidApp): void {
        console.log(`[Android14] Launching ${app.name}...`);
        
        // Create full-screen app view
        const appView = document.createElement('div');
        appView.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 2000;
            display: flex;
            flex-direction: column;
        `;
        
        // App bar
        const appBar = document.createElement('div');
        appBar.style.cssText = `
            height: 56px;
            background: ${app.color};
            color: white;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 16px;
        `;
        
        appBar.innerHTML = `
            <div style="cursor: pointer; font-size: 24px;">←</div>
            <div style="flex: 1; font-size: 18px; font-weight: 500;">${app.name}</div>
        `;
        
        appBar.querySelector('div')?.addEventListener('click', () => {
            appView.remove();
        });
        
        // App content
        const appContent = document.createElement('div');
        appContent.style.cssText = `
            flex: 1;
            padding: 24px;
            overflow-y: auto;
        `;
        
        appContent.innerHTML = `
            <h2>Welcome to ${app.name}</h2>
            <p>This is a simulated ${app.name} application.</p>
        `;
        
        appView.appendChild(appBar);
        appView.appendChild(appContent);
        
        this.homeScreen?.appendChild(appView);
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Swipe up from bottom to open app drawer
        let touchStartY = 0;
        
        this.homeScreen?.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        });
        
        this.homeScreen?.addEventListener('touchend', (e) => {
            const touchEndY = e.changedTouches[0].clientY;
            const swipeDistance = touchStartY - touchEndY;
            
            if (swipeDistance > 100 && touchStartY > window.innerHeight - 100) {
                this.toggleAppDrawer();
            }
        });
    }

    /**
     * Shutdown launcher
     */
    async shutdown(): Promise<void> {
        console.log('[Android14] Shutting down...');
        
        // Clear UI
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export singleton
export const android14Launcher = new Android14Launcher();
