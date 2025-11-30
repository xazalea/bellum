/**
 * Optimizer Source Loader - Loads optimizer source files
 */

export async function loadOptimizerSource(language: string, filename: string): Promise<string> {
  try {
    // Load from optimizers directory
    const response = await fetch(`/optimizers/${language}/${filename}`);
    if (!response.ok) {
      throw new Error(`Failed to load ${filename}: ${response.statusText}`);
    }
    return await response.text();
  } catch (error) {
    console.warn(`Failed to load optimizer source ${filename}, using fallback:`, error);
    throw error;
  }
}

export const OPTIMIZER_FILES = {
  rust: {
    state: 'state_optimizer.rs',
    cargo: 'Cargo.toml',
  },
  go: {
    frame: 'frame_optimizer.go',
  },
  zig: {
    cycle: 'cycle_optimizer.zig',
  },
  python: {
    cycle: 'cycle_optimizer.py',
  },
  lua: {
    memory: 'memory_optimizer.lua',
  },
} as const;

