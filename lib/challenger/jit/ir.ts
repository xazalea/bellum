/**
 * Intermediate Representation (IR) for JIT Compiler
 * Common IR used by both x86 and Dalvik JIT compilers
 */

// IR Operation Types
export enum IROpcode {
  // Constants
  CONST_I32,
  CONST_I64,
  CONST_F32,
  CONST_F64,
  
  // Arithmetic
  ADD_I32,
  ADD_I64,
  SUB_I32,
  SUB_I64,
  MUL_I32,
  MUL_I64,
  DIV_I32,
  DIV_I64,
  MOD_I32,
  MOD_I64,
  NEG_I32,
  NEG_I64,
  
  // Bitwise
  AND_I32,
  OR_I32,
  XOR_I32,
  NOT_I32,
  SHL_I32,
  SHR_I32,
  USHR_I32,
  
  // Comparison
  EQ_I32,
  NE_I32,
  LT_I32,
  LE_I32,
  GT_I32,
  GE_I32,
  
  // Control Flow
  BR,           // Unconditional branch
  BR_IF,        // Conditional branch
  BR_TABLE,     // Switch/table branch
  CALL,         // Function call
  CALL_INDIRECT, // Indirect call
  RETURN,       // Return from function
  
  // Memory
  LOAD_I32,
  LOAD_I64,
  STORE_I32,
  STORE_I64,
  
  // Locals/Globals
  GET_LOCAL,
  SET_LOCAL,
  GET_GLOBAL,
  SET_GLOBAL,
  
  // Type Conversion
  I32_TO_I64,
  I64_TO_I32,
  I32_TO_F32,
  F32_TO_I32,
  
  // Object Operations (for managed code)
  NEW_OBJECT,
  GET_FIELD,
  SET_FIELD,
  ARRAY_NEW,
  ARRAY_GET,
  ARRAY_SET,
  ARRAY_LENGTH,
  
  // Special
  NOP,
  UNREACHABLE,
  PHI,          // SSA phi node
}

// IR Value Types
export enum IRType {
  I32,
  I64,
  F32,
  F64,
  REF,     // Object reference
  VOID,
}

// IR Instruction
export interface IRInstruction {
  opcode: IROpcode;
  type: IRType;
  operands: IRValue[];
  result?: IRValue;
  metadata?: any;
}

// IR Value (register or constant)
export interface IRValue {
  kind: 'register' | 'constant' | 'label';
  type: IRType;
  value: number | string;
  id?: number;
}

// IR Basic Block
export interface IRBasicBlock {
  id: number;
  label: string;
  instructions: IRInstruction[];
  predecessors: Set<number>;
  successors: Set<number>;
  dominatedBy?: number;
  dominates: Set<number>;
}

// IR Function
export interface IRFunction {
  name: string;
  parameters: IRValue[];
  returnType: IRType;
  locals: IRValue[];
  basicBlocks: IRBasicBlock[];
  entryBlock: number;
}

/**
 * IR Builder
 * Constructs IR from bytecode
 */
export class IRBuilder {
  private nextRegisterId = 0;
  private nextBlockId = 0;
  private currentBlock: IRBasicBlock | null = null;
  private blocks: IRBasicBlock[] = [];
  
  /**
   * Create new basic block
   */
  createBlock(label: string): IRBasicBlock {
    const block: IRBasicBlock = {
      id: this.nextBlockId++,
      label,
      instructions: [],
      predecessors: new Set(),
      successors: new Set(),
      dominates: new Set(),
    };
    this.blocks.push(block);
    return block;
  }
  
  /**
   * Set current block for instruction insertion
   */
  setInsertPoint(block: IRBasicBlock) {
    this.currentBlock = block;
  }
  
  /**
   * Create new virtual register
   */
  createRegister(type: IRType): IRValue {
    return {
      kind: 'register',
      type,
      value: 0,
      id: this.nextRegisterId++,
    };
  }
  
  /**
   * Create constant value
   */
  createConstant(type: IRType, value: number): IRValue {
    return {
      kind: 'constant',
      type,
      value,
    };
  }
  
  /**
   * Emit instruction
   */
  emit(opcode: IROpcode, type: IRType, operands: IRValue[], result?: IRValue): IRInstruction {
    if (!this.currentBlock) {
      throw new Error('No insert point set');
    }
    
    const instruction: IRInstruction = {
      opcode,
      type,
      operands,
      result,
    };
    
    this.currentBlock.instructions.push(instruction);
    return instruction;
  }
  
  /**
   * Emit binary operation
   */
  emitBinOp(opcode: IROpcode, left: IRValue, right: IRValue): IRValue {
    const result = this.createRegister(left.type);
    this.emit(opcode, left.type, [left, right], result);
    return result;
  }
  
  /**
   * Emit unary operation
   */
  emitUnaryOp(opcode: IROpcode, operand: IRValue): IRValue {
    const result = this.createRegister(operand.type);
    this.emit(opcode, operand.type, [operand], result);
    return result;
  }
  
  /**
   * Emit branch
   */
  emitBranch(targetBlock: IRBasicBlock) {
    if (!this.currentBlock) return;
    
    this.emit(IROpcode.BR, IRType.VOID, [{
      kind: 'label',
      type: IRType.VOID,
      value: targetBlock.label,
    }]);
    
    this.currentBlock.successors.add(targetBlock.id);
    targetBlock.predecessors.add(this.currentBlock.id);
  }
  
  /**
   * Emit conditional branch
   */
  emitBranchIf(condition: IRValue, trueBlock: IRBasicBlock, falseBlock: IRBasicBlock) {
    if (!this.currentBlock) return;
    
    this.emit(IROpcode.BR_IF, IRType.VOID, [
      condition,
      { kind: 'label', type: IRType.VOID, value: trueBlock.label },
      { kind: 'label', type: IRType.VOID, value: falseBlock.label },
    ]);
    
    this.currentBlock.successors.add(trueBlock.id);
    this.currentBlock.successors.add(falseBlock.id);
    trueBlock.predecessors.add(this.currentBlock.id);
    falseBlock.predecessors.add(this.currentBlock.id);
  }
  
  /**
   * Get all blocks
   */
  getBlocks(): IRBasicBlock[] {
    return this.blocks;
  }
  
  /**
   * Reset builder
   */
  reset() {
    this.nextRegisterId = 0;
    this.nextBlockId = 0;
    this.currentBlock = null;
    this.blocks = [];
  }
}

/**
 * IR Optimizer
 * Performs optimization passes on IR
 */
export class IROptimizer {
  /**
   * Run all optimization passes
   */
  optimize(func: IRFunction): IRFunction {
    let optimized = func;
    
    // Dead code elimination
    optimized = this.eliminateDeadCode(optimized);
    
    // Constant folding
    optimized = this.constantFolding(optimized);
    
    // Common subexpression elimination
    optimized = this.eliminateCommonSubexpressions(optimized);
    
    // Copy propagation
    optimized = this.copyPropagation(optimized);
    
    return optimized;
  }
  
  /**
   * Dead code elimination
   */
  private eliminateDeadCode(func: IRFunction): IRFunction {
    const liveValues = new Set<number>();
    
    // Mark live values (simplified - would need proper liveness analysis)
    for (const block of func.basicBlocks) {
      for (const inst of block.instructions) {
        // Mark operands as live
        for (const operand of inst.operands) {
          if (operand.kind === 'register' && operand.id !== undefined) {
            liveValues.add(operand.id);
          }
        }
        
        // If instruction has side effects, mark result as live
        if (this.hasSideEffects(inst)) {
          if (inst.result && inst.result.id !== undefined) {
            liveValues.add(inst.result.id);
          }
        }
      }
    }
    
    // Remove dead instructions
    for (const block of func.basicBlocks) {
      block.instructions = block.instructions.filter(inst => {
        if (!inst.result || inst.result.id === undefined) return true;
        return liveValues.has(inst.result.id) || this.hasSideEffects(inst);
      });
    }
    
    return func;
  }
  
  /**
   * Constant folding
   */
  private constantFolding(func: IRFunction): IRFunction {
    for (const block of func.basicBlocks) {
      for (let i = 0; i < block.instructions.length; i++) {
        const inst = block.instructions[i];
        
        // Check if all operands are constants
        const allConst = inst.operands.every(op => op.kind === 'constant');
        if (!allConst) continue;
        
        // Evaluate at compile time
        const result = this.evaluateConstant(inst);
        if (result !== null && inst.result) {
          // Replace with constant load
          block.instructions[i] = {
            opcode: IROpcode.CONST_I32,
            type: inst.type,
            operands: [],
            result: inst.result,
            metadata: { value: result },
          };
        }
      }
    }
    
    return func;
  }
  
  /**
   * Common subexpression elimination
   */
  private eliminateCommonSubexpressions(func: IRFunction): IRFunction {
    const expressions = new Map<string, IRValue>();
    
    for (const block of func.basicBlocks) {
      expressions.clear(); // Reset per block (simplified)
      
      for (const inst of block.instructions) {
        if (!inst.result) continue;
        
        // Create expression key
        const key = this.getExpressionKey(inst);
        
        // Check if we've seen this expression
        const existing = expressions.get(key);
        if (existing) {
          // Replace result with existing value
          inst.result = existing;
        } else {
          expressions.set(key, inst.result);
        }
      }
    }
    
    return func;
  }
  
  /**
   * Copy propagation
   */
  private copyPropagation(func: IRFunction): IRFunction {
    const copies = new Map<number, IRValue>();
    
    for (const block of func.basicBlocks) {
      for (const inst of block.instructions) {
        // Track copies (MOV-like operations)
        if (inst.opcode === IROpcode.GET_LOCAL && inst.result && inst.result.id !== undefined) {
          copies.set(inst.result.id, inst.operands[0]);
        }
        
        // Replace operands with copy sources
        for (let i = 0; i < inst.operands.length; i++) {
          const operand = inst.operands[i];
          if (operand.kind === 'register' && operand.id !== undefined) {
            const source = copies.get(operand.id);
            if (source) {
              inst.operands[i] = source;
            }
          }
        }
      }
    }
    
    return func;
  }
  
  /**
   * Check if instruction has side effects
   */
  private hasSideEffects(inst: IRInstruction): boolean {
    return [
      IROpcode.STORE_I32,
      IROpcode.STORE_I64,
      IROpcode.CALL,
      IROpcode.CALL_INDIRECT,
      IROpcode.RETURN,
      IROpcode.BR,
      IROpcode.BR_IF,
      IROpcode.SET_FIELD,
      IROpcode.ARRAY_SET,
    ].includes(inst.opcode);
  }
  
  /**
   * Evaluate constant expression
   */
  private evaluateConstant(inst: IRInstruction): number | null {
    const ops = inst.operands.map(op => op.value as number);
    
    switch (inst.opcode) {
      case IROpcode.ADD_I32: return ops[0] + ops[1];
      case IROpcode.SUB_I32: return ops[0] - ops[1];
      case IROpcode.MUL_I32: return Math.imul(ops[0], ops[1]);
      case IROpcode.DIV_I32: return ops[1] !== 0 ? Math.floor(ops[0] / ops[1]) : null;
      case IROpcode.MOD_I32: return ops[1] !== 0 ? ops[0] % ops[1] : null;
      case IROpcode.AND_I32: return ops[0] & ops[1];
      case IROpcode.OR_I32: return ops[0] | ops[1];
      case IROpcode.XOR_I32: return ops[0] ^ ops[1];
      case IROpcode.NOT_I32: return ~ops[0];
      case IROpcode.SHL_I32: return ops[0] << (ops[1] & 0x1F);
      case IROpcode.SHR_I32: return ops[0] >> (ops[1] & 0x1F);
      case IROpcode.USHR_I32: return ops[0] >>> (ops[1] & 0x1F);
      default: return null;
    }
  }
  
  /**
   * Get expression key for CSE
   */
  private getExpressionKey(inst: IRInstruction): string {
    const operandKeys = inst.operands.map(op => 
      op.kind === 'constant' ? `c${op.value}` : `r${op.id}`
    ).join(',');
    return `${inst.opcode}:${operandKeys}`;
  }
}
