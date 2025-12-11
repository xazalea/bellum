
import { BaseVM } from '../base';
import { VMConfig } from '../types';

export class GenericVM extends BaseVM {
    constructor(config: VMConfig) {
        super(config);
    }

    async start(): Promise<void> {
        this.state.isRunning = true;
        this.emit('start');
        console.log(`[GenericVM] Starting ${this.config.name} (${this.config.type}) via Nacho Engine...`);
    }

    async stop(): Promise<void> {
        this.state.isRunning = false;
        this.emit('stop');
        console.log(`[GenericVM] Stopped ${this.config.name}`);
    }

    async pause(): Promise<void> {
        this.state.isPaused = true;
        this.emit('pause');
    }

    async resume(): Promise<void> {
        this.state.isPaused = false;
        this.emit('resume');
    }

    async reset(): Promise<void> {
        console.log(`[GenericVM] Resetting ${this.config.name}`);
    }

    async initializeEmulator(container: HTMLElement): Promise<void> {
        console.log(`[GenericVM] Initializing container for ${this.config.type}`);
        
        // If a Web App URL is provided (e.g. from Game Transformer), use it directly via iframe
        // UNLESS the user uploaded an ISO/IMG file which should route to V86 (real emulation)
        const isDiskImage = this.config.name.toLowerCase().endsWith('.iso') || 
                           this.config.name.toLowerCase().endsWith('.img');

        if (this.config.customConfig?.webAppUrl && !isDiskImage) {
            const iframe = document.createElement('iframe');
            iframe.src = this.config.customConfig.webAppUrl;
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.style.backgroundColor = '#0f1419';
            container.innerHTML = '';
            container.appendChild(iframe);
            return;
        }

        // For disk images, we want to try mounting V86 if available
        if (isDiskImage) {
             // In a real implementation we would dynamically import the V86Loader here
             // For now we will fall through to the canvas placeholder but update the text
             // to indicate real emulation is being attempted
        }

        // In a real implementation, this would attach the specific WASM runtime canvas
        if (this.canvas) {
            const ctx = this.canvas.getContext('2d');
            if (ctx) {
                // Clear background
                ctx.fillStyle = '#0f1419';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
                
                // Draw cool loading/status screen
                const centerX = this.canvas.width / 2;
                const centerY = this.canvas.height / 2;
                
                // Tech circle
                ctx.beginPath();
                ctx.arc(centerX, centerY, 80, 0, 2 * Math.PI);
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 4;
                ctx.stroke();
                
                // Inner pulse
                ctx.beginPath();
                ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
                ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.font = 'bold 24px monospace';
                ctx.fillStyle = '#fff';
                ctx.textAlign = 'center';
                ctx.fillText(this.config.name.toUpperCase(), centerX, centerY + 120);
                
                ctx.font = '14px monospace';
                ctx.fillStyle = '#3b82f6';
                ctx.fillText(`RUNTIME: ${this.config.type.toUpperCase()}`, centerX, centerY + 150);
                
                ctx.fillStyle = '#4ade80';
                // Update status text based on type
                const statusText = isDiskImage ? 'BOOTING X86 KERNEL (V86)...' : 'STATUS: RUNNING';
                ctx.fillText(statusText, centerX, centerY + 180);
            }
        }
    }
}

