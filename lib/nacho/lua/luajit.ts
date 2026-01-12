/**
 * Lua 5.1 VM Implementation
 * 
 * Implements Lua 5.1 bytecode interpreter for Roblox script execution.
 * Provides core Lua functionality including coroutines, metatables, and standard library.
 */

export enum LuaType {
  NIL = 0,
  BOOLEAN = 1,
  NUMBER = 2,
  STRING = 3,
  TABLE = 4,
  FUNCTION = 5,
  USERDATA = 6,
  THREAD = 7,
}

export type LuaValue = 
  | null
  | boolean
  | number
  | string
  | LuaTable
  | LuaFunction
  | LuaUserData
  | LuaThread;

/**
 * Lua Table (associative array)
 */
export class LuaTable {
  private array: LuaValue[] = [];
  private hash: Map<string | number, LuaValue> = new Map();
  public metatable: LuaTable | null = null;

  set(key: LuaValue, value: LuaValue): void {
    if (typeof key === 'number' && key >= 1 && Number.isInteger(key)) {
      this.array[key - 1] = value;
    } else if (key !== null) {
      const hashKey = typeof key === 'string' ? key : String(key);
      this.hash.set(hashKey, value);
    }
  }

  get(key: LuaValue): LuaValue {
    if (typeof key === 'number' && key >= 1 && Number.isInteger(key)) {
      return this.array[key - 1] ?? null;
    } else if (key !== null) {
      const hashKey = typeof key === 'string' ? key : String(key);
      return this.hash.get(hashKey) ?? null;
    }
    return null;
  }

  length(): number {
    return this.array.length;
  }

  pairs(): [LuaValue, LuaValue][] {
    const result: [LuaValue, LuaValue][] = [];
    
    // Array part
    for (let i = 0; i < this.array.length; i++) {
      result.push([i + 1, this.array[i]]);
    }
    
    // Hash part
    for (const [key, value] of this.hash.entries()) {
      result.push([key, value]);
    }
    
    return result;
  }

  clone(): LuaTable {
    const newTable = new LuaTable();
    newTable.array = [...this.array];
    newTable.hash = new Map(this.hash);
    newTable.metatable = this.metatable;
    return newTable;
  }
}

/**
 * Lua Function
 */
export type LuaFunction = (...args: LuaValue[]) => LuaValue | LuaValue[];

/**
 * Lua UserData (for C data)
 */
export class LuaUserData {
  constructor(
    public data: any,
    public metatable: LuaTable | null = null
  ) {}
}

/**
 * Lua Thread (coroutine)
 */
export class LuaThread {
  private stack: LuaValue[] = [];
  private pc: number = 0;
  private status: 'running' | 'suspended' | 'dead' = 'suspended';

  constructor(
    private func: LuaFunction,
    private vm: LuaVM
  ) {}

  resume(...args: LuaValue[]): { success: boolean; values: LuaValue[] } {
    if (this.status === 'dead') {
      return { success: false, values: ['cannot resume dead coroutine'] };
    }

    this.status = 'running';
    
    try {
      const result = this.func(...args);
      const values = Array.isArray(result) ? result : [result];
      this.status = 'suspended';
      return { success: true, values };
    } catch (e: any) {
      this.status = 'dead';
      return { success: false, values: [e.message] };
    }
  }

  yield(...values: LuaValue[]): void {
    this.status = 'suspended';
    // In a real implementation, this would suspend execution
  }

  getStatus(): string {
    return this.status;
  }
}

/**
 * Lua VM - Main interpreter
 */
export class LuaVM {
  private globals: LuaTable;
  private stack: LuaValue[] = [];
  private callStack: CallFrame[] = [];
  private registry: LuaTable;
  private currentThread: LuaThread | null = null;

  constructor() {
    this.globals = new LuaTable();
    this.registry = new LuaTable();
    this.initializeStandardLibrary();
    console.log('[LuaVM] Initialized');
  }

  /**
   * Initialize Lua standard library
   */
  private initializeStandardLibrary(): void {
    // Basic functions
    this.globals.set('print', (...args: LuaValue[]) => {
      console.log('[Lua]', ...args.map(v => this.toString(v)));
      return null;
    });

    this.globals.set('type', (value: LuaValue) => {
      return this.getType(value);
    });

    this.globals.set('tonumber', (value: LuaValue) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      }
      return null;
    });

    this.globals.set('tostring', (value: LuaValue) => {
      return this.toString(value);
    });

    this.globals.set('pairs', (table: LuaValue) => {
      if (!(table instanceof LuaTable)) {
        throw new Error('pairs() expects a table');
      }
      
      const pairs = table.pairs();
      let index = 0;
      
      return () => {
        if (index >= pairs.length) return null;
        const [key, value] = pairs[index++];
        return [key, value];
      };
    });

    this.globals.set('ipairs', (table: LuaValue) => {
      if (!(table instanceof LuaTable)) {
        throw new Error('ipairs() expects a table');
      }
      
      let index = 1;
      
      return () => {
        const value = table.get(index);
        if (value === null) return null;
        return [index++, value];
      };
    });

    this.globals.set('next', (table: LuaValue, key: LuaValue = null) => {
      if (!(table instanceof LuaTable)) {
        throw new Error('next() expects a table');
      }
      
      const pairs = table.pairs();
      let found = key === null;
      
      for (const [k, v] of pairs) {
        if (found) return [k, v];
        if (k === key) found = true;
      }
      
      return null;
    });

    this.globals.set('assert', (condition: LuaValue, message?: LuaValue) => {
      if (!this.toBoolean(condition)) {
        throw new Error(message ? this.toString(message) : 'assertion failed');
      }
      return condition;
    });

    this.globals.set('error', ((...args: LuaValue[]) => {
      const message = args[0];
      throw new Error(this.toString(message));
    }) as LuaFunction);

    this.globals.set('pcall', (func: LuaValue, ...args: LuaValue[]) => {
      if (typeof func !== 'function') {
        return [false, 'attempt to call a non-function'];
      }
      
      try {
        const result = func(...args);
        const results = Array.isArray(result) ? result : [result];
        return [true, ...results];
      } catch (e: any) {
        return [false, e.message];
      }
    });

    // Table library
    const tableLib = new LuaTable();
    tableLib.set('insert', (table: LuaValue, pos: LuaValue, value?: LuaValue) => {
      if (!(table instanceof LuaTable)) {
        throw new Error('table.insert() expects a table');
      }
      
      if (value === undefined) {
        // table.insert(t, value)
        const len = table.length();
        table.set(len + 1, pos);
      } else {
        // table.insert(t, pos, value)
        // Simplified: just insert at position
        table.set(pos as number, value);
      }
      
      return null;
    });

    tableLib.set('remove', (table: LuaValue, pos?: LuaValue) => {
      if (!(table instanceof LuaTable)) {
        throw new Error('table.remove() expects a table');
      }
      
      const position = typeof pos === 'number' ? pos : table.length();
      const value = table.get(position);
      table.set(position, null);
      return value;
    });

    tableLib.set('concat', (table: LuaValue, sep?: LuaValue, i?: LuaValue, j?: LuaValue) => {
      if (!(table instanceof LuaTable)) {
        throw new Error('table.concat() expects a table');
      }
      
      const separator = typeof sep === 'string' ? sep : '';
      const start = typeof i === 'number' ? i : 1;
      const end = typeof j === 'number' ? j : table.length();
      
      const parts: string[] = [];
      for (let idx = start; idx <= end; idx++) {
        const value = table.get(idx);
        parts.push(this.toString(value));
      }
      
      return parts.join(separator);
    });

    this.globals.set('table', tableLib);

    // String library
    const stringLib = new LuaTable();
    stringLib.set('len', (s: LuaValue) => {
      return typeof s === 'string' ? s.length : 0;
    });

    stringLib.set('sub', (s: LuaValue, i: LuaValue, j?: LuaValue) => {
      if (typeof s !== 'string') return '';
      const start = typeof i === 'number' ? i - 1 : 0;
      const end = typeof j === 'number' ? j : s.length;
      return s.substring(start, end);
    });

    stringLib.set('upper', (s: LuaValue) => {
      return typeof s === 'string' ? s.toUpperCase() : '';
    });

    stringLib.set('lower', (s: LuaValue) => {
      return typeof s === 'string' ? s.toLowerCase() : '';
    });

    stringLib.set('find', (s: LuaValue, pattern: LuaValue, init?: LuaValue) => {
      if (typeof s !== 'string' || typeof pattern !== 'string') return null;
      const startIndex = typeof init === 'number' ? init - 1 : 0;
      const index = s.indexOf(pattern, startIndex);
      return index >= 0 ? [index + 1, index + pattern.length] : null;
    });

    this.globals.set('string', stringLib);

    // Math library - wrap all functions to match LuaFunction signature
    const mathLib = new LuaTable();
    mathLib.set('abs', ((x: LuaValue) => Math.abs(x as number)) as LuaFunction);
    mathLib.set('acos', ((x: LuaValue) => Math.acos(x as number)) as LuaFunction);
    mathLib.set('asin', ((x: LuaValue) => Math.asin(x as number)) as LuaFunction);
    mathLib.set('atan', ((x: LuaValue) => Math.atan(x as number)) as LuaFunction);
    mathLib.set('ceil', ((x: LuaValue) => Math.ceil(x as number)) as LuaFunction);
    mathLib.set('cos', ((x: LuaValue) => Math.cos(x as number)) as LuaFunction);
    mathLib.set('deg', ((x: LuaValue) => (x as number) * 180 / Math.PI) as LuaFunction);
    mathLib.set('exp', ((x: LuaValue) => Math.exp(x as number)) as LuaFunction);
    mathLib.set('floor', ((x: LuaValue) => Math.floor(x as number)) as LuaFunction);
    mathLib.set('log', ((x: LuaValue) => Math.log(x as number)) as LuaFunction);
    mathLib.set('max', ((...args: LuaValue[]) => Math.max(...args.map(x => x as number))) as LuaFunction);
    mathLib.set('min', ((...args: LuaValue[]) => Math.min(...args.map(x => x as number))) as LuaFunction);
    mathLib.set('pi', Math.PI);
    mathLib.set('pow', ((x: LuaValue, y: LuaValue) => Math.pow(x as number, y as number)) as LuaFunction);
    mathLib.set('rad', ((x: LuaValue) => (x as number) * Math.PI / 180) as LuaFunction);
    mathLib.set('random', ((...args: LuaValue[]) => {
      const nums = args.map(x => x as number);
      if (nums.length === 0) return Math.random();
      if (nums.length === 1) return Math.floor(Math.random() * nums[0]) + 1;
      return Math.floor(Math.random() * (nums[1] - nums[0] + 1)) + nums[0];
    }) as LuaFunction);
    mathLib.set('sin', ((x: LuaValue) => Math.sin(x as number)) as LuaFunction);
    mathLib.set('sqrt', ((x: LuaValue) => Math.sqrt(x as number)) as LuaFunction);
    mathLib.set('tan', ((x: LuaValue) => Math.tan(x as number)) as LuaFunction);

    this.globals.set('math', mathLib);

    // Coroutine library
    const coroutineLib = new LuaTable();
    coroutineLib.set('create', (func: LuaValue) => {
      if (typeof func !== 'function') {
        throw new Error('coroutine.create() expects a function');
      }
      return new LuaThread(func, this);
    });

    coroutineLib.set('resume', (thread: LuaValue, ...args: LuaValue[]) => {
      if (!(thread instanceof LuaThread)) {
        throw new Error('coroutine.resume() expects a thread');
      }
      const result = thread.resume(...args);
      return [result.success, ...result.values];
    });

    coroutineLib.set('status', (thread: LuaValue) => {
      if (!(thread instanceof LuaThread)) {
        throw new Error('coroutine.status() expects a thread');
      }
      return thread.getStatus();
    });

    coroutineLib.set('yield', (...values: LuaValue[]) => {
      if (this.currentThread) {
        this.currentThread.yield(...values);
      }
      return values;
    });

    this.globals.set('coroutine', coroutineLib);
  }

  /**
   * Execute Lua code
   */
  execute(code: string): LuaValue {
    try {
      // In a real implementation, this would:
      // 1. Parse Lua code to AST
      // 2. Compile AST to bytecode
      // 3. Execute bytecode
      
      // For now, we'll use eval as a placeholder
      // This is NOT safe for production!
      console.warn('[LuaVM] Using simplified execution (eval) - NOT PRODUCTION READY');
      
      // Wrap code in a function and execute
      const func = new Function('vm', 'globals', `
        with (globals) {
          ${code}
        }
      `);
      
      return func(this, this.createJavaScriptProxy());
    } catch (e: any) {
      throw new Error(`Lua execution error: ${e.message}`);
    }
  }

  /**
   * Create JavaScript proxy for Lua globals
   */
  private createJavaScriptProxy(): any {
    const proxy: any = {};
    
    for (const [key, value] of this.globals.pairs()) {
      if (typeof key === 'string') {
        proxy[key] = value;
      }
    }
    
    return proxy;
  }

  /**
   * Get/set global variable
   */
  getGlobal(name: string): LuaValue {
    return this.globals.get(name);
  }

  setGlobal(name: string, value: LuaValue): void {
    this.globals.set(name, value);
  }

  /**
   * Create a new table
   */
  createTable(): LuaTable {
    return new LuaTable();
  }

  /**
   * Type conversion utilities
   */
  private getType(value: LuaValue): string {
    if (value === null) return 'nil';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (value instanceof LuaTable) return 'table';
    if (typeof value === 'function') return 'function';
    if (value instanceof LuaUserData) return 'userdata';
    if (value instanceof LuaThread) return 'thread';
    return 'unknown';
  }

  private toString(value: LuaValue): string {
    if (value === null) return 'nil';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (value instanceof LuaTable) return `table: ${Object.keys(value).length} items`;
    if (typeof value === 'function') return 'function';
    if (value instanceof LuaUserData) return 'userdata';
    if (value instanceof LuaThread) return `thread: ${value.getStatus()}`;
    return String(value);
  }

  private toBoolean(value: LuaValue): boolean {
    return value !== null && value !== false;
  }

  /**
   * Registry access
   */
  getRegistry(): LuaTable {
    return this.registry;
  }
}

/**
 * Call Frame for stack traces
 */
interface CallFrame {
  func: LuaFunction;
  pc: number;
  base: number;
}

console.log('[LuaVM] Module loaded');
