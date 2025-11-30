# Code Compilation Service Setup

The backend compilation service compiles Go, Rust, and Zig code to WebAssembly.

## Prerequisites

### Rust Compilation
Install one of the following:
- **wasm-pack** (recommended): `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`
- **rustc** with wasm32 target: 
  ```bash
  rustup target add wasm32-unknown-unknown
  ```

### Zig Compilation
Install Zig compiler:
- **macOS**: `brew install zig`
- **Linux**: Download from https://ziglang.org/download/
- **Windows**: Download from https://ziglang.org/download/

### Go Compilation
Install one of the following:
- **TinyGo** (recommended for WASM): `brew install tinygo` or download from https://tinygo.org/getting-started/
- **Go** with wasm support: `brew install go` or download from https://go.dev/dl/

## Configuration

The service automatically detects available compilers and uses them in this order:

### Rust
1. Tries `wasm-pack` first (preferred)
2. Falls back to `rustc` with wasm32-unknown-unknown target

### Zig
1. Uses `zig` compiler with wasm32-freestanding target

### Go
1. Tries `tinygo` first (preferred for WASM)
2. Falls back to standard `go` compiler with GOOS=js GOARCH=wasm

## API Endpoints

### Compile Rust
```http
POST /api/codecompilation/compile/rust
Content-Type: application/json

{
  "code": "fn main() { println!(\"Hello\"); }",
  "config": "[optional Cargo.toml content]"
}
```

### Compile Zig
```http
POST /api/codecompilation/compile/zig
Content-Type: application/json

{
  "code": "const std = @import(\"std\"); pub fn main() !void { ... }"
}
```

### Compile Go
```http
POST /api/codecompilation/compile/go
Content-Type: application/json

{
  "code": "package main\nimport \"fmt\"\nfunc main() { fmt.Println(\"Hello\") }"
}
```

## Response Format

```json
{
  "success": true,
  "wasmBase64": "AGFzbQEAAAAB...",
  "warnings": ["warning: unused variable"]
}
```

Or on error:
```json
{
  "success": false,
  "error": "Compilation failed: ...",
  "warnings": []
}
```

## Environment Variables

Set `NEXT_PUBLIC_BACKEND_URL` in your frontend to point to the backend:
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

## Testing

Test the compilation service:
```bash
# Health check
curl http://localhost:5000/api/codecompilation/health

# Compile Rust
curl -X POST http://localhost:5000/api/codecompilation/compile/rust \
  -H "Content-Type: application/json" \
  -d '{"code":"fn main(){println!(\"Hello\");}"}'
```

## Troubleshooting

### Compiler Not Found
- Ensure the compiler is installed and in your PATH
- Check with: `which rustc`, `which zig`, `which go`, `which tinygo`
- Restart the backend after installing compilers

### Compilation Fails
- Check backend logs for detailed error messages
- Ensure code is valid for the target language
- For Rust, ensure Cargo.toml is properly formatted (if provided)

### WASM Not Generated
- Check that the compiler successfully completed
- Verify output file exists in temp directory (before cleanup)
- Check compiler output for errors

## Security Notes

- Compilation runs in isolated temp directories
- Temp directories are cleaned up after compilation
- Code is executed server-side - ensure proper sandboxing in production
- Consider rate limiting for production deployments

