/**
 * Recompiler Types
 * Type definitions for WASM and JS code generation
 */

import type { ModuleIR, FunctionIR, IROpcode, Architecture } from '../decompiler/types';

// ============================================================================
// Target Configuration
// ============================================================================

export type OutputFormat = 'wasm' | 'js' | 'webgpu';

export type OptimizationLevel = 'O0' | 'O1' | 'O2' | 'O3' | 'Os' | 'Oz';

export interface RecompilationTarget {
  format: OutputFormat;
  optimizations: OptimizationLevel;
  features: TargetFeatures;
  memoryModel: MemoryModel;
  runtimeSupport: RuntimeSupport[];
}

export interface TargetFeatures {
  simd: boolean;
  threads: boolean;
  bulkMemory: boolean;
  referenceTypes: boolean;
  tailCall: boolean;
  multiValue: boolean;
  exceptionHandling: boolean;
}

export interface MemoryModel {
  initialPages: number;
  maxPages: number;
  shared: boolean;
  guardPages: number;
  alignment: 4 | 8 | 16;
}

export type RuntimeSupport = 
  | 'emulated-syscalls'
  | 'webgpu-rendering'
  | 'filesystem-access'
  | 'network-proxy'
  | 'audio-output'
  | 'input-handling'
  | 'window-management';

// ============================================================================
// Recompilation Result
// ============================================================================

export interface RecompilationResult {
  success: boolean;
  code: Uint8Array | string;
  sourceMap?: string;
  metadata: RecompilationMetadata;
  errors: RecompilationError[];
  timing: RecompilationTiming;
}

export interface RecompilationMetadata {
  functionCount: number;
  codeSize: number;
  dataSize: number;
  memorySize: number;
  tableSize: number;
  imports: string[];
  exports: string[];
  features: string[];
}

export interface RecompilationError {
  code: string;
  message: string;
  function?: string;
  instruction?: number;
  severity: 'error' | 'warning' | 'info';
}

export interface RecompilationTiming {
  analysis: number;
  optimization: number;
  codeGeneration: number;
  total: number;
}

// ============================================================================
// WASM Module Structure
// ============================================================================

export interface WasmModule {
  version: number;
  types: WasmType[];
  functions: WasmFunction[];
  tables: WasmTable[];
  memories: WasmMemory[];
  globals: WasmGlobal[];
  elements: WasmElement[];
  data: WasmData[];
  imports: WasmImport[];
  exports: WasmExport[];
  start?: number;
  customSections: WasmCustomSection[];
}

export interface WasmType {
  id: number;
  params: WasmValType[];
  results: WasmValType[];
}

export type WasmValType = 
  | 'i32' 
  | 'i64' 
  | 'f32' 
  | 'f64' 
  | 'v128' 
  | 'funcref' 
  | 'externref' 
  | 'anyref';

export interface WasmFunction {
  id: number;
  name: string;
  typeIndex: number;
  locals: WasmValType[];
  body: WasmInstruction[];
  sourceFunction?: string;
}

export interface WasmInstruction {
  opcode: WasmOpcode;
  operands: (number | number[])[];
  blockType?: WasmBlockType;
  sourceLocation?: SourceLocation;
}

export type WasmOpcode =
  // Control
  | 'unreachable' | 'nop' | 'block' | 'loop' | 'if' | 'else' | 'end' | 'br' 
  | 'br_if' | 'br_table' | 'return' | 'call' | 'call_indirect'
  // Parametric
  | 'drop' | 'select'
  // Variable
  | 'local.get' | 'local.set' | 'local.tee' | 'global.get' | 'global.set'
  // Memory
  | 'i32.load' | 'i64.load' | 'f32.load' | 'f64.load'
  | 'i32.load8_s' | 'i32.load8_u' | 'i32.load16_s' | 'i32.load16_u'
  | 'i64.load8_s' | 'i64.load8_u' | 'i64.load16_s' | 'i64.load16_u'
  | 'i64.load32_s' | 'i64.load32_u'
  | 'i32.store' | 'i64.store' | 'f32.store' | 'f64.store'
  | 'i32.store8' | 'i32.store16' | 'i64.store8' | 'i64.store16' | 'i64.store32'
  | 'memory.size' | 'memory.grow'
  // Numeric
  | 'i32.const' | 'i64.const' | 'f32.const' | 'f64.const'
  | 'i32.eqz' | 'i32.eq' | 'i32.ne' | 'i32.lt_s' | 'i32.lt_u'
  | 'i32.gt_s' | 'i32.gt_u' | 'i32.le_s' | 'i32.le_u' | 'i32.ge_s' | 'i32.ge_u'
  | 'i32.clz' | 'i32.ctz' | 'i32.popcnt' | 'i32.add' | 'i32.sub' | 'i32.mul'
  | 'i32.div_s' | 'i32.div_u' | 'i32.rem_s' | 'i32.rem_u'
  | 'i32.and' | 'i32.or' | 'i32.xor' | 'i32.shl' | 'i32.shr_s' | 'i32.shr_u'
  | 'i32.rotl' | 'i32.rotr'
  // SIMD
  | 'v128.load' | 'v128.store' | 'v128.const'
  | 'i32x4.add' | 'i32x4.sub' | 'i32x4.mul' | 'i32x4.dot_i16x8_s'
  // Bulk memory
  | 'memory.init' | 'data.drop' | 'memory.copy' | 'memory.fill';

export type WasmBlockType = number | WasmValType | 'empty';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  function?: string;
  address?: number;
}

export interface WasmTable {
  id: number;
  elementType: 'funcref' | 'externref';
  limits: { min: number; max?: number };
  name?: string;
}

export interface WasmMemory {
  id: number;
  limits: { min: number; max?: number };
  shared: boolean;
  name?: string;
}

export interface WasmGlobal {
  id: number;
  type: WasmValType;
  mutable: boolean;
  init: WasmInstruction[];
  name?: string;
}

export interface WasmElement {
  tableIndex: number;
  offset: WasmInstruction[];
  functionIndices: number[];
}

export interface WasmData {
  memoryIndex: number;
  offset: WasmInstruction[];
  bytes: Uint8Array;
  name?: string;
}

export interface WasmImport {
  module: string;
  name: string;
  kind: 'func' | 'table' | 'memory' | 'global';
  typeIndex?: number;
  desc?: WasmTable | WasmMemory | WasmGlobal;
}

export interface WasmExport {
  name: string;
  kind: 'func' | 'table' | 'memory' | 'global';
  index: number;
}

export interface WasmCustomSection {
  name: string;
  data: Uint8Array;
}

// ============================================================================
// JavaScript Output
// ============================================================================

export interface JSModule {
  name: string;
  imports: JSImport[];
  exports: JSExport[];
  functions: JSFunction[];
  classes: JSClass[];
  globals: JSGlobal[];
  constants: JSConstant[];
}

export interface JSFunction {
  name: string;
  params: string[];
  body: string;
  isAsync: boolean;
  isGenerator: boolean;
  exported: boolean;
  sourceFunction?: string;
}

export interface JSClass {
  name: string;
  superClass?: string;
  methods: JSMethod[];
  properties: JSProperty[];
  staticMethods: JSMethod[];
  staticProperties: JSProperty[];
}

export interface JSMethod {
  name: string;
  params: string[];
  body: string;
  isAsync: boolean;
  isStatic: boolean;
  isGetter: boolean;
  isSetter: boolean;
}

export interface JSProperty {
  name: string;
  initializer?: string;
  isStatic: boolean;
  isPrivate: boolean;
}

export interface JSGlobal {
  name: string;
  initializer: string;
  exported: boolean;
}

export interface JSConstant {
  name: string;
  value: string | number | boolean | object;
  exported: boolean;
}

export interface JSImport {
  module: string;
  names: string[];
  namespace?: string;
}

export interface JSExport {
  name: string;
  type: 'function' | 'class' | 'const' | 'default';
}

// ============================================================================
// Register Allocation
// ============================================================================

export interface RegisterAllocator {
  architecture: Architecture;
  registers: PhysicalRegister[];
  allocation: Map<string, number>;
  spills: Map<string, StackSlot>;
}

export interface PhysicalRegister {
  id: number;
  name: string;
  type: 'general' | 'float' | 'vector' | 'special';
  size: number;
  aliases: string[];
}

export interface StackSlot {
  offset: number;
  size: number;
  alignment: number;
}

// ============================================================================
// Instruction Selection
// ============================================================================

export interface InstructionSelector {
  patterns: SelectionPattern[];
  rules: SelectionRule[];
}

export interface SelectionPattern {
  irOpcode: IROpcode;
  constraints: PatternConstraint[];
  outputs: SelectionOutput[];
  cost: number;
}

export interface PatternConstraint {
  operandIndex: number;
  type: 'reg' | 'imm' | 'mem' | 'any';
  predicate?: string;
}

export interface SelectionOutput {
  type: 'instruction' | 'sequence';
  template: string;
  operands: number[];
}

export interface SelectionRule {
  name: string;
  pattern: string;
  replacement: string;
  cost: number;
}

// ============================================================================
// Code Emitter
// ============================================================================

export interface CodeEmitter {
  output: OutputFormat;
  buffer: number[];
  labels: Map<string, number>;
  relocations: Relocation[];
  currentFunction: string;
}

export interface Relocation {
  offset: number;
  type: 'function' | 'global' | 'memory' | 'table';
  symbol: string;
  addend: number;
}

// ============================================================================
// Optimization Context
// ============================================================================

export interface OptimizationContext {
  module: ModuleIR;
  target: RecompilationTarget;
  profile?: CompilationProfile;
  passes: OptimizationPass[];
  decisions: OptimizationDecision[];
}

export interface OptimizationPass {
  name: string;
  run(module: ModuleIR, context: OptimizationContext): Promise<ModuleIR>;
}

export interface OptimizationDecision {
  pass: string;
  function: string;
  decision: string;
  reason: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface CompilationProfile {
  functionHotness: Map<string, number>;
  branchProbabilities: Map<string, Map<number, number>>;
  memoryAccessPatterns: Map<string, MemoryAccessPattern>;
  callFrequencies: Map<string, Map<string, number>>;
}

export interface MemoryAccessPattern {
  base: string;
  stride: number;
  pattern: 'sequential' | 'strided' | 'random' | 'indirect';
  size: number;
}

// ============================================================================
// Runtime Bridge
// ============================================================================

export interface RuntimeBridge {
  name: string;
  functions: BridgeFunction[];
  globals: BridgeGlobal[];
  memory: BridgeMemory;
}

export interface BridgeFunction {
  name: string;
  wasmSignature: { params: WasmValType[]; results: WasmValType[] };
  nativeImplementation: string;
  isAsync: boolean;
}

export interface BridgeGlobal {
  name: string;
  type: WasmValType;
  initialValue: number | bigint;
  mutable: boolean;
}

export interface BridgeMemory {
  initialPages: number;
  maxPages: number;
  shared: boolean;
}

// ============================================================================
// Source Map
// ============================================================================

export interface SourceMap {
  version: number;
  file: string;
  sourceRoot?: string;
  sources: string[];
  names: string[];
  mappings: string;
  sourcesContent?: (string | null)[];
}

export interface SourceMapEntry {
  generatedLine: number;
  generatedColumn: number;
  sourceIndex?: number;
  originalLine?: number;
  originalColumn?: number;
  nameIndex?: number;
}