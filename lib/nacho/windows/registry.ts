/**
 * Windows Registry Emulation
 * Stores application settings and system configuration
 */

export enum RegistryHive {
  HKEY_LOCAL_MACHINE = 'HKLM',
  HKEY_CURRENT_USER = 'HKCU',
  HKEY_CLASSES_ROOT = 'HKCR',
  HKEY_USERS = 'HKU',
  HKEY_CURRENT_CONFIG = 'HKCC',
}

export enum RegistryValueType {
  REG_NONE = 0,
  REG_SZ = 1, // String
  REG_EXPAND_SZ = 2, // Expandable string
  REG_BINARY = 3, // Binary data
  REG_DWORD = 4, // 32-bit number
  REG_DWORD_BIG_ENDIAN = 5,
  REG_LINK = 6, // Symbolic link
  REG_MULTI_SZ = 7, // Multiple strings
  REG_QWORD = 11, // 64-bit number
}

export interface RegistryValue {
  name: string;
  type: RegistryValueType;
  data: any;
}

export interface RegistryKey {
  name: string;
  values: Map<string, RegistryValue>;
  subkeys: Map<string, RegistryKey>;
  lastModified: number;
}

/**
 * Windows Registry
 */
export class WindowsRegistry {
  private hives: Map<string, RegistryKey> = new Map();
  
  constructor() {
    console.log('[Registry] Initialized');
    this.initializeHives();
  }
  
  /**
   * Initialize registry hives
   */
  private initializeHives(): void {
    // Create root keys for each hive
    for (const hive of Object.values(RegistryHive)) {
      const rootKey: RegistryKey = {
        name: hive,
        values: new Map(),
        subkeys: new Map(),
        lastModified: Date.now(),
      };
      this.hives.set(hive, rootKey);
    }
    
    // Initialize common registry paths
    this.initializeCommonKeys();
  }
  
  /**
   * Initialize common registry keys
   */
  private initializeCommonKeys(): void {
    // HKLM\SOFTWARE
    this.createKey('HKLM\\SOFTWARE');
    this.createKey('HKLM\\SOFTWARE\\Microsoft');
    this.createKey('HKLM\\SOFTWARE\\Microsoft\\Windows');
    this.createKey('HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion');
    
    // Set common values
    this.setValue(
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion',
      'ProgramFilesDir',
      RegistryValueType.REG_SZ,
      'C:\\Program Files'
    );
    
    this.setValue(
      'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion',
      'ProgramFilesDir (x86)',
      RegistryValueType.REG_SZ,
      'C:\\Program Files (x86)'
    );
    
    // HKCU\Software
    this.createKey('HKCU\\SOFTWARE');
    this.createKey('HKCU\\SOFTWARE\\Microsoft');
    this.createKey('HKCU\\SOFTWARE\\Microsoft\\Windows');
    
    // HKLM\SYSTEM
    this.createKey('HKLM\\SYSTEM');
    this.createKey('HKLM\\SYSTEM\\CurrentControlSet');
    this.createKey('HKLM\\SYSTEM\\CurrentControlSet\\Control');
    
    console.log('[Registry] Common keys initialized');
  }
  
  /**
   * Create registry key
   */
  createKey(path: string): void {
    const parts = path.split('\\');
    const hive = parts[0];
    
    let current = this.hives.get(hive);
    if (!current) {
      throw new Error(`Invalid hive: ${hive}`);
    }
    
    for (let i = 1; i < parts.length; i++) {
      const name = parts[i];
      
      if (!current.subkeys.has(name)) {
        const newKey: RegistryKey = {
          name,
          values: new Map(),
          subkeys: new Map(),
          lastModified: Date.now(),
        };
        current.subkeys.set(name, newKey);
      }
      
      current = current.subkeys.get(name)!;
    }
  }
  
  /**
   * Delete registry key
   */
  deleteKey(path: string): void {
    const parts = path.split('\\');
    const hive = parts[0];
    const keyName = parts[parts.length - 1];
    
    let current = this.hives.get(hive);
    if (!current) return;
    
    for (let i = 1; i < parts.length - 1; i++) {
      current = current.subkeys.get(parts[i]);
      if (!current) return;
    }
    
    current.subkeys.delete(keyName);
  }
  
  /**
   * Set registry value
   */
  setValue(path: string, valueName: string, type: RegistryValueType, data: any): void {
    const key = this.getKey(path);
    if (!key) {
      this.createKey(path);
      const newKey = this.getKey(path)!;
      newKey.values.set(valueName, { name: valueName, type, data });
    } else {
      key.values.set(valueName, { name: valueName, type, data });
      key.lastModified = Date.now();
    }
  }
  
  /**
   * Get registry value
   */
  getValue(path: string, valueName: string): RegistryValue | null {
    const key = this.getKey(path);
    if (!key) return null;
    
    return key.values.get(valueName) || null;
  }
  
  /**
   * Delete registry value
   */
  deleteValue(path: string, valueName: string): void {
    const key = this.getKey(path);
    if (key) {
      key.values.delete(valueName);
      key.lastModified = Date.now();
    }
  }
  
  /**
   * Get registry key
   */
  private getKey(path: string): RegistryKey | null {
    const parts = path.split('\\');
    const hive = parts[0];
    
    let current = this.hives.get(hive);
    if (!current) return null;
    
    for (let i = 1; i < parts.length; i++) {
      current = current.subkeys.get(parts[i]);
      if (!current) return null;
    }
    
    return current;
  }
  
  /**
   * Enumerate subkeys
   */
  enumKeys(path: string): string[] {
    const key = this.getKey(path);
    if (!key) return [];
    
    return Array.from(key.subkeys.keys());
  }
  
  /**
   * Enumerate values
   */
  enumValues(path: string): string[] {
    const key = this.getKey(path);
    if (!key) return [];
    
    return Array.from(key.values.keys());
  }
  
  /**
   * Check if key exists
   */
  keyExists(path: string): boolean {
    return this.getKey(path) !== null;
  }
  
  /**
   * Query value
   */
  queryValue(path: string, valueName: string, defaultValue?: any): any {
    const value = this.getValue(path, valueName);
    if (!value) return defaultValue;
    
    return value.data;
  }
  
  /**
   * Export registry to JSON
   */
  export(): any {
    const exportData: any = {};
    
    for (const [hiveName, hive] of this.hives) {
      exportData[hiveName] = this.exportKey(hive);
    }
    
    return exportData;
  }
  
  /**
   * Export registry key recursively
   */
  private exportKey(key: RegistryKey): any {
    const data: any = {
      values: {},
      subkeys: {},
    };
    
    for (const [name, value] of key.values) {
      data.values[name] = {
        type: value.type,
        data: value.data,
      };
    }
    
    for (const [name, subkey] of key.subkeys) {
      data.subkeys[name] = this.exportKey(subkey);
    }
    
    return data;
  }
  
  /**
   * Import registry from JSON
   */
  import(data: any): void {
    for (const [hiveName, hiveData] of Object.entries(data)) {
      if (this.hives.has(hiveName)) {
        this.importKey(this.hives.get(hiveName)!, hiveData as any);
      }
    }
  }
  
  /**
   * Import registry key recursively
   */
  private importKey(key: RegistryKey, data: any): void {
    if (data.values) {
      for (const [name, valueData] of Object.entries(data.values as any)) {
        const value = valueData as { type: number; data: any };
        key.values.set(name, {
          name,
          type: value.type,
          data: value.data,
        });
      }
    }
    
    if (data.subkeys) {
      for (const [name, subkeyData] of Object.entries(data.subkeys as any)) {
        if (!key.subkeys.has(name)) {
          key.subkeys.set(name, {
            name,
            values: new Map(),
            subkeys: new Map(),
            lastModified: Date.now(),
          });
        }
        this.importKey(key.subkeys.get(name)!, subkeyData);
      }
    }
  }
  
  /**
   * Save registry to IndexedDB
   */
  async save(): Promise<void> {
    const data = this.export();
    // In real implementation, would save to IndexedDB
    console.log('[Registry] Saved to persistent storage');
  }
  
  /**
   * Load registry from IndexedDB
   */
  async load(): Promise<void> {
    // In real implementation, would load from IndexedDB
    console.log('[Registry] Loaded from persistent storage');
  }
}
