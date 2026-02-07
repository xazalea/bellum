/**
 * Result Extractor
 * Utilities for extracting computation results from rendered pages
 */

export interface ExtractionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    extractionTime: number;
    method: string;
  };
}

/**
 * Extract result from various sources
 */
export class ResultExtractor {
  /**
   * Parse result from DOM element
   */
  parseFromElement(element: Element): unknown {
    // Check for data attributes
    const dataResult = element.getAttribute('data-result');
    if (dataResult) {
      try {
        return JSON.parse(dataResult);
      } catch {
        return dataResult;
      }
    }

    // Try to parse text content as JSON
    const text = element.textContent || '';
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Parse result from console logs
   */
  parseFromLogs(logs: unknown[]): unknown {
    // Look for structured result
    for (const log of logs) {
      if (Array.isArray(log) && log[0] === '__RESULT__') {
        return log[1];
      }
    }

    // Return all logs if no structured result
    return logs;
  }

  /**
   * Parse result from postMessage data
   */
  parseFromMessage(data: unknown): unknown {
    if (typeof data === 'object' && data !== null && 'result' in data) {
      return (data as { result: unknown }).result;
    }
    return data;
  }

  /**
   * Parse result from HTTP response
   */
  async parseFromResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    if (contentType?.includes('text/')) {
      return response.text();
    }

    return response.arrayBuffer();
  }

  /**
   * Validate result structure
   */
  validateResult(result: unknown): ExtractionResult {
    const startTime = Date.now();

    if (result === undefined || result === null) {
      return {
        success: false,
        error: 'No result extracted',
        metadata: {
          extractionTime: Date.now() - startTime,
          method: 'validation',
        },
      };
    }

    return {
      success: true,
      data: result,
      metadata: {
        extractionTime: Date.now() - startTime,
        method: 'validation',
      },
    };
  }

  /**
   * Extract performance metrics from page
   */
  extractPerformanceMetrics(win: Window): Record<string, unknown> {
    if (!win.performance) {
      return {};
    }

    const navigation = win.performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;

    const paint = win.performance.getEntriesByType('paint');

    return {
      loadTime: navigation?.loadEventEnd - navigation?.fetchStart,
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.fetchStart,
      firstPaint: paint.find((p) => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find((p) => p.name === 'first-contentful-paint')
        ?.startTime,
      memory: (win.performance as any).memory
        ? {
            usedJSHeapSize: (win.performance as any).memory.usedJSHeapSize,
            totalJSHeapSize: (win.performance as any).memory.totalJSHeapSize,
          }
        : undefined,
    };
  }

  /**
   * Extract device fingerprint from iframe
   */
  extractDeviceFingerprint(win: Window): Record<string, unknown> {
    return {
      userAgent: win.navigator.userAgent,
      platform: win.navigator.platform,
      language: win.navigator.language,
      hardwareConcurrency: win.navigator.hardwareConcurrency,
      deviceMemory: (win.navigator as any).deviceMemory,
      maxTouchPoints: win.navigator.maxTouchPoints,
      screenResolution: `${win.screen.width}x${win.screen.height}`,
      colorDepth: win.screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }
}

// Singleton instance
let instance: ResultExtractor | null = null;

export function getResultExtractor(): ResultExtractor {
  if (!instance) {
    instance = new ResultExtractor();
  }
  return instance;
}
