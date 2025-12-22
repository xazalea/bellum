import { IRModule } from './ir';
import { fabricCompute } from '@/lib/fabric/compute';
import { fabricMesh } from '@/lib/fabric/mesh';
import { hyperion } from '../engine/hyperion';

/**
 * JitExecutor: Orchestrates the compilation and execution of Nacho IR.
 * Decides whether to compile locally or offload to the Fabrik mesh.
 */
export class JitExecutor {
    private static instance: JitExecutor;

    private constructor() { }

    public static getInstance(): JitExecutor {
        if (!JitExecutor.instance) {
            JitExecutor.instance = new JitExecutor();
        }
        return JitExecutor.instance;
    }

    /**
     * Esecutes an IR Module.
     * 1. Checks mesh strength.
     * 2. Offloads chunks if peers available.
     * 3. Compiles remainder locally.
     * 4. Runs code.
     */
    public async executeModule(module: IRModule, arch: 'x86' | 'dalvik') {
        console.log(`[JitExecutor] Preparing to execute module with ${module.blocks.size} blocks...`);

        const peers = fabricMesh.getPeers();
        const shouldOffload = peers.length > 0 && module.blocks.size > 10; // Threshold for offloading

        if (shouldOffload) {
            console.log(`[JitExecutor] Fabrik Strength: ${peers.length} peers. Offloading compilation...`);
            await this.distributeCompilation(module, arch);
        } else {
            console.log("[JitExecutor] Compiling locally (Low mesh strength or small module).");
            await this.localCompile(module);
        }

        console.log("[JitExecutor] Execution started.");
        // hyperion.run(module); // In real app, this would trigger the engine
    }

    private async distributeCompilation(module: IRModule, arch: 'x86' | 'dalvik') {
        // Simple strategy: Send a "hot" chunk to the network
        // We'll serialize the largest block as a demo
        const blocks = Array.from(module.blocks.values());
        if (blocks.length === 0) return;

        const targetBlock = blocks[0]; // pick first for demo

        // Serialize block instructions to bytes (mock)
        const code = new TextEncoder().encode(JSON.stringify(targetBlock));

        try {
            const result = await fabricCompute.offloadCompilation(code, arch);
            if (result && result.status === 'COMPLETED') {
                console.log(`[JitExecutor] Received compiled chunk from mesh! ID: ${result.id}`);
            }
        } catch (e) {
            console.warn("[JitExecutor] Offloading failed, falling back to local.", e);
        }
    }

    private async localCompile(module: IRModule) {
        // Simulate local GPU compilation time
        await new Promise(r => setTimeout(r, 200));
    }
}

export const jitExecutor = JitExecutor.getInstance();
