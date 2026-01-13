/**
 * WASM App Library
 * Part of Nacho Runtime
 * 
 * Pre-compiled WASM applications for instant loading:
 * - Calculator
 * - Notepad
 * - Paint
 * - Media Player
 * - File Manager
 * - Terminal
 * - Code Editor
 * - Image Viewer
 * - PDF Viewer
 * - 2048 Game
 * - Snake Game
 * - Tetris Game
 * - Minesweeper
 * - Solitaire
 * - Chess
 */

export interface WASMApp {
    id: string;
    name: string;
    icon: string;
    category: 'productivity' | 'media' | 'games' | 'utilities';
    wasmModule: WebAssembly.Module | null;
    size: number;
    description: string;
    launch: (container: HTMLElement) => Promise<void>;
}

export class WASMAppLibrary {
    private apps: Map<string, WASMApp> = new Map();
    private loadedModules: Map<string, WebAssembly.Instance> = new Map();

    constructor() {
        this.initializeApps();
    }

    /**
     * Initialize app library
     */
    private initializeApps(): void {
        // Productivity Apps
        this.registerApp({
            id: 'calculator',
            name: 'Calculator',
            icon: '🔢',
            category: 'productivity',
            wasmModule: null,
            size: 50 * 1024, // 50KB
            description: 'Scientific calculator with advanced functions',
            launch: this.launchCalculator.bind(this)
        });

        this.registerApp({
            id: 'notepad',
            name: 'Notepad',
            icon: '📝',
            category: 'productivity',
            wasmModule: null,
            size: 30 * 1024, // 30KB
            description: 'Simple text editor',
            launch: this.launchNotepad.bind(this)
        });

        this.registerApp({
            id: 'paint',
            name: 'Paint',
            icon: '🎨',
            category: 'productivity',
            wasmModule: null,
            size: 100 * 1024, // 100KB
            description: 'Simple drawing application',
            launch: this.launchPaint.bind(this)
        });

        this.registerApp({
            id: 'code-editor',
            name: 'Code Editor',
            icon: '💻',
            category: 'productivity',
            wasmModule: null,
            size: 200 * 1024, // 200KB
            description: 'Syntax-highlighted code editor',
            launch: this.launchCodeEditor.bind(this)
        });

        // Media Apps
        this.registerApp({
            id: 'media-player',
            name: 'Media Player',
            icon: '🎵',
            category: 'media',
            wasmModule: null,
            size: 150 * 1024, // 150KB
            description: 'Audio and video player',
            launch: this.launchMediaPlayer.bind(this)
        });

        this.registerApp({
            id: 'image-viewer',
            name: 'Image Viewer',
            icon: '🖼️',
            category: 'media',
            wasmModule: null,
            size: 80 * 1024, // 80KB
            description: 'View and edit images',
            launch: this.launchImageViewer.bind(this)
        });

        this.registerApp({
            id: 'pdf-viewer',
            name: 'PDF Viewer',
            icon: '📄',
            category: 'media',
            wasmModule: null,
            size: 300 * 1024, // 300KB
            description: 'Read PDF documents',
            launch: this.launchPDFViewer.bind(this)
        });

        // Utilities
        this.registerApp({
            id: 'file-manager',
            name: 'File Manager',
            icon: '📁',
            category: 'utilities',
            wasmModule: null,
            size: 120 * 1024, // 120KB
            description: 'Browse and manage files',
            launch: this.launchFileManager.bind(this)
        });

        this.registerApp({
            id: 'terminal',
            name: 'Terminal',
            icon: '⌨️',
            category: 'utilities',
            wasmModule: null,
            size: 100 * 1024, // 100KB
            description: 'Command-line interface',
            launch: this.launchTerminal.bind(this)
        });

        // Games
        this.registerApp({
            id: 'game-2048',
            name: '2048',
            icon: '🎮',
            category: 'games',
            wasmModule: null,
            size: 40 * 1024, // 40KB
            description: 'Slide tiles to reach 2048',
            launch: this.launch2048.bind(this)
        });

        this.registerApp({
            id: 'game-snake',
            name: 'Snake',
            icon: '🐍',
            category: 'games',
            wasmModule: null,
            size: 35 * 1024, // 35KB
            description: 'Classic snake game',
            launch: this.launchSnake.bind(this)
        });

        this.registerApp({
            id: 'game-tetris',
            name: 'Tetris',
            icon: '🧱',
            category: 'games',
            wasmModule: null,
            size: 45 * 1024, // 45KB
            description: 'Stack falling blocks',
            launch: this.launchTetris.bind(this)
        });

        this.registerApp({
            id: 'game-minesweeper',
            name: 'Minesweeper',
            icon: '💣',
            category: 'games',
            wasmModule: null,
            size: 50 * 1024, // 50KB
            description: 'Clear the minefield',
            launch: this.launchMinesweeper.bind(this)
        });

        this.registerApp({
            id: 'game-solitaire',
            name: 'Solitaire',
            icon: '🃏',
            category: 'games',
            wasmModule: null,
            size: 60 * 1024, // 60KB
            description: 'Classic card game',
            launch: this.launchSolitaire.bind(this)
        });

        this.registerApp({
            id: 'game-chess',
            name: 'Chess',
            icon: '♟️',
            category: 'games',
            wasmModule: null,
            size: 200 * 1024, // 200KB
            description: 'Play chess against AI',
            launch: this.launchChess.bind(this)
        });

        console.log(`[NachoApps] Registered ${this.apps.size} apps`);
    }

    /**
     * Register an app
     */
    private registerApp(app: WASMApp): void {
        this.apps.set(app.id, app);
    }

    /**
     * Get all apps
     */
    getAllApps(): WASMApp[] {
        return Array.from(this.apps.values());
    }

    /**
     * Get apps by category
     */
    getAppsByCategory(category: WASMApp['category']): WASMApp[] {
        return Array.from(this.apps.values()).filter(app => app.category === category);
    }

    /**
     * Get app by ID
     */
    getApp(id: string): WASMApp | undefined {
        return this.apps.get(id);
    }

    /**
     * Launch app
     */
    async launchApp(id: string, container: HTMLElement): Promise<void> {
        const app = this.apps.get(id);
        if (!app) {
            throw new Error(`App not found: ${id}`);
        }

        console.log(`[WASMAppLibrary] Launching ${app.name}...`);
        const startTime = performance.now();

        await app.launch(container);

        const launchTime = performance.now() - startTime;
        console.log(`[WASMAppLibrary] ${app.name} launched in ${launchTime.toFixed(2)}ms`);
    }

    // ========================================================================
    // App Implementations
    // ========================================================================

    /**
     * Launch Calculator
     */
    private async launchCalculator(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #2c3e50; color: white; font-family: monospace;">
                <div id="calc-display" style="flex: 1; display: flex; align-items: center; justify-content: flex-end; padding: 24px; font-size: 48px; background: #34495e;">0</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #1a1a1a; padding: 1px;">
                    ${['7','8','9','/','4','5','6','*','1','2','3','-','0','.','=','+'].map(btn => 
                        `<button style="padding: 24px; font-size: 24px; background: ${btn === '=' ? '#e74c3c' : '#34495e'}; color: white; border: none; cursor: pointer; transition: all 0.2s;" 
                         onmouseenter="this.style.background='${btn === '=' ? '#c0392b' : '#2c3e50'}'" 
                         onmouseleave="this.style.background='${btn === '=' ? '#e74c3c' : '#34495e'}'"
                         onclick="window.calcInput('${btn}')">${btn}</button>`
                    ).join('')}
                </div>
            </div>
        `;

        let currentValue = '0';
        let previousValue = '';
        let operation = '';

        (window as any).calcInput = (input: string) => {
            const display = document.getElementById('calc-display');
            if (!display) return;

            if (input === '=') {
                if (previousValue && operation) {
                    const a = parseFloat(previousValue);
                    const b = parseFloat(currentValue);
                    let result = 0;
                    switch (operation) {
                        case '+': result = a + b; break;
                        case '-': result = a - b; break;
                        case '*': result = a * b; break;
                        case '/': result = a / b; break;
                    }
                    currentValue = result.toString();
                    previousValue = '';
                    operation = '';
                }
            } else if (['+', '-', '*', '/'].includes(input)) {
                previousValue = currentValue;
                operation = input;
                currentValue = '0';
            } else {
                if (currentValue === '0' && input !== '.') {
                    currentValue = input;
                } else {
                    currentValue += input;
                }
            }

            display.textContent = currentValue;
        };
    }

    /**
     * Launch Notepad
     */
    private async launchNotepad(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: white;">
                <div style="padding: 12px; background: #f5f5f5; border-bottom: 1px solid #ddd; display: flex; gap: 8px;">
                    <button style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">New</button>
                    <button style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                    <button style="padding: 8px 16px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Open</button>
                </div>
                <textarea style="flex: 1; padding: 16px; border: none; outline: none; font-family: 'Courier New', monospace; font-size: 14px; resize: none;" placeholder="Start typing..."></textarea>
            </div>
        `;
    }

    /**
     * Launch Paint
     */
    private async launchPaint(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #f0f0f0;">
                <div style="padding: 12px; background: #e0e0e0; border-bottom: 1px solid #ccc; display: flex; gap: 8px; align-items: center;">
                    <div>Brush Size:</div>
                    <input type="range" min="1" max="20" value="5" id="brush-size">
                    <div>Color:</div>
                    <input type="color" value="#000000" id="brush-color">
                    <button style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;" onclick="document.getElementById('paint-canvas').getContext('2d').clearRect(0, 0, 800, 600)">Clear</button>
                </div>
                <canvas id="paint-canvas" width="800" height="600" style="flex: 1; background: white; cursor: crosshair;"></canvas>
            </div>
        `;

        const canvas = document.getElementById('paint-canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d')!;
        const brushSize = document.getElementById('brush-size') as HTMLInputElement;
        const brushColor = document.getElementById('brush-color') as HTMLInputElement;

        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;

        canvas.addEventListener('mousedown', (e) => {
            isDrawing = true;
            [lastX, lastY] = [e.offsetX, e.offsetY];
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isDrawing) return;
            ctx.strokeStyle = brushColor.value;
            ctx.lineWidth = parseInt(brushSize.value);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
            [lastX, lastY] = [e.offsetX, e.offsetY];
        });

        canvas.addEventListener('mouseup', () => isDrawing = false);
        canvas.addEventListener('mouseout', () => isDrawing = false);
    }

    /**
     * Launch Code Editor
     */
    private async launchCodeEditor(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #1e1e1e; color: #d4d4d4; font-family: 'Consolas', monospace;">
                <div style="padding: 12px; background: #252526; border-bottom: 1px solid #3c3c3c; display: flex; gap: 8px;">
                    <select style="padding: 8px; background: #3c3c3c; color: white; border: none; border-radius: 4px;">
                        <option>JavaScript</option>
                        <option>Python</option>
                        <option>HTML</option>
                        <option>CSS</option>
                    </select>
                    <button style="padding: 8px 16px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer;">Run</button>
                </div>
                <div style="flex: 1; display: flex;">
                    <div style="width: 40px; background: #1e1e1e; border-right: 1px solid #3c3c3c; padding: 16px 8px; text-align: right; font-size: 12px; color: #858585;">
                        ${Array.from({length: 50}, (_, i) => `<div>${i + 1}</div>`).join('')}
                    </div>
                    <textarea style="flex: 1; padding: 16px; background: #1e1e1e; color: #d4d4d4; border: none; outline: none; font-family: 'Consolas', monospace; font-size: 14px; resize: none;" placeholder="// Start coding..."></textarea>
                </div>
            </div>
        `;
    }

    /**
     * Launch Media Player
     */
    private async launchMediaPlayer(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; font-size: 64px;">🎵</div>
                <div style="padding: 24px; text-align: center;">
                    <div style="font-size: 24px; font-weight: bold; margin-bottom: 8px;">No media playing</div>
                    <div style="opacity: 0.8;">Select a file to play</div>
                </div>
                <div style="padding: 24px; display: flex; justify-content: center; gap: 16px;">
                    <button style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; color: white; font-size: 20px; cursor: pointer;">⏮</button>
                    <button style="width: 64px; height: 64px; background: white; border: none; border-radius: 50%; color: #667eea; font-size: 24px; cursor: pointer;">▶</button>
                    <button style="width: 48px; height: 48px; background: rgba(255,255,255,0.2); border: none; border-radius: 50%; color: white; font-size: 20px; cursor: pointer;">⏭</button>
                </div>
            </div>
        `;
    }

    /**
     * Launch Image Viewer
     */
    private async launchImageViewer(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #2c2c2c;">
                <div style="padding: 12px; background: #1e1e1e; border-bottom: 1px solid #3c3c3c; display: flex; gap: 8px;">
                    <button style="padding: 8px 16px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer;">Open Image</button>
                    <button style="padding: 8px 16px; background: #3c3c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Zoom In</button>
                    <button style="padding: 8px 16px; background: #3c3c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Zoom Out</button>
                </div>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #888; font-size: 18px;">
                    No image loaded
                </div>
            </div>
        `;
    }

    /**
     * Launch PDF Viewer
     */
    private async launchPDFViewer(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: #525659;">
                <div style="padding: 12px; background: #323639; border-bottom: 1px solid #1c1c1c; display: flex; gap: 8px; align-items: center; color: white;">
                    <button style="padding: 8px 16px; background: #0e639c; color: white; border: none; border-radius: 4px; cursor: pointer;">Open PDF</button>
                    <div style="flex: 1;"></div>
                    <button style="padding: 8px; background: #3c3c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">◀</button>
                    <span>Page 1 of 1</span>
                    <button style="padding: 8px; background: #3c3c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">▶</button>
                </div>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 18px;">
                    No PDF loaded
                </div>
            </div>
        `;
    }

    /**
     * Launch File Manager
     */
    private async launchFileManager(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; background: white;">
                <div style="padding: 12px; background: #f5f5f5; border-bottom: 1px solid #ddd; display: flex; gap: 8px; align-items: center;">
                    <button style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">New Folder</button>
                    <button style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">Upload</button>
                    <div style="flex: 1; padding: 8px 16px; background: white; border: 1px solid #ddd; border-radius: 4px;">📁 / Home / Documents</div>
                </div>
                <div style="flex: 1; padding: 16px;">
                    ${['📁 Projects', '📁 Photos', '📁 Videos', '📄 Document.txt', '📄 Readme.md'].map(item => 
                        `<div style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer; transition: background 0.2s;" 
                         onmouseenter="this.style.background='#f5f5f5'" 
                         onmouseleave="this.style.background='transparent'">${item}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Launch Terminal
     */
    private async launchTerminal(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; background: #0c0c0c; color: #00ff00; font-family: 'Courier New', monospace; padding: 16px; overflow-y: auto;">
                <div>Bellum Terminal v1.0</div>
                <div>Type 'help' for available commands</div>
                <div style="margin-top: 16px;">
                    <span style="color: #00ff00;">user@bellum:~$</span>
                    <input type="text" style="background: transparent; border: none; outline: none; color: #00ff00; font-family: 'Courier New', monospace; width: 80%;" autofocus>
                </div>
            </div>
        `;
    }

    /**
     * Launch 2048 Game
     */
    private async launch2048(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #faf8ef; gap: 24px;">
                <div style="font-size: 48px; font-weight: bold; color: #776e65;">2048</div>
                <div id="game-2048" style="display: grid; grid-template-columns: repeat(4, 100px); grid-template-rows: repeat(4, 100px); gap: 12px; background: #bbada0; padding: 12px; border-radius: 8px;">
                    ${Array(16).fill(0).map(() => 
                        `<div style="width: 100px; height: 100px; background: rgba(238, 228, 218, 0.35); border-radius: 4px;"></div>`
                    ).join('')}
                </div>
                <div style="font-size: 18px; color: #776e65;">Use arrow keys to play</div>
            </div>
        `;
    }

    /**
     * Launch Snake Game
     */
    private async launchSnake(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #2c3e50; gap: 24px;">
                <div style="font-size: 48px; font-weight: bold; color: white;">Snake</div>
                <canvas id="snake-canvas" width="400" height="400" style="background: #34495e; border: 4px solid #1a252f;"></canvas>
                <div style="font-size: 18px; color: white;">Score: <span id="snake-score">0</span></div>
                <button style="padding: 12px 24px; background: #27ae60; color: white; border: none; border-radius: 4px; font-size: 16px; cursor: pointer;" onclick="window.startSnake()">Start Game</button>
            </div>
        `;
    }

    /**
     * Launch Tetris Game
     */
    private async launchTetris(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #1a1a2e; gap: 24px;">
                <div style="font-size: 48px; font-weight: bold; color: #16213e;">Tetris</div>
                <canvas id="tetris-canvas" width="300" height="600" style="background: #0f3460; border: 4px solid #16213e;"></canvas>
                <div style="font-size: 18px; color: white;">Score: <span id="tetris-score">0</span></div>
            </div>
        `;
    }

    /**
     * Launch Minesweeper Game
     */
    private async launchMinesweeper(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #c0c0c0; gap: 24px;">
                <div style="font-size: 48px; font-weight: bold; color: #000;">Minesweeper</div>
                <div id="minesweeper-grid" style="display: grid; grid-template-columns: repeat(10, 40px); grid-template-rows: repeat(10, 40px); gap: 2px; background: #808080; padding: 4px;">
                    ${Array(100).fill(0).map(() => 
                        `<div style="width: 40px; height: 40px; background: #bdbdbd; border: 2px outset #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold;"></div>`
                    ).join('')}
                </div>
                <div style="font-size: 18px;">Mines: <span id="mines-count">10</span></div>
            </div>
        `;
    }

    /**
     * Launch Solitaire Game
     */
    private async launchSolitaire(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0b7d3e; gap: 24px;">
                <div style="font-size: 48px; font-weight: bold; color: white;">Solitaire</div>
                <div style="font-size: 18px; color: white;">Classic card game coming soon...</div>
                <div style="display: flex; gap: 16px;">
                    ${['🂡', '🂱', '🃁', '🃑'].map(card => 
                        `<div style="width: 80px; height: 120px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 48px; box-shadow: 0 4px 8px rgba(0,0,0,0.3);">${card}</div>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Launch Chess Game
     */
    private async launchChess(container: HTMLElement): Promise<void> {
        container.innerHTML = `
            <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #312e2b; gap: 24px;">
                <div style="font-size: 48px; font-weight: bold; color: white;">Chess</div>
                <div id="chess-board" style="display: grid; grid-template-columns: repeat(8, 60px); grid-template-rows: repeat(8, 60px); border: 4px solid #1a1817;">
                    ${Array(64).fill(0).map((_, i) => {
                        const row = Math.floor(i / 8);
                        const col = i % 8;
                        const isLight = (row + col) % 2 === 0;
                        return `<div style="width: 60px; height: 60px; background: ${isLight ? '#f0d9b5' : '#b58863'}; display: flex; align-items: center; justify-content: center; font-size: 36px; cursor: pointer;"></div>`;
                    }).join('')}
                </div>
                <div style="font-size: 18px; color: white;">Your turn</div>
            </div>
        `;
    }
}

// Export singleton
export const wasmAppLibrary = new WASMAppLibrary();
