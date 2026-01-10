/**
 * Asset Analyzer
 * Detects asset type and determines optimal compression strategy
 */

export type AssetType =
  | 'mesh'
  | 'texture'
  | 'audio'
  | 'video'
  | 'animation'
  | 'document'
  | 'code'
  | 'binary'
  | 'unknown';

export interface AssetAnalysis {
  type: AssetType;
  mimeType: string;
  size: number;
  isProceduralizable: boolean;
  neuralScore: number; // 0-1, higher = better for neural compression
  reencodingGain: number; // Estimated compression ratio from re-encoding
  complexity: number; // 0-1, higher = more complex
  metadata: Record<string, any>;
}

/**
 * Asset Analyzer
 */
export class AssetAnalyzer {
  /**
   * Analyze a file to determine optimal compression strategy
   */
  async analyze(file: File): Promise<AssetAnalysis> {
    const type = this.detectType(file);
    const size = file.size;
    const mimeType = file.type || 'application/octet-stream';

    let isProceduralizable = false;
    let neuralScore = 0.5;
    let reencodingGain = 1.0;
    let complexity = 0.5;
    const metadata: Record<string, any> = {};

    switch (type) {
      case 'mesh':
        isProceduralizable = await this.isMeshProceduralizable(file);
        neuralScore = 0.6;
        reencodingGain = 1.5;
        complexity = 0.7;
        break;

      case 'texture':
        isProceduralizable = await this.isTextureProceduralizable(file);
        neuralScore = 0.8;
        reencodingGain = 4.0; // BC7/BC5 compression
        complexity = await this.analyzeTextureComplexity(file);
        break;

      case 'audio':
        isProceduralizable = await this.isAudioProceduralizable(file);
        neuralScore = 0.7;
        reencodingGain = 10.0; // Opus compression
        complexity = 0.6;
        break;

      case 'video':
        isProceduralizable = false;
        neuralScore = 0.5;
        reencodingGain = 15.0; // Motion field compression
        complexity = 0.8;
        break;

      case 'animation':
        isProceduralizable = true;
        neuralScore = 0.4;
        reencodingGain = 2.0;
        complexity = 0.5;
        break;

      case 'document':
      case 'code':
        isProceduralizable = false;
        neuralScore = 0.3;
        reencodingGain = 3.0; // Text compression
        complexity = 0.3;
        break;

      default:
        isProceduralizable = false;
        neuralScore = 0.5;
        reencodingGain = 1.5;
        complexity = 0.5;
    }

    return {
      type,
      mimeType,
      size,
      isProceduralizable,
      neuralScore,
      reencodingGain,
      complexity,
      metadata,
    };
  }

  private detectType(file: File): AssetType {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const mime = file.type.toLowerCase();

    // Mesh formats
    if (['obj', 'fbx', 'gltf', 'glb', 'stl', 'ply'].includes(ext)) {
      return 'mesh';
    }

    // Texture formats
    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'tga', 'dds'].includes(ext)) {
      return 'texture';
    }

    // Audio formats
    if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) {
      return 'audio';
    }

    // Video formats
    if (mime.startsWith('video/') || ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
      return 'video';
    }

    // Animation formats
    if (['anim', 'fbx', 'bvh'].includes(ext)) {
      return 'animation';
    }

    // Document formats
    if (['txt', 'md', 'json', 'xml', 'html', 'css', 'pdf', 'doc', 'docx'].includes(ext)) {
      return 'document';
    }

    // Code formats
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'rs', 'go'].includes(ext)) {
      return 'code';
    }

    // Binary formats
    if (['exe', 'dll', 'so', 'dylib', 'wasm', 'bin'].includes(ext)) {
      return 'binary';
    }

    return 'unknown';
  }

  private async isMeshProceduralizable(file: File): Promise<boolean> {
    // Simple heuristic: small meshes are more likely to be procedural
    return file.size < 100 * 1024; // < 100KB
  }

  private async isTextureProceduralizable(file: File): Promise<boolean> {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(bitmap.width, 64);
      canvas.height = Math.min(bitmap.height, 64);
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Check for patterns that suggest procedural generation
      const variance = this.calculateVariance(imageData.data);
      const entropy = this.calculateEntropy(imageData.data);

      // Low variance + low entropy = likely procedural
      return variance < 1000 && entropy < 4.0;
    } catch {
      return false;
    }
  }

  private async isAudioProceduralizable(file: File): Promise<boolean> {
    // Simple heuristic: short audio clips are more likely to be synthesizable
    return file.size < 500 * 1024; // < 500KB
  }

  private async analyzeTextureComplexity(file: File): Promise<number> {
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(bitmap.width, 128);
      canvas.height = Math.min(bitmap.height, 128);
      const ctx = canvas.getContext('2d');
      if (!ctx) return 0.5;

      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const entropy = this.calculateEntropy(imageData.data);
      // Normalize entropy to 0-1 (max entropy for 8-bit is 8)
      return Math.min(entropy / 8, 1);
    } catch {
      return 0.5;
    }
  }

  private calculateVariance(data: Uint8ClampedArray): number {
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += data[i]; // Red channel
    }
    const mean = sum / (data.length / 4);

    let variance = 0;
    for (let i = 0; i < data.length; i += 4) {
      const diff = data[i] - mean;
      variance += diff * diff;
    }
    return variance / (data.length / 4);
  }

  private calculateEntropy(data: Uint8ClampedArray): number {
    const histogram = new Array(256).fill(0);
    
    for (let i = 0; i < data.length; i += 4) {
      histogram[data[i]]++; // Red channel
    }

    const total = data.length / 4;
    let entropy = 0;

    for (const count of histogram) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }
}
