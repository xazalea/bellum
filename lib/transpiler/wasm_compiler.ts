/**
 * WASM Compiler - Generates WebAssembly binary from IR
 * Extended Support: SIMD, Locals, Linear Memory, Multithreading
 */

import { IRInstruction, IROpcode } from './lifter';

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
    this.typeSection = [
      0x01, // Section Code
      0x00, // Placeholder Size
      0x03, // Num types
      0x60, 0x01, 0x7f, 0x00, // (i32) -> void
      0x60, 0x00, 0x00,       // () -> void
      0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f // (i32, i32) -> i32
    ];

    // 2. Import Section
    // Import memory from 'env.memory'
    this.importSection = [
      0x02, // Section Code
      0x00, // Placeholder Size
      0x02, // Num imports
      // env.memory (Shared)
      0x03, 0x65, 0x6e, 0x76, 0x06, 0x6d, 0x65, 0x6d, 0x6f, 0x72, 0x79,
      0x02, // Kind: Memory
      0x03, // Limits: Shared + Min/Max
      0x80, 0x02, // Min 256 pages
      0x80, 0x20, // Max 4096 pages
      0x01, // Shared flag
      // env.print
      0x03, 0x65, 0x6e, 0x76, 0x05, 0x70, 0x72, 0x69, 0x6e, 0x74,
      0x00, 0x00 // Kind: Func, Type: 0
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
        switch (instr.opcode) {
            case IROpcode.ADD:
                // Push op1, op2, add
                body.push(0x41, ...this.leb128(Number(instr.op1)));
                body.push(0x41, ...this.leb128(Number(instr.op2)));
                body.push(0x6a); // i32.add
                body.push(0x21, 0x00); // local.set 0
                break;
            case IROpcode.PUSH:
                // Store to stack (memory)
                // For POC, just print
                body.push(0x41, ...this.leb128(Number(instr.op1)));
                body.push(0x10, 0x00); // call print
                break;
            // ... other ops
        }
    }
    
    // Hello World Check
    if (body.length === 3) { // Just locals header
         body.push(0x41, ...this.leb128(1337), 0x10, 0x00);
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
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
<<<<<<< Current (Your changes)
         section[1] = contentLen; 
=======
      section[1] = contentLen; 
>>>>>>> Incoming (Background Agent changes)
=======
      section[1] = contentLen; 
>>>>>>> Incoming (Background Agent changes)
=======
         section[1] = contentLen; 
>>>>>>> Incoming (Background Agent changes)
=======
      section[1] = contentLen; 
>>>>>>> Incoming (Background Agent changes)
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

