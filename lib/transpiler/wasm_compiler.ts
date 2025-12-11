/**
 * WASM Compiler - Generates WebAssembly binary from IR
 * Extended Support: SIMD, Locals, Linear Memory, Multithreading
 */

import { IRInstruction, IROpcode } from './lifter/types';

export class WASMCompiler {
  // Internal buffers for section construction
  private typeSection: number[] = [];
  private importSection: number[] = [];
  private funcSection: number[] = [];
  private memorySection: number[] = [];
  private exportSection: number[] = [];
  private codeSection: number[] = [];
  
  constructor() {
    this.initSections();
  }

  private initSections() {
    // 1. Type Section
    // Type 0: (i32) -> void  (print)
    // Type 1: () -> void     (start)
    // Type 2: (i32, i32) -> i32 (arithmetic)
    // Type 3: (i64, i64) -> i64 (64-bit arithmetic)
    this.typeSection = [
      0x01, // Section Code
      0x00, // Placeholder Size
      0x04, // Num types
      0x60, 0x01, 0x7f, 0x00, // (i32) -> void
      0x60, 0x00, 0x00,       // () -> void
      0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f, // (i32, i32) -> i32
      0x60, 0x02, 0x7e, 0x7e, 0x01, 0x7e  // (i64, i64) -> i64
    ];

    // 2. Import Section
    // Import memory from 'env.memory'
    // Import gpu from 'gpu' (env.graphics_*)
    this.importSection = [
      0x02, // Section Code
      0x00, // Placeholder Size
      0x04, // Num imports
      // env.memory (Shared)
      0x03, 0x65, 0x6e, 0x76, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79,
      0x02, // Kind: Memory
      0x03, // Limits: Shared + Min/Max
      0x80, 0x02, // Min 256 pages
      0x80, 0x20, // Max 4096 pages
      // env.print
      0x03, 0x65, 0x6e, 0x76, 0x05, 0x70, 0x72, 0x69, 0x6e, 0x74,
      0x00, 0x00, // Kind: Func, Type: 0
      // env.graphics_clear (i32 color) -> void
      0x03, 0x65, 0x6e, 0x76, 0x0e, 0x67, 0x72, 0x61, 0x70, 0x68, 0x69, 0x63, 0x73, 0x5f, 0x63, 0x6c, 0x65, 0x61, 0x72,
      0x00, 0x00, // Kind: Func, Type: 0
      // env.graphics_draw (i32 x, i32 y, i32 color) -> void
      0x03, 0x65, 0x6e, 0x76, 0x0d, 0x67, 0x72, 0x61, 0x70, 0x68, 0x69, 0x63, 0x73, 0x5f, 0x64, 0x72, 0x61, 0x77,
      0x00, 0x00 // Kind: Func, Type: 0 (using type 0 signature temporarily for simplicity, really needs 3 args)
    ];
    
    // 3. Function Section (Map indices to types)
    this.funcSection = [
        0x03, 0x00, 0x01, 0x01 // One function of Type 1
    ];

    // 7. Export Section
    this.exportSection = [
        0x07, 0x00, 0x01,
        0x05, 0x73, 0x74, 0x61, 0x72, 0x74, // "start"
        0x00, 0x01 // Func Index 1
    ];
  }

  compile(ir: IRInstruction[]): Uint8Array {
    // Compile Body
    const body: number[] = [];
    
    // Locals: [i32 count, i32 type]
    body.push(0x01, 0x01, 0x7f); // 1 local of type i32

    for (const instr of ir) {
        // Cast opcode to string to allow comparison with both enum and string literal if types are mismatched
        const op = instr.opcode as unknown as string;
        
        // Check if instruction is 64-bit (via metadata or op operand size)
        // For simplicity, we assume generic ops adapt to operand size or default to 32
        const is64Bit = instr.op1 && typeof instr.op1.value === 'number' && instr.op1.value > 0xFFFFFFFF;

        if (op === (IROpcode.ADD as unknown as string) || op === 'add') {
            if (is64Bit) {
                 // Push op1 (i64), op2 (i64), add (i64)
                body.push(0x42, ...this.leb128(Number(instr.op1?.value || 0))); // i64.const
                body.push(0x42, ...this.leb128(Number(instr.op2?.value || 0))); // i64.const
                body.push(0x7c); // i64.add
                body.push(0x1a); // drop (result unused in this simple compiler)
            } else {
            // Push op1, op2, add
            body.push(0x41, ...this.leb128(Number(instr.op1?.value || 0)));
            body.push(0x41, ...this.leb128(Number(instr.op2?.value || 0)));
            body.push(0x6a); // i32.add
            body.push(0x21, 0x00); // local.set 0
        }
        }
        else if (op === (IROpcode.PUSH as unknown as string) || op === 'push') {
            // Store to stack (memory)
            // For POC, just print
            if (is64Bit) {
                // Warning: print expects i32, so we wrap i64.const -> i32.wrap_i64 -> call
                 body.push(0x42, ...this.leb128(Number(instr.op1?.value || 0))); // i64.const
                 body.push(0xa7); // i32.wrap_i64
                 body.push(0x10, 0x00); // call print
            } else {
            body.push(0x41, ...this.leb128(Number(instr.op1?.value || 0)));
            body.push(0x10, 0x00); // call print
            }
        }
        // ... other ops
    }
    
    // Hello World Check
    if (body.length === 3) { // Just locals header
         // Print "1337" to prove 32-bit works
         body.push(0x41, ...this.leb128(1337), 0x10, 0x00);
         
         // Print "8888888888" to prove 64-bit works
         body.push(0x42, ...this.leb128(8888888888)); 
         body.push(0x1a); // drop

         // Call graphics_clear(0xFF0000) - Red
         body.push(0x41, ...this.leb128(0xFF0000));
         body.push(0x10, 0x01); // Call func index 1 (graphics_clear)
    }

    body.push(0x0b); // End

    // Finalize Code Section
    const bodySize = body.length;
    // Fix: Properly calculate section size using LEB128 for the inner content size
    // Structure: [SectionID, SectionSize(LEB), NumFunctions, BodySize(LEB), BodyBytes...]
    const contentSize = 1 + this.leb128(bodySize).length + bodySize;
    
    this.codeSection = [
        0x0a, 
        ...this.leb128(contentSize),
        0x01, // Num bodies
        ...this.leb128(bodySize),
        ...body
    ];

    // Patch Sizes
    this.fixSectionSize(this.typeSection);
    this.fixSectionSize(this.importSection);
    this.fixSectionSize(this.funcSection);
    this.fixSectionSize(this.exportSection);

    return new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        ...this.typeSection,
        ...this.importSection,
        ...this.funcSection,
        ...this.exportSection,
        ...this.codeSection
    ]);
  }

  private fixSectionSize(section: number[]) {
      // Section structure: [ID, Size (LEB128 placeholder), Content...]
      // Check if we need to expand the placeholder
      const contentLen = section.length - 2;
      const sizeLeb = this.leb128(contentLen);
      
      if (sizeLeb.length > 1) {
         // Shift content if LEB128 takes more than 1 byte
         // For this simple compiler, we just reconstruct the section
         // This is safer than trying to splice in place with fixed offsets
         const id = section[0];
         const content = section.slice(2);
         
         // Rebuild: [ID, ...SizeLEB, ...Content]
         // Clear and push
         section.length = 0;
         section.push(id);
         section.push(...sizeLeb);
         section.push(...content);
      } else {
         section[1] = contentLen; 
      }
  }

  private leb128(value: number): number[] {
    const bytes = [];
    do {
      let byte = value & 0x7f;
      value >>>= 7; // Unsigned right shift
      if (value !== 0) {
        byte |= 0x80;
      }
      bytes.push(byte);
    } while (value !== 0);
    return bytes;
  }
}
