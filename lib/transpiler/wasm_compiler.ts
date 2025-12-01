/**
 * WASM Compiler - Generates WebAssembly binary from IR
 */

import { IRInstruction, IROpcode } from './lifter';

export class WASMCompiler {
  compile(ir: IRInstruction[]): Uint8Array {
    // Generates a valid WASM binary that imports 'env.print' and calls it with 42
    // This is a "Hello World" valid WASM module for POC purposes.
    // In a real implementation, this would translate IR instructions.
    
    // WASM Binary Structure:
    // Magic (4) + Version (4)
    // Type Section (1): Define func signatures
    // Import Section (2): Import env.print
    // Function Section (3): Define main
    // Export Section (7): Export main
    // Code Section (10): Body of main
    
    const magic = [0x00, 0x61, 0x73, 0x6d];
    const version = [0x01, 0x00, 0x00, 0x00];
    
    // 1. Type Section
    // Count: 2
    // Type 0: (i32) -> void  (for print)
    // Type 1: () -> void     (for main)
    const typeSection = [
      0x01, // Section Code
      0x09, // Section Size (bytes)
      0x02, // Num types
      0x60, 0x01, 0x7f, 0x00, // (i32) -> void
      0x60, 0x00, 0x00        // () -> void
    ];

    // 2. Import Section
    // Count: 1
    // Module: "env", Field: "print", Kind: Function, Type Index: 0
    const importSection = [
      0x02, // Section Code
      0x0d, // Section Size
      0x01, // Num imports
      0x03, 0x65, 0x6e, 0x76, // "env"
      0x05, 0x70, 0x72, 0x69, 0x6e, 0x74, // "print"
      0x00, // Kind: Function
      0x00  // Type Index: 0
    ];

    // 3. Function Section
    // Count: 1
    // Func Index 1 (since 0 is import): Type Index 1
    const funcSection = [
      0x03, // Section Code
      0x02, // Section Size
      0x01, // Num funcs
      0x01  // Type Index 1
    ];

    // 7. Export Section
    // Count: 1
    // Name: "start", Kind: Function, Index: 1
    const exportSection = [
      0x07, // Section Code
      0x09, // Section Size
      0x01, // Num exports
      0x05, 0x73, 0x74, 0x61, 0x72, 0x74, // "start"
      0x00, // Kind: Function
      0x01  // Func Index: 1
    ];

    // 10. Code Section
    // Count: 1
    // Body 0:
    //   i32.const 1337
    //   call 0 (print)
    //   end
    const codeBody = [
      0x00, // Locals count
      0x41, ...this.leb128(1337), // i32.const 1337
      0x10, 0x00, // call 0
      0x0b  // end
    ];
    
    const codeSection = [
      0x0a, // Section Code
      codeBody.length + 1, // Section Size
      0x01, // Num bodies
      codeBody.length, // Body size
      ...codeBody
    ];

    const buffer = new Uint8Array([
      ...magic,
      ...version,
      ...typeSection,
      ...importSection,
      ...funcSection,
      ...exportSection,
      ...codeSection
    ]);
    
    return buffer;
  }

  private leb128(value: number): number[] {
    const bytes = [];
    while (true) {
      let byte = value & 0x7f;
      value >>= 7;
      if (value === 0 && (byte & 0x40) === 0) {
        bytes.push(byte);
        break;
      } else if (value === -1 && (byte & 0x40) !== 0) {
        bytes.push(byte);
        break;
      } else {
        byte |= 0x80;
        bytes.push(byte);
      }
    }
    return bytes;
  }
}
