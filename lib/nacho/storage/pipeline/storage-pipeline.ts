/**
 * Unified Storage Pipeline
 * Orchestrates all compression techniques for maximum efficiency
 */

import { ChunkGraph } from '../dedupe/chunk-graph';
import { getDedupeIndex } from '../dedupe/dedupe-index';
import { ProceduralMeshGenerator, ProceduralMeshSpec } from '../procedural/mesh-generator';
import { ShaderMaterialGenerator, ProceduralMaterialSpec } from '../procedural/shader-materials';
import { ParametricAudioSynthesizer, ProceduralAudioSpec } from '../procedural/audio-synthesis';
import { ParametricAnimationCurves, ProceduralAnimationSpec } from '../procedural/animation-curves';
import { TextureReencoder } from '../reencoder/texture-reencoder';
import { AudioReencoder } from '../reencoder/audio-reencoder';
import { VideoReencoder } from '../reencoder/video-reencoder';
import { createNeuralCodec, WANeuralCodec } from '../neural/wasm-codec';
import { AssetAnalyzer, AssetAnalysis } from './analyzer';
import { StrategySelector, CompressionStrategy } from './strategy-selector';

export type StorageBackend = 'telegram' | 'discord' | 'local' | 'cdn';

export interface StorageOptions {
  backend?: StorageBackend;
  preferredBackends?: StorageBackend[]; // Try backends in order
  enableProceduralGeneration?: boolean;
  enableDeduplication?: boolean;
  enableReencoding?: boolean;
  enableNeuralCompression?: boolean;
  chunkSize?: number;
}

export interface StorageResult {
  fileId: string;
  originalSize: number;
  storedSize: number;
  compressionRatio: number;
  strategy: CompressionStrategy;
  chunks: string[]; // Chunk hashes
  metadata: {
    proceduralSpec?: any;
    encoding?: string;
    format?: string;
  };
}

/**
 * Storage Pipeline
 * Main orchestrator for the advanced storage system
 */
export class StoragePipeline {
  private analyzer: AssetAnalyzer;
  private strategySelector: StrategySelector;
  private chunkGraph: ChunkGraph;
  private neuralCodec: WANeuralCodec | null = null;
  private options: Required<StorageOptions>;

  constructor(options: StorageOptions) {
    this.options = {
      backend: options.backend || 'local',
      preferredBackends: options.preferredBackends || ['discord', 'telegram', 'local'],
      enableProceduralGeneration: true,
      enableDeduplication: true,
      enableReencoding: true,
      enableNeuralCompression: true,
      chunkSize: 32 * 1024, // 32KB
      ...options,
    };

    this.analyzer = new AssetAnalyzer();
    this.strategySelector = new StrategySelector();
    this.chunkGraph = new ChunkGraph({ targetChunkSize: this.options.chunkSize });
  }

  /**
   * Initialize the pipeline
   */
  async init(): Promise<void> {
    // Initialize neural codec if enabled
    if (this.options.enableNeuralCompression) {
      this.neuralCodec = await createNeuralCodec();
    }

    // Load deduplication index
    if (this.options.enableDeduplication) {
      const dedupeIndex = await getDedupeIndex();
      await dedupeIndex.load();
    }

    console.log('[StoragePipeline] Initialized');
  }

  /**
   * Store a file with optimal compression
   */
  async store(file: File): Promise<StorageResult> {
    console.log(`[StoragePipeline] Storing file: ${file.name} (${file.size} bytes)`);

    // 1. Analyze asset
    const analysis = await this.analyzer.analyze(file);
    console.log(`[StoragePipeline] Asset type: ${analysis.type}, proceduralizable: ${analysis.isProceduralizable}`);

    // 2. Choose strategy
    const strategy = this.strategySelector.select(analysis, {
      enableProcedural: this.options.enableProceduralGeneration,
      enableReencoding: this.options.enableReencoding,
      enableNeural: this.options.enableNeuralCompression,
    });
    console.log(`[StoragePipeline] Strategy: ${strategy.primary} (fallback: ${strategy.fallback})`);

    // 3. Apply transformations
    let data: Uint8Array;
    let metadata: StorageResult['metadata'] = {};

    try {
      switch (strategy.primary) {
        case 'procedural':
          const proceduralResult = await this.applyProceduralGeneration(file, analysis);
          data = proceduralResult.data;
          metadata.proceduralSpec = proceduralResult.spec;
          break;

        case 'neural':
          if (this.neuralCodec) {
            const neuralResult = await this.applyNeuralCompression(file);
            data = neuralResult;
            metadata.encoding = 'neural';
          } else {
            data = new Uint8Array(await file.arrayBuffer());
          }
          break;

        case 'reencode':
          const reencodedResult = await this.applyReencoding(file, analysis);
          data = reencodedResult.data;
          metadata.encoding = reencodedResult.encoding;
          metadata.format = reencodedResult.format;
          break;

        default:
          data = new Uint8Array(await file.arrayBuffer());
      }
    } catch (error) {
      console.warn(`[StoragePipeline] Primary strategy failed, using fallback:`, error);
      data = new Uint8Array(await file.arrayBuffer());
    }

    // 4. Apply deduplication
    let chunks: string[];
    if (this.options.enableDeduplication) {
      chunks = await this.applyDeduplication(data);
    } else {
      // Single chunk
      const chunkHash = await this.storeChunk(data);
      chunks = [chunkHash];
    }

    // 5. Register file
    const fileId = this.generateFileId(file.name);
    this.chunkGraph.registerFile(fileId, chunks, file.size, this.options.chunkSize);

    // 6. Save deduplication index
    if (this.options.enableDeduplication) {
      const dedupeIndex = await getDedupeIndex();
      await dedupeIndex.save();
    }

    const storedSize = chunks.reduce((sum, hash) => {
      const chunk = this.chunkGraph.getChunk(hash);
      return sum + (chunk?.size || 0);
    }, 0);

    console.log(`[StoragePipeline] Stored ${file.name}: ${file.size} → ${storedSize} bytes (${(file.size / storedSize).toFixed(2)}x)`);

    return {
      fileId,
      originalSize: file.size,
      storedSize,
      compressionRatio: file.size / storedSize,
      strategy,
      chunks,
      metadata,
    };
  }

  /**
   * Retrieve a file
   */
  async retrieve(fileId: string): Promise<Blob> {
    const fileGraph = this.chunkGraph.getFile(fileId);
    if (!fileGraph) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Retrieve chunks
    const chunkData: Uint8Array[] = [];
    for (const hash of fileGraph.chunks) {
      const chunk = this.chunkGraph.getChunk(hash);
      if (!chunk) {
        throw new Error(`Chunk not found: ${hash}`);
      }

      const data = await this.retrieveChunk(chunk.storageId);
      chunkData.push(data);
    }

    // Concatenate chunks
    const totalSize = chunkData.reduce((sum, chunk) => sum + chunk.length, 0);
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunkData) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return new Blob([combined]);
  }

  private async applyProceduralGeneration(
    file: File,
    analysis: AssetAnalysis
  ): Promise<{ data: Uint8Array; spec: any }> {
    const arrayBuffer = await file.arrayBuffer();

    switch (analysis.type) {
      case 'mesh': {
        // Extract mesh spec (simplified - would need actual mesh parsing)
        const spec: ProceduralMeshSpec = {
          type: 'sphere',
          seed: Date.now(),
          params: { radius: 1, widthSegments: 32, heightSegments: 16 },
          version: 1,
        };
        const data = ProceduralMeshGenerator.serializeSpec(spec);
        return { data, spec };
      }

      case 'texture': {
        // Extract material spec (simplified)
        const spec: ProceduralMaterialSpec = {
          shader: 'fbm_noise',
          seed: Date.now(),
          params: { frequency: 2.0, octaves: 6 },
          width: 512,
          height: 512,
          version: 1,
        };
        const data = ShaderMaterialGenerator.serializeSpec(spec);
        return { data, spec };
      }

      case 'audio': {
        // Extract audio spec (simplified)
        const spec: ProceduralAudioSpec = {
          oscillator: 'sine',
          envelope: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.5 },
          sampleRate: 44100,
          duration: 1.0,
          seed: Date.now(),
          version: 1,
        };
        const data = ParametricAudioSynthesizer.serializeSpec(spec);
        return { data, spec };
      }

      default:
        throw new Error(`Unsupported procedural type: ${analysis.type}`);
    }
  }

  private async applyNeuralCompression(file: File): Promise<Uint8Array> {
    if (!this.neuralCodec) {
      throw new Error('Neural codec not initialized');
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const result = await this.neuralCodec.compress(data);
    return result.latent.quantized;
  }

  private async applyReencoding(
    file: File,
    analysis: AssetAnalysis
  ): Promise<{ data: Uint8Array; encoding: string; format?: string }> {
    switch (analysis.type) {
      case 'texture': {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');
        ctx.drawImage(bitmap, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const result = await TextureReencoder.reencode(imageData);
        return { data: result.data, encoding: 'texture', format: result.format };
      }

      case 'audio': {
        const audioContext = new AudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const result = await AudioReencoder.reencode(audioBuffer);
        return { data: result.data, encoding: 'audio', format: result.encoding };
      }

      default:
        throw new Error(`Unsupported re-encoding type: ${analysis.type}`);
    }
  }

  private async applyDeduplication(data: Uint8Array): Promise<string[]> {
    const chunks = await this.chunkGraph.splitIntoChunks(data);
    const hashes: string[] = [];

    for (const chunk of chunks) {
      const hash = await this.storeChunk(chunk);
      hashes.push(hash);
    }

    return hashes;
  }

  private async storeChunk(data: Uint8Array): Promise<string> {
    // Store chunk to backend (Telegram, local, etc.)
    const storageId = await this.uploadToBackend(data);
    const hash = this.chunkGraph.addChunk(data, this.options.backend, storageId);
    return hash;
  }

  private async retrieveChunk(storageId: string): Promise<Uint8Array> {
    // Retrieve chunk from backend
    return this.downloadFromBackend(storageId);
  }

  private async uploadToBackend(data: Uint8Array): Promise<string> {
    // Implement actual upload to Telegram/local/CDN
    // For now, return a dummy ID
    return `chunk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async downloadFromBackend(storageId: string): Promise<Uint8Array> {
    // Implement actual download from Telegram/local/CDN
    // For now, return empty data
    return new Uint8Array(0);
  }

  private generateFileId(filename: string): string {
    return `file_${Date.now()}_${filename.replace(/[^a-zA-Z0-9]/g, '_')}`;
  }

  /**
   * Get pipeline statistics
   */
  getStats() {
    return {
      chunkGraph: this.chunkGraph.getStats(),
      neuralCodec: this.neuralCodec?.getStats(),
      options: this.options,
    };
  }
}
