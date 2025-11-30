# Code Execution System (WebVM)

Bellum now supports running code in multiple languages directly in the browser using a local OS-level environment (WebVM).

## Supported Languages

### ✅ Ready to Use
- **Lua** - Using Fengari (Lua VM in JavaScript)
- **Python** - Using Pyodide (Python compiled to WebAssembly)

### 🔨 Requires Compilation
- **Go** - Compiles to WebAssembly (requires backend compiler service)
- **Rust** - Compiles to WebAssembly (requires backend compiler service)
- **Zig** - Compiles to WebAssembly (requires backend compiler service)

## Features

### Code Playground
- Multi-language code editor with syntax highlighting
- Real-time code execution
- Output display (stdout/stderr)
- Execution time tracking
- Exit code reporting

### WebVM Architecture
- Local OS-level environment running in the browser
- Isolated execution environment
- File system support (virtual filesystem)
- Language-specific executors

## Usage

### Opening Code Playground

1. Click the **"Code"** button in the taskbar (⚡ icon)
2. Or create a Code Execution VM programmatically:

```typescript
import { vmManager } from '@/lib/vm/manager';
import { VMType } from '@/lib/vm/types';

const codeVM = await vmManager.createVM({
  id: 'code-vm-1',
  type: VMType.CODE,
  name: 'Code Playground',
  executionMode: 'code',
});
```

### Executing Code

```typescript
import { webVM } from '@/lib/code-execution/webvm';

// Execute Python code
const result = await webVM.executeCode('python', `
print("Hello, World!")
for i in range(5):
    print(f"Count: {i}")
`);

console.log(result.stdout); // Output
console.log(result.stderr); // Errors
console.log(result.exitCode); // Exit code
console.log(result.executionTime); // Execution time in ms
```

### Language Examples

#### Lua
```lua
-- Lua code
print("Hello from Lua!")
local sum = 0
for i = 1, 10 do
    sum = sum + i
end
print("Sum:", sum)
```

#### Python
```python
# Python code
print("Hello from Python!")
import math
print(f"Pi: {math.pi}")
print(f"Square root of 16: {math.sqrt(16)}")
```

#### Go (Requires Compilation)
```go
package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")
}
```

#### Rust (Requires Compilation)
```rust
fn main() {
    println!("Hello from Rust!");
    let x = 42;
    println!("The answer is: {}", x);
}
```

#### Zig (Requires Compilation)
```zig
const std = @import("std");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("Hello from Zig!\n", .{});
}
```

## Architecture

### WebVM System
- **Location**: `lib/code-execution/webvm.ts`
- Provides a Linux environment in the browser
- Manages language executors
- Handles code execution and output capture

### Language Executors
Each language has its own executor:
- **LuaExecutor**: Uses Fengari library
- **PythonExecutor**: Uses Pyodide (loaded from CDN)
- **GoExecutor**: Compiles to WASM (placeholder)
- **RustExecutor**: Compiles to WASM (placeholder)
- **ZigExecutor**: Compiles to WASM (placeholder)

### Code Compiler
- **Location**: `lib/code-execution/compiler.ts`
- Handles compilation of Go, Rust, and Zig to WebAssembly
- Currently requires a backend compiler service (to be implemented)

## Components

### CodeEditor
- **Location**: `components/CodeEditor.tsx`
- Single-language code editor
- Run/Compile buttons
- Output display
- Syntax highlighting ready

### CodePlayground
- **Location**: `components/CodePlayground.tsx`
- Multi-language playground
- Language selector
- Integrated code editor
- WebVM info panel

## Dependencies

### Installed
- `fengari` - Lua VM in JavaScript

### CDN Loaded
- `pyodide` - Python in WebAssembly (loaded from CDN)

### Future
- Go compiler (TinyGo or similar)
- Rust compiler (wasm-pack or similar)
- Zig compiler

## Integration

The code execution system is fully integrated with the VM system:

1. **VM Type**: `VMType.CODE` for code execution VMs
2. **Execution Mode**: `executionMode: 'code'`
3. **VM Manager**: Supports creating and managing code execution VMs
4. **Window Manager**: Displays CodePlayground in a window
5. **Taskbar**: Button to open Code Playground

## Performance

- **Lua**: Executes directly in JavaScript (fast)
- **Python**: Runs in WebAssembly (near-native speed)
- **Go/Rust/Zig**: Compile to WASM for optimal performance

## Security

- Code runs in browser sandbox
- No access to local file system (uses virtual filesystem)
- Isolated execution environment
- No network access (unless explicitly enabled)

## Future Enhancements

1. **Backend Compiler Service**: Implement compilation for Go, Rust, Zig
2. **File System**: Enhanced virtual filesystem with persistence
3. **Package Management**: Support for language package managers
4. **Multi-file Projects**: Support for multi-file code projects
5. **Terminal Integration**: Full terminal access in WebVM
6. **Collaborative Editing**: Real-time collaborative code editing

## Troubleshooting

### Python Not Loading
- Ensure Pyodide script is loaded in `app/layout.tsx`
- Check browser console for errors
- Verify CDN is accessible

### Lua Not Working
- Ensure `fengari` is installed: `npm install fengari`
- Check that the module loads correctly

### Compilation Errors
- Go, Rust, and Zig compilation requires a backend service
- Currently shows placeholder messages
- Will be implemented in future updates

## Examples

See the Code Playground for interactive examples. Open it from the taskbar or create a Code Execution VM programmatically.

