/**
 * Render Optimizer
 * Advanced rendering optimizations for high FPS
 * 
 * Features:
 * - Draw call batching
 * - Occlusion culling
 * - Frustum culling
 * - LOD (Level of Detail) management
 * - Texture atlasing
 * - Instanced rendering
 */

// ============================================================================
// Types
// ============================================================================

export interface RenderObject {
  id: number;
  position: vec3;
  scale: vec3;
  rotation: quat;
  mesh: Mesh;
  material: Material;
  visible: boolean;
  castsShadow: boolean;
  receivesShadow: boolean;
  lodLevels?: LODLevel[];
}

export interface Mesh {
  vertices: Float32Array;
  indices: Uint32Array;
  normals: Float32Array;
  uvs: Float32Array;
  bounds: BoundingBox;
}

export interface Material {
  albedo: [number, number, number, number];
  metallic: number;
  roughness: number;
  textures: Map<string, Texture>;
}

export interface Texture {
  width: number;
  height: number;
  data: Uint8Array | ImageBitmap;
  gpuTexture?: GPUTexture;
}

export interface DrawCall {
  mesh: Mesh;
  material: Material;
  transform: mat4;
}

export interface BatchedDrawCall {
  mesh: Mesh;
  material: Material;
  instanceCount: number;
  transforms: mat4[];
}

export interface Camera {
  position: vec3;
  target: vec3;
  fov: number;
  near: number;
  far: number;
  viewMatrix: mat4;
  projectionMatrix: mat4;
  frustum: Frustum;
}

export interface BoundingBox {
  min: vec3;
  max: vec3;
}

export interface Frustum {
  planes: Array<{ normal: vec3; distance: number }>;
}

export interface LODLevel {
  distance: number;
  mesh: Mesh;
}

export interface TextureAtlas {
  width: number;
  height: number;
  texture: GPUTexture;
  regions: Map<string, { x: number; y: number; width: number; height: number }>;
}

// Helper types
type vec3 = [number, number, number];
type vec4 = [number, number, number, number];
type quat = [number, number, number, number];
type mat4 = Float32Array; // 16 elements

// ============================================================================
// Render Optimizer
// ============================================================================

export class RenderOptimizer {
  private device: GPUDevice | null = null;
  private textureAtlases: Map<string, TextureAtlas> = new Map();

  async initialize(device: GPUDevice): Promise<void> {
    this.device = device;
    console.log('[RenderOptimizer] Initialized');
  }

  /**
   * Batch draw calls by material and mesh
   */
  batchDrawCalls(calls: DrawCall[]): BatchedDrawCall[] {
    console.log(`[RenderOptimizer] Batching ${calls.length} draw calls...`);

    const batches = new Map<string, BatchedDrawCall>();

    for (const call of calls) {
      // Create key based on mesh and material
      const key = `${this.getMeshKey(call.mesh)}_${this.getMaterialKey(call.material)}`;

      if (!batches.has(key)) {
        batches.set(key, {
          mesh: call.mesh,
          material: call.material,
          instanceCount: 0,
          transforms: [],
        });
      }

      const batch = batches.get(key)!;
      batch.instanceCount++;
      batch.transforms.push(call.transform);
    }

    const result = Array.from(batches.values());
    console.log(`[RenderOptimizer] Batched into ${result.length} draw calls (${((1 - result.length / calls.length) * 100).toFixed(1)}% reduction)`);

    return result;
  }

  /**
   * Cull objects outside camera frustum
   */
  cullOccludedObjects(objects: RenderObject[], camera: Camera): RenderObject[] {
    console.log(`[RenderOptimizer] Culling ${objects.length} objects...`);

    const visible: RenderObject[] = [];

    for (const obj of objects) {
      if (!obj.visible) continue;

      // Frustum culling
      if (this.isInFrustum(obj, camera.frustum)) {
        visible.push(obj);
      }
    }

    console.log(`[RenderOptimizer] ${visible.length}/${objects.length} objects visible (${((visible.length / objects.length) * 100).toFixed(1)}%)`);

    return visible;
  }

  /**
   * Select appropriate LOD level based on distance
   */
  selectLOD(object: RenderObject, distance: number): Mesh {
    if (!object.lodLevels || object.lodLevels.length === 0) {
      return object.mesh;
    }

    // Find appropriate LOD level
    for (let i = 0; i < object.lodLevels.length; i++) {
      if (distance < object.lodLevels[i].distance) {
        return object.lodLevels[i].mesh;
      }
    }

    // Return lowest detail LOD
    return object.lodLevels[object.lodLevels.length - 1].mesh;
  }

  /**
   * Create texture atlas from multiple textures
   */
  async createTextureAtlas(textures: Map<string, Texture>, atlasSize: number = 2048): Promise<TextureAtlas> {
    console.log(`[RenderOptimizer] Creating texture atlas with ${textures.size} textures...`);

    if (!this.device) {
      throw new Error('Device not initialized');
    }

    // Simple bin-packing algorithm
    const regions = new Map<string, { x: number; y: number; width: number; height: number }>();
    let currentX = 0;
    let currentY = 0;
    let rowHeight = 0;

    for (const [name, texture] of textures) {
      if (currentX + texture.width > atlasSize) {
        // Move to next row
        currentX = 0;
        currentY += rowHeight;
        rowHeight = 0;
      }

      if (currentY + texture.height > atlasSize) {
        console.warn('[RenderOptimizer] Texture atlas full, some textures may be omitted');
        break;
      }

      regions.set(name, {
        x: currentX,
        y: currentY,
        width: texture.width,
        height: texture.height,
      });

      currentX += texture.width;
      rowHeight = Math.max(rowHeight, texture.height);
    }

    // Create GPU texture
    const gpuTexture = this.device.createTexture({
      size: [atlasSize, atlasSize, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    // Copy textures to atlas
    for (const [name, texture] of textures) {
      const region = regions.get(name);
      if (!region) continue;

      // Copy texture data to atlas
      if (texture.data instanceof Uint8Array) {
        this.device.queue.writeTexture(
          { texture: gpuTexture, origin: [region.x, region.y, 0] },
          texture.data,
          { bytesPerRow: texture.width * 4 },
          [texture.width, texture.height, 1]
        );
      }
    }

    console.log(`[RenderOptimizer] Texture atlas created: ${regions.size}/${textures.size} textures packed`);

    return {
      width: atlasSize,
      height: atlasSize,
      texture: gpuTexture,
      regions,
    };
  }

  /**
   * Sort objects for optimal rendering
   */
  sortForRendering(objects: RenderObject[], camera: Camera): RenderObject[] {
    // Sort by:
    // 1. Opaque objects front-to-back (reduce overdraw)
    // 2. Transparent objects back-to-front (correct blending)
    // 3. Material (reduce state changes)

    const sorted = [...objects];

    sorted.sort((a, b) => {
      const distA = this.distanceToCamera(a.position, camera.position);
      const distB = this.distanceToCamera(b.position, camera.position);

      // Opaque objects front-to-back
      const isTransparentA = a.material.albedo[3] < 1.0;
      const isTransparentB = b.material.albedo[3] < 1.0;

      if (!isTransparentA && !isTransparentB) {
        return distA - distB;
      }

      // Transparent objects back-to-front
      if (isTransparentA && isTransparentB) {
        return distB - distA;
      }

      // Opaque before transparent
      return isTransparentA ? 1 : -1;
    });

    return sorted;
  }

  /**
   * Calculate optimal LOD distances
   */
  calculateLODDistances(object: RenderObject, lodCount: number): number[] {
    const distances: number[] = [];
    const baseDistance = 10; // meters

    for (let i = 0; i < lodCount; i++) {
      distances.push(baseDistance * Math.pow(2, i));
    }

    return distances;
  }

  /**
   * Perform occlusion queries
   */
  async performOcclusionQueries(objects: RenderObject[], camera: Camera): Promise<Set<number>> {
    // In real implementation, would use GPU occlusion queries
    // For now, use simple distance-based heuristic

    const visible = new Set<number>();

    for (const obj of objects) {
      const distance = this.distanceToCamera(obj.position, camera.position);
      
      // Simple heuristic: visible if within camera range
      if (distance < camera.far) {
        visible.add(obj.id);
      }
    }

    return visible;
  }

  /**
   * Helper methods
   */

  private getMeshKey(mesh: Mesh): string {
    // Create unique key for mesh
    return `mesh_${mesh.vertices.length}_${mesh.indices.length}`;
  }

  private getMaterialKey(material: Material): string {
    // Create unique key for material
    return `mat_${material.albedo.join('_')}_${material.metallic}_${material.roughness}`;
  }

  private isInFrustum(obj: RenderObject, frustum: Frustum): boolean {
    // Check if object's bounding box intersects frustum
    const bounds = obj.mesh.bounds;

    for (const plane of frustum.planes) {
      // Check if bounding box is completely outside any plane
      const corners = this.getBoundingBoxCorners(bounds);
      let allOutside = true;

      for (const corner of corners) {
        const distance = this.dotProduct(plane.normal, corner) + plane.distance;
        if (distance >= 0) {
          allOutside = false;
          break;
        }
      }

      if (allOutside) {
        return false;
      }
    }

    return true;
  }

  private getBoundingBoxCorners(bounds: BoundingBox): vec3[] {
    return [
      [bounds.min[0], bounds.min[1], bounds.min[2]],
      [bounds.max[0], bounds.min[1], bounds.min[2]],
      [bounds.min[0], bounds.max[1], bounds.min[2]],
      [bounds.max[0], bounds.max[1], bounds.min[2]],
      [bounds.min[0], bounds.min[1], bounds.max[2]],
      [bounds.max[0], bounds.min[1], bounds.max[2]],
      [bounds.min[0], bounds.max[1], bounds.max[2]],
      [bounds.max[0], bounds.max[1], bounds.max[2]],
    ];
  }

  private distanceToCamera(position: vec3, cameraPosition: vec3): number {
    const dx = position[0] - cameraPosition[0];
    const dy = position[1] - cameraPosition[1];
    const dz = position[2] - cameraPosition[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private dotProduct(a: vec3, b: vec3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  /**
   * Get render statistics
   */
  getStatistics(objects: RenderObject[], batches: BatchedDrawCall[]): {
    totalObjects: number;
    visibleObjects: number;
    drawCalls: number;
    triangles: number;
    textureMemory: number;
  } {
    const visible = objects.filter(o => o.visible).length;
    const triangles = batches.reduce((sum, batch) => {
      return sum + (batch.mesh.indices.length / 3) * batch.instanceCount;
    }, 0);

    return {
      totalObjects: objects.length,
      visibleObjects: visible,
      drawCalls: batches.length,
      triangles,
      textureMemory: 0, // Would calculate from texture atlases
    };
  }
}

// Export singleton
export const renderOptimizer = new RenderOptimizer();
