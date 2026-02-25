/**
 * Advanced Optimization Passes
 * 
 * Superblock Formation, Memory Alias Analysis, SIMD Vectorization,
 * Bounds Check Elimination, and other advanced optimizations
 */

import { 
    ModuleIR, 
    ControlFlowGraph, 
    CFGNode,
    LoopInfo,
    OptimizationProfile,
    FunctionProfile,
    CallTargetInfo
} from './static-binary-translator';
import { BasicBlock, IRInstruction, IROperand, FunctionIR } from '../transpiler/lifter/types';

export interface Superblock {
    id: string;
    entryBlock: number;
    blocks: number[];
    instructions: IRInstruction[];
    frequency: number;
    sideExits: SideExit[];
    isHot: boolean;
}

export interface SideExit {
    sourceBlock: number;
    targetBlock: number;
    probability: number;
}

export interface AliasInfo {
    pointer: string;
    possibleTargets: Set<string>;
    mustAlias: Set<string>;
    mayAlias: Set<string>;
    noAlias: Set<string>;
}

export interface MemoryLocation {
    base: string;
    offset: number;
    size: number;
    id: string;
}

export class SuperblockFormationPass {
    name = 'Superblock Formation';
    
    async run(module: ModuleIR, profile?: OptimizationProfile): Promise<void> {
        console.log('[Superblock] Starting superblock formation...');
        
        for (const [funcName, func] of module.functions) {
            const funcProfile = profile?.functionProfiles.get(funcName);
            if (!funcProfile || funcProfile.hotness === 'cold') continue;
            
            const superblocks = this.formSuperblocks(func, funcProfile, module.controlFlowGraph);
            
            // Replace hot functions with superblocks
            if (superblocks.length > 0) {
                this.applySuperblocks(func, superblocks, module.controlFlowGraph);
            }
        }
    }
    
    private formSuperblocks(
        func: FunctionIR, 
        profile: FunctionProfile,
        cfg: ControlFlowGraph
    ): Superblock[] {
        const superblocks: Superblock[] = [];
        const processed = new Set<number>();
        
        // Find hot entry points
        const sortedBlocks: BasicBlock[] = Array.from(func.blocks.values())
            .sort((a: BasicBlock, b: BasicBlock) => {
                const freqA = profile.blockFrequencies.get(a.id) || 0;
                const freqB = profile.blockFrequencies.get(b.id) || 0;
                return freqB - freqA;
            });
        
        for (const entryBlock of sortedBlocks) {
            if (processed.has(entryBlock.id)) continue;
            
            const superblock = this.traceHotPath(entryBlock.id, func, profile, cfg, processed);
            if (superblock && superblock.blocks.length > 1) {
                superblocks.push(superblock);
            }
        }
        
        return superblocks;
    }
    
    private traceHotPath(
        entryId: number,
        func: FunctionIR,
        profile: FunctionProfile,
        cfg: ControlFlowGraph,
        processed: Set<number>
    ): Superblock | null {
        const blocks: number[] = [];
        const instructions: IRInstruction[] = [];
        const sideExits: SideExit[] = [];
        let frequency = profile.blockFrequencies.get(entryId) || 1;
        
        let currentId = entryId;
        const visited = new Set<number>();
        
        while (true) {
            if (visited.has(currentId)) break;
            visited.add(currentId);
            processed.add(currentId);
            
            const block = func.blocks.get(currentId);
            if (!block) break;
            
            blocks.push(currentId);
            instructions.push(...block.instructions);
            
            // Find most frequent successor
            if (block.successors.length === 0) break;
            
            if (block.successors.length === 1) {
                currentId = block.successors[0];
                continue;
            }
            
            // Multiple successors - pick the hot one
            const branchProbs = profile.branchProbabilities.get(currentId);
            if (!branchProbs) break;
            
            let bestSucc = -1;
            let bestProb = 0;
            
            for (const succ of block.successors) {
                const prob = branchProbs.get(succ) || 0;
                if (prob > bestProb) {
                    bestProb = prob;
                    bestSucc = succ;
                }
            }
            
            // Add side exits for cold successors
            for (const succ of block.successors) {
                if (succ !== bestSucc) {
                    const prob = branchProbs.get(succ) || 0;
                    sideExits.push({
                        sourceBlock: currentId,
                        targetBlock: succ,
                        probability: prob
                    });
                }
            }
            
            if (bestSucc === -1 || bestProb < 0.6) break;
            currentId = bestSucc;
        }
        
        if (blocks.length < 2) return null;
        
        return {
            id: `sb_${entryId.toString(16)}`,
            entryBlock: entryId,
            blocks,
            instructions,
            frequency,
            sideExits,
            isHot: frequency > 1000
        };
    }
    
    private applySuperblocks(
        func: FunctionIR, 
        superblocks: Superblock[],
        cfg: ControlFlowGraph
    ): void {
        // Create new blocks from superblocks
        for (const sb of superblocks) {
            const newBlock: BasicBlock = {
                id: sb.entryBlock * 10000, // Unique ID
                startAddr: sb.instructions[0]?.addr || 0,
                endAddr: sb.instructions[sb.instructions.length - 1]?.addr || 0,
                instructions: sb.instructions,
                successors: []
            };
            
            // Add to function
            func.blocks.set(newBlock.id, newBlock);
            
            // Update CFG
            const cfgNode: CFGNode = {
                id: newBlock.id,
                startAddr: newBlock.startAddr,
                endAddr: newBlock.endAddr,
                predecessors: [],
                successors: sb.sideExits.map(e => e.targetBlock),
                instructions: sb.instructions,
                kind: 'normal',
                frequency: sb.frequency
            };
            cfg.blocks.set(newBlock.id, cfgNode);
        }
    }
}

export class MemoryAliasAnalysisPass {
    name = 'Memory Alias Analysis';
    
    private aliasCache: Map<string, AliasInfo> = new Map();
    
    async run(module: ModuleIR): Promise<void> {
        console.log('[AliasAnalysis] Running memory alias analysis...');
        
        for (const func of module.functions.values()) {
            this.analyzeFunction(func, module);
        }
    }
    
    private analyzeFunction(func: FunctionIR, module: ModuleIR): void {
        const pointers = this.collectPointers(func);
        const locations = this.collectMemoryLocations(func, module);
        
        for (const ptr of pointers) {
            const aliasInfo = this.computeAliasInfo(ptr, locations, func, module);
            this.aliasCache.set(ptr, aliasInfo);
        }
        
        // Apply alias info to optimize loads/stores
        this.optimizeMemoryAccesses(func);
    }
    
    private collectPointers(func: FunctionIR): string[] {
        const pointers: Set<string> = new Set();
        
        for (const block of func.blocks.values()) {
            for (const instr of block.instructions) {
                if (instr.opcode === 'lea' || instr.opcode === 'mov') {
                    if (instr.op1?.type === 'reg') {
                        pointers.add(instr.op1.value as string);
                    }
                }
                if (instr.opcode === 'load' || instr.opcode === 'store') {
                    if (instr.op1?.type === 'mem') {
                        pointers.add(`mem_${instr.op1.value}`);
                    }
                }
            }
        }
        
        return Array.from(pointers);
    }
    
    private collectMemoryLocations(func: FunctionIR, module: ModuleIR): MemoryLocation[] {
        const locations: MemoryLocation[] = [];
        let locId = 0;
        
        // Global data sections
        for (const section of module.dataSections) {
            locations.push({
                base: 'global',
                offset: section.address,
                size: section.size,
                id: `global_${section.name}`
            });
        }
        
        // Stack locations (approximate)
        locations.push({
            base: 'stack',
            offset: 0,
            size: 0x100000,
            id: 'stack_0'
        });
        
        // Heap locations
        locations.push({
            base: 'heap',
            offset: 0,
            size: 0x10000000,
            id: 'heap_0'
        });
        
        return locations;
    }
    
    private computeAliasInfo(
        pointer: string,
        locations: MemoryLocation[],
        func: FunctionIR,
        module: ModuleIR
    ): AliasInfo {
        const possibleTargets = new Set<string>();
        const mustAlias = new Set<string>();
        const mayAlias = new Set<string>();
        const noAlias = new Set<string>();
        
        // Simple analysis based on pointer arithmetic
        // Real implementation would use Andersens's or Steensgaard's algorithm
        
        for (const loc of locations) {
            possibleTargets.add(loc.id);
            
            if (pointer.startsWith('mem_')) {
                // Direct memory reference
                mayAlias.add(loc.id);
            } else if (pointer.startsWith('r') || pointer.startsWith('e')) {
                // Register - could point anywhere
                mayAlias.add(loc.id);
            } else {
                noAlias.add(loc.id);
            }
        }
        
        return { pointer, possibleTargets, mustAlias, mayAlias, noAlias };
    }
    
    private optimizeMemoryAccesses(func: FunctionIR): void {
        // Remove redundant loads
        const lastStore = new Map<string, IRInstruction>();
        
        for (const block of func.blocks.values()) {
            const newInstructions: IRInstruction[] = [];
            
            for (const instr of block.instructions) {
                if (instr.opcode === 'store') {
                    const addr = this.getMemoryAddress(instr);
                    if (addr) {
                        lastStore.set(addr, instr);
                    }
                    newInstructions.push(instr);
                } else if (instr.opcode === 'load') {
                    const addr = this.getMemoryAddress(instr);
                    if (addr && lastStore.has(addr)) {
                        // Load can be replaced with the stored value
                        const storeInstr = lastStore.get(addr)!;
                        // Create a move from the stored value
                        const moveInstr: IRInstruction = {
                            id: instr.id,
                            opcode: 'mov',
                            op1: instr.op1,
                            op2: storeInstr.op2,
                            addr: instr.addr
                        };
                        newInstructions.push(moveInstr);
                        continue;
                    }
                    newInstructions.push(instr);
                } else {
                    newInstructions.push(instr);
                }
            }
            
            block.instructions = newInstructions;
        }
    }
    
    private getMemoryAddress(instr: IRInstruction): string | null {
        if (instr.op1?.type === 'mem') {
            return instr.op1.value as string;
        }
        return null;
    }
    
    getAliasInfo(pointer: string): AliasInfo | undefined {
        return this.aliasCache.get(pointer);
    }
    
    mayAlias(ptr1: string, ptr2: string): boolean {
        const info1 = this.aliasCache.get(ptr1);
        const info2 = this.aliasCache.get(ptr2);
        
        if (!info1 || !info2) return true; // Conservative
        
        for (const target of info1.possibleTargets) {
            if (info2.possibleTargets.has(target)) return true;
        }
        
        return false;
    }
}

export class SIMDVectorizationPass {
    name = 'SIMD Vectorization';
    
    private vectorizableOps = new Set(['add', 'sub', 'mul', 'and', 'or', 'xor', 'shl', 'shr']);
    
    async run(module: ModuleIR): Promise<void> {
        console.log('[SIMD] Running SIMD vectorization...');
        
        for (const func of module.functions.values()) {
            for (const loop of module.controlFlowGraph.loops) {
                this.tryVectorizeLoop(loop, func, module);
            }
        }
    }
    
    private tryVectorizeLoop(
        loop: LoopInfo,
        func: FunctionIR,
        module: ModuleIR
    ): boolean {
        const header = func.blocks.get(loop.header);
        if (!header) return false;
        
        // Analyze loop body for vectorization potential
        const bodyInstructions: IRInstruction[] = [];
        for (const blockId of loop.body) {
            const block = func.blocks.get(blockId);
            if (block) {
                bodyInstructions.push(...block.instructions);
            }
        }
        
        // Check for array operations with stride
        const stride = this.detectStride(bodyInstructions);
        if (stride === null) return false;
        
        // Check for dependencies
        if (this.hasLoopCarriedDependencies(bodyInstructions, loop)) return false;
        
        // Check that all operations have SIMD equivalents
        for (const instr of bodyInstructions) {
            if (!this.vectorizableOps.has(instr.opcode) &&
                instr.opcode !== 'load' &&
                instr.opcode !== 'store' &&
                instr.opcode !== 'mov' &&
                instr.opcode !== 'nop') {
                return false;
            }
        }
        
        // Vectorize!
        console.log(`[SIMD] Vectorizing loop at block ${loop.header}`);
        this.vectorizeLoop(loop, func, stride);
        
        return true;
    }
    
    private detectStride(instructions: IRInstruction[]): number | null {
        const strides = new Set<number>();
        
        for (const instr of instructions) {
            if (instr.opcode === 'load' || instr.opcode === 'store') {
                if (instr.op1?.type === 'mem') {
                    // Would analyze memory operand for stride
                    strides.add(4); // Assume 4-byte stride for now
                }
            }
        }
        
        if (strides.size === 1) {
            return Array.from(strides)[0];
        }
        
        return null;
    }
    
    private hasLoopCarriedDependencies(
        instructions: IRInstruction[],
        loop: LoopInfo
    ): boolean {
        // Simplified dependency check
        // Real implementation would build dependence graph
        
        const stores: Set<string> = new Set();
        const loads: Set<string> = new Set();
        
        for (const instr of instructions) {
            if (instr.opcode === 'store') {
                const addr = this.getMemoryAddress(instr);
                if (addr) stores.add(addr);
            }
            if (instr.opcode === 'load') {
                const addr = this.getMemoryAddress(instr);
                if (addr) loads.add(addr);
            }
        }
        
        // Check for RAW/WAR/WAW hazards
        for (const load of loads) {
            if (stores.has(load)) return true;
        }
        
        return false;
    }
    
    private getMemoryAddress(instr: IRInstruction): string | null {
        if (instr.op1?.type === 'mem') {
            return String(instr.op1.value);
        }
        if (instr.op2?.type === 'mem') {
            return String(instr.op2.value);
        }
        return null;
    }
    
    private vectorizeLoop(
        loop: LoopInfo,
        func: FunctionIR,
        stride: number
    ): void {
        // Create vectorized loop kernel
        const header = func.blocks.get(loop.header);
        if (!header) return;
        
        // Replace scalar operations with SIMD
        const newInstructions: IRInstruction[] = [];
        
        for (const instr of header.instructions) {
            if (this.vectorizableOps.has(instr.opcode)) {
                const simdInstr: IRInstruction = {
                    id: instr.id,
                    opcode: `v${instr.opcode}`, // e.g., vadd, vsub
                    op1: instr.op1,
                    op2: instr.op2,
                    op3: { type: 'imm', value: 4, size: 32 }, // SIMD width
                    addr: instr.addr,
                    meta: { simd: true, width: 128 }
                };
                newInstructions.push(simdInstr);
            } else if (instr.opcode === 'load') {
                // v128.load
                const simdLoad: IRInstruction = {
                    id: instr.id,
                    opcode: 'vload',
                    op1: instr.op1,
                    op2: { type: 'imm', value: 4, size: 32 },
                    addr: instr.addr,
                    meta: { simd: true, width: 128, align: stride }
                };
                newInstructions.push(simdLoad);
            } else if (instr.opcode === 'store') {
                // v128.store
                const simdStore: IRInstruction = {
                    id: instr.id,
                    opcode: 'vstore',
                    op1: instr.op1,
                    op2: instr.op2,
                    op3: { type: 'imm', value: 4, size: 32 },
                    addr: instr.addr,
                    meta: { simd: true, width: 128, align: stride }
                };
                newInstructions.push(simdStore);
            } else {
                newInstructions.push(instr);
            }
        }
        
        header.instructions = newInstructions;
        
        // Set unroll factor based on loop size
        loop.estimatedIterations = Math.floor((loop.estimatedIterations || 100) / 4);
    }
}

export class BoundsCheckEliminationPass {
    name = 'Bounds Check Elimination';
    
    async run(module: ModuleIR, profile?: OptimizationProfile): Promise<void> {
        console.log('[BoundsCheck] Running bounds check elimination...');
        
        for (const func of module.functions.values()) {
            this.eliminateBoundsChecks(func, module);
        }
    }
    
    private eliminateBoundsChecks(func: FunctionIR, module: ModuleIR): void {
        // Find array accesses and eliminate redundant bounds checks
        const arrayInfo = this.collectArrayInfo(func, module);
        
        for (const block of func.blocks.values()) {
            const newInstructions: IRInstruction[] = [];
            
            for (const instr of block.instructions) {
                if (this.isArrayAccess(instr)) {
                    const canEliminate = this.canEliminateBoundsCheck(instr, arrayInfo, newInstructions);
                    
                    if (canEliminate) {
                        // Mark as safe - no bounds check needed
                        instr.meta = { ...instr.meta, noBoundsCheck: true };
                    }
                }
                
                newInstructions.push(instr);
            }
            
            block.instructions = newInstructions;
        }
    }
    
    private collectArrayInfo(func: FunctionIR, module: ModuleIR): Map<string, { base: number; size: number }> {
        const info = new Map<string, { base: number; size: number }>();
        
        // Find array allocations and sizes from data sections
        for (const section of module.dataSections) {
            info.set(section.name, { base: section.address, size: section.size });
        }
        
        return info;
    }
    
    private isArrayAccess(instr: IRInstruction): boolean {
        return instr.opcode === 'load' || instr.opcode === 'store';
    }
    
    private canEliminateBoundsCheck(
        instr: IRInstruction,
        arrayInfo: Map<string, { base: number; size: number }>,
        prevInstructions: IRInstruction[]
    ): boolean {
        // Check if index is known to be in bounds
        if (instr.op1?.type === 'imm') {
            const addr = instr.op1.value as number;
            // Check against known array bounds
            for (const info of arrayInfo.values()) {
                if (addr >= info.base && addr < info.base + info.size) {
                    return true;
                }
            }
        }
        
        // Check for loop-invariant indices that have already been bounds-checked
        for (const prev of prevInstructions) {
            if (prev.opcode === 'cmp' && prev.op1?.value === instr.op1?.value) {
                return true;
            }
        }
        
        return false;
    }
}

export class SpeculativeConstantPropagationPass {
    name = 'Speculative Constant Propagation';
    
    async run(module: ModuleIR, profile?: OptimizationProfile): Promise<void> {
        if (!profile) return;
        
        console.log('[SpecConst] Running speculative constant propagation...');
        
        for (const [funcName, func] of module.functions) {
            const funcProfile = profile.functionProfiles.get(funcName);
            if (!funcProfile) continue;
            
            this.propagateSpeculativeConstants(func, funcProfile);
        }
    }
    
    private propagateSpeculativeConstants(func: FunctionIR, profile: FunctionProfile): void {
        // Find values that are constant in most executions
        for (const block of func.blocks.values()) {
            for (const instr of block.instructions) {
                if (instr.opcode === 'mov' && instr.op2?.type === 'imm') {
                    // Already a constant - nothing to do
                    continue;
                }
                
                // Check value profile
                const valueProfile = profile.memoryAccessPatterns.find(
                    p => p.isConstant && p.address === instr.addr
                );
                
                if (valueProfile && valueProfile.value !== undefined) {
                    // Speculate that this value is constant
                    const speculativeInstr: IRInstruction = {
                        id: instr.id,
                        opcode: instr.opcode,
                        op1: instr.op1,
                        op2: { type: 'imm', value: valueProfile.value, size: 32 },
                        addr: instr.addr,
                        meta: { speculative: true, confidence: 0.95 }
                    };
                    
                    // Replace instruction
                    const idx = block.instructions.indexOf(instr);
                    if (idx >= 0) {
                        block.instructions[idx] = speculativeInstr;
                    }
                }
            }
        }
    }
}

export class DynamicInstructionFusionPass {
    name = 'Dynamic Instruction Fusion';
    
    async run(module: ModuleIR): Promise<void> {
        console.log('[Fusion] Running instruction fusion...');
        
        for (const func of module.functions.values()) {
            for (const block of func.blocks.values()) {
                this.fuseInstructions(block);
            }
        }
    }
    
    private fuseInstructions(block: BasicBlock): void {
        const fused: IRInstruction[] = [];
        let i = 0;
        
        while (i < block.instructions.length) {
            const curr = block.instructions[i];
            const next = block.instructions[i + 1];
            
            if (next && this.canFuse(curr, next)) {
                const fusedInstr = this.createFusedInstruction(curr, next);
                fused.push(fusedInstr);
                i += 2;
            } else {
                fused.push(curr);
                i++;
            }
        }
        
        block.instructions = fused;
    }
    
    private canFuse(instr1: IRInstruction, instr2: IRInstruction): boolean {
        // load + add => load-add
        if (instr1.opcode === 'load' && instr2.opcode === 'add') {
            return this.usesResult(instr2, instr1);
        }
        
        // load + store => copy
        if (instr1.opcode === 'load' && instr2.opcode === 'store') {
            return true;
        }
        
        // cmp + jmp => fused branch
        if (instr1.opcode === 'cmp' && instr2.opcode.startsWith('j')) {
            return true;
        }
        
        // add + add with same operands
        if (instr1.opcode === 'add' && instr2.opcode === 'add') {
            return instr1.op1?.value === instr2.op1?.value;
        }
        
        return false;
    }
    
    private usesResult(instr: IRInstruction, prev: IRInstruction): boolean {
        // Check if instr uses the result of prev
        if (!prev.op1) return false;
        
        return instr.op1?.value === prev.op1.value ||
               instr.op2?.value === prev.op1.value;
    }
    
    private createFusedInstruction(instr1: IRInstruction, instr2: IRInstruction): IRInstruction {
        let fusedOpcode = instr1.opcode;
        
        if (instr1.opcode === 'load' && instr2.opcode === 'add') {
            fusedOpcode = 'load_add';
        } else if (instr1.opcode === 'load' && instr2.opcode === 'store') {
            fusedOpcode = 'copy';
        } else if (instr1.opcode === 'cmp' && instr2.opcode.startsWith('j')) {
            fusedOpcode = `fused_${instr2.opcode}`;
        } else if (instr1.opcode === 'add' && instr2.opcode === 'add') {
            fusedOpcode = 'add2';
        }
        
        return {
            id: instr1.id,
            opcode: fusedOpcode,
            op1: instr1.op1,
            op2: instr2.op1,
            op3: instr2.op2,
            addr: instr1.addr,
            meta: { fused: true, original: [instr1.opcode, instr2.opcode] }
        };
    }
}

export class WorkStealingScheduler {
    name = 'Work Stealing Scheduler';
    private taskQueue: Array<{ func: string; block: number; priority: number }> = [];
    private workerLoads: Map<number, number> = new Map();
    
    addTask(func: string, block: number, priority: number = 0): void {
        this.taskQueue.push({ func, block, priority });
        this.taskQueue.sort((a, b) => b.priority - a.priority);
    }
    
    getTask(workerId: number): { func: string; block: number } | null {
        // Find task that balances load
        const currentLoad = this.workerLoads.get(workerId) || 0;
        
        // Prefer tasks with higher priority and lower worker load
        for (let i = 0; i < this.taskQueue.length; i++) {
            const task = this.taskQueue[i];
            // Simple load balancing
            if (currentLoad < 100 || i === this.taskQueue.length - 1) {
                this.taskQueue.splice(i, 1);
                this.workerLoads.set(workerId, currentLoad + 1);
                return { func: task.func, block: task.block };
            }
        }
        
        return null;
    }
    
    completeTask(workerId: number): void {
        const load = this.workerLoads.get(workerId) || 0;
        this.workerLoads.set(workerId, Math.max(0, load - 1));
    }
    
    stealTask(fromWorker: number, toWorker: number): { func: string; block: number } | null {
        // Work stealing for load balancing
        const fromLoad = this.workerLoads.get(fromWorker) || 0;
        const toLoad = this.workerLoads.get(toWorker) || 0;
        
        if (fromLoad > toLoad + 2 && this.taskQueue.length > 0) {
            const task = this.taskQueue.pop()!;
            this.workerLoads.set(fromWorker, fromLoad - 1);
            this.workerLoads.set(toWorker, toLoad + 1);
            return { func: task.func, block: task.block };
        }
        
        return null;
    }
}
