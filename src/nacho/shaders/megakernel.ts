export const MEGAKERNEL_WGSL = `
struct Entity {
    pos: vec2f,
    vel: vec2f,
    color: vec4f,
    padding: vec2f, // Align to 16 bytes if needed, though vec4f + 2*vec2f = 32 bytes (16+8+8). Wait: vec2 (8), vec2 (8), vec4 (16) = 32. Perfectly aligned.
}

struct WorldState {
    entities: array<Entity>,
}

struct Uniforms {
    dt: f32,
    width: f32,
    height: f32,
    count: f32,
}

@group(0) @binding(0) var<storage, read_write> oldState: WorldState;
@group(0) @binding(1) var<storage, read_write> newState: WorldState;
@group(0) @binding(2) var<uniform> uniforms: Uniforms;

// --- COMPUTE KERNEL (PHYSICS & LOGIC) ---
@compute @workgroup_size(64)
fn computeMain(@builtin(global_invocation_id) global_id: vec3u) {
    let index = global_id.x;
    if (index >= u32(uniforms.count)) { return; }

    var entity = oldState.entities[index];

    // Simple Physics Simulation
    entity.pos = entity.pos + entity.vel * uniforms.dt;

    // Boundary Bounce (assuming 0,0 to width,height)
    if (entity.pos.x < 0.0) {
        entity.pos.x = 0.0;
        entity.vel.x = abs(entity.vel.x);
    } else if (entity.pos.x > uniforms.width) {
        entity.pos.x = uniforms.width;
        entity.vel.x = -abs(entity.vel.x);
    }

    if (entity.pos.y < 0.0) {
        entity.pos.y = 0.0;
        entity.vel.y = abs(entity.vel.y);
    } else if (entity.pos.y > uniforms.height) {
        entity.pos.y = uniforms.height;
        entity.vel.y = -abs(entity.vel.y);
    }

    newState.entities[index] = entity;
}

// --- RENDER KERNEL (VISUALIZATION) ---

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) color: vec4f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32, @builtin(instance_index) instanceIndex: u32) -> VertexOutput {
    // Read from buffer that was just written to (newState in compute becomes readable here if bound correctly, 
    // OR we just read from the buffer we consider "current" for this frame).
    // For simplicity, we bind the same buffer to a readonly slot or just reuse the storage binding if supported.
    // Here we assume 'oldState' slot is bound to the CURRENT valid state for rendering.
    
    let entity = oldState.entities[instanceIndex];

    // Generate Quad Logic
    // 0--1
    // | /|
    // |/ |
    // 2--3
    // Indices: 0, 1, 2, 1, 3, 2
    
    var pos = vec2f(0.0, 0.0);
    let size = 10.0; // Size of particle in pixels

    let vID = vertexIndex % 6;
    if (vID == 0u) { pos = vec2f(-0.5, -0.5); }
    else if (vID == 1u) { pos = vec2f( 0.5, -0.5); }
    else if (vID == 2u) { pos = vec2f(-0.5,  0.5); }
    else if (vID == 3u) { pos = vec2f( 0.5, -0.5); }
    else if (vID == 4u) { pos = vec2f( 0.5,  0.5); }
    else if (vID == 5u) { pos = vec2f(-0.5,  0.5); }

    let worldPos = entity.pos + (pos * size);

    // Convert to NDC (-1 to 1)
    // 0..width -> -1..1
    let ndcX = (worldPos.x / uniforms.width) * 2.0 - 1.0;
    let ndcY = (worldPos.y / uniforms.height) * 2.0 - 1.0;

    var output: VertexOutput;
    output.position = vec4f(ndcX, -ndcY, 0.0, 1.0); // Flip Y because WGSL Y+ is up usually match 
    output.color = entity.color;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    return input.color;
}
`;
