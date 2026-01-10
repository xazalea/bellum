/**
 * Procedural Mesh Generator
 * Store mesh generation instructions instead of vertex data
 * Compression: 1MB vertex buffer → ~120 bytes parameters
 */

export type MeshType =
  | 'sphere'
  | 'cube'
  | 'cylinder'
  | 'torus'
  | 'plane'
  | 'noise_displaced_plane'
  | 'parametric_surface'
  | 'icosphere'
  | 'capsule';

export interface MeshParams {
  // Common parameters
  segments?: number;
  radius?: number;
  width?: number;
  height?: number;
  depth?: number;

  // Sphere/Icosphere
  widthSegments?: number;
  heightSegments?: number;
  subdivisions?: number;

  // Cylinder/Capsule
  radialSegments?: number;
  heightSegments?: number;
  openEnded?: boolean;

  // Torus
  tube?: number;
  tubularSegments?: number;

  // Noise displacement
  noiseScale?: number;
  noiseOctaves?: number;
  noiseLacunarity?: number;
  noisePersistence?: number;
  amplitude?: number;

  // Parametric surface
  uMin?: number;
  uMax?: number;
  vMin?: number;
  vMax?: number;
  uSegments?: number;
  vSegments?: number;
}

export interface ModifierSpec {
  type: 'subdivide' | 'smooth' | 'displace' | 'twist' | 'bend' | 'taper';
  params: Record<string, number>;
}

export interface ProceduralMeshSpec {
  type: MeshType;
  seed: number;
  params: MeshParams;
  modifiers?: ModifierSpec[];
  version: number;
}

export interface MeshData {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
}

/**
 * Seeded random number generator (Mulberry32)
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  next(): number {
    let t = (this.state += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
}

/**
 * Simplex noise implementation for procedural displacement
 */
class SimplexNoise {
  private perm: Uint8Array;
  private grad3: Float32Array;

  constructor(seed: number) {
    const random = new SeededRandom(seed);
    
    // Initialize permutation table
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    
    // Shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(random.next() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }

    // Gradient vectors
    this.grad3 = new Float32Array([
      1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
      1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1,
    ]);
  }

  noise3D(x: number, y: number, z: number): number {
    // Simplex noise implementation
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;

    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;

    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
      } else {
        i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
      } else if (x0 < z0) {
        i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
      } else {
        i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    const ii = i & 255;
    const jj = j & 255;
    const kk = k & 255;

    const gi0 = this.perm[ii + this.perm[jj + this.perm[kk]]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1 + this.perm[kk + k1]]] % 12;
    const gi2 = this.perm[ii + i2 + this.perm[jj + j2 + this.perm[kk + k2]]] % 12;
    const gi3 = this.perm[ii + 1 + this.perm[jj + 1 + this.perm[kk + 1]]] % 12;

    let n0, n1, n2, n3;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(gi0, x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(gi1, x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(gi2, x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0) n3 = 0.0;
    else {
      t3 *= t3;
      n3 = t3 * t3 * this.dot(gi3, x3, y3, z3);
    }

    return 32.0 * (n0 + n1 + n2 + n3);
  }

  private dot(gi: number, x: number, y: number, z: number): number {
    const g = gi * 3;
    return this.grad3[g] * x + this.grad3[g + 1] * y + this.grad3[g + 2] * z;
  }

  fbm(x: number, y: number, z: number, octaves: number, lacunarity: number, persistence: number): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise3D(x * frequency, y * frequency, z * frequency);
      frequency *= lacunarity;
      amplitude *= persistence;
    }

    return value;
  }
}

/**
 * Procedural Mesh Generator
 */
export class ProceduralMeshGenerator {
  /**
   * Extract procedural specification from mesh data
   * Attempts to detect if mesh can be represented procedurally
   */
  static extractSpec(meshData: MeshData): ProceduralMeshSpec | null {
    // Analyze mesh to detect if it's procedural
    // For now, return null (not procedural)
    // In a real implementation, this would use heuristics to detect
    // common procedural patterns
    return null;
  }

  /**
   * Generate mesh from procedural specification
   */
  static generate(spec: ProceduralMeshSpec): MeshData {
    switch (spec.type) {
      case 'sphere':
        return this.generateSphere(spec);
      case 'cube':
        return this.generateCube(spec);
      case 'plane':
        return this.generatePlane(spec);
      case 'noise_displaced_plane':
        return this.generateNoiseDisplacedPlane(spec);
      case 'cylinder':
        return this.generateCylinder(spec);
      case 'torus':
        return this.generateTorus(spec);
      case 'icosphere':
        return this.generateIcosphere(spec);
      default:
        throw new Error(`Unsupported mesh type: ${spec.type}`);
    }
  }

  private static generateSphere(spec: ProceduralMeshSpec): MeshData {
    const radius = spec.params.radius || 1;
    const widthSegments = spec.params.widthSegments || 32;
    const heightSegments = spec.params.heightSegments || 16;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const phi = v * Math.PI;

      for (let x = 0; x <= widthSegments; x++) {
        const u = x / widthSegments;
        const theta = u * Math.PI * 2;

        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        const nx = sinPhi * cosTheta;
        const ny = cosPhi;
        const nz = sinPhi * sinTheta;

        positions.push(radius * nx, radius * ny, radius * nz);
        normals.push(nx, ny, nz);
        uvs.push(u, v);
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < widthSegments; x++) {
        const a = y * (widthSegments + 1) + x;
        const b = a + widthSegments + 1;

        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
    };
  }

  private static generateCube(spec: ProceduralMeshSpec): MeshData {
    const width = spec.params.width || 1;
    const height = spec.params.height || 1;
    const depth = spec.params.depth || 1;

    const w = width / 2;
    const h = height / 2;
    const d = depth / 2;

    const positions = new Float32Array([
      // Front
      -w, -h, d, w, -h, d, w, h, d, -w, h, d,
      // Back
      -w, -h, -d, -w, h, -d, w, h, -d, w, -h, -d,
      // Top
      -w, h, -d, -w, h, d, w, h, d, w, h, -d,
      // Bottom
      -w, -h, -d, w, -h, -d, w, -h, d, -w, -h, d,
      // Right
      w, -h, -d, w, h, -d, w, h, d, w, -h, d,
      // Left
      -w, -h, -d, -w, -h, d, -w, h, d, -w, h, -d,
    ]);

    const normals = new Float32Array([
      // Front
      0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
      // Back
      0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
      // Top
      0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
      // Bottom
      0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
      // Right
      1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
      // Left
      -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
    ]);

    const uvs = new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
    ]);

    const indices = new Uint32Array([
      0, 1, 2, 0, 2, 3,       // Front
      4, 5, 6, 4, 6, 7,       // Back
      8, 9, 10, 8, 10, 11,    // Top
      12, 13, 14, 12, 14, 15, // Bottom
      16, 17, 18, 16, 18, 19, // Right
      20, 21, 22, 20, 22, 23, // Left
    ]);

    return { positions, normals, uvs, indices };
  }

  private static generatePlane(spec: ProceduralMeshSpec): MeshData {
    const width = spec.params.width || 1;
    const height = spec.params.height || 1;
    const widthSegments = spec.params.widthSegments || 1;
    const heightSegments = spec.params.heightSegments || 1;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const w = width / 2;
    const h = height / 2;

    for (let iy = 0; iy <= heightSegments; iy++) {
      const y = iy / heightSegments;
      for (let ix = 0; ix <= widthSegments; ix++) {
        const x = ix / widthSegments;

        positions.push(
          (x - 0.5) * width,
          0,
          (y - 0.5) * height
        );
        normals.push(0, 1, 0);
        uvs.push(x, y);
      }
    }

    for (let iy = 0; iy < heightSegments; iy++) {
      for (let ix = 0; ix < widthSegments; ix++) {
        const a = ix + (widthSegments + 1) * iy;
        const b = ix + (widthSegments + 1) * (iy + 1);
        const c = (ix + 1) + (widthSegments + 1) * (iy + 1);
        const d = (ix + 1) + (widthSegments + 1) * iy;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
    };
  }

  private static generateNoiseDisplacedPlane(spec: ProceduralMeshSpec): MeshData {
    const planeMesh = this.generatePlane(spec);
    const noise = new SimplexNoise(spec.seed);

    const scale = spec.params.noiseScale || 0.5;
    const octaves = spec.params.noiseOctaves || 4;
    const lacunarity = spec.params.noiseLacunarity || 2.0;
    const persistence = spec.params.noisePersistence || 0.5;
    const amplitude = spec.params.amplitude || 1.0;

    const positions = planeMesh.positions;
    const normals = new Float32Array(positions.length);

    // Displace vertices
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];

      const displacement = noise.fbm(x * scale, 0, z * scale, octaves, lacunarity, persistence);
      positions[i + 1] = displacement * amplitude;
    }

    // Recalculate normals
    this.calculateNormals(positions, planeMesh.indices, normals);

    return {
      positions,
      normals,
      uvs: planeMesh.uvs,
      indices: planeMesh.indices,
    };
  }

  private static generateCylinder(spec: ProceduralMeshSpec): MeshData {
    const radius = spec.params.radius || 1;
    const height = spec.params.height || 2;
    const radialSegments = spec.params.radialSegments || 32;
    const heightSegments = spec.params.heightSegments || 1;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const halfHeight = height / 2;

    for (let y = 0; y <= heightSegments; y++) {
      const v = y / heightSegments;
      const posY = v * height - halfHeight;

      for (let x = 0; x <= radialSegments; x++) {
        const u = x / radialSegments;
        const theta = u * Math.PI * 2;

        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);

        positions.push(radius * cosTheta, posY, radius * sinTheta);
        normals.push(cosTheta, 0, sinTheta);
        uvs.push(u, v);
      }
    }

    for (let y = 0; y < heightSegments; y++) {
      for (let x = 0; x < radialSegments; x++) {
        const a = y * (radialSegments + 1) + x;
        const b = a + radialSegments + 1;

        indices.push(a, b, a + 1);
        indices.push(b, b + 1, a + 1);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
    };
  }

  private static generateTorus(spec: ProceduralMeshSpec): MeshData {
    const radius = spec.params.radius || 1;
    const tube = spec.params.tube || 0.4;
    const radialSegments = spec.params.radialSegments || 32;
    const tubularSegments = spec.params.tubularSegments || 24;

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let j = 0; j <= radialSegments; j++) {
      for (let i = 0; i <= tubularSegments; i++) {
        const u = (i / tubularSegments) * Math.PI * 2;
        const v = (j / radialSegments) * Math.PI * 2;

        const x = (radius + tube * Math.cos(v)) * Math.cos(u);
        const y = (radius + tube * Math.cos(v)) * Math.sin(u);
        const z = tube * Math.sin(v);

        positions.push(x, y, z);

        const cx = radius * Math.cos(u);
        const cy = radius * Math.sin(u);
        const nx = x - cx;
        const ny = y - cy;
        const nz = z;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

        normals.push(nx / len, ny / len, nz / len);
        uvs.push(i / tubularSegments, j / radialSegments);
      }
    }

    for (let j = 1; j <= radialSegments; j++) {
      for (let i = 1; i <= tubularSegments; i++) {
        const a = (tubularSegments + 1) * j + i - 1;
        const b = (tubularSegments + 1) * (j - 1) + i - 1;
        const c = (tubularSegments + 1) * (j - 1) + i;
        const d = (tubularSegments + 1) * j + i;

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
    };
  }

  private static generateIcosphere(spec: ProceduralMeshSpec): MeshData {
    const radius = spec.params.radius || 1;
    const subdivisions = spec.params.subdivisions || 2;

    // Start with icosahedron
    const t = (1.0 + Math.sqrt(5.0)) / 2.0;

    const positions: number[] = [
      -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t, 0,
      0, -1, t, 0, 1, t, 0, -1, -t, 0, 1, -t,
      t, 0, -1, t, 0, 1, -t, 0, -1, -t, 0, 1,
    ];

    const indices: number[] = [
      0, 11, 5, 0, 5, 1, 0, 1, 7, 0, 7, 10, 0, 10, 11,
      1, 5, 9, 5, 11, 4, 11, 10, 2, 10, 7, 6, 7, 1, 8,
      3, 9, 4, 3, 4, 2, 3, 2, 6, 3, 6, 8, 3, 8, 9,
      4, 9, 5, 2, 4, 11, 6, 2, 10, 8, 6, 7, 9, 8, 1,
    ];

    // Subdivide
    for (let i = 0; i < subdivisions; i++) {
      const newIndices: number[] = [];
      const midpointCache = new Map<string, number>();

      const getMidpoint = (i1: number, i2: number): number => {
        const key = i1 < i2 ? `${i1},${i2}` : `${i2},${i1}`;
        if (midpointCache.has(key)) return midpointCache.get(key)!;

        const x = (positions[i1 * 3] + positions[i2 * 3]) / 2;
        const y = (positions[i1 * 3 + 1] + positions[i2 * 3 + 1]) / 2;
        const z = (positions[i1 * 3 + 2] + positions[i2 * 3 + 2]) / 2;

        const len = Math.sqrt(x * x + y * y + z * z);
        positions.push(x / len, y / len, z / len);

        const index = positions.length / 3 - 1;
        midpointCache.set(key, index);
        return index;
      };

      for (let j = 0; j < indices.length; j += 3) {
        const v1 = indices[j];
        const v2 = indices[j + 1];
        const v3 = indices[j + 2];

        const a = getMidpoint(v1, v2);
        const b = getMidpoint(v2, v3);
        const c = getMidpoint(v3, v1);

        newIndices.push(v1, a, c, v2, b, a, v3, c, b, a, b, c);
      }

      indices.length = 0;
      indices.push(...newIndices);
    }

    // Scale to radius and calculate normals
    const normals: number[] = [];
    const uvs: number[] = [];

    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      positions[i] = x * radius;
      positions[i + 1] = y * radius;
      positions[i + 2] = z * radius;

      normals.push(x, y, z);

      // Spherical UV mapping
      const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);
      const v = 0.5 - Math.asin(y) / Math.PI;
      uvs.push(u, v);
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array(uvs),
      indices: new Uint32Array(indices),
    };
  }

  private static calculateNormals(positions: Float32Array, indices: Uint32Array, normals: Float32Array): void {
    // Initialize normals to zero
    for (let i = 0; i < normals.length; i++) {
      normals[i] = 0;
    }

    // Calculate face normals and accumulate
    for (let i = 0; i < indices.length; i += 3) {
      const i1 = indices[i] * 3;
      const i2 = indices[i + 1] * 3;
      const i3 = indices[i + 2] * 3;

      const v1x = positions[i1];
      const v1y = positions[i1 + 1];
      const v1z = positions[i1 + 2];

      const v2x = positions[i2];
      const v2y = positions[i2 + 1];
      const v2z = positions[i2 + 2];

      const v3x = positions[i3];
      const v3y = positions[i3 + 1];
      const v3z = positions[i3 + 2];

      // Edge vectors
      const e1x = v2x - v1x;
      const e1y = v2y - v1y;
      const e1z = v2z - v1z;

      const e2x = v3x - v1x;
      const e2y = v3y - v1y;
      const e2z = v3z - v1z;

      // Cross product
      const nx = e1y * e2z - e1z * e2y;
      const ny = e1z * e2x - e1x * e2z;
      const nz = e1x * e2y - e1y * e2x;

      // Accumulate
      normals[i1] += nx;
      normals[i1 + 1] += ny;
      normals[i1 + 2] += nz;

      normals[i2] += nx;
      normals[i2 + 1] += ny;
      normals[i2 + 2] += nz;

      normals[i3] += nx;
      normals[i3 + 1] += ny;
      normals[i3 + 2] += nz;
    }

    // Normalize
    for (let i = 0; i < normals.length; i += 3) {
      const x = normals[i];
      const y = normals[i + 1];
      const z = normals[i + 2];
      const len = Math.sqrt(x * x + y * y + z * z);

      if (len > 0) {
        normals[i] = x / len;
        normals[i + 1] = y / len;
        normals[i + 2] = z / len;
      }
    }
  }

  /**
   * Serialize spec to compact binary format
   */
  static serializeSpec(spec: ProceduralMeshSpec): Uint8Array {
    const json = JSON.stringify(spec);
    const encoder = new TextEncoder();
    return encoder.encode(json);
  }

  /**
   * Deserialize spec from binary format
   */
  static deserializeSpec(data: Uint8Array): ProceduralMeshSpec {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }
}
