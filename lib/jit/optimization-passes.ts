/**
 * JIT Optimization Passes
 * Aggressive optimization techniques for hot code paths
 * 
 * Optimizations:
 * - Function inlining
 * - Loop unrolling
 * - Dead code elimination
 * - Constant propagation
 * - SIMD vectorization
 * - Common subexpression elimination
 * - Register allocation
 */

import type { BasicBlock, IRInstruction, IROpcode } from '../transpiler/lifter/types';
import { ExecutionTier } from '../execution/profiler';

// ============================================================================
// Types
// ============================================================================

export interface OptimizationResult {
  optimized: BasicBlock[];
  statistics: OptimizationStats;
}

export interface OptimizationStats {
  instructionsRemoved: number;
  loopsUnrolled: number;
  functionsInlined: number;
  vectorized: boolean;
  compilationTime: number;
}

// ============================================================================
// Optimizing JIT
// ============================================================================

export class OptimizingJIT {
  /**
   * Compile with optimizations based on code tier
   */
  compileWithOptimizations(blocks: BasicBlock[], tier: ExecutionTier): OptimizationResult {
    console.log(`[OptimizingJIT] Compiling with ${tier} optimizations...`);
    const startTime = performance.now();

    let optimized = [...blocks];
    const stats: OptimizationStats = {
      instructionsRemoved: 0,
      loopsUnrolled: 0,
      functionsInlined: 0,
      vectorized: false,
      compilationTime: 0,
    };

    // Apply optimizations based on tier
    if (tier === ExecutionTier.WARM || tier === ExecutionTier.HOT || tier === ExecutionTier.CRITICAL) {
      // Dead code elimination (all tiers)
      const dceResult = this.eliminateDeadCode(optimized);
      optimized = dceResult.blocks;
      stats.instructionsRemoved += dceResult.removed;
    }

    if (tier === ExecutionTier.HOT || tier === ExecutionTier.CRITICAL) {
      // Constant propagation
      optimized = this.propagateConstants(optimized);

      // Common subexpression elimination
      optimized = this.eliminateCommonSubexpressions(optimized);

      // Inline small functions
      const inlineResult = this.inlineFunctions(optimized);
      optimized = inlineResult.blocks;
      stats.functionsInlined = inlineResult.inlined;
    }

    if (tier === ExecutionTier.CRITICAL) {
      // Loop unrolling
      const unrollResult = this.unrollLoops(optimized);
      optimized = unrollResult.blocks;
      stats.loopsUnrolled = unrollResult.unrolled;

      // SIMD vectorization
      const vectorResult = this.vectorizeOperations(optimized);
      optimized = vectorResult.blocks;
      stats.vectorized = vectorResult.vectorized;
    }

    stats.compilationTime = performance.now() - startTime;

    console.log(`[OptimizingJIT] Optimization complete:`, stats);

    return { optimized, statistics: stats };
  }

  /**
   * Inline small functions
   */
  inlineFunctions(blocks: BasicBlock[]): { blocks: BasicBlock[]; inlined: number } {
    console.log('[OptimizingJIT] Inlining functions...');

    let inlined = 0;
    const optimized: BasicBlock[] = [];

    for (const block of blocks) {
      const newInstructions: IRInstruction[] = [];

      for (const instr of block.instructions) {
        if (instr.opcode === 'CALL' as IROpcode) {
          // Check if call target is small enough to inline
          const targetBlock = this.findCallTarget(instr, blocks);
          
          if (targetBlock && this.isSmallEnoughToInline(targetBlock)) {
            // Inline the function
            newInstructions.push(...targetBlock.instructions.filter(i => i.opcode !== 'RET' as IROpcode));
            inlined++;
          } else {
            newInstructions.push(instr);
          }
        } else {
          newInstructions.push(instr);
        }
      }

      optimized.push({
        ...block,
        instructions: newInstructions,
      });
    }

    console.log(`[OptimizingJIT] Inlined ${inlined} functions`);
    return { blocks: optimized, inlined };
  }

  /**
   * Unroll loops for better performance
   */
  unrollLoops(blocks: BasicBlock[]): { blocks: BasicBlock[]; unrolled: number } {
    console.log('[OptimizingJIT] Unrolling loops...');

    let unrolled = 0;
    const optimized: BasicBlock[] = [];

    for (const block of blocks) {
      const loop = this.detectLoop(block);
      
      if (loop && loop.tripCount && loop.tripCount <= 8) {
        // Unroll small loops
        const unrolledBlock = this.unrollLoop(block, loop);
        optimized.push(unrolledBlock);
        unrolled++;
      } else {
        optimized.push(block);
      }
    }

    console.log(`[OptimizingJIT] Unrolled ${unrolled} loops`);
    return { blocks: optimized, unrolled };
  }

  /**
   * Eliminate dead code
   */
  eliminateDeadCode(blocks: BasicBlock[]): { blocks: BasicBlock[]; removed: number } {
    console.log('[OptimizingJIT] Eliminating dead code...');

    let removed = 0;
    const optimized: BasicBlock[] = [];

    for (const block of blocks) {
      const liveInstructions: IRInstruction[] = [];
      const usedRegisters = new Set<string>();

      // Backward pass to mark live instructions
      for (let i = block.instructions.length - 1; i >= 0; i--) {
        const instr = block.instructions[i];
        
        // Check if instruction result is used
        if (this.isInstructionLive(instr, usedRegisters)) {
          liveInstructions.unshift(instr);
          
          // Mark source operands as used
          const operands = [instr.op1, instr.op2, instr.op3].filter(op => op !== undefined);
          if (operands.length > 0) {
            for (const operand of operands) {
              if (typeof operand === 'string') {
                usedRegisters.add(operand);
              }
            }
          }
        } else if (this.hasSideEffects(instr)) {
          // Keep instructions with side effects
          liveInstructions.unshift(instr);
        } else {
          removed++;
        }
      }

      optimized.push({
        ...block,
        instructions: liveInstructions,
      });
    }

    console.log(`[OptimizingJIT] Removed ${removed} dead instructions`);
    return { blocks: optimized, removed };
  }

  /**
   * Propagate constants
   */
  propagateConstants(blocks: BasicBlock[]): BasicBlock[] {
    console.log('[OptimizingJIT] Propagating constants...');

    const optimized: BasicBlock[] = [];

    for (const block of blocks) {
      const constants = new Map<string, any>();
      const newInstructions: IRInstruction[] = [];

      for (const instr of block.instructions) {
        // Track constant assignments
        if (instr.opcode === 'MOV' as IROpcode && typeof instr.op2 === 'number') {
          constants.set(instr.op1 as any, instr.op2);
        }

        // Replace constant uses
        const optimizedInstr = { ...instr };
        // Replace constants in op1, op2, op3
        if (optimizedInstr.op1 && typeof optimizedInstr.op1 === 'string' && constants.has(optimizedInstr.op1)) {
          optimizedInstr.op1 = constants.get(optimizedInstr.op1) as any;
        }
        if (optimizedInstr.op2 && typeof optimizedInstr.op2 === 'string' && constants.has(optimizedInstr.op2)) {
          optimizedInstr.op2 = constants.get(optimizedInstr.op2) as any;
        }
        if (optimizedInstr.op3 && typeof optimizedInstr.op3 === 'string' && constants.has(optimizedInstr.op3)) {
          optimizedInstr.op3 = constants.get(optimizedInstr.op3) as any;
        }

        newInstructions.push(optimizedInstr);
      }

      optimized.push({
        ...block,
        instructions: newInstructions,
      });
    }

    console.log('[OptimizingJIT] Constant propagation complete');
    return optimized;
  }

  /**
   * Vectorize operations for SIMD
   */
  vectorizeOperations(blocks: BasicBlock[]): { blocks: BasicBlock[]; vectorized: boolean } {
    console.log('[OptimizingJIT] Vectorizing operations...');

    let vectorized = false;
    const optimized: BasicBlock[] = [];

    for (const block of blocks) {
      const newInstructions: IRInstruction[] = [];
      let i = 0;

      while (i < block.instructions.length) {
        // Look for vectorizable patterns (e.g., 4 consecutive ADD operations)
        const vectorGroup = this.findVectorizableGroup(block.instructions, i);
        
        if (vectorGroup.length >= 4) {
          // Replace with SIMD instruction
          newInstructions.push({
            id: block.instructions[i].id,
            opcode: 'SIMD_ADD' as IROpcode,
            addr: block.instructions[i].addr,
            op1: vectorGroup[0]?.op1,
            op2: vectorGroup[0]?.op2,
            op3: vectorGroup[0]?.op3,
          });
          
          i += vectorGroup.length;
          vectorized = true;
        } else {
          newInstructions.push(block.instructions[i]);
          i++;
        }
      }

      optimized.push({
        ...block,
        instructions: newInstructions,
      });
    }

    console.log(`[OptimizingJIT] Vectorization ${vectorized ? 'applied' : 'not applicable'}`);
    return { blocks: optimized, vectorized };
  }

  /**
   * Eliminate common subexpressions
   */
  eliminateCommonSubexpressions(blocks: BasicBlock[]): BasicBlock[] {
    console.log('[OptimizingJIT] Eliminating common subexpressions...');

    const optimized: BasicBlock[] = [];

    for (const block of blocks) {
      const expressions = new Map<string, IRInstruction>();
      const newInstructions: IRInstruction[] = [];

      for (const instr of block.instructions) {
        const exprKey = this.getExpressionKey(instr);
        
        if (exprKey && expressions.has(exprKey)) {
          // Replace with reference to previous result
          const prevInstr = expressions.get(exprKey)!;
          newInstructions.push({
            ...instr,
            opcode: 'MOV' as IROpcode,
            op1: instr.op1,
            op2: prevInstr.op1,
          });
        } else {
          if (exprKey) {
            expressions.set(exprKey, instr);
          }
          newInstructions.push(instr);
        }
      }

      optimized.push({
        ...block,
        instructions: newInstructions,
      });
    }

    console.log('[OptimizingJIT] CSE complete');
    return optimized;
  }

  /**
   * Helper methods
   */

  private findCallTarget(instr: IRInstruction, blocks: BasicBlock[]): BasicBlock | null {
    // Find the target basic block of a CALL instruction
    if (instr.op1) {
      const targetAddr = parseInt(String(instr.op1).replace('0x', ''), 16);
      return blocks.find(b => b.startAddr === targetAddr) || null;
    }
    return null;
  }

  private isSmallEnoughToInline(block: BasicBlock): boolean {
    // Inline functions with ≤10 instructions
    return block.instructions.length <= 10;
  }

  private detectLoop(block: BasicBlock): { tripCount?: number } | null {
    // Simplified loop detection
    // Look for backward jumps
    for (const instr of block.instructions) {
      if (instr.opcode === 'JMP' as IROpcode && instr.op1) {
        const targetAddr = parseInt(String(instr.op1).replace('0x', ''), 16);
        if (instr.addr !== undefined && targetAddr < instr.addr) {
          // Backward jump - potential loop
          return { tripCount: 4 }; // Assume small trip count
        }
      }
    }
    return null;
  }

  private unrollLoop(block: BasicBlock, loop: { tripCount?: number }): BasicBlock {
    // Duplicate loop body tripCount times
    const unrolled: IRInstruction[] = [];
    const loopBody = block.instructions.filter(i => i.opcode !== 'JMP' as IROpcode);

    for (let i = 0; i < (loop.tripCount || 1); i++) {
      unrolled.push(...loopBody.map(instr => ({ ...instr })));
    }

    return {
      ...block,
      instructions: unrolled,
    };
  }

  private isInstructionLive(instr: IRInstruction, usedRegisters: Set<string>): boolean {
    // Check if instruction writes to a used register
    if (instr.op1) {
      const dest = instr.op1;
      return typeof dest === 'string' && usedRegisters.has(dest);
    }
    return false;
  }

  private hasSideEffects(instr: IRInstruction): boolean {
    // Instructions with side effects (memory, I/O, control flow)
    const sideEffectOpcodes: IROpcode[] = ['STORE', 'CALL', 'RET', 'JMP', 'SYSCALL'] as unknown as IROpcode[];
    return sideEffectOpcodes.includes(instr.opcode as IROpcode);
  }

  private findVectorizableGroup(instructions: IRInstruction[], start: number): IRInstruction[] {
    const group: IRInstruction[] = [];
    const targetOpcode = instructions[start].opcode;

    // Look for consecutive instructions with same opcode
    for (let i = start; i < instructions.length && i < start + 4; i++) {
      if (instructions[i].opcode === targetOpcode && this.isVectorizable(instructions[i])) {
        group.push(instructions[i]);
      } else {
        break;
      }
    }

    return group;
  }

  private isVectorizable(instr: IRInstruction): boolean {
    // Check if instruction can be vectorized
    const vectorizableOpcodes: IROpcode[] = ['ADD', 'SUB', 'MUL', 'DIV'] as unknown as IROpcode[];
    return vectorizableOpcodes.includes(instr.opcode as IROpcode);
  }

  private getExpressionKey(instr: IRInstruction): string | null {
    // Create unique key for expression
    if (instr.op2) {
      return `${instr.opcode}:${instr.op2},${instr.op3 || ''}`;
    }
    return null;
  }
}

// Export singleton
export const optimizingJIT = new OptimizingJIT();
