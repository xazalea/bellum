/**
 * Android System Orchestrator
 * Boots the Android environment and manages the lifecycle
 */

import { AndroidRuntime } from './runtime';
import { APKLoader } from './apk_loader';
import { DEXParser } from './dex_parser';
import { DalvikInterpreter } from './dalvik_interpreter';

export class AndroidSystem {
    private runtime: AndroidRuntime;
    private interpreter: DalvikInterpreter;
    private isBooted: boolean = false;

    constructor() {
        this.runtime = new AndroidRuntime();
        this.interpreter = new DalvikInterpreter(this.runtime);
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
        } catch (e) {
            console.error("System: Failed to extract DEX", e);
            return;
        }

        // 3. Parse DEX
        console.log("System: Parsing DEX structure...");
        const dexParser = new DEXParser(dexData);
        const header = dexParser.parseHeader();
        console.log(`System: DEX Header verified. File size: ${header.fileSize}, Classes: ${header.classDefsSize}`);

        // 4. Load Resources (Mount to /data/app/res)
        console.log("System: Mounting resources...");
        const resources = await APKLoader.extractResources(apkFile);
        for (const [path, data] of resources) {
            this.runtime.writeFile(`/data/app/${path}`, new Uint8Array(data));
        }

        // 5. Initialize Main Activity
        // For now, we just look for the first class that looks like an activity or the one in manifest
        const mainActivity = apkInfo.activities[0];
        console.log(`System: Launching Main Activity: ${mainActivity}`);
        
        // TODO: Find the main method code in the DEX parser
        // const mainCode = dexParser.getMethodCode(mainActivity, 'onCreate');
        
        // For demonstration, we execute a dummy instruction set
        // nop, const/4 v0, 5, return-void
        const dummyCode = new Uint8Array([0x00, 0x00, 0x12, 0x50, 0x0E, 0x00]);
        
        console.log("System: Starting Dalvik VM...");
        await this.interpreter.execute(dummyCode);

        this.isBooted = true;
        console.log("System: Boot sequence complete.");
    }
    
    getRuntime(): AndroidRuntime {
        return this.runtime;
    }
}
