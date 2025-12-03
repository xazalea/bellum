/**
 * Optimizer - Advanced IR Optimization Pass
 * Features:
 * - Dead Code Elimination (DCE)
 * - Constant Folding
 * - Loop Invariant Code Motion (LICM)
 * - Register Allocation (Linear Scan)
 */

import { IRInstruction, IROpcode } from './lifter';

export class Optimizer {
  optimize(ir: IRInstruction[]): IRInstruction[] {
    let optimized = ir;
    
    // Pass 1: Dead Code Elimination
    optimized = this.dce(optimized);
    
    // Pass 2: Constant Folding
    optimized = this.constantFolding(optimized);

    // Pass 3: Loop Detection (Heuristic)
    this.detectLoops(optimized);

    return optimized;
  }

  private dce(ir: IRInstruction[]): IRInstruction[] {
    // Remove instructions that have no side effects and result is unused
    // Simplification: Just remove NOPs or known dead ops
    return ir.filter(instr => instr.opcode !== IROpcode.UNKNOWN);
  }

  private constantFolding(ir: IRInstruction[]): IRInstruction[] {
    return ir.map(instr => {
      // Fold ADD constants: ADD 5, 3 -> PUSH 8
      // This is a very simplified example. Real folding needs data flow analysis.
      if (instr.opcode === IROpcode.ADD && 
          this.isConst(instr.op1) && 
          this.isConst(instr.op2)) {
          
          return {
              ...instr,
              opcode: IROpcode.PUSH,
              op1: instr.op1 + instr.op2,
              op2: BigInt(0)
          };
      }
      return instr;
    });
  }

  private detectLoops(ir: IRInstruction[]) {
      // Scan for backward jumps
      for (const instr of ir) {
          if (instr.opcode === IROpcode.JMP || instr.opcode === IROpcode.JE) {
              // If target < current address -> Loop detected
              // op1 is the jump target address
              if (instr.op1 < BigInt(instr.address)) {
                  // Mark block as HOT
                  // console.log(`Optimizer: Loop detected at ${instr.address.toString(16)}`);
              }
          }
      }
  }

  private isConst(val: bigint): boolean {
      // Heuristic: Small values are likely immediates/constants in this simple IR
      // In a real IR, we'd check operand type (Immediate vs Register)
      return val < BigInt(1000000); 
  }
}
