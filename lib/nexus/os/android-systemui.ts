/**
 * Android SystemUI
 * Complete Android 14 user interface
 * 
 * Components:
 * - Launcher (Home Screen with app grid)
 * - Status Bar (time, battery, notifications)
 * - Navigation Bar (back, home, recents)
 * - Quick Settings
 * - Notification Shade
 * - Recent Apps (Task Switcher)
 * 
 * Target: Render complete UI in <50ms
 */

import { androidFramework } from './android-framework-complete';

export interface LauncherApp {
    packageName: string;
    label: string;
    icon: string;
}

export interface Notification {
    id: string;
    appName: string;
    appIcon: string;
    title: string;
    text: string;
    timestamp: number;
}

export class AndroidSystemUI {
    private isInitialized: boolean = false;
    
    // UI Elements
    private launcherElement: HTMLElement | null = null;
    private statusBarElement: HTMLElement | null = null;
    private navigationBarElement: HTMLElement | null = null;
    private notificationShadeElement: HTMLElement | null = null;
    private recentsElement: HTMLElement | null = null;
    
    // State
    private isLauncherVisible: boolean = true;
    private isNotificationShadeOpen: boolean = false;
    private isRecentsOpen: boolean = false;
    
    private notifications: Notification[] = [];
    private launcherApps: LauncherApp[] = [];

    /**
     * Initialize SystemUI
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.warn('[SystemUI] Already initialized');
            return;
        }

        const startTime = performance.now();
        console.log('[SystemUI] Initializing Android SystemUI...');

        // Create UI components
        this.createStatusBar();
        this.createNavigationBar();
        this.createLauncher();
        this.createNotificationShade();
        this.createRecents();

        // Populate launcher with installed apps
        this.populateLauncher();

        // Set up event listeners
        this.setupEventListeners();

        this.isInitialized = true;

        const elapsed = performance.now() - startTime;
        console.log(`[SystemUI] SystemUI initialized in ${elapsed.toFixed(2)}ms (Target: <50ms)`);
    }

    /**
     * Create Status Bar
     */
    private createStatusBar(): void {
        this.statusBarElement = document.createElement('div');
        this.statusBarElement.id = 'android-status-bar';
        this.statusBarElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 32px;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 12px;
            z-index: 10000;
            color: white;
            font-size: 14px;
            font-family: 'Roboto', sans-serif;
        `;

        // Left side - Time
        const timeElement = document.createElement('div');
        timeElement.id = 'status-bar-time';
        timeElement.style.cssText = `
            font-weight: 500;
        `;
        const updateTime = () => {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        };
        updateTime();
        setInterval(updateTime, 1000);
        this.statusBarElement.appendChild(timeElement);

        // Right side - Icons
        const iconsContainer = document.createElement('div');
        iconsContainer.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
        `;

        // WiFi icon
        const wifiIcon = document.createElement('span');
        wifiIcon.textContent = '📶';
        wifiIcon.style.fontSize = '16px';
        iconsContainer.appendChild(wifiIcon);

        // Battery icon
        const batteryIcon = document.createElement('span');
        batteryIcon.textContent = '🔋';
        batteryIcon.style.fontSize = '16px';
        iconsContainer.appendChild(batteryIcon);

        // Battery percentage
        const batteryText = document.createElement('span');
        batteryText.textContent = '100%';
        batteryText.style.fontSize = '12px';
        iconsContainer.appendChild(batteryText);

        this.statusBarElement.appendChild(iconsContainer);

        // Make status bar clickable to open notification shade
        this.statusBarElement.style.cursor = 'pointer';
        this.statusBarElement.addEventListener('click', () => {
            this.toggleNotificationShade();
        });

        document.body.appendChild(this.statusBarElement);
    }

    /**
     * Create Navigation Bar
     */
    private createNavigationBar(): void {
        this.navigationBarElement = document.createElement('div');
        this.navigationBarElement.id = 'android-navigation-bar';
        this.navigationBarElement.style.cssText = `
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100vw;
            height: 56px;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: space-around;
            z-index: 10000;
        `;

        // Back button
        const backButton = this.createNavButton('◀', 'Back', () => {
            console.log('[SystemUI] Back button pressed');
            // Handle back navigation
        });
        this.navigationBarElement.appendChild(backButton);

        // Home button
        const homeButton = this.createNavButton('⚫', 'Home', () => {
            this.goHome();
        });
        this.navigationBarElement.appendChild(homeButton);

        // Recents button
        const recentsButton = this.createNavButton('▭', 'Recents', () => {
            this.toggleRecents();
        });
        this.navigationBarElement.appendChild(recentsButton);

        document.body.appendChild(this.navigationBarElement);
    }

    /**
     * Create navigation button
     */
    private createNavButton(icon: string, label: string, onClick: () => void): HTMLElement {
        const button = document.createElement('button');
        button.innerHTML = icon;
        button.title = label;
        button.style.cssText = `
            width: 64px;
            height: 48px;
            background: transparent;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            border-radius: 8px;
            transition: background 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        button.addEventListener('mouseenter', () => {
            button.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'transparent';
        });
        button.addEventListener('click', onClick);

        return button;
    }

    /**
     * Create Launcher (Home Screen)
     */
    private createLauncher(): void {
        this.launcherElement = document.createElement('div');
        this.launcherElement.id = 'android-launcher';
        this.launcherElement.style.cssText = `
            position: fixed;
            top: 32px;
            left: 0;
            width: 100vw;
            height: calc(100vh - 88px);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            overflow-y: auto;
            z-index: 1;
            display: flex;
            flex-direction: column;
        `;

        // Search bar
        const searchBar = document.createElement('input');
        searchBar.type = 'text';
        searchBar.placeholder = 'Search apps';
        searchBar.style.cssText = `
            margin: 16px;
            padding: 12px 16px;
            background: rgba(255, 255, 255, 0.9);
            border: none;
            border-radius: 24px;
            font-size: 16px;
            outline: none;
        `;
        this.launcherElement.appendChild(searchBar);

        // App grid
        const appGrid = document.createElement('div');
        appGrid.id = 'launcher-app-grid';
        appGrid.style.cssText = `
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 24px;
            padding: 16px;
            flex: 1;
        `;
        this.launcherElement.appendChild(appGrid);

        document.body.appendChild(this.launcherElement);
    }

    /**
     * Populate launcher with apps
     */
    private populateLauncher(): void {
        const packages = androidFramework.packageManager.getInstalledPackages();
        
        this.launcherApps = packages.map(pkg => ({
            packageName: pkg.packageName,
            label: pkg.applicationInfo.label,
            icon: pkg.applicationInfo.icon,
        }));

        const appGrid = document.getElementById('launcher-app-grid');
        if (!appGrid) return;

        // Clear existing apps
        appGrid.innerHTML = '';

        // Add app icons
        for (const app of this.launcherApps) {
            const appIcon = this.createAppIcon(app);
            appGrid.appendChild(appIcon);
        }

        console.log(`[SystemUI] Launcher populated with ${this.launcherApps.length} apps`);
    }

    /**
     * Create app icon
     */
    private createAppIcon(app: LauncherApp): HTMLElement {
        const container = document.createElement('div');
        container.className = 'launcher-app-icon';
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            padding: 12px;
            border-radius: 12px;
            transition: background 0.2s;
        `;

        const icon = document.createElement('div');
        icon.textContent = app.icon;
        icon.style.cssText = `
            font-size: 48px;
            width: 64px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 16px;
        `;
        container.appendChild(icon);

        const label = document.createElement('div');
        label.textContent = app.label;
        label.style.cssText = `
            color: white;
            font-size: 12px;
            text-align: center;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        `;
        container.appendChild(label);

        container.addEventListener('mouseenter', () => {
            container.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        container.addEventListener('mouseleave', () => {
            container.style.background = 'transparent';
        });
        container.addEventListener('click', () => {
            this.launchApp(app.packageName);
        });

        return container;
    }

    /**
     * Create Notification Shade
     */
    private createNotificationShade(): void {
        this.notificationShadeElement = document.createElement('div');
        this.notificationShadeElement.id = 'android-notification-shade';
        this.notificationShadeElement.style.cssText = `
            position: fixed;
            top: -100vh;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 20000;
            transition: top 0.3s ease-out;
            overflow-y: auto;
            padding-top: 32px;
        `;

        // Quick settings
        const quickSettings = document.createElement('div');
        quickSettings.style.cssText = `
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            padding: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const quickSettingsItems = [
            { icon: '📶', label: 'WiFi' },
            { icon: '📶', label: 'Data' },
            { icon: '🔊', label: 'Sound' },
            { icon: '☀️', label: 'Brightness' },
            { icon: '🔦', label: 'Flashlight' },
            { icon: '⚙️', label: 'Settings' },
        ];

        for (const item of quickSettingsItems) {
            const tile = document.createElement('div');
            tile.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                text-align: center;
                cursor: pointer;
                transition: background 0.2s;
            `;
            tile.innerHTML = `<div style="font-size: 24px;">${item.icon}</div><div style="color: white; font-size: 12px; margin-top: 8px;">${item.label}</div>`;
            
            tile.addEventListener('mouseenter', () => {
                tile.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            tile.addEventListener('mouseleave', () => {
                tile.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            
            quickSettings.appendChild(tile);
        }

        this.notificationShadeElement.appendChild(quickSettings);

        // Notifications container
        const notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notifications-container';
        notificationsContainer.style.cssText = `
            padding: 16px;
        `;
        this.notificationShadeElement.appendChild(notificationsContainer);

        document.body.appendChild(this.notificationShadeElement);
    }

    /**
     * Create Recents (Task Switcher)
     */
    private createRecents(): void {
        this.recentsElement = document.createElement('div');
        this.recentsElement.id = 'android-recents';
        this.recentsElement.style.cssText = `
            position: fixed;
            top: 100vh;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 15000;
            transition: top 0.3s ease-out;
            overflow-y: auto;
            padding: 48px 16px;
        `;

        const title = document.createElement('div');
        title.textContent = 'Recent apps';
        title.style.cssText = `
            color: white;
            font-size: 24px;
            margin-bottom: 24px;
        `;
        this.recentsElement.appendChild(title);

        const recentsGrid = document.createElement('div');
        recentsGrid.id = 'recents-grid';
        recentsGrid.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 16px;
        `;
        this.recentsElement.appendChild(recentsGrid);

        document.body.appendChild(this.recentsElement);
    }

    /**
     * Toggle notification shade
     */
    private toggleNotificationShade(): void {
        if (!this.notificationShadeElement) return;

        this.isNotificationShadeOpen = !this.isNotificationShadeOpen;

        if (this.isNotificationShadeOpen) {
            this.notificationShadeElement.style.top = '0';
            this.updateNotifications();
        } else {
            this.notificationShadeElement.style.top = '-100vh';
        }
    }

    /**
     * Update notifications display
     */
    private updateNotifications(): void {
        const container = document.getElementById('notifications-container');
        if (!container) return;

        container.innerHTML = '';

        if (this.notifications.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No notifications';
            emptyMessage.style.cssText = `
                color: rgba(255, 255, 255, 0.5);
                text-align: center;
                padding: 32px;
            `;
            container.appendChild(emptyMessage);
            return;
        }

        for (const notification of this.notifications) {
            const notifElement = document.createElement('div');
            notifElement.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 8px;
                color: white;
            `;

            notifElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                    <div style="font-size: 24px;">${notification.appIcon}</div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600;">${notification.appName}</div>
                        <div style="font-size: 12px; opacity: 0.7;">${new Date(notification.timestamp).toLocaleTimeString()}</div>
                    </div>
                </div>
                <div style="font-weight: 500; margin-bottom: 4px;">${notification.title}</div>
                <div style="font-size: 14px; opacity: 0.8;">${notification.text}</div>
            `;

            container.appendChild(notifElement);
        }
    }

    /**
     * Toggle recents
     */
    private toggleRecents(): void {
        if (!this.recentsElement) return;

        this.isRecentsOpen = !this.isRecentsOpen;

        if (this.isRecentsOpen) {
            this.recentsElement.style.top = '0';
            this.updateRecents();
        } else {
            this.recentsElement.style.top = '100vh';
        }
    }

    /**
     * Update recents display
     */
    private updateRecents(): void {
        const grid = document.getElementById('recents-grid');
        if (!grid) return;

        grid.innerHTML = '';

        const activities = androidFramework.activityManager.getActivities();

        if (activities.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.textContent = 'No recent apps';
            emptyMessage.style.cssText = `
                color: rgba(255, 255, 255, 0.5);
                text-align: center;
                padding: 32px;
            `;
            grid.appendChild(emptyMessage);
            return;
        }

        for (const activity of activities) {
            const card = document.createElement('div');
            card.style.cssText = `
                background: rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 16px;
                cursor: pointer;
                transition: background 0.2s;
            `;

            card.innerHTML = `
                <div style="color: white; font-weight: 500; margin-bottom: 4px;">${activity.packageName}</div>
                <div style="color: rgba(255, 255, 255, 0.7); font-size: 12px;">${activity.className}</div>
            `;

            card.addEventListener('mouseenter', () => {
                card.style.background = 'rgba(255, 255, 255, 0.2)';
            });
            card.addEventListener('mouseleave', () => {
                card.style.background = 'rgba(255, 255, 255, 0.1)';
            });
            card.addEventListener('click', () => {
                // Switch to activity
                androidFramework.activityManager.resumeActivity(activity.id);
                this.toggleRecents();
            });

            grid.appendChild(card);
        }
    }

    /**
     * Go to home screen
     */
    private goHome(): void {
        // Hide recents and notification shade
        if (this.isRecentsOpen) {
            this.toggleRecents();
        }
        if (this.isNotificationShadeOpen) {
            this.toggleNotificationShade();
        }

        // Show launcher
        if (this.launcherElement) {
            this.launcherElement.style.display = 'flex';
            this.isLauncherVisible = true;
        }

        console.log('[SystemUI] Returned to home screen');
    }

    /**
     * Launch app
     */
    private async launchApp(packageName: string): Promise<void> {
        console.log(`[SystemUI] Launching app: ${packageName}`);

        // Hide launcher
        if (this.launcherElement) {
            this.launcherElement.style.display = 'none';
            this.isLauncherVisible = false;
        }

        // Launch app via framework
        await androidFramework.launchApp(packageName);

        // Show notification
        this.addNotification({
            id: `notif-${Date.now()}`,
            appName: packageName,
            appIcon: this.launcherApps.find(a => a.packageName === packageName)?.icon || '📱',
            title: 'App launched',
            text: `${packageName} is now running`,
            timestamp: Date.now(),
        });
    }

    /**
     * Add notification
     */
    addNotification(notification: Notification): void {
        this.notifications.unshift(notification);
        
        // Limit to 20 notifications
        if (this.notifications.length > 20) {
            this.notifications = this.notifications.slice(0, 20);
        }

        console.log(`[SystemUI] Notification added: ${notification.title}`);
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        // Close notification shade on background click
        this.notificationShadeElement?.addEventListener('click', (e) => {
            if (e.target === this.notificationShadeElement) {
                this.toggleNotificationShade();
            }
        });

        // Close recents on background click
        this.recentsElement?.addEventListener('click', (e) => {
            if (e.target === this.recentsElement) {
                this.toggleRecents();
            }
        });
    }

    /**
     * Shutdown SystemUI
     */
    shutdown(): void {
        console.log('[SystemUI] Shutting down SystemUI...');

        this.launcherElement?.remove();
        this.statusBarElement?.remove();
        this.navigationBarElement?.remove();
        this.notificationShadeElement?.remove();
        this.recentsElement?.remove();

        this.notifications = [];
        this.launcherApps = [];
        this.isInitialized = false;

        console.log('[SystemUI] SystemUI shutdown complete');
    }

    /**
     * Check if initialized
     */
    isReady(): boolean {
        return this.isInitialized;
    }
}

export const androidSystemUI = new AndroidSystemUI();
