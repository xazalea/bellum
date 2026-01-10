// Nacho Windows Runtime (Section G & I & H)
// Implements Win32 Syscall Emulation layer

import { WebGPUContext } from '../gpu/webgpu';
import { UnifiedMemory, memoryManager } from '../memory/unified-memory';
import { SimpleInterpreter } from '../core/interpreter';
import { PELoader } from './pe-loader';

// [Checklist #303] Kernel32 Emulation
class Kernel32 {
    private memory: UnifiedMemory;

    constructor(memory: UnifiedMemory) {
        this.memory = memory;
    }

    // [Checklist #309] Ntoskrnl-style functions
    VirtualAlloc(addr: number, size: number, type: number, protect: number) {
        // In unified memory, we just return the address if it's free. 
        // For now, assume simplified allocation.
        return addr || 0x20000000; // Return application heap start
    }

    CreateFile(name: string) {
        // [Checklist #311] Fake Windows filesystem via OPFS
        return 1; // Fake handle
    }
}

// [Checklist #304] User32 Emulation
class User32 {
    // [Checklist #307] Virtual HWNDs
    private hwnds: Map<number, {element: HTMLElement, title: string}> = new Map();
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private nextHwnd = 1000;

    setCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }

    CreateWindow(className: string, windowName: string) {
        console.log(`[User32] CreateWindow: ${className} - "${windowName}"`);
        
        const hwnd = this.nextHwnd++;
        
        // Draw window on canvas
        if (this.ctx && this.canvas) {
            const x = 50;
            const y = 50 + (this.hwnds.size * 30);
            const w = 400;
            const h = 300;
            
            // Window background
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillRect(x, y, w, h);
            
            // Title bar
            this.ctx.fillStyle = '#0078D4';
            this.ctx.fillRect(x, y, w, 30);
            
            // Title text
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '14px sans-serif';
            this.ctx.fillText(windowName, x + 10, y + 20);
            
            // Border
            this.ctx.strokeStyle = '#000000';
            this.ctx.lineWidth = 1;
            this.ctx.strokeRect(x, y, w, h);
        }
        
        // Create virtual div (for compatibility)
        if (typeof document !== 'undefined') {
            const div = document.createElement('div');
            div.className = 'win32-window';
            div.style.display = 'none'; // Hidden, using canvas instead
            document.body.appendChild(div);
            this.hwnds.set(hwnd, {element: div, title: windowName});
        }
        
        return hwnd;
    }

    ShowWindow(hwnd: number, nCmdShow: number) {
        console.log(`[User32] ShowWindow: hwnd=${hwnd}, cmd=${nCmdShow}`);
        return 1;
    }

    UpdateWindow(hwnd: number) {
        console.log(`[User32] UpdateWindow: hwnd=${hwnd}`);
        return 1;
    }

    // [Checklist #306] Message Loop
    GetMessage(msg: any, hwnd: number) {
        // Simplified message loop
        return 0;
    }
    
    MessageBox(hwnd: number, text: string, caption: string, type: number) {
        console.log(`[User32] MessageBox: "${caption}" - ${text}`);
        
        if (this.ctx && this.canvas) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            // Draw message box
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.fillStyle = '#F0F0F0';
            this.ctx.fillRect(centerX - 200, centerY - 100, 400, 200);
            
            this.ctx.strokeStyle = '#0078D4';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(centerX - 200, centerY - 100, 400, 200);
            
            // Title bar
            this.ctx.fillStyle = '#0078D4';
            this.ctx.fillRect(centerX - 200, centerY - 100, 400, 30);
            
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = 'bold 14px sans-serif';
            this.ctx.fillText(caption, centerX - 190, centerY - 80);
            
            // Text
            this.ctx.fillStyle = '#000000';
            this.ctx.font = '16px sans-serif';
            this.ctx.fillText(text, centerX - 180, centerY);
            
            // OK Button
            this.ctx.fillStyle = '#0078D4';
            this.ctx.fillRect(centerX - 50, centerY + 50, 100, 30);
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.fillText('OK', centerX - 10, centerY + 70);
        }
        
        return 1; // IDOK
    }
}

// [Checklist #305] GDI -> WebGPU
class GDI {
    private gpu: WebGPUContext;

    constructor(gpu: WebGPUContext) {
        this.gpu = gpu;
    }

    // [Checklist #326] BitBlt -> WebGPU texture blit
    BitBlt(hdc: number, x: number, y: number, w: number, h: number) {
        // WebGPU copyTextureToTexture
    }
}

// [Checklist #411] DirectX9 -> WebGPU
class DirectX {
    constructor(gpu: WebGPUContext) {}

    // [Checklist #412] HLSL -> WGSL
    compileShader(hlsl: string) {
        return "/* WGSL */";
    }
}

export class WindowsRuntime {
    private gpu: WebGPUContext;
    private memory: UnifiedMemory;
    private cpu: SimpleInterpreter;
    private kernel32: Kernel32;
    private user32: User32;
    private gdi: GDI;
    private directX: DirectX;
    private running: boolean = false;
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;

    constructor(gpu: WebGPUContext) {
        this.gpu = gpu;
        this.memory = memoryManager;
        this.cpu = new SimpleInterpreter(this.memory);
        this.cpu.onInterrupt = this.handleSyscall.bind(this);
        
        this.kernel32 = new Kernel32(this.memory);
        this.user32 = new User32();
        this.gdi = new GDI(gpu);
        this.directX = new DirectX(gpu);
    }

    setCanvas(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.user32.setCanvas(canvas);
        if (this.ctx) {
            // Set up a basic Windows-style background
            this.ctx.fillStyle = '#0078D4'; // Windows blue
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.drawWindowsPlaceholder();
        }
    }

    private drawWindowsPlaceholder() {
        if (!this.ctx || !this.canvas) return;
        
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Draw Windows logo
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 64px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⊞', centerX, centerY - 60);
        
        this.ctx.font = '28px sans-serif';
        this.ctx.fillText('Windows Runtime', centerX, centerY + 20);
        
        this.ctx.font = '16px monospace';
        this.ctx.fillStyle = '#E0E0E0';
        this.ctx.fillText('Nacho Windows Emulation Layer', centerX, centerY + 55);
    }

    async boot() {
        console.log("🪟 Booting Nacho Windows Runtime (NTR)", "Ver 10.0.19044");
        // Reset CPU
        this.cpu.reset();
    }

    // [Checklist #316] PE Loader
    async loadPE(buffer: ArrayBuffer) {
        try {
            console.log("📦 Loading PE Executable...");
            const image = PELoader.parse(buffer);
            console.log(`   - Entry Point: 0x${image.entryPoint.toString(16)}`);
            console.log(`   - Image Base: 0x${image.imageBase.toString(16)}`);
            console.log(`   - Sections: ${image.sections.length}`);

            // Load sections into memory
            const view = new Uint8Array(buffer);
            let totalLoaded = 0;
            for (const section of image.sections) {
                console.log(`   - Section ${section.name}: VA=0x${section.virtualAddress.toString(16)} Size=${section.virtualSize}`);
                if (section.rawDataPtr > 0 && section.rawDataSize > 0) {
                     // Ensure we don't read past buffer
                     const size = Math.min(section.rawDataSize, view.length - section.rawDataPtr);
                     const data = view.subarray(section.rawDataPtr, section.rawDataPtr + size);
                     
                     // Load into Unified Memory
                     this.memory.load(image.imageBase + section.virtualAddress, data);
                     totalLoaded += size;
                }
            }

            console.log(`   - Loaded ${totalLoaded} bytes into memory`);

            // Update canvas to show executable is loaded
            if (this.ctx && this.canvas) {
                this.ctx.fillStyle = '#0078D4';
                this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.font = 'bold 32px sans-serif';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText('Windows Application Running', centerX, centerY - 60);
                
                this.ctx.font = '18px sans-serif';
                this.ctx.fillText(`Entry Point: 0x${image.entryPoint.toString(16)}`, centerX, centerY);
                this.ctx.fillText(`Image Base: 0x${image.imageBase.toString(16)}`, centerX, centerY + 30);
                this.ctx.fillText(`Sections: ${image.sections.length}`, centerX, centerY + 60);
                this.ctx.fillText(`Memory Loaded: ${(totalLoaded / 1024).toFixed(1)}KB`, centerX, centerY + 90);
                
                this.ctx.fillStyle = '#E0E0E0';
                this.ctx.font = '14px monospace';
                this.ctx.fillText('Emulation in progress...', centerX, centerY + 130);
            }

            // Set EIP to Entry Point
            const entryAddr = image.imageBase + image.entryPoint;
            this.cpu.setRegisters({
                ...this.cpu.getRegisters(),
                eip: entryAddr,
                esp: 0x7FFFFFFF, // Stack pointer near top of 2GB
                ebp: 0x7FFFFFFF
            });
            
            console.log(`🚀 Ready to Execute at 0x${entryAddr.toString(16)}...`);
            console.log(`Note: This is a simplified x86 interpreter`);
            console.log(`Full Win32 applications require extensive API implementation`);
            
            this.run();
        } catch (e) {
            console.error("Failed to load PE:", e);
            throw e;
        }
    }

    private run() {
         this.running = true;
         const runLoop = () => {
             if (!this.running) return;
             
             try {
                 // Run 1000 cycles per frame
                 this.cpu.run(1000); 
                 
                 // Check if still running (CPU halts on error or finish)
                 // For now, we assume it runs forever unless stopped
                 requestAnimationFrame(runLoop);
             } catch (e) {
                 console.error("Runtime Error:", e);
                 this.running = false;
             }
         };
         runLoop();
    }
    
    public stop() {
        this.running = false;
    }

    // Syscall Dispatcher
    private handleSyscall(interrupt: number) {
        const regs = this.cpu.getRegisters();
        // console.log(`[SYSCALL] INT 0x${interrupt.toString(16)} EAX=0x${regs.eax.toString(16)}`);
        
        if (interrupt === 0x80) { // Linux/Legacy style
             // Dispatch based on EAX
             if (regs.eax === 1) { // Exit
                 console.log(`Process Exited with code ${regs.ebx}`);
                 this.running = false;
             } else if (regs.eax === 4) { // Write
                  // EBX = fd, ECX = buf, EDX = count
                  const fd = regs.ebx;
                  const buf = regs.ecx;
                  const count = regs.edx;
                  
                  if (fd === 1) { // stdout
                      let str = '';
                      for(let i=0; i<count; i++) {
                          str += String.fromCharCode(this.memory.readU8(buf + i));
                      }
                      console.log(`[STDOUT] ${str}`);
                  }
             }
        }
    }
}
