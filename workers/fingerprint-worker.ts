/**
 * Fingerprint Web Worker
 * Handles fingerprint generation in a background thread
 */

import {
  hashSHA256,
  hashCombined,
  hashCanvasData,
  hashAudioData,
  generateFingerprintId,
  initFingerprint,
} from '@/lib/wasm/fingerprint';

export interface FingerprintTask {
  id: string;
  type: 'hash' | 'combined' | 'canvas' | 'audio' | 'generate';
  data?: Uint8Array | string[] | any;
  width?: number;
  height?: number;
}

export interface FingerprintResult {
  id: string;
  success: boolean;
  hash?: string | Uint8Array;
  error?: string;
  timeMs: number;
}

// Initialize WASM when worker starts
let initialized = false;

async function ensureInit() {
  if (!initialized) {
    await initFingerprint();
    initialized = true;
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<FingerprintTask>) => {
  const task = event.data;
  const startTime = performance.now();
  
  try {
    await ensureInit();
    
    let hash: string | Uint8Array;
    
    switch (task.type) {
      case 'hash':
        if (!(task.data instanceof Uint8Array)) {
          throw new Error('Invalid data for hash task');
        }
        hash = await hashSHA256(task.data);
        break;
        
      case 'combined':
        if (!Array.isArray(task.data)) {
          throw new Error('Invalid data for combined task');
        }
        hash = await hashCombined(task.data);
        break;
        
      case 'canvas':
        if (!(task.data instanceof Uint8Array) || !task.width || !task.height) {
          throw new Error('Invalid data for canvas task');
        }
        hash = await hashCanvasData(task.data, task.width, task.height);
        break;
        
      case 'audio':
        if (!(task.data instanceof Float32Array)) {
          throw new Error('Invalid data for audio task');
        }
        hash = await hashAudioData(task.data);
        break;
        
      case 'generate':
        if (!Array.isArray(task.data)) {
          throw new Error('Invalid data for generate task');
        }
        hash = await generateFingerprintId(task.data);
        break;
        
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
    
    const timeMs = performance.now() - startTime;
    
    const response: FingerprintResult = {
      id: task.id,
      success: true,
      hash,
      timeMs,
    };
    
    self.postMessage(response);
  } catch (error: any) {
    const timeMs = performance.now() - startTime;
    
    const response: FingerprintResult = {
      id: task.id,
      success: false,
      error: error.message || 'Fingerprint operation failed',
      timeMs,
    };
    
    self.postMessage(response);
  }
};

export {};
