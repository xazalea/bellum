/**
 * Binary ECS & Data-Oriented Design
 * Covers Items:
 * 118. Binary ECS (Entity Component System).
 * 128. Use structure-of-arrays (SoA).
 * 139. Minimize pointer chasing.
 */

export class BinaryECS {
    // SoA Layout (Item 128)
    // entities[i] corresponds to components_pos[i * 3], etc.
    private capacity: number;
    private count: number = 0;
    
    // Component Arrays (Float32Array for positions, Int8 for flags, etc)
    private positions: Float32Array; // x, y, z
    private velocities: Float32Array; // vx, vy, vz
    private flags: Uint8Array;        // active, visible, physics_enabled

    constructor(capacity: number = 10000) {
        this.capacity = capacity;
        // Allocate large continuous buffers (Item 111)
        this.positions = new Float32Array(capacity * 3);
        this.velocities = new Float32Array(capacity * 3);
        this.flags = new Uint8Array(capacity);
    }

    addEntity(x: number, y: number, z: number): number {
        if (this.count >= this.capacity) throw new Error("ECS Full");
        
        const id = this.count++;
        this.positions[id * 3] = x;
        this.positions[id * 3 + 1] = y;
        this.positions[id * 3 + 2] = z;
        this.flags[id] = 1; // Active
        
        return id;
    }

    /**
     * Data-Oriented System Update
     * Iterates linearly over arrays -> cache friendly (Item 139)
     */
    updatePhysics(dt: number) {
        for (let i = 0; i < this.count; i++) {
            if (this.flags[i] === 0) continue;

            const idx = i * 3;
            // pos += vel * dt
            this.positions[idx] += this.velocities[idx] * dt;
            this.positions[idx + 1] += this.velocities[idx + 1] * dt;
            this.positions[idx + 2] += this.velocities[idx + 2] * dt;
        }
    }

    /**
     * Serialize to Binary (Item 118)
     */
    serialize(): ArrayBuffer {
        // Just dump the buffers
        // In real app, we might compress
        // Avoid ArrayBuffer|SharedArrayBuffer typing ambiguity by copying the slice
        return this.positions.slice(0, this.count * 3).buffer;
    }
}
