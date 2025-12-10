# Game Transformation Guide

This document explains how nacho. transforms native games into web applications.

## 🎯 Overview

The nacho. platform uses a sophisticated multi-stage pipeline to convert native game binaries into WebAssembly modules that run in the browser at near-native speeds.

## 🔄 Transformation Pipeline

### Stage 1: Binary Analysis

**Input**: Game binary file (.exe, .apk, .iso)
**Output**: Parsed headers, sections, and metadata

```typescript
// Detect file type
const fileType = await BinaryAnalyzer.detectType(buffer);

// Parse headers
if (fileType === FileType.PE_EXE) {
  const peParser = new PEParser(buffer);
  const { headers, sections } = peParser.parse();
}
```

**What happens:**
- Magic number detection
- Header parsing (PE, ELF, DEX)
- Section extraction (.text, .data, .rdata)
- Import/Export table reading
- Entry point identification

### Stage 2: Instruction Lifting

**Input**: Machine code (x86, ARM, Dalvik bytecode)
**Output**: Platform-independent Intermediate Representation (IR)

```typescript
const lifter = new InstructionLifter();
const ir = lifter.lift({
  arch: 'x86',
  entryPoint: 0x401000,
  data: codeSection
});
```

**What happens:**
- Disassembly of native instructions
- Conversion to IR format
- Control flow analysis
- Register allocation tracking
- Memory access pattern detection

**IR Format:**
```typescript
interface IRInstruction {
  opcode: IROpcode;  // ADD, SUB, PUSH, CALL, etc.
  op1?: { type: string; value: number };
  op2?: { type: string; value: number };
  dest?: { type: string; value: number };
}
```

### Stage 3: Optimization

**Input**: IR instructions
**Output**: Optimized IR

```typescript
const optimizer = new Optimizer();
const optimizedIR = optimizer.optimize(ir);
```

**Optimizations applied:**

1. **Dead Code Elimination**
   - Remove unreachable code
   - Eliminate unused variables

2. **Constant Folding**
   - Evaluate constant expressions at compile-time
   - Replace runtime calculations with constants

3. **Loop Optimization**
   - Loop unrolling
   - Loop-invariant code motion
   - Strength reduction

4. **Peephole Optimization**
   - Local instruction pattern matching
   - Replace inefficient sequences

5. **Profile-Guided Optimization (PGO)**
   - Use runtime data to guide optimizations
   - Hot path optimization
   - Branch prediction hints

### Stage 4: WASM Compilation

**Input**: Optimized IR
**Output**: WebAssembly binary

```typescript
const compiler = new WASMCompiler();
const wasmBytes = compiler.compile(optimizedIR);
```

**What happens:**
- IR to WASM instruction mapping
- Memory layout generation
- Syscall bridge creation
- Import/Export section generation
- Binary encoding

**WASM Sections:**
- Type section: Function signatures
- Import section: External functions (syscalls)
- Function section: Function indices
- Memory section: Linear memory configuration
- Export section: Public API
- Code section: Actual function bytecode

### Stage 5: Runtime Execution

**Input**: WASM binary
**Output**: Running game

```typescript
const wasmModule = await WebAssembly.compile(wasmBytes);
const instance = await WebAssembly.instantiate(wasmModule, {
  env: {
    memory: sharedMemory,
    ...syscallBridge.getImports()
  }
});

instance.exports.start();
```

**Runtime features:**
- Shared memory (multi-threading)
- WebGPU rendering
- Syscall emulation
- File system virtualization
- Network tunneling

## 🎮 Platform-Specific Details

### Windows Games (.exe)

**Binary Format**: PE (Portable Executable)

**Parsing:**
```typescript
class PEParser {
  parse(buffer: ArrayBuffer) {
    // DOS header
    const dosHeader = this.parseDOSHeader(buffer);
    
    // PE header
    const peHeader = this.parsePEHeader(buffer, dosHeader.e_lfanew);
    
    // Optional header
    const optionalHeader = this.parseOptionalHeader(buffer);
    
    // Sections
    const sections = this.parseSections(buffer);
    
    return { dosHeader, peHeader, optionalHeader, sections };
  }
}
```

**Key sections:**
- `.text`: Executable code
- `.data`: Initialized data
- `.rdata`: Read-only data
- `.idata`: Import table
- `.edata`: Export table

**Challenges:**
- Windows API calls (need syscall bridge)
- DirectX graphics (translate to WebGPU)
- File system access (virtual FS)
- Registry access (mock registry)

### Android Games (.apk)

**Binary Format**: ZIP archive with DEX bytecode

**Parsing:**
```typescript
const zip = await JSZip.loadAsync(buffer);
const dexFile = zip.file('classes.dex');
const dexBuffer = await dexFile.async('arraybuffer');

const parser = new DEXParser(dexBuffer);
const { header, strings, types, methods } = parser.parse();
```

**DEX Structure:**
- Header: Magic, version, checksums
- String IDs: String constant pool
- Type IDs: Type descriptors
- Proto IDs: Method prototypes
- Field IDs: Field descriptors
- Method IDs: Method descriptors
- Class Defs: Class definitions
- Data: Method bytecode and data

**Dalvik Bytecode:**
- Register-based (vs stack-based)
- 256 virtual registers
- Instruction formats: 10x, 11x, 12x, etc.

**Challenges:**
- Android API emulation
- OpenGL ES to WebGPU
- Asset extraction
- Native library loading (.so files)

### Xbox Games

**Binary Format**: XBE (Xbox Executable)

**Parsing:**
```typescript
class XBEParser {
  parse(buffer: ArrayBuffer) {
    // XBE header
    const header = this.parseHeader(buffer);
    
    // Certificate
    const cert = this.parseCertificate(buffer);
    
    // Sections
    const sections = this.parseSections(buffer);
    
    return { header, cert, sections };
  }
}
```

**Challenges:**
- DirectX to WebGPU translation
- Xbox kernel calls
- Custom file formats
- Controller input mapping

## 🚀 Performance Optimizations

### 1. AOT (Ahead-of-Time) Caching

```typescript
// First run: Compile and cache
const wasmBytes = compiler.compile(ir);
await cache.save(gameId, wasmBytes);

// Subsequent runs: Load from cache
const wasmBytes = await cache.load(gameId);
```

**Benefits:**
- Instant game start after first compilation
- No repeated compilation overhead
- Uses IndexedDB for persistent storage

### 2. JIT (Just-in-Time) Optimization

```typescript
// Runtime profile collection
const profiler = new Profiler();
profiler.track(functionId, executionTime, callCount);

// Hot path recompilation
if (profiler.isHot(functionId)) {
  const optimizedCode = recompile(functionId, profiler.getProfile(functionId));
  hotSwap(functionId, optimizedCode);
}
```

**Benefits:**
- Optimize based on actual usage patterns
- Hot path gets maximum optimization
- Cold code stays lightweight

### 3. WebGPU Acceleration

```typescript
// GPU-accelerated rendering
const gpuContext = await navigator.gpu.requestAdapter();
const device = await gpuContext.requestDevice();

// Compile shaders
const shaderModule = device.createShaderModule({
  code: wgslShaderCode
});

// Render pipeline
const pipeline = device.createRenderPipeline({
  vertex: { module: shaderModule, entryPoint: 'vs_main' },
  fragment: { module: shaderModule, entryPoint: 'fs_main' }
});
```

**Benefits:**
- Hardware acceleration
- High performance rendering
- Modern graphics features

### 4. Shared Memory & Threading

```typescript
// Create shared memory
const sharedMemory = new WebAssembly.Memory({
  initial: 256,
  maximum: 4096,
  shared: true
});

// Spawn worker threads
const workers = Array.from({ length: 4 }, () => {
  return new Worker('/worker.js', { type: 'module' });
});
```

**Benefits:**
- True multi-threading
- Parallel execution
- Better CPU utilization

## 📊 Compression Techniques

### 1. Code Deduplication

Identify and eliminate duplicate code sequences:

```typescript
const codeBlocks = extractCodeBlocks(binary);
const unique = new Map<string, number>();

for (const block of codeBlocks) {
  const hash = hashCode(block);
  if (!unique.has(hash)) {
    unique.set(hash, block.offset);
  } else {
    // Replace with reference to first occurrence
    replaceWithReference(block.offset, unique.get(hash));
  }
}
```

**Savings**: 10-30% reduction

### 2. Asset Compression

```typescript
// Images: Use WebP format
const webpImage = await convertToWebP(pngImage);

// Audio: Use Opus codec
const opusAudio = await convertToOpus(wavAudio);

// Textures: Use Basis Universal
const basisTexture = await convertToBasis(ddsTexture);
```

**Savings**: 50-70% reduction

### 3. Delta Encoding

For game updates and patches:

```typescript
// Generate delta between versions
const delta = generateDelta(oldVersion, newVersion);

// Apply delta
const newVersion = applyDelta(oldVersion, delta);
```

**Savings**: 80-95% for updates

## 🧪 Testing

### Unit Tests

```typescript
describe('WASMCompiler', () => {
  it('should compile IR to valid WASM', () => {
    const ir = [
      { opcode: IROpcode.PUSH, op1: { type: 'const', value: 42 } },
      { opcode: IROpcode.ADD, op1: { type: 'const', value: 10 } }
    ];
    
    const compiler = new WASMCompiler();
    const wasm = compiler.compile(ir);
    
    expect(wasm[0]).toBe(0x00); // WASM magic
    expect(wasm[1]).toBe(0x61); // 'a'
    expect(wasm[2]).toBe(0x73); // 's'
    expect(wasm[3]).toBe(0x6d); // 'm'
  });
});
```

### Integration Tests

```typescript
describe('Full Pipeline', () => {
  it('should transform exe to runnable WASM', async () => {
    const exeFile = await loadTestFile('simple.exe');
    
    const runtime = RuntimeManager.getInstance();
    const { type, config } = await runtime.prepareRuntime('simple.exe');
    
    expect(type).toBe(FileType.PE_EXE);
    expect(config.memory).toBeGreaterThan(0);
  });
});
```

### Performance Tests

```typescript
describe('Performance', () => {
  it('should compile under 5 seconds', async () => {
    const start = Date.now();
    await compileGame('test-game.exe');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000);
  });
  
  it('should run at 60 FPS', async () => {
    const fps = await measureFPS(60); // measure for 60 frames
    expect(fps).toBeGreaterThan(58);
  });
});
```

## 🔍 Debugging

### Enable Debug Mode

```typescript
// In lib/engine/loaders/nacho-loader.ts
const DEBUG = true;

if (DEBUG) {
  console.log('IR:', ir);
  console.log('Optimized IR:', optimizedIR);
  console.log('WASM bytes:', Array.from(wasmBytes));
}
```

### Inspect WASM

```bash
# Use wasm-objdump to inspect generated WASM
wasm-objdump -d output.wasm
```

### Monitor Performance

```typescript
// Add performance markers
performance.mark('compile-start');
const wasm = compiler.compile(ir);
performance.mark('compile-end');

performance.measure('compile', 'compile-start', 'compile-end');
const measure = performance.getEntriesByName('compile')[0];
console.log(`Compilation took ${measure.duration}ms`);
```

## 📈 Success Metrics

### Compilation
- ✅ Average compilation time: < 5 seconds
- ✅ Cache hit rate: > 80%
- ✅ Binary size reduction: 70-90%

### Runtime
- ✅ Frame rate: 60 FPS stable
- ✅ Input latency: < 16ms
- ✅ Memory usage: < 512MB
- ✅ CPU usage: < 30% on average

### Storage
- ✅ Compressed game size: 1/10th of original
- ✅ IndexedDB caching: 100% utilization
- ✅ Cloud sync: < 30 seconds

## 🎓 Learn More

- [WebAssembly Specification](https://webassembly.github.io/spec/)
- [WebGPU Specification](https://www.w3.org/TR/webgpu/)
- [PE Format Documentation](https://docs.microsoft.com/en-us/windows/win32/debug/pe-format)
- [DEX Format Documentation](https://source.android.com/devices/tech/dalvik/dex-format)
- [Compiler Optimization Techniques](https://en.wikipedia.org/wiki/Optimizing_compiler)

---

**Ready to transform your first game? Check out the main README for getting started!**
