/**
 * Strategy Selector
 * Chooses optimal compression strategy based on asset analysis
 */

import { AssetAnalysis } from './analyzer';

export type CompressionStrategyType = 'procedural' | 'neural' | 'reencode' | 'standard';

export interface CompressionStrategy {
  primary: CompressionStrategyType;
  fallback?: CompressionStrategyType;
  reason: string;
  estimatedRatio: number;
}

export interface StrategyOptions {
  enableProcedural?: boolean;
  enableReencoding?: boolean;
  enableNeural?: boolean;
}

/**
 * Strategy Selector
 * Determines the best compression approach for each asset
 */
export class StrategySelector {
  /**
   * Select optimal compression strategy
   */
  select(analysis: AssetAnalysis, options: StrategyOptions = {}): CompressionStrategy {
    const {
      enableProcedural = true,
      enableReencoding = true,
      enableNeural = true,
    } = options;

    // Priority order: Procedural > Neural > Re-encoding > Standard

    // 1. Procedural (highest compression)
    if (enableProcedural && analysis.isProceduralizable) {
      return {
        primary: 'procedural',
        fallback: 'neural',
        reason: 'Asset is proceduralizable',
        estimatedRatio: this.estimateProceduralRatio(analysis),
      };
    }

    // 2. Neural (for compressible patterns)
    if (enableNeural && analysis.neuralScore > 0.7) {
      return {
        primary: 'neural',
        fallback: 'reencode',
        reason: `High neural score (${analysis.neuralScore.toFixed(2)})`,
        estimatedRatio: analysis.neuralScore * 50, // Up to 50x
      };
    }

    // 3. Re-encoding (format optimization)
    if (enableReencoding && analysis.reencodingGain > 2.0) {
      return {
        primary: 'reencode',
        fallback: 'standard',
        reason: `High re-encoding gain (${analysis.reencodingGain.toFixed(2)}x)`,
        estimatedRatio: analysis.reencodingGain,
      };
    }

    // 4. Standard (dedupe + gzip)
    return {
      primary: 'standard',
      reason: 'Default compression',
      estimatedRatio: 2.0, // Typical gzip + dedupe
    };
  }

  private estimateProceduralRatio(analysis: AssetAnalysis): number {
    switch (analysis.type) {
      case 'mesh':
        return 50; // 1MB → 20KB
      case 'texture':
        return 80; // 16MB → 200KB
      case 'audio':
        return 100; // 5MB → 50KB
      case 'animation':
        return 125; // 10KB → 80 bytes
      default:
        return 10;
    }
  }

  /**
   * Evaluate if a strategy was successful
   */
  evaluateSuccess(
    strategy: CompressionStrategy,
    originalSize: number,
    compressedSize: number
  ): boolean {
    const actualRatio = originalSize / compressedSize;
    const expectedRatio = strategy.estimatedRatio;

    // Success if we achieved at least 50% of expected ratio
    return actualRatio >= expectedRatio * 0.5;
  }

  /**
   * Get fallback strategy
   */
  getFallback(strategy: CompressionStrategy): CompressionStrategyType {
    return strategy.fallback || 'standard';
  }
}
