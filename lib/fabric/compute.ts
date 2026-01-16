import { fabricMesh } from './mesh';
import { p2pNode } from '../../src/nacho/net/p2p_node';
import { DBT } from '../../src/nacho/jit/dbt';

export interface ComputeJob {
    id: string;
    type: 'COMPILE_CHUNK' | 'EXECUTE_TASK' | 'SHADER_COMPILE' | 'ML_INFERENCE' | 'PHYSICS_SIM' | 'DECOMPRESS';
    payload: {
        code?: Uint8Array; // Bytecode or IR
        arch?: 'x86' | 'arm' | 'dalvik';
        data?: Uint8Array; // Generic data payload
        shaderSource?: string; // For shader compilation
        modelWeights?: Uint8Array; // For ML inference
        physicsData?: any; // For physics simulation
    };
    priority: number; // 0-1, higher = more urgent
    deadline?: number; // Timestamp when job must complete
    response?: any;
}

export interface DeviceCapabilities {
    computeUnits: number;
    memory: number;
    gpuVRAM: number;
    bandwidth: number; // bytes/s
    battery?: number; // 0-1, null if N/A
    thermalState: 'nominal' | 'fair' | 'serious' | 'critical';
    supportedTaskTypes: ComputeJob['type'][];
}

export interface TaskSchedulingResult {
    jobId: string;
    assignedPeerId: string;
    estimatedCompletionTime: number;
    success: boolean;
    error?: string;
}

export class FabricComputeService {
    private static instance: FabricComputeService;
    private dbt: DBT = new DBT();

    private constructor() {
        this.initialize();
    }

    public static getInstance(): FabricComputeService {
        if (!FabricComputeService.instance) {
            FabricComputeService.instance = new FabricComputeService();
        }
        return FabricComputeService.instance;
    }

    private initialize() {
        console.log("[Fabrik] Initializing Compute Service...");

        // Advertise "compute" capability
        fabricMesh.advertiseService('compute-v1', 'Desc: Distributed JIT Compiler');

        // Handle incoming RPC requests
        fabricMesh.onRpcRequest(async (req) => {
            if (req.serviceId === 'compute-v1') {
                try {
                    const result = await this.handleComputeRequest(req.request as ComputeJob);
                    fabricMesh.respondRpc(req.fromPeerId, req.id, true, result);
                } catch (e: any) {
                    fabricMesh.respondRpc(req.fromPeerId, req.id, false, undefined, e.message);
                }
            }
        });
    }

    private async handleComputeRequest(job: ComputeJob): Promise<any> {
        console.log(`[Fabrik] Received Compute Job: ${job.id} (${job.type})`);

        if (job.type === 'COMPILE_CHUNK') {
            // Emulate compiling a remote chunk
            if (!job.payload.code) {
                throw new Error('COMPILE_CHUNK job missing code payload');
            }
            const buffer = job.payload.code.buffer;

            // In a real scenario, we'd invoke the DBT here and return optimized IR or WASM.
            // For now, we simulate work.
            const blockSize = job.payload.code.byteLength;
            console.log(`[Fabrik] Compiling ${blockSize} bytes for ${job.payload.arch}...`);

            // Simulate processing time based on size
            await new Promise(r => setTimeout(r, blockSize / 10)); // fake latency

            return {
                id: job.id,
                status: 'COMPLETED',
                machineCode: new Uint8Array([0x00]), // Dummy output
                logs: [`Compiled ${blockSize} bytes at peer ${fabricMesh.getLocalNodeId()}`]
            };
        }

        throw new Error("Unknown Job Type");
    }

    /**
     * Offload a compilation task to the mesh.
     */
    public async offloadCompilation(code: Uint8Array, arch: 'x86' | 'arm' | 'dalvik'): Promise<any> {
        const peers = fabricMesh.getPeers();
        if (peers.length === 0) {
            console.warn("[Fabrik] No peers available for offloading.");
            return null;
        }

        // Simple scheduler: Pick first peer
        // Improve later to pick 'service' specifically
        const services = fabricMesh.getServices().filter(s => s.serviceId === 'compute-v1');
        if (services.length === 0) {
            console.warn("[Fabrik] No compute peers found.");
            return null;
        }

        const target = services[0]; // Pick best signal/latency in future
        console.log(`[Fabrik] Offloading job to ${target.nodeId} (${target.peerId})...`);

        const job: ComputeJob = {
            id: crypto.randomUUID(),
            type: 'COMPILE_CHUNK',
            payload: { code, arch },
            priority: 0.7
        };

        const result = await fabricMesh.rpcCall(target.serviceId, job);
        return result;
    }

    /**
     * Submit a generic compute job
     */
    public async submitJob(job: ComputeJob): Promise<any> {
        return this.handleComputeRequest(job);
    }
}

export const fabricCompute = FabricComputeService.getInstance();
