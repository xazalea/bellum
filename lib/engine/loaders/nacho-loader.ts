/**
 * Nacho Loader - Orchestrates the Transpiler Pipeline
 */

import { puterClient } from '../../storage/hiberfile';
import { PEParser } from '../../transpiler/pe_parser';
import { DEXParser } from '../../transpiler/dex_parser';
import { InstructionLifter, LifterContext } from '../../transpiler/lifter';
import { Optimizer } from '../../transpiler/optimizer';
import { WASMCompiler } from '../../transpiler/wasm_compiler';
import { SyscallBridge } from '../../hle/syscall_bridge';
import { PELoader } from '../../hle/pe_loader';
import { FileType } from '../analyzers/binary-analyzer';

export class NachoLoader {
  private memory: WebAssembly.Memory | null = null;
  private syscallBridge: SyscallBridge | null = null;
  private instance: WebAssembly.Instance | null = null;

  // Hook for UI updates
  public onStatusUpdate: ((status: string, detail?: string) => void) | null = null;

  async load(container: HTMLElement, filePath: string, type: FileType) {
    this.updateStatus('Initializing', `Loading ${filePath}...`);
    console.log(`Nacho Transpiler: Loading ${filePath} as ${type}`);
    const buffer = await puterClient.readFile(filePath);

    // 1. Parse Headers & Setup Memory
    this.memory = new WebAssembly.Memory({ initial: 256, maximum: 2048 });
    this.syscallBridge = new SyscallBridge(this.memory);
    
    let entryPoint = 0;
    let arch: 'x86' | 'dalvik' = 'x86';
    let codeSection: Uint8Array = new Uint8Array(0);

    if (type === FileType.PE_EXE) {
      this.updateStatus('Parsing PE Headers', 'Reading Sections & Imports...');
      const peLoader = new PELoader(this.memory);
      peLoader.load(buffer);
      
      const parser = new PEParser(buffer);
      const { optionalHeader } = parser.parse();
      entryPoint = optionalHeader.addressOfEntryPoint;
      codeSection = new Uint8Array(buffer); 
      arch = 'x86';
    } else if (type === FileType.APK) {
      this.updateStatus('Parsing DEX', 'Reading Dalvik Bytecode...');
      const parser = new DEXParser(buffer);
      parser.parseHeader();
      arch = 'dalvik';
      codeSection = new Uint8Array(buffer);
    }

    // 2. Lift to IR (Using C++ Lifter if available, else fallback)
    this.updateStatus('Lifting Instructions', 'Core: C++ (Simulated)');
    // In a real build, we would load `lib/transpiler/cpp/lifter.wasm` here
    // and call the exported `lift_code` function.
    // For this POC, we use the TS implementation but acknowledge the C++ source existence.
    
    const lifter = new InstructionLifter();
    const context: LifterContext = { arch, entryPoint, data: codeSection };
    const ir = lifter.lift(context);
    console.log(`Transpiler: Lifted ${ir.length} instructions`);

    // 3. Optimize (Using Haskell Optimizer if available)
    this.updateStatus('Optimizing IR', 'Core: Haskell (Simulated)');
    // Similarly, we would load `lib/transpiler/haskell/optimizer.wasm` here.
    
    const optimizer = new Optimizer();
    const optimizedIR = optimizer.optimize(ir);

    // 4. Compile to WASM
    this.updateStatus('Compiling to WASM', 'Generating Binary...');
    const compiler = new WASMCompiler();
    const wasmBytes = compiler.compile(optimizedIR);

    // 5. Link & Run
    this.updateStatus('Linking', 'Binding Syscalls...');
    
    try {
        const module = await WebAssembly.compile(wasmBytes);
        this.instance = await WebAssembly.instantiate(module, this.syscallBridge.getImports());
        
        this.updateStatus('Running', 'Execution Started');

        const exports = this.instance.exports as any;
        if (exports.start) {
            console.log('Nacho: Executing Entry Point...');
            exports.start();
        } else {
            console.warn('Nacho: No start function exported');
        }
        
    } catch (e: any) {
        console.error("WASM Execution Failed:", e);
        throw e;
    }
  }

  private updateStatus(status: string, detail: string = '') {
      if (this.onStatusUpdate) {
          this.onStatusUpdate(status, detail);
      }
  }

  stop() {
    this.instance = null;
    this.memory = null;
    this.syscallBridge = null;
  }
}
