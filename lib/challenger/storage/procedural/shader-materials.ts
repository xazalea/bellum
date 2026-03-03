/**
 * Shader-Based Material Generator
 * Store shader programs and parameters instead of texture atlases
 * Compression: 4K texture (16MB) → ~200 bytes parameters
 */

export type ShaderType =
  | 'fbm_noise'
  | 'perlin_noise'
  | 'voronoi'
  | 'checkerboard'
  | 'gradient'
  | 'wood_grain'
  | 'marble'
  | 'brick'
  | 'tile'
  | 'cellular'
  | 'fractal';

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'add'
  | 'subtract';

export interface ShaderMaterialParams {
  // Noise parameters
  frequency?: number;
  octaves?: number;
  lacunarity?: number;
  persistence?: number;
  scale?: number;
  offset?: [number, number];

  // Color parameters
  colors?: string[];
  colorStops?: number[];
  brightness?: number;
  contrast?: number;
  saturation?: number;

  // Pattern parameters
  tileSize?: number;
  rotation?: number;
  distortion?: number;
  sharpness?: number;

  // Blend mode
  blendMode?: BlendMode;

  // Animation
  animated?: boolean;
  speed?: number;
}

export interface ProceduralMaterialSpec {
  shader: ShaderType;
  seed: number;
  params: ShaderMaterialParams;
  width: number;
  height: number;
  version: number;
}

/**
 * Shader Material Generator
 * Generates textures procedurally using shader-like algorithms
 */
export class ShaderMaterialGenerator {
  /**
   * Generate texture from procedural specification
   */
  static generate(spec: ProceduralMaterialSpec): ImageData {
    const { width, height } = spec;
    const imageData = new ImageData(width, height);
    const data = imageData.data;

    switch (spec.shader) {
      case 'fbm_noise':
        this.generateFBMNoise(data, width, height, spec);
        break;
      case 'perlin_noise':
        this.generatePerlinNoise(data, width, height, spec);
        break;
      case 'voronoi':
        this.generateVoronoi(data, width, height, spec);
        break;
      case 'checkerboard':
        this.generateCheckerboard(data, width, height, spec);
        break;
      case 'gradient':
        this.generateGradient(data, width, height, spec);
        break;
      case 'wood_grain':
        this.generateWoodGrain(data, width, height, spec);
        break;
      case 'marble':
        this.generateMarble(data, width, height, spec);
        break;
      case 'brick':
        this.generateBrick(data, width, height, spec);
        break;
      default:
        this.generateFBMNoise(data, width, height, spec);
    }

    return imageData;
  }

  private static generateFBMNoise(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const frequency = spec.params.frequency || 2.0;
    const octaves = spec.params.octaves || 6;
    const lacunarity = spec.params.lacunarity || 2.0;
    const persistence = spec.params.persistence || 0.5;
    const colors = this.parseColors(spec.params.colors || ['#000000', '#ffffff']);

    const noise = new PerlinNoise(spec.seed);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = y / height;

        let value = 0;
        let amplitude = 1;
        let freq = frequency;

        for (let i = 0; i < octaves; i++) {
          value += amplitude * noise.noise2D(nx * freq, ny * freq);
          freq *= lacunarity;
          amplitude *= persistence;
        }

        // Normalize to 0-1
        value = (value + 1) / 2;

        const color = this.interpolateColors(colors, value);
        const idx = (y * width + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }
  }

  private static generatePerlinNoise(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const scale = spec.params.scale || 10.0;
    const colors = this.parseColors(spec.params.colors || ['#000000', '#ffffff']);
    const noise = new PerlinNoise(spec.seed);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = (noise.noise2D(x / scale, y / scale) + 1) / 2;
        const color = this.interpolateColors(colors, value);
        
        const idx = (y * width + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }
  }

  private static generateVoronoi(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const scale = spec.params.scale || 20.0;
    const colors = this.parseColors(spec.params.colors || ['#ff0000', '#00ff00', '#0000ff']);
    const random = new SeededRandom(spec.seed);

    // Generate random points
    const numPoints = Math.floor((width * height) / (scale * scale));
    const points: [number, number][] = [];
    for (let i = 0; i < numPoints; i++) {
      points.push([random.next() * width, random.next() * height]);
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let minDist = Infinity;
        let closestPoint = 0;

        for (let i = 0; i < points.length; i++) {
          const dx = x - points[i][0];
          const dy = y - points[i][1];
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < minDist) {
            minDist = dist;
            closestPoint = i;
          }
        }

        const colorIndex = closestPoint % colors.length;
        const color = colors[colorIndex];

        const idx = (y * width + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }
  }

  private static generateCheckerboard(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const tileSize = spec.params.tileSize || 32;
    const colors = this.parseColors(spec.params.colors || ['#ffffff', '#000000']);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileX = Math.floor(x / tileSize);
        const tileY = Math.floor(y / tileSize);
        const colorIndex = (tileX + tileY) % 2;
        const color = colors[colorIndex];

        const idx = (y * width + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }
  }

  private static generateGradient(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const colors = this.parseColors(spec.params.colors || ['#ff0000', '#0000ff']);
    const rotation = spec.params.rotation || 0;

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width - 0.5;
        const ny = y / height - 0.5;

        const rotX = nx * cos - ny * sin + 0.5;
        const t = Math.max(0, Math.min(1, rotX));

        const color = this.interpolateColors(colors, t);

        const idx = (y * width + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }
  }

  private static generateWoodGrain(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const scale = spec.params.scale || 10.0;
    const colors = this.parseColors(spec.params.colors || ['#8B4513', '#D2691E', '#A0522D']);
    const noise = new PerlinNoise(spec.seed);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = y / height;

        // Create concentric rings
        const dx = nx - 0.5;
        const dy = ny - 0.5;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Add noise for irregularity
        const noiseValue = noise.noise2D(nx * scale, ny * scale);
        const rings = Math.sin((dist + noiseValue * 0.1) * 50);

        const value = (rings + 1) / 2;
        const color = this.interpolateColors(colors, value);

        const idx = (y * width + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }
  }

  private static generateMarble(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const scale = spec.params.scale || 5.0;
    const colors = this.parseColors(spec.params.colors || ['#ffffff', '#cccccc', '#999999']);
    const noise = new PerlinNoise(spec.seed);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const nx = x / width;
        const ny = y / height;

        // Create marble veins
        const noiseValue = noise.noise2D(nx * scale, ny * scale);
        const marble = Math.sin((nx + noiseValue) * 10);

        const value = (marble + 1) / 2;
        const color = this.interpolateColors(colors, value);

        const idx = (y * width + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = 255;
      }
    }
  }

  private static generateBrick(data: Uint8ClampedArray, width: number, height: number, spec: ProceduralMaterialSpec): void {
    const tileSize = spec.params.tileSize || 64;
    const colors = this.parseColors(spec.params.colors || ['#8B4513', '#654321']);
    const mortarColor = [200, 200, 200] as [number, number, number];
    const mortarWidth = 4;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const row = Math.floor(y / tileSize);
        const col = Math.floor((x + (row % 2) * (tileSize / 2)) / tileSize);

        const localX = x % tileSize;
        const localY = y % tileSize;

        // Mortar
        if (localX < mortarWidth || localY < mortarWidth) {
          const idx = (y * width + x) * 4;
          data[idx] = mortarColor[0];
          data[idx + 1] = mortarColor[1];
          data[idx + 2] = mortarColor[2];
          data[idx + 3] = 255;
        } else {
          const colorIndex = (row + col) % colors.length;
          const color = colors[colorIndex];

          const idx = (y * width + x) * 4;
          data[idx] = color[0];
          data[idx + 1] = color[1];
          data[idx + 2] = color[2];
          data[idx + 3] = 255;
        }
      }
    }
  }

  private static parseColors(colorStrings: string[]): Array<[number, number, number]> {
    return colorStrings.map(str => {
      const hex = str.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return [r, g, b] as [number, number, number];
    });
  }

  private static interpolateColors(colors: Array<[number, number, number]>, t: number): [number, number, number] {
    if (colors.length === 1) return colors[0];

    t = Math.max(0, Math.min(1, t));
    const scaledT = t * (colors.length - 1);
    const index = Math.floor(scaledT);
    const frac = scaledT - index;

    if (index >= colors.length - 1) return colors[colors.length - 1];

    const c1 = colors[index];
    const c2 = colors[index + 1];

    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * frac),
      Math.round(c1[1] + (c2[1] - c1[1]) * frac),
      Math.round(c1[2] + (c2[2] - c1[2]) * frac),
    ];
  }

  /**
   * Serialize spec to compact binary format
   */
  static serializeSpec(spec: ProceduralMaterialSpec): Uint8Array {
    const json = JSON.stringify(spec);
    const encoder = new TextEncoder();
    return encoder.encode(json);
  }

  /**
   * Deserialize spec from binary format
   */
  static deserializeSpec(data: Uint8Array): ProceduralMaterialSpec {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }
}

/**
 * Seeded random number generator
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
}

/**
 * Perlin noise implementation
 */
class PerlinNoise {
  private perm: Uint8Array;
  private grad2: Float32Array;

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

    // Gradient vectors for 2D
    this.grad2 = new Float32Array([
      1, 1, -1, 1, 1, -1, -1, -1,
      1, 0, -1, 0, 0, 1, 0, -1,
    ]);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.perm[X] + Y;
    const b = this.perm[X + 1] + Y;

    return this.lerp(
      v,
      this.lerp(u, this.grad(this.perm[a], x, y), this.grad(this.perm[b], x - 1, y)),
      this.lerp(u, this.grad(this.perm[a + 1], x, y - 1), this.grad(this.perm[b + 1], x - 1, y - 1))
    );
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const gx = this.grad2[h * 2];
    const gy = this.grad2[h * 2 + 1];
    return gx * x + gy * y;
  }
}
