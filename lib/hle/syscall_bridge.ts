/**
 * Syscall Bridge - Maps Guest OS syscalls to Browser APIs
 */

export class SyscallBridge {
  private memory: WebAssembly.Memory;

  constructor(memory: WebAssembly.Memory) {
    this.memory = memory;
  }

  // Debug / Core
  
  print(value: number): void {
    console.log(`[Nacho Syscall] print: ${value}`);
  }

  // Windows API Simulations
  
  CreateFile(fileNamePtr: number): number {
    const fileName = this.readString(fileNamePtr);
    console.log(`[Nacho Syscall] CreateFile(${fileName})`);
    // Map to HiberFile or JS FileSystem
    return 1; // Mock Handle
  }

  WriteFile(handle: number, bufferPtr: number, length: number): boolean {
    console.log(`[Nacho Syscall] WriteFile(handle=${handle}, len=${length})`);
    return true;
  }

  // OpenGL / GLES Simulations
  
  glDrawArrays(mode: number, first: number, count: number): void {
    // Call actual WebGL context
    // gl.drawArrays(mode, first, count);
    console.log(`[Nacho Syscall] glDrawArrays(${mode}, ${first}, ${count})`);
  }

  private readString(ptr: number): string {
    // Read null-terminated string from WASM memory
    const buffer = new Uint8Array(this.memory.buffer);
    let str = '';
    let i = ptr;
    // Safety limit
    while (buffer[i] !== 0 && i < buffer.length) {
      str += String.fromCharCode(buffer[i]);
      i++;
    }
    return str;
  }

  getImports(): WebAssembly.Imports {
    return {
      env: {
        print: this.print.bind(this),
        CreateFile: this.CreateFile.bind(this),
        WriteFile: this.WriteFile.bind(this),
        glDrawArrays: this.glDrawArrays.bind(this),
        memory: this.memory // Link memory if needed
      }
    };
  }
}
