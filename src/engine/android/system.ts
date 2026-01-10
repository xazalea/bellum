/**
 * Android System Orchestrator
 * Boots the Android environment and manages the lifecycle
 */

import { AndroidRuntime } from './runtime';
import { APKLoader } from './apk_loader';
import { DEXParser } from './dex_parser';
import { DalvikInterpreter } from './dalvik_interpreter';
import { AndroidAPIs, Log } from './android-apis';

export class AndroidSystem {
    private runtime: AndroidRuntime;
    private interpreter: DalvikInterpreter;
    private apis: AndroidAPIs;
    private isBooted: boolean = false;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    constructor() {
        this.runtime = new AndroidRuntime();
        this.interpreter = new DalvikInterpreter(this.runtime);
        this.apis = new AndroidAPIs();
    }

    setCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.apis.setCanvas(canvas);
        if (this.ctx) {
            // Set up a basic Android-style background
            this.ctx.fillStyle = '#121212';
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw Android logo placeholder
            this.drawAndroidPlaceholder();
        }
    }

    private drawAndroidPlaceholder() {
        if (!this.ctx || !this.canvas) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Draw a simple Android robot
        this.ctx.fillStyle = '#3DDC84'; // Android green
        this.ctx.font = 'bold 48px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🤖', centerX, centerY - 50);
        
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '24px sans-serif';
        this.ctx.fillText('Android Runtime', centerX, centerY + 30);
        
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#888888';
        this.ctx.fillText('App is running...', centerX, centerY + 60);
    }

    /**
     * Boot the system with a given APK
     */
    async boot(apkFile: File | Blob) {
        console.log("System: Booting...");

        // 1. Load APK info
        console.log("System: Parsing APK...");
        const apkInfo = await APKLoader.loadAPK(apkFile);
        console.log(`System: Loaded APK package=${apkInfo.packageName} version=${apkInfo.version}`);

        // 2. Extract DEX
        console.log("System: Extracting classes.dex...");
        let dexData: ArrayBuffer;
        try {
            dexData = await APKLoader.extractDEX(apkFile);
            console.log(`System: DEX extracted (${dexData.byteLength} bytes)`);
        } catch (e) {
            console.error("System: Failed to extract DEX", e);
            throw new Error(`DEX extraction failed: ${e}`);
        }

        // 3. Parse DEX
        console.log("System: Parsing DEX structure...");
        const dexParser = new DEXParser(dexData);
        const header = dexParser.parseHeader();
        console.log(`System: DEX Header verified. File size: ${header.fileSize}, Classes: ${header.classDefsSize}`);
        
        // Get class names
        try {
            const classNames = dexParser.getClassNames();
            console.log(`System: Found ${classNames.length} classes:`);
            classNames.slice(0, 5).forEach(name => console.log(`  - ${name}`));
            if (classNames.length > 5) console.log(`  ... and ${classNames.length - 5} more`);
        } catch (e) {
            console.warn("System: Could not parse class names", e);
        }

        // 4. Load Resources (Mount to /data/app/res)
        console.log("System: Mounting resources...");
        const resources = await APKLoader.extractResources(apkFile);
        console.log(`System: Found ${resources.size} resource files`);
        for (const [path, data] of resources) {
            this.runtime.writeFile(`/data/app/${path}`, new Uint8Array(data));
        }

        // 5. Initialize Main Activity using APIs
        const mainActivityName = apkInfo.activities[0] || 'MainActivity';
        console.log(`System: Launching Main Activity: ${mainActivityName}`);
        
        const mainActivity = this.apis.getActivity(mainActivityName);
        mainActivity.onCreate(null);
        mainActivity.onStart();
        mainActivity.onResume();
        
        // Update UI to show app is running
        if (this.ctx && this.canvas) {
            this.ctx.fillStyle = '#121212';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            this.ctx.fillStyle = '#3DDC84';
            this.ctx.font = 'bold 32px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('Android App Running', centerX, centerY - 40);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '18px sans-serif';
            this.ctx.fillText(`Package: ${apkInfo.packageName}`, centerX, centerY + 10);
            this.ctx.fillText(`Version: ${apkInfo.version}`, centerX, centerY + 40);
            this.ctx.fillText(`Classes: ${header.classDefsSize}`, centerX, centerY + 70);
            
            this.ctx.fillStyle = '#888888';
            this.ctx.font = '14px monospace';
            this.ctx.fillText(`DEX Size: ${(header.fileSize / 1024).toFixed(1)}KB`, centerX, centerY + 100);
            this.ctx.fillText(`Resources: ${resources.size} files`, centerX, centerY + 120);
        }
        
        // Execute a simple bytecode sequence
        // This demonstrates that the Dalvik interpreter is working
        // In a full implementation, we would extract and execute actual method bytecode
        const demoCode = new Uint8Array([
            0x12, 0x05, // const/4 v0, #5
            0x12, 0x13, // const/4 v1, #3
            0x01, 0x01, // move v0, v1
            0x0E, 0x00  // return-void
        ]);
        
        console.log("System: Executing demo bytecode...");
        await this.interpreter.execute(demoCode);

        this.isBooted = true;
        console.log("System: Boot sequence complete.");
        console.log("System: App is now running (simulation mode)");
        console.log("Note: Full Dalvik VM implementation is a work in progress");
    }
    
    getRuntime(): AndroidRuntime {
        return this.runtime;
    }
}
