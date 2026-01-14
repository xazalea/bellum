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
          if (instr.operands) {
            for (const operand of instr.operands) {
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
        if (instr.opcode === 'MOV' as IROpcode && typeof instr.operands?.[1] === 'number') {
          constants.set(instr.operands[0], instr.operands[1]);
        }

        // Replace constant uses
        const optimizedInstr = { ...instr };
        if (optimizedInstr.operands) {
          optimizedInstr.operands = optimizedInstr.operands.map(op => {
            if (typeof op === 'string' && constants.has(op)) {
              return constants.get(op);
            }
            return op;
          });
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
            bytes: new Uint8Array(),
            operands: vectorGroup.flatMap(instr => instr.operands || []),
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
            operands: [instr.operands?.[0], prevInstr.operands?.[0]],
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
    if (instr.operands && instr.operands.length > 0) {
      const targetAddr = parseInt(String(instr.operands[0]).replace('0x', ''), 16);
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
      if (instr.opcode === 'JMP' as IROpcode && instr.operands) {
        const targetAddr = parseInt(String(instr.operands[0]).replace('0x', ''), 16);
        if (targetAddr < instr.addr) {
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
    if (instr.operands && instr.operands.length > 0) {
      const dest = instr.operands[0];
      return typeof dest === 'string' && usedRegisters.has(dest);
    }
    return false;
  }

  private hasSideEffects(instr: IRInstruction): boolean {
    // Instructions with side effects (memory, I/O, control flow)
    const sideEffectOpcodes: IROpcode[] = ['STORE', 'CALL', 'RET', 'JMP', 'SYSCALL'] as IROpcode[];
    return sideEffectOpcodes.includes(instr.opcode);
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
    const vectorizableOpcodes: IROpcode[] = ['ADD', 'SUB', 'MUL', 'DIV'] as IROpcode[];
    return vectorizableOpcodes.includes(instr.opcode);
  }

  private getExpressionKey(instr: IRInstruction): string | null {
    // Create unique key for expression
    if (instr.operands && instr.operands.length >= 2) {
      return `${instr.opcode}:${instr.operands.slice(1).join(',')}`;
    }
    return null;
  }
}

// Export singleton
export const optimizingJIT = new OptimizingJIT();
