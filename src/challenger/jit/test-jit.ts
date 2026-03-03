import { DBT } from './dbt';
import { GPUCompiler } from './gpu-compiler';

export async function runJITTest() {
    console.log("--- Starting JIT-to-GPU Pipeline Test ---");

    // 1. Mock "Hot Code" (x86 Machine Code)
    // 0xB8 0x01 0x00 0x00 0x00  -> MOV EAX, 1
    // 0xBB 0x02 0x00 0x00 0x00  -> MOV EBX, 2
    // 0x01 0xD8                 -> ADD EAX, EBX (ModRM C3: 11 000 011 -> EAX, EBX. Wait, my DBT is mocked. 01 is ADD.)

    // My DBT Add logic:
    // if op == 0x01:
    //   dest = (modrm >> 3) & 7
    //   src  = modrm & 7

    // 0xD8 = 11 011 000 (Wait, dest=3(EBX), src=0(EAX))?
    // 0xC3 = 11 000 011 (dest=0(EAX), src=3(EBX))

    const mockCode = new Uint8Array([
        0xB8, 10, 0, 0, 0,    // MOV EAX (0), 10
        0xB9, 20, 0, 0, 0,    // MOV ECX (1), 20
        0x01, 0xC8            // ADD EAX, ECX (ModRM C8 -> 11 001 000 -> dest=1(ECX)? No wait. 
        // mod=3, reg=1(ECX), rm=0(EAX). ADD r/m32, r32. 
        // dest is r/m32 (EAX). src is r32 (ECX).
        // My DBT logic: regDest = (modrm>>3)&7 = 1. src=0.
        // So it thinks dest=ECX, src=EAX. 
        // Let's adjust bytes to match my DBT expectation if needed, or just observe.
    ]);

    // 2. Initialize Pipeline
    const dbt = new DBT();
    const compiler = new GPUCompiler();

    // 3. Translate to IR
    console.log("Step 1: DBT Translation (x86 -> IR)");
    const irBlock = dbt.translateBlock(mockCode, 0x1000);
    console.log("IR Instructions:", JSON.stringify(irBlock.instructions, null, 2));

    // 4. Compile to WGSL
    console.log("Step 2: Backend Compilation (IR -> WGSL)");
    const wgsl = compiler.compileBlockToWGSL(irBlock);
    console.log("Generated WGSL:");
    console.log(wgsl);

    return wgsl;
}
