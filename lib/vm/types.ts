/**
 * VM Types and Interfaces
 */

export enum VMType {
  LINUX = 'linux',
  WINDOWS = 'windows',
  ANDROID = 'android',
  XBOX = 'xbox',
  DOS = 'dos',
  MACOS = 'macos',
  PLAYSTATION = 'playstation',
  CODE = 'code', // Code execution environment (WebVM)
}

export interface VMConfig {
  id: string;
  type: VMType;
  name: string;
  description?: string;
  memory?: number; // in MB
  diskSize?: number; // in MB
  networkEnabled?: boolean;
  customConfig?: Record<string, any>;
  executionMode?: 'system' | 'game' | 'code'; // 'system' = full OS, 'game' = direct execution, 'code' = code execution
}

export interface VMState {
  id: string;
  config: VMConfig;
  isRunning: boolean;
  isPaused: boolean;
  lastSaved?: Date;
  storagePath?: string; // Path in Puter storage
}

export interface VMInstance {
  id: string;
  config: VMConfig;
  state: VMState;

  // Lifecycle methods
  start(): Promise<void>;
  stop(): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  reset(): Promise<void>;

  // File operations
  saveState(): Promise<void>;
  loadState(): Promise<void>;

  // Rendering
  getCanvas(): HTMLCanvasElement | null;
  getContainer(): HTMLElement | null;
  mount(container: HTMLElement): Promise<void>;

  // Events
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}

export interface VMManager {
  createVM(config: VMConfig): Promise<VMInstance>;
  getVM(id: string): VMInstance | null;
  listVMs(): VMInstance[];
  deleteVM(id: string): Promise<void>;
  saveAllVMs(): Promise<void>;
  loadAllVMs(): Promise<void>;
}

