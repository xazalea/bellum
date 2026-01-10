# Storage System Tests

Comprehensive test suite for the advanced cloud storage system.

## Test Coverage

### 1. Telegram Storage (`telegram.test.ts`)
- Hash function consistency
- Error classification
- Upload/download round-trips
- Chunk verification
- Rate limit handling

### 2. Deduplication (`dedupe.test.ts`)
- Content hashing (XXHash64)
- Chunk graph operations
- Reference counting
- Garbage collection
- Cross-file deduplication

### 3. Procedural Generation (`procedural.test.ts`)
- Mesh generation determinism
- Shader material consistency
- Audio synthesis accuracy
- Animation curve interpolation
- Serialization/deserialization

### 4. Re-encoding (`reencoder.test.ts`)
- Texture format conversion (BC7/BC5/BC4)
- Audio re-encoding (Opus/parametric)
- Video motion field compression
- Quality metrics (PSNR, SSIM)

### 5. Neural Compression (`neural.test.ts`)
- WASM codec initialization
- Compression/decompression round-trips
- Latent vector quantization
- Quality vs. compression tradeoffs
- Performance benchmarks

### 6. Integration (`integration.test.ts`)
- End-to-end storage pipeline
- Multi-strategy fallback
- Large file handling (>1GB)
- Corruption recovery
- Performance under load

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test telegram.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Test Data

Test files are generated programmatically to avoid committing large binary files.

## Performance Benchmarks

Expected compression ratios:
- Procedural: 10x-100x
- Deduplication: 2x-10x
- Re-encoding: 3x-15x
- Neural: 10x-50x
- **Combined**: 50x-500x

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Main branch commits
- Release tags

## Writing New Tests

Follow these guidelines:
1. Use descriptive test names
2. Test both success and failure cases
3. Mock external dependencies
4. Clean up resources after tests
5. Document expected behavior
