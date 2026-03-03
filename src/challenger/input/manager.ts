/**
 * Input Manager - Low Latency Input Polling
 * Bypasses React's synthetic event system for raw performance.
 */

export class InputManager {
    private keys: Set<string> = new Set();
    private mouseButtons: Set<number> = new Set();
    private mouseX: number = 0;
    private mouseY: number = 0;
    private mouseDeltaX: number = 0;
    private mouseDeltaY: number = 0;
    
    // Gamepad State
    private gamepads: (Gamepad | null)[] = [];

    constructor() {
        if (typeof window !== 'undefined') {
            this.setupListeners();
        }
    }

    private setupListeners() {
        window.addEventListener('keydown', (e) => this.keys.add(e.code));
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        
        window.addEventListener('mousedown', (e) => this.mouseButtons.add(e.button));
        window.addEventListener('mouseup', (e) => this.mouseButtons.delete(e.button));
        
        window.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.mouseDeltaX += e.movementX;
            this.mouseDeltaY += e.movementY;
        });

        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
        });
    }

    public poll() {
        // Reset deltas after they are consumed (usually once per frame)
        // But we'll let the consumer reset them if they want strictly per-frame delta
        // Or we can accumulate and reset here. Let's accumulate and provide a getter that resets.
        
        this.pollGamepads();
    }

    private pollGamepads() {
        const nav = navigator;
        if (nav && nav.getGamepads) {
            this.gamepads = Array.from(nav.getGamepads());
        }
    }

    // --- Public API ---

    public isKeyDown(code: string): boolean {
        return this.keys.has(code);
    }

    public isMouseButtonDown(button: number): boolean {
        return this.mouseButtons.has(button);
    }

    public getMousePosition() {
        return { x: this.mouseX, y: this.mouseY };
    }

    public getMouseDelta() {
        const delta = { x: this.mouseDeltaX, y: this.mouseDeltaY };
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        return delta;
    }

    public getGamepad(index: number = 0): Gamepad | null {
        return this.gamepads[index] || null;
    }

    public vibrate(duration: number = 200, weakMagnitude: number = 0.5, strongMagnitude: number = 0.5) {
        const gp = this.gamepads[0];
        if (gp && gp.vibrationActuator) {
            gp.vibrationActuator.playEffect('dual-rumble', {
                startDelay: 0,
                duration: duration,
                weakMagnitude: weakMagnitude,
                strongMagnitude: strongMagnitude,
            });
        }
    }
}

export const inputManager = new InputManager();


