
const IROpcode = {
    PUSH: 'PUSH',
    ADD: 'ADD',
    SUB: 'SUB',
    MUL: 'MUL',
    DIV: 'DIV',
    RET: 'RET'
};

class WASMCompiler {
  private typeSection: number[] = [];
  private importSection: number[] = [];
  private funcSection: number[] = [];
  private exportSection: number[] = [];
  private codeSection: number[] = [];
  
  constructor() {
    this.initSections();
  }

  private initSections() {
    this.typeSection = [
      0x01, 0x00, 0x03,
      0x60, 0x01, 0x7f, 0x00,
      0x60, 0x00, 0x00,
      0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f
    ];

    // Placeholder import section - stripped down for test
    this.importSection = [
      0x02, 0x00, 0x01,
      0x03, 0x65, 0x6e, 0x76, 0x05, 0x70, 0x72, 0x69, 0x6e, 0x74, 0x00, 0x00
    ];
    
    this.funcSection = [ 0x03, 0x00, 0x01, 0x01 ];

    this.exportSection = [
        0x07, 0x00, 0x01,
        0x05, 0x73, 0x74, 0x61, 0x72, 0x74,
        0x00, 0x01
    ];
  }

  compile(ir: any[]): Uint8Array {
    const body: number[] = [];
    body.push(0x01, 0x01, 0x7f); // Locals

    for (const instr of ir) {
        if (instr.opcode === IROpcode.PUSH) {
            body.push(0x41, ...this.leb128(Number(instr.op1)));
            body.push(0x10, 0x00); // call print
        }
    }
    
    // Hello World Check
    if (body.length === 3) {
         body.push(0x41, ...this.leb128(1337), 0x10, 0x00);
    }

    body.push(0x0b); // End

    const bodySize = body.length;
    // CRITICAL PART: Section Size Calculation
    const contentSize = 1 + this.leb128(bodySize).length + bodySize; // Count + SizeLEB + Body
    
    console.log(`Body Size: ${bodySize}`);
    console.log(`Body Size LEB: ${this.leb128(bodySize).length}`);
    console.log(`Content Size: ${contentSize}`);
    console.log(`Content Size LEB: ${this.leb128(contentSize).length}`);

    this.codeSection = [
        0x0a, 
        ...this.leb128(contentSize),
        0x01, // Num bodies
        ...this.leb128(bodySize),
        ...body
    ];

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
      const contentLen = section.length - 2;
      const sizeLeb = this.leb128(contentLen);
      
      // If contentLen is small (e.g. < 128), sizeLeb is 1 byte.
      // If contentLen >= 128, sizeLeb is 2+ bytes.
      // section[1] is the placeholder (0x00).
      
      if (sizeLeb.length > 1) {
         console.log(`Fixing large section ${section[0]} with size ${contentLen}`);
         const id = section[0];
         const content = section.slice(2);
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
      value >>>= 7;
      if (value !== 0) {
        byte |= 0x80;
      }
      bytes.push(byte);
    } while (value !== 0);
    return bytes;
  }
}

async function test() {
    console.log("Testing standalone compiler logic...");
    const compiler = new WASMCompiler();
    const ir = [{ opcode: IROpcode.PUSH, op1: 42 }];
    const binary = compiler.compile(ir);
    
    console.log(`Binary size: ${binary.length}`);
    
    // Check if we can compile it
    try {
        const module = await WebAssembly.compile(binary.buffer as ArrayBuffer);
        console.log("SUCCESS: Module compiled.");
    } catch (e) {
        console.error("FAILURE:", e);
    }
}

test();

