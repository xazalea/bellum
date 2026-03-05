/**
 * Decompiler Types
 * Type definitions for PE and DEX decompilation
 */

// ============================================================================
// Common Types
// ============================================================================

export type BinaryFormat = 'PE' | 'DEX' | 'APK' | 'ELF' | 'Mach-O';

export interface DecompilationResult {
  success: boolean;
  ir: ModuleIR | null;
  metadata: DecompilationMetadata;
  errors: DecompilationError[];
  timing: DecompilationTiming;
}

export interface DecompilationMetadata {
  originalFormat: BinaryFormat;
  entryPoint: number;
  imports: ImportInfo[];
  exports: ExportInfo[];
  strings: string[];
  sections: SectionInfo[];
  architecture: Architecture;
  bitWidth: 32 | 64;
}

export interface DecompilationError {
  code: string;
  message: string;
  address?: number;
  section?: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DecompilationTiming {
  parse: number;
  lift: number;
  optimize: number;
  total: number;
}

// ============================================================================
// Intermediate Representation
// ============================================================================

export interface ModuleIR {
  name: string;
  functions: Map<string, FunctionIR>;
  globals: Map<string, GlobalVariable>;
  imports: Map<string, ImportInfo>;
  exports: Map<string, ExportInfo>;
  dataSections: DataSection[];
  controlFlowGraph: ControlFlowGraph;
  callGraph: CallGraph;
  typeInfo: TypeInfo[];
  stringTable: StringTable;
}

export interface FunctionIR {
  name: string;
  entryBlock: number;
  blocks: Map<number, BasicBlock>;
  signature: FunctionSignature;
  locals: LocalVariable[];
  stackFrame: StackFrame;
  attributes: FunctionAttribute[];
}

export interface BasicBlock {
  id: number;
  startAddr: number;
  endAddr: number;
  instructions: IRInstruction[];
  successors: number[];
  predecessors: number[];
  dominator?: number;
  postDominator?: number;
  loop?: LoopInfo;
}

export interface IRInstruction {
  id: number;
  opcode: IROpcode;
  addr?: number;
  op1?: IROperand;
  op2?: IROperand;
  op3?: IROperand;
  dest?: IROperand;
  metadata?: InstructionMetadata;
}

export type IROpcode =
  // Data movement
  | 'mov' | 'movzx' | 'movsx' | 'lea'
  // Arithmetic
  | 'add' | 'sub' | 'mul' | 'div' | 'rem' | 'neg' | 'inc' | 'dec'
  // Logical
  | 'and' | 'or' | 'xor' | 'not' | 'shl' | 'shr' | 'sar'
  // Comparison
  | 'cmp' | 'test' | 'setcc'
  // Control flow
  | 'jmp' | 'jcc' | 'call' | 'ret' | 'syscall' | 'trap'
  // Memory
  | 'load' | 'store' | 'push' | 'pop' | 'alloc' | 'free'
  // Conversion
  | 'cast' | 'conv' | 'bitcast'
  // Vector/SIMD
  | 'vec_load' | 'vec_store' | 'vec_add' | 'vec_mul' | 'vec_shuffle'
  // Atomic
  | 'atomic_load' | 'atomic_store' | 'atomic_rmw' | 'fence'
  // Unknown
  | 'unknown' | 'nop' | 'phi';

export interface IROperand {
  type: 'reg' | 'imm' | 'mem' | 'label' | 'func' | 'global' | 'stack';
  value: number | string | MemoryOperand;
  size: 8 | 16 | 32 | 64 | 128 | 256 | 512;
  flags?: OperandFlags;
}

export interface MemoryOperand {
  base: number | null;  // Register number or null
  index: number | null; // Register number or null
  scale: 1 | 2 | 4 | 8;
  disp: number;
  segment?: number;
}

export interface OperandFlags {
  signed: boolean;
  float: boolean;
  vector: boolean;
  atomic: boolean;
}

export interface InstructionMetadata {
  originalBytes: Uint8Array;
  originalOpcode: number;
  size: number;
  branchTarget?: number;
  isConditional: boolean;
  isCall: boolean;
  isReturn: boolean;
}

// ============================================================================
// Control Flow
// ============================================================================

export interface ControlFlowGraph {
  blocks: Map<number, CFGNode>;
  edges: CFGEdge[];
  dominators: Map<number, Set<number>>;
  postDominators: Map<number, Set<number>>;
  loops: LoopInfo[];
  entryBlock: number;
  exitBlocks: number[];
}

export interface CFGNode {
  id: number;
  startAddr: number;
  endAddr: number;
  predecessors: number[];
  successors: number[];
  instructions: IRInstruction[];
  kind: 'entry' | 'exit' | 'normal' | 'call' | 'return';
  frequency: number;
}

export interface CFGEdge {
  from: number;
  to: number;
  kind: 'fallthrough' | 'branch' | 'call' | 'return';
  probability: number;
}

export interface LoopInfo {
  header: number;
  backEdges: number[];
  body: number[];
  nestingLevel: number;
  isIrreducible: boolean;
  estimatedIterations?: number;
}

// ============================================================================
// Call Graph
// ============================================================================

export interface CallGraph {
  nodes: Map<string, CallGraphNode>;
  edges: CallGraphEdge[];
  sccs: string[][]; // Strongly connected components
  entryPoints: string[];
}

export interface CallGraphNode {
  name: string;
  address: number;
  callers: string[];
  callees: CalleeInfo[];
  isExternal: boolean;
  isVirtual: boolean;
  vtableSlot?: number;
  complexity: number;
}

export interface CalleeInfo {
  target: string;
  callSites: number[];
  isDirect: boolean;
  isVirtual: boolean;
  vtableSlot?: number;
}

export interface CallGraphEdge {
  caller: string;
  callee: string;
  callSites: number[];
  frequency: number;
}

// ============================================================================
// Types
// ============================================================================

export interface TypeInfo {
  name: string;
  kind: 'primitive' | 'struct' | 'union' | 'array' | 'pointer' | 'function' | 'class' | 'interface';
  size: number;
  alignment: number;
  fields: FieldInfo[];
  methods?: MethodInfo[];
  vtable?: VtableEntry[];
  superClass?: string;
  interfaces: string[];
  attributes: TypeAttribute[];
}

export interface FieldInfo {
  name: string;
  offset: number;
  type: string;
  size: number;
  flags: FieldFlags;
}

export interface FieldFlags {
  isStatic: boolean;
  isFinal: boolean;
  isVolatile: boolean;
  isPrivate: boolean;
  isProtected: boolean;
  isPublic: boolean;
}

export interface MethodInfo {
  name: string;
  signature: string;
  isVirtual: boolean;
  vtableSlot?: number;
  address?: number;
  flags: MethodFlags;
}

export interface MethodFlags {
  isStatic: boolean;
  isFinal: boolean;
  isPrivate: boolean;
  isProtected: boolean;
  isPublic: boolean;
  isAbstract: boolean;
  isNative: boolean;
  isSynchronized: boolean;
}

export interface VtableEntry {
  slot: number;
  methodName: string;
  implementor: string;
  address: number;
}

export type TypeAttribute = 'packed' | 'transparent' | 'readonly' | 'sealed';

export type FunctionAttribute = 
  | 'inline' 
  | 'noinline' 
  | 'noreturn' 
  | 'pure' 
  | 'const' 
  | 'constructor'
  | 'destructor'
  | 'exported'
  | 'hidden';

// ============================================================================
// Variables
// ============================================================================

export interface GlobalVariable {
  name: string;
  address: number;
  size: number;
  initializer?: Uint8Array;
  isReadOnly: boolean;
  isThreadLocal: boolean;
  type?: string;
}

export interface LocalVariable {
  name: string;
  type: string;
  size: number;
  offset: number;
  isParameter: boolean;
  register?: number;
}

export interface StackFrame {
  size: number;
  locals: LocalVariable[];
  savedRegisters: number[];
  hasDynamicAllocation: boolean;
}

// ============================================================================
// Imports/Exports
// ============================================================================

export interface ImportInfo {
  module: string;
  name: string;
  signature: string;
  callSites: number[];
  isDirectCall: boolean;
  inferredReturnType?: string;
  resolved?: boolean;
}

export interface ExportInfo {
  name: string;
  address: number;
  signature: string;
  isEntryPoint: boolean;
  isPublic: boolean;
}

// ============================================================================
// Sections
// ============================================================================

export interface SectionInfo {
  name: string;
  address: number;
  size: number;
  permissions: 'r' | 'rw' | 'rwx' | 'rx';
  type: 'code' | 'data' | 'rodata' | 'bss' | 'unknown';
}

export interface DataSection {
  name: string;
  address: number;
  size: number;
  data: Uint8Array;
  permissions: 'r' | 'rw' | 'rwx';
  relocations: Relocation[];
}

export interface Relocation {
  address: number;
  type: string;
  symbol: string;
  addend: number;
}

// ============================================================================
// String Table
// ============================================================================

export interface StringTable {
  strings: Map<number, string>;
  references: Map<string, number[]>;
  encoding: 'utf-8' | 'utf-16' | 'ascii';
}

// ============================================================================
// Function Signature
// ============================================================================

export interface FunctionSignature {
  returnType: string;
  parameters: ParameterInfo[];
  isVariadic: boolean;
  callingConvention: CallingConvention;
}

export interface ParameterInfo {
  name: string;
  type: string;
  size: number;
  register?: number;
  stackOffset?: number;
}

export type CallingConvention = 
  | 'cdecl' 
  | 'stdcall' 
  | 'fastcall' 
  | 'thiscall' 
  | 'vectorcall'
  | 'systemv'
  | 'windows'
  | 'aapcs'
  | 'dalvik';

// ============================================================================
// Architecture
// ============================================================================

export type Architecture = 
  | 'x86' 
  | 'x86_64' 
  | 'arm' 
  | 'arm64' 
  | 'mips' 
  | 'riscv'
  | 'dalvik'
  | 'wasm';

// ============================================================================
// Profile Data
// ============================================================================

export interface DecompilationProfile {
  moduleHash: string;
  functionProfiles: Map<string, FunctionProfile>;
  memoryPatterns: MemoryPattern[];
  callTargets: Map<number, CallTargetInfo>;
  createdAt: number;
  samplesCollected: number;
}

export interface FunctionProfile {
  name: string;
  entryCount: number;
  blockFrequencies: Map<number, number>;
  branchProbabilities: Map<number, Map<number, number>>;
  callTargets: Map<number, Map<string, number>>;
  memoryAccessPatterns: MemoryAccessPattern[];
  hotness: 'cold' | 'warm' | 'hot' | 'critical';
}

export interface MemoryAccessPattern {
  address: number;
  stride: number;
  accessCount: number;
  isRead: boolean;
  isConstant: boolean;
  value?: number;
}

export interface MemoryPattern {
  baseAddress: number;
  size: number;
  accessType: 'sequential' | 'strided' | 'random';
  stride?: number;
  readWrite: 'read' | 'write' | 'both';
}

export interface CallTargetInfo {
  address: number;
  targets: Map<string, number>;
  totalCalls: number;
  isStable: boolean;
  primaryTarget?: string;
}