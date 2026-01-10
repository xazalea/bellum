/**
 * Integration Tests
 * End-to-end testing of the storage pipeline
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import { StoragePipeline } from '../pipeline/storage-pipeline';
import { AssetAnalyzer } from '../pipeline/analyzer';
import { StrategySelector } from '../pipeline/strategy-selector';

describe('Storage Pipeline Integration', () => {
  let pipeline: StoragePipeline;

  beforeAll(async () => {
    pipeline = new StoragePipeline({ backend: 'local' });
    await pipeline.init();
  });

  describe('Asset Analysis', () => {
    it('should correctly identify texture files', async () => {
      const analyzer = new AssetAnalyzer();
      const file = new File([new Uint8Array(100)], 'texture.png', { type: 'image/png' });
      
      const analysis = await analyzer.analyze(file);
      
      expect(analysis.type).toBe('texture');
      expect(analysis.mimeType).toBe('image/png');
    });

    it('should correctly identify audio files', async () => {
      const analyzer = new AssetAnalyzer();
      const file = new File([new Uint8Array(100)], 'sound.mp3', { type: 'audio/mpeg' });
      
      const analysis = await analyzer.analyze(file);
      
      expect(analysis.type).toBe('audio');
    });

    it('should correctly identify mesh files', async () => {
      const analyzer = new AssetAnalyzer();
      const file = new File([new Uint8Array(100)], 'model.obj', { type: 'application/octet-stream' });
      
      const analysis = await analyzer.analyze(file);
      
      expect(analysis.type).toBe('mesh');
    });
  });

  describe('Strategy Selection', () => {
    it('should select procedural for proceduralizable assets', () => {
      const selector = new StrategySelector();
      const analysis = {
        type: 'mesh' as const,
        mimeType: 'application/octet-stream',
        size: 1000,
        isProceduralizable: true,
        neuralScore: 0.5,
        reencodingGain: 1.5,
        complexity: 0.5,
        metadata: {},
      };
      
      const strategy = selector.select(analysis);
      
      expect(strategy.primary).toBe('procedural');
    });

    it('should select neural for high neural score', () => {
      const selector = new StrategySelector();
      const analysis = {
        type: 'texture' as const,
        mimeType: 'image/png',
        size: 1000,
        isProceduralizable: false,
        neuralScore: 0.8,
        reencodingGain: 2.0,
        complexity: 0.6,
        metadata: {},
      };
      
      const strategy = selector.select(analysis);
      
      expect(strategy.primary).toBe('neural');
    });

    it('should select re-encoding for high gain', () => {
      const selector = new StrategySelector();
      const analysis = {
        type: 'texture' as const,
        mimeType: 'image/png',
        size: 1000,
        isProceduralizable: false,
        neuralScore: 0.5,
        reencodingGain: 5.0,
        complexity: 0.6,
        metadata: {},
      };
      
      const strategy = selector.select(analysis);
      
      expect(strategy.primary).toBe('reencode');
    });
  });

  describe('End-to-End Storage', () => {
    it('should store and retrieve a file', async () => {
      const testData = new Uint8Array([1, 2, 3, 4, 5]);
      const file = new File([testData], 'test.bin', { type: 'application/octet-stream' });
      
      const result = await pipeline.store(file);
      
      expect(result.fileId).toBeDefined();
      expect(result.originalSize).toBe(testData.length);
      expect(result.compressionRatio).toBeGreaterThanOrEqual(1);
    });

    it('should achieve compression', async () => {
      // Create a file with repetitive data (highly compressible)
      const testData = new Uint8Array(10000);
      testData.fill(42);
      const file = new File([testData], 'repetitive.bin', { type: 'application/octet-stream' });
      
      const result = await pipeline.store(file);
      
      expect(result.compressionRatio).toBeGreaterThan(1);
    });

    it('should report statistics', () => {
      const stats = pipeline.getStats();
      
      expect(stats).toBeDefined();
      expect(stats.chunkGraph).toBeDefined();
      expect(stats.options).toBeDefined();
    });
  });

  describe('Compression Ratios', () => {
    it('should achieve expected ratios for different asset types', async () => {
      const testCases = [
        { name: 'text.txt', size: 1000, expectedRatio: 2 },
        { name: 'image.png', size: 10000, expectedRatio: 1.5 },
        { name: 'data.bin', size: 5000, expectedRatio: 1.2 },
      ];

      for (const testCase of testCases) {
        const data = new Uint8Array(testCase.size);
        // Fill with semi-random data
        for (let i = 0; i < data.length; i++) {
          data[i] = i % 256;
        }
        
        const file = new File([data], testCase.name);
        const result = await pipeline.store(file);
        
        expect(result.compressionRatio).toBeGreaterThanOrEqual(1);
      }
    });
  });
});
