/**
 * Profile-Guided Optimization System
 * 
 * Features:
 * - Run game in instrumented mode for first 30-60 seconds
 * - Record hot basic blocks, branch bias ratios, indirect call targets, memory stride patterns
 * - Recompile hot regions with specialized optimizations
 * - Cache optimized Wasm locally (IndexedDB)
 */

import { ModuleIR, FunctionProfile, OptimizationProfile, CallTargetInfo, MemoryAccessPattern } from './static-binary-translator';

export interface InstrumentationData {
    blockCounts: Map<number, number>;
    branchOutcomes: Map<number, { taken: number; notTaken: number }>;
    callTargets: Map<number, Map<string, number>>;
    memoryAccesses: Map<number, { reads: number; writes: number; addresses: number[] }>;
    valueProfiles: Map<number, Map<number, number>>; // address -> value -> count
}

export class ProfileGuidedOptimizer {
    private instrumentation: InstrumentationData;
    private isInstrumenting: boolean = false;
    private instrumentationStartTime: number = 0;
    private instrumentationDuration: number = 30000; // 30 seconds
    private samples: number = 0;
    
    constructor() {
        this.instrumentation = {
            blockCounts: new Map(),
            branchOutcomes: new Map(),
            callTargets: new Map(),
            memoryAccesses: new Map(),
            valueProfiles: new Map()
        };
    }
    
    /**
     * Start instrumented execution
     */
    startInstrumentation(): void {
        this.isInstrumenting = true;
        this.instrumentationStartTime = performance.now();
        console.log('[PGO] Starting instrumented execution for profile collection');
    }
    
    /**
     * Stop instrumented execution
     */
    stopInstrumentation(): void {
        this.isInstrumenting = false;
        console.log(`[PGO] Stopped instrumented execution. Collected ${this.samples} samples`);
    }
    
    /**
     * Record block execution (called from interpreter)
     */
    recordBlockExecution(address: number): void {
        if (!this.isInstrumenting) return;
        
        const count = this.instrumentation.blockCounts.get(address) || 0;
        this.instrumentation.blockCounts.set(address, count + 1);
        this.samples++;
    }
    
    /**
     * Record branch outcome
     */
    recordBranch(address: number, taken: boolean): void {
        if (!this.isInstrumenting) return;
        
        let outcomes = this.instrumentation.branchOutcomes.get(address);
        if (!outcomes) {
            outcomes = { taken: 0, notTaken: 0 };
            this.instrumentation.branchOutcomes.set(address, outcomes);
        }
        
        if (taken) {
            outcomes.taken++;
        } else {
            outcomes.notTaken++;
        }
    }
    
    /**
     * Record indirect call target
     */
    recordCallTarget(callSite: number, target: string): void {
        if (!this.isInstrumenting) return;
        
        let targets = this.instrumentation.callTargets.get(callSite);
        if (!targets) {
            targets = new Map();
            this.instrumentation.callTargets.set(callSite, targets);
        }
        
        const count = targets.get(target) || 0;
        targets.set(target, count + 1);
    }
    
    /**
     * Record memory access
     */
    recordMemoryAccess(address: number, isRead: boolean, effectiveAddress: number): void {
        if (!this.isInstrumenting) return;
        
        let access = this.instrumentation.memoryAccesses.get(address);
        if (!access) {
            access = { reads: 0, writes: 0, addresses: [] };
            this.instrumentation.memoryAccesses.set(address, access);
        }
        
        if (isRead) {
            access.reads++;
        } else {
            access.writes++;
        }
        access.addresses.push(effectiveAddress);
        
        // Keep only last 100 addresses for stride detection
        if (access.addresses.length > 100) {
            access.addresses = access.addresses.slice(-100);
        }
    }
    
    /**
     * Check if instrumentation period is complete
     */
    isInstrumentationComplete(): boolean {
        if (!this.isInstrumenting) return true;
        return (performance.now() - this.instrumentationStartTime) >= this.instrumentationDuration;
    }
    
    /**
     * Build optimization profile from instrumentation data
     */
    buildProfile(moduleHash: string): OptimizationProfile {
        const profile: OptimizationProfile = {
            moduleHash,
            functionProfiles: new Map(),
            memoryPatterns: [],
            callTargets: new Map(),
            createdAt: Date.now(),
            samplesCollected: this.samples
        };
        
        // Analyze block frequencies
        const totalBlocks = Array.from(this.instrumentation.blockCounts.values())
            .reduce((a, b) => a + b, 0);
        
        // Categorize blocks by hotness
        for (const [addr, count] of this.instrumentation.blockCounts) {
            const frequency = count / totalBlocks;
            const hotness = this.categorizeHotness(frequency);
            
            // Would need to map address to function
        }
        
        // Analyze branch biases
        for (const [addr, outcomes] of this.instrumentation.branchOutcomes) {
            const total = outcomes.taken + outcomes.notTaken;
            if (total > 0) {
                const takenRatio = outcomes.taken / total;
                
                // Highly biased branches can be optimized
                if (takenRatio > 0.95 || takenRatio < 0.05) {
                    console.log(`[PGO] Biased branch at 0x${addr.toString(16)}: ${(takenRatio * 100).toFixed(1)}% taken`);
                }
            }
        }
        
        // Analyze indirect call targets
        for (const [callSite, targets] of this.instrumentation.callTargets) {
            const totalCalls = Array.from(targets.values()).reduce((a, b) => a + b, 0);
            let primaryTarget: string | undefined;
            let primaryCount = 0;
            
            for (const [target, count] of targets) {
                if (count > primaryCount) {
                    primaryCount = count;
                    primaryTarget = target;
                }
            }
            
            const isStable = primaryCount / totalCalls > 0.9;
            
            profile.callTargets.set(callSite, {
                address: callSite,
                targets: targets,
                totalCalls,
                isStable,
                primaryTarget: isStable ? primaryTarget : undefined
            });
            
            if (isStable) {
                console.log(`[PGO] Stable call site at 0x${callSite.toString(16)}: ${primaryTarget} (${((primaryCount / totalCalls) * 100).toFixed(1)}%)`);
            }
        }
        
        // Analyze memory stride patterns
        for (const [addr, access] of this.instrumentation.memoryAccesses) {
            if (access.addresses.length >= 2) {
                const stride = this.detectStride(access.addresses);
                if (stride !== null) {
                    profile.memoryPatterns.push({
                        baseAddress: access.addresses[0],
                        size: 4,
                        accessType: stride === 0 ? 'random' : 'strided',
                        stride: stride,
                        readWrite: access.reads > 0 && access.writes > 0 ? 'both' : access.reads > 0 ? 'read' : 'write'
                    });
                }
            }
        }
        
        console.log(`[PGO] Built profile: ${profile.functionProfiles.size} functions, ` +
            `${profile.memoryPatterns.length} memory patterns, ` +
            `${profile.callTargets.size} call sites`);
        
        return profile;
    }
    
    /**
     * Categorize block hotness
     */
    private categorizeHotness(frequency: number): 'cold' | 'warm' | 'hot' | 'critical' {
        if (frequency > 0.1) return 'critical';
        if (frequency > 0.01) return 'hot';
        if (frequency > 0.001) return 'warm';
        return 'cold';
    }
    
    /**
     * Detect stride pattern in address sequence
     */
    private detectStride(addresses: number[]): number | null {
        if (addresses.length < 2) return null;
        
        const strides: number[] = [];
        for (let i = 1; i < addresses.length; i++) {
            strides.push(addresses[i] - addresses[i - 1]);
        }
        
        // Check if all strides are the same
        const firstStride = strides[0];
        const allSame = strides.every(s => s === firstStride);
        
        if (allSame) {
            return firstStride;
        }
        
        // Check for power-of-2 stride (common in loops)
        const absStride = Math.abs(firstStride);
        if (absStride > 0 && (absStride & (absStride - 1)) === 0) {
            return firstStride;
        }
        
        return null;
    }
    
    /**
     * Save profile to IndexedDB
     */
    async saveProfile(profile: OptimizationProfile): Promise<void> {
        if (typeof indexedDB === 'undefined') {
            console.warn('[PGO] IndexedDB not available');
            return;
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ChallengerProfiles', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                const transaction = db.transaction(['profiles'], 'readwrite');
                const store = transaction.objectStore('profiles');
                
                // Serialize profile
                const serialized = this.serializeProfile(profile);
                store.put(serialized, profile.moduleHash);
                
                transaction.oncomplete = () => {
                    console.log(`[PGO] Saved profile: ${profile.moduleHash}`);
                    resolve();
                };
                transaction.onerror = () => reject(transaction.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('profiles')) {
                    db.createObjectStore('profiles');
                }
            };
        });
    }
    
    /**
     * Load profile from IndexedDB
     */
    async loadProfile(moduleHash: string): Promise<OptimizationProfile | null> {
        if (typeof indexedDB === 'undefined') {
            return null;
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ChallengerProfiles', 1);
            
            request.onerror = () => reject(request.error);
            
            request.onsuccess = () => {
                const db = request.result;
                
                if (!db.objectStoreNames.contains('profiles')) {
                    resolve(null);
                    return;
                }
                
                const transaction = db.transaction(['profiles'], 'readonly');
                const store = transaction.objectStore('profiles');
                const getRequest = store.get(moduleHash);
                
                getRequest.onsuccess = () => {
                    if (getRequest.result) {
                        const profile = this.deserializeProfile(getRequest.result);
                        console.log(`[PGO] Loaded cached profile: ${moduleHash}`);
                        resolve(profile);
                    } else {
                        resolve(null);
                    }
                };
                getRequest.onerror = () => reject(getRequest.error);
            };
            
            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains('profiles')) {
                    db.createObjectStore('profiles');
                }
            };
        });
    }
    
    /**
     * Serialize profile for storage
     */
    private serializeProfile(profile: OptimizationProfile): any {
        return {
            moduleHash: profile.moduleHash,
            createdAt: profile.createdAt,
            samplesCollected: profile.samplesCollected,
            functionProfiles: Array.from(profile.functionProfiles.entries()),
            memoryPatterns: profile.memoryPatterns,
            callTargets: Array.from(profile.callTargets.entries()).map(([k, v]) => ({
                callSiteAddress: k,
                targetsData: Array.from(v.targets.entries()),
                totalCalls: v.totalCalls,
                isStable: v.isStable,
                primaryTarget: v.primaryTarget
            }))
        };
    }
    
    /**
     * Deserialize profile from storage
     */
    private deserializeProfile(data: any): OptimizationProfile {
        return {
            moduleHash: data.moduleHash,
            createdAt: data.createdAt,
            samplesCollected: data.samplesCollected,
            functionProfiles: new Map(data.functionProfiles),
            memoryPatterns: data.memoryPatterns,
            callTargets: new Map(data.callTargets.map((ct: any) => [
                ct.callSiteAddress,
                {
                    address: ct.callSiteAddress,
                    targets: new Map(ct.targetsData),
                    totalCalls: ct.totalCalls,
                    isStable: ct.isStable,
                    primaryTarget: ct.primaryTarget
                }
            ]))
        };
    }
    
    /**
     * Get instrumentation data
     */
    getInstrumentationData(): InstrumentationData {
        return this.instrumentation;
    }
    
    /**
     * Reset instrumentation
     */
    reset(): void {
        this.instrumentation = {
            blockCounts: new Map(),
            branchOutcomes: new Map(),
            callTargets: new Map(),
            memoryAccesses: new Map(),
            valueProfiles: new Map()
        };
        this.samples = 0;
    }
}

// Singleton
export const profileGuidedOptimizer = new ProfileGuidedOptimizer();
