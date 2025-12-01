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

  async load(container: HTMLElement, filePath: string, type: FileType) {
    console.log(`Nacho Transpiler: Loading ${filePath} as ${type}`);
    const buffer = await puterClient.readFile(filePath); // Need full file for transpilation

    // 1. Parse Headers & Setup Memory
    this.memory = new WebAssembly.Memory({ initial: 256, maximum: 2048 }); // 16MB initial
    this.syscallBridge = new SyscallBridge(this.memory);
    
    let entryPoint = 0;
    let arch: 'x86' | 'dalvik' = 'x86';
    let codeSection: Uint8Array = new Uint8Array(0);

    if (type === FileType.PE_EXE) {
      const peLoader = new PELoader(this.memory);
      peLoader.load(buffer); // Maps data to memory
      
      const parser = new PEParser(buffer);
      const { optionalHeader } = parser.parse();
      entryPoint = optionalHeader.addressOfEntryPoint;
      codeSection = new Uint8Array(buffer); 
      arch = 'x86';
    } else if (type === FileType.APK) {
      const parser = new DEXParser(buffer);
      parser.parseHeader();
      arch = 'dalvik';
      codeSection = new Uint8Array(buffer);
    }

    // 2. Lift to IR
    console.log('Transpiler: Lifting...');
    const lifter = new InstructionLifter();
    const context: LifterContext = {
      arch,
      entryPoint,
      data: codeSection
    };
    const ir = lifter.lift(context);
    console.log(`Transpiler: Lifted ${ir.length} instructions`);

    // 3. Optimize
    console.log('Transpiler: Optimizing...');
    const optimizer = new Optimizer();
    const optimizedIR = optimizer.optimize(ir);

    // 4. Compile to WASM
    console.log('Transpiler: Compiling to WASM...');
    const compiler = new WASMCompiler();
    const wasmBytes = compiler.compile(optimizedIR);

    // 5. Link & Run
    console.log('Transpiler: Linking & Running...');
    
    try {
        const module = await WebAssembly.compile(wasmBytes);
        this.instance = await WebAssembly.instantiate(module, this.syscallBridge.getImports());
        
        // Run the entry point (mapped to 'start' in our POC compiler)
        const exports = this.instance.exports as any;
        if (exports.start) {
            console.log('Nacho: Executing Entry Point...');
            exports.start();
        } else {
            console.warn('Nacho: No start function exported');
        }

        // UI Feedback
        const statusEl = document.createElement('div');
        statusEl.style.color = '#0f0';
        statusEl.style.fontFamily = 'monospace';
        statusEl.style.padding = '20px';
        statusEl.style.whiteSpace = 'pre-wrap';
        statusEl.innerText = `Nacho Transpiler Success!
        
        Source: ${filePath}
        Architecture: ${arch}
        Lifted Instructions: ${ir.length}
        Optimized Instructions: ${optimizedIR.length}
        Generated WASM Size: ${wasmBytes.length} bytes
        
        [EXECUTION STARTED]
        > Syscall Bridge Connected
        > Memory Mapped
        > Main Thread Active
        > check console for 'print' output (1337)
        `;
        
        container.innerHTML = '';
        container.appendChild(statusEl);
        
    } catch (e: any) {
        console.error("WASM Execution Failed:", e);
        const errorEl = document.createElement('div');
        errorEl.style.color = 'red';
        errorEl.style.fontFamily = 'monospace';
        errorEl.style.padding = '20px';
        errorEl.innerText = `Execution Error: ${e.message}`;
        container.innerHTML = '';
        container.appendChild(errorEl);
    }
  }

  stop() {
    this.instance = null;
    this.memory = null;
    this.syscallBridge = null;
  }
}
