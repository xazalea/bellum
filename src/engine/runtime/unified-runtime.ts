import { X86Interpreter } from '../cpu/x86_interpreter';
import { WebGL2Renderer } from '../graphics/webgl2-renderer';
import { GLESWebGLTranslator } from '../android/gles_webgl_translator';
import { ActivityManager, Activity, LinearLayout, TextView, Button, SurfaceView, View } from '../android/activity_manager';
import { HTMLExporter } from '../export/html-exporter';
import { WindowManager } from '../windows/gdi';
import { DEXParser, type DEXMethod } from '../android/dex_parser';
import { DalvikInterpreter } from '../android/dalvik_interpreter';
import { AndroidRuntime } from '../android/runtime';
import { APKLoader } from '../android/apk_loader';

// PS/2 Set 1 scancode map — static, no per-call allocation
const SCANCODE_MAP: Record<string, number> = {
  KeyA: 0x1E, KeyB: 0x30, KeyC: 0x2E, KeyD: 0x20, KeyE: 0x12, KeyF: 0x21,
  KeyG: 0x22, KeyH: 0x23, KeyI: 0x17, KeyJ: 0x24, KeyK: 0x25, KeyL: 0x26,
  KeyM: 0x32, KeyN: 0x31, KeyO: 0x18, KeyP: 0x19, KeyQ: 0x10, KeyR: 0x13,
  KeyS: 0x1F, KeyT: 0x14, KeyU: 0x16, KeyV: 0x2F, KeyW: 0x11, KeyX: 0x2D,
  KeyY: 0x15, KeyZ: 0x2C,
  Digit0: 0x0B, Digit1: 0x02, Digit2: 0x03, Digit3: 0x04, Digit4: 0x05,
  Digit5: 0x06, Digit6: 0x07, Digit7: 0x08, Digit8: 0x09, Digit9: 0x0A,
  Space: 0x39, Enter: 0x1C, Escape: 0x01, Tab: 0x0F, Backspace: 0x0E,
  ArrowUp: 0x48, ArrowDown: 0x50, ArrowLeft: 0x4B, ArrowRight: 0x4D,
  ShiftLeft: 0x2A, ShiftRight: 0x36, ControlLeft: 0x1D, ControlRight: 0x1D,
  AltLeft: 0x38, AltRight: 0x38,
  F1: 0x3B, F2: 0x3C, F3: 0x3D, F4: 0x3E, F5: 0x3F, F6: 0x40,
  F7: 0x41, F8: 0x42, F9: 0x43, F10: 0x44, F11: 0x57, F12: 0x58,
};

export type BinaryType = 'apk' | 'exe';
export type RuntimeState = 'idle' | 'loading' | 'running' | 'paused' | 'halted' | 'error';

interface ThunkEntry {
  dll: string;
  name: string;
  numArgs: number;
  stdcall: boolean;
  handler: (cpu: X86Interpreter) => number;
}

export interface RuntimeConfig {
  canvas: HTMLCanvasElement;
  type: BinaryType;
  width?: number;
  height?: number;
  instructionsPerFrame?: number;
  useWorker?: boolean;
  onStateChange?: (state: RuntimeState) => void;
  onLog?: (msg: string) => void;
  onError?: (err: Error) => void;
  onFPS?: (fps: number) => void;
}

export class UnifiedRuntime {
  private cpu: X86Interpreter | null = null;
  private renderer: WebGL2Renderer | null = null;
  private gles: GLESWebGLTranslator | null = null;
  private activityManager: ActivityManager | null = null;
  private exporter: HTMLExporter;
  private config: RuntimeConfig;
  private _state: RuntimeState = 'idle';
  private animFrameId = 0;
  private instructionsPerFrame: number;
  private lastFrameTime = 0;
  private targetFrameTime = 1000 / 60;
  private framePacingBuffer: number[] = [];
  private worker: Worker | null = null;
  private workerBusy = false;
  private workerReady = false;
  private workerResolve: ((v: unknown) => void) | null = null;

  // Input state — keyboard scan codes for the emulated machine
  private keyState: Uint8Array = new Uint8Array(256); // 1 = pressed
  private inputBuffer: { port: number; value: number; }[] = [];
  private mouseState = { x: 0, y: 0, buttons: 0 };
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundMouseHandler: ((e: MouseEvent) => void) | null = null;

  // Win32 thunk dispatch — maps imported function indices to handlers
  private windowManager: WindowManager | null = null;
  private thunkTable: Map<number, ThunkEntry> = new Map();
  private thunkNameMap: Map<string, number> = new Map(); // "dll!name" → thunkIdx
  private nextThunkIdx = 0;
  private readonly THUNK_BASE = 0x01000000;
  private quitPosted = false;
  private mainHwnd = 0;
  private lastPolledKeyIdx = 0; // for round-robin key polling in GetMessageA

  // Android / Dalvik state
  private dalvik: DalvikInterpreter | null = null;
  private androidRuntime: AndroidRuntime | null = null;
  private dexParser: DEXParser | null = null;
  private apkMethods: DEXMethod[] = [];
  private apkDexBuffer: ArrayBuffer | null = null;
  private dalvikRunning = false;
  private dalvikEventQueue: Array<{ methodIdx: number; args: number[] }> = []; // queued callbacks from input events

  constructor(config: RuntimeConfig) {
    this.config = config;
    this.instructionsPerFrame = config.instructionsPerFrame || 500000;
    this.exporter = new HTMLExporter();
  }

  get state(): RuntimeState { return this._state; }
  get fps(): number { return this.renderer?.fps ?? 0; }
  getRenderer(): WebGL2Renderer | null { return this.renderer; }
  getCPU(): X86Interpreter | null { return this.cpu; }
  getGLES(): GLESWebGLTranslator | null { return this.gles; }

  private setState(s: RuntimeState): void {
    this._state = s;
    this.config.onStateChange?.(s);
  }

  private log(msg: string): void {
    this.config.onLog?.(msg);
  }

  async boot(): Promise<void> {
    try {
      this.setState('loading');
      this.log(`[Runtime] Booting ${this.config.type.toUpperCase()} runtime...`);

      this.renderer = new WebGL2Renderer(
        this.config.canvas,
        this.config.width || 800,
        this.config.height || 600
      );

      // Attach input handlers to the canvas
      this.attachInputHandlers();

      if (this.config.type === 'exe') {
        this.cpu = new X86Interpreter({
          onInterrupt: (cpu, num) => this.handleInterrupt(cpu, num),
          onSyscall: (cpu, num) => this.handleSyscall(cpu, num),
          onPortRead: (port, size) => this.handlePortRead(port, size),
          onPortWrite: (port, val, size) => this.handlePortWrite(port, val, size),
        });
        this.windowManager = new WindowManager(this.renderer);
        this.log('[Runtime] x86 interpreter + WindowManager initialized');
      }

      if (this.config.type === 'apk') {
        this.gles = new GLESWebGLTranslator(this.renderer);
        this.log('[Runtime] GLES→WebGL translator initialized');
      }

      this.renderer.clear(0, 0, 32);
      this.renderer.present();

      if (this.config.type === 'apk') {
        this.activityManager = new ActivityManager(this.renderer);
      }

      if (this.config.type === 'exe' && this.config.useWorker && this.cpu) {
        this.worker = new Worker(new URL('../cpu/cpu-worker.ts', import.meta.url));
        this.worker.onmessage = (e: MessageEvent) => {
          const msg = e.data;
          if (msg.type === 'ready') {
            this.workerReady = true;
            this.log('[Runtime] CPU worker ready');
          } else if (msg.type === 'state') {
            this.syncFromWorker(msg);
            this.workerBusy = false;
            if (this.workerResolve) {
              this.workerResolve(msg);
              this.workerResolve = null;
            }
          } else if (msg.type === 'halted') {
            this.workerBusy = false;
          }
        };
        const memBase64 = this.uint8ToBase64(this.cpu.mem);
        this.worker.postMessage({
          type: 'init',
          memSize: this.cpu.mem.length,
          memBase64,
          regs: Array.from(this.cpu.regs),
          eip: this.cpu.eip,
          eflags: this.cpu.eflags,
          segs: Array.from(this.cpu.segs),
          batchSize: this.instructionsPerFrame,
        });
        this.log('[Runtime] CPU worker initializing...');
      }

      this.setState('idle');
      this.log('[Runtime] Boot complete');
    } catch (err) {
      this.setState('error');
      this.config.onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  }

  async loadEXE(buffer: ArrayBuffer): Promise<void> {
    if (!this.cpu || !this.renderer) throw new Error('Runtime not booted for EXE');

    this.setState('loading');
    this.log('[Runtime] Loading PE executable...');

    const view = new DataView(buffer);
    const bytes = new Uint8Array(buffer);
    if (view.getUint16(0, true) !== 0x5A4D) {
      throw new Error('Not a valid PE executable (missing MZ header)');
    }

    const peOffset = view.getUint32(0x3C, true);
    if (view.getUint32(peOffset, true) !== 0x00004550) {
      throw new Error('Invalid PE signature');
    }

    const numSections = view.getUint16(peOffset + 6, true);
    const optionalHeaderSize = view.getUint16(peOffset + 20, true);
    const entryPoint = view.getUint32(peOffset + 40, true);
    const imageBase = view.getUint32(peOffset + 52, true);

    this.log(`[Runtime] PE: entry=0x${entryPoint.toString(16)} base=0x${imageBase.toString(16)} sections=${numSections}`);

    // Load sections
    const sectionHeaderStart = peOffset + 24 + optionalHeaderSize;
    for (let i = 0; i < numSections; i++) {
      const off = sectionHeaderStart + i * 40;
      const vAddr = view.getUint32(off + 12, true);
      const rawSize = view.getUint32(off + 16, true);
      const rawOffset = view.getUint32(off + 20, true);

      if (rawSize === 0) continue;

      const sectionData = new Uint8Array(buffer, rawOffset, Math.min(rawSize, buffer.byteLength - rawOffset));
      if (vAddr + sectionData.length <= this.cpu.mem.length) {
        this.cpu.mem.set(sectionData, vAddr);
        this.log(`[Runtime] Loaded section at 0x${vAddr.toString(16)} (${sectionData.length} bytes)`);
      }
    }

    const actualLoadAddr = 0; // sections loaded at RVA offsets directly
    const dataDir0Off = peOffset + 24 + 96; // first data directory for PE32

    // Parse import directory (data directory entry 1)
    const importDirRVA = view.getUint32(dataDir0Off + 8, true);
    const importDirSize = view.getUint32(dataDir0Off + 12, true);
    if (importDirRVA && importDirSize) {
      this.patchIAT(view, bytes, importDirRVA, actualLoadAddr);
    }

    // Apply relocations (data directory entry 5)
    const relocDirRVA = view.getUint32(dataDir0Off + 40, true);
    const relocDirSize = view.getUint32(dataDir0Off + 44, true);
    if (relocDirRVA && relocDirSize) {
      this.applyRelocations(view, actualLoadAddr, imageBase, relocDirRVA, relocDirSize);
    }

    // Set EIP and stack
    this.cpu.eip = entryPoint;
    this.cpu.regs[4] = 0x7FFF0000; // ESP
    this.cpu.write32(0x7FFF0000, 0xDEADBEEF);     // Return address sentinel
    this.cpu.write32(0x7FFF0004, 0xDEADC0DE);

    // Heap setup
    this.cpu.write32(0x60000000, 0x60001000); // Heap pointer at 0x60000000, heap starts at 0x60001000

    // Minimal PEB at 0x7FFDF000
    this.cpu.write8(0x7FFDF000 + 2, 0);       // BeingDebugged = 0
    this.cpu.write32(0x7FFDF000 + 8, imageBase); // ImageBaseAddress

    this.log(`[Runtime] EXE loaded, EIP=0x${this.cpu.eip.toString(16)}`);
    this.setState('idle');
  }

  async loadAPK(buffer: ArrayBuffer): Promise<void> {
    if (!this.renderer || !this.activityManager) throw new Error('Runtime not booted for APK');

    this.setState('loading');
    this.log('[Runtime] Loading APK...');

    try {
      // Step 1: Extract classes.dex from the APK (ZIP)
      let dexBuffer: ArrayBuffer;
      try {
        const blob = new Blob([buffer]);
        dexBuffer = await APKLoader.extractDEX(blob);
        this.log(`[Runtime] Extracted classes.dex (${dexBuffer.byteLength} bytes)`);
      } catch (dexErr: any) {
        this.log(`[Runtime] DEX extraction failed: ${dexErr?.message}, trying raw buffer`);
        // Maybe the buffer IS a DEX file already
        const view = new DataView(buffer);
        if (view.getUint32(0, true) === 0x0A786564 || // 'dex\n' little-endian
            String.fromCharCode(...new Uint8Array(buffer, 0, 3)) === 'dex') {
          dexBuffer = buffer;
        } else {
          throw new Error('Could not extract DEX from APK: ' + (dexErr?.message || 'unknown error'));
        }
      }

      this.apkDexBuffer = dexBuffer;

      // Step 2: Parse the DEX file
      this.dexParser = new DEXParser(dexBuffer);
      const header = this.dexParser.parseHeader();
      this.log(`[Runtime] DEX parsed: ${header.stringIdsSize} strings, ${header.methodIdsSize} methods, ${header.classDefsSize} classes`);

      // Step 3: Build the method table for the Dalvik interpreter
      this.androidRuntime = new AndroidRuntime();
      // Wire up string resolution so const-string opcode can resolve DEX string IDs
      this.androidRuntime.setStringResolver((idx: number) => this.dexParser?.parseString(idx) ?? '');
      this.dalvik = new DalvikInterpreter(this.androidRuntime);
      this.apkMethods = this.dexParser.getAllMethods();

      // Register all DEX methods with the interpreter so invoke-* opcodes can find them
      this.registerAndroidFrameworkAPIs();
      this.registerDEXMethods();

      // Step 4: Find the main Activity and its entry method
      const mainMethod = this.dexParser.findMainActivity();
      if (mainMethod && mainMethod.codeItem) {
        this.log(`[Runtime] Found entry: ${mainMethod.className}.${mainMethod.methodName} (${mainMethod.codeItem.insnsSize} code units)`);

        // Create an Activity for the main class and start it
        const activity = new Activity(mainMethod.className.replace(/^L|;$/g, '').replace(/\//g, '.'));

        // Set up a default content view with a SurfaceView for GLES rendering
        const layout = new LinearLayout('vertical');
        layout.backgroundColor = 0xFF202030;
        layout.width = 0;
        layout.height = 0;

        const surfaceView = new SurfaceView();
        surfaceView.width = 0;
        surfaceView.height = 0;
        // Connect GLES output to the SurfaceView if available
        if (this.gles) {
          surfaceView.surface = this.gles.getSurface();
        }

        const titleView = new TextView();
        titleView.text = mainMethod.className.replace(/^L|;$/g, '').replace(/\//g, '.');
        titleView.textColor = 0xFF8AB4F8;
        titleView.margin = { left: 16, top: 24, right: 16, bottom: 8 };

        layout.addChild(titleView);
        layout.addChild(surfaceView);
        activity.setContentView(layout);
        this.activityManager.startActivity(activity);

        // Step 5: Execute the Dalvik bytecode
        this.dalvikRunning = true;
        const codeItem = mainMethod.codeItem;
        // Set up registers for the method
        const interp = this.dalvik;
        // Register 'this' (v0) as the activity's object ID
        const thisObjId = 1;
        interp.setRegister(0, thisObjId);

        this.log('[Runtime] Starting Dalvik execution...');
        // Run in chunks to avoid blocking — the render loop will continue execution
        this.executeDalvikChunk(codeItem.insns, codeItem.insnsSize);
      } else {
        // No bytecode found — show a fallback UI
        this.log('[Runtime] No main Activity found, showing fallback');
        const activity = new Activity('com.example.UnknownApp');
        const layout = new LinearLayout('vertical');
        layout.backgroundColor = 0xFF202030;
        layout.width = 0;
        layout.height = 0;

        const textView = new TextView();
        textView.text = 'No entry point found in APK';
        textView.textColor = 0xFF8AB4F8;
        textView.margin = { left: 16, top: 24, right: 16, bottom: 8 };

        layout.addChild(textView);
        activity.setContentView(layout);
        this.activityManager.startActivity(activity);
      }

      this.activityManager.renderFrame();
      this.renderer.present();
      this.log('[Runtime] APK loaded');
      this.setState('idle');
    } catch (err: any) {
      const msg = err?.message || 'Unknown APK loading error';
      this.log(`[Runtime] APK error: ${msg}`);
      this.setState('error');
      this.config.onError?.(err instanceof Error ? err : new Error(msg));
    }
  }

  /** Execute a chunk of Dalvik bytecode (non-blocking: runs up to a limit, then returns). */
  private dalvikInsnsExecuted = 0;
  private readonly DALVIK_INSNS_PER_FRAME = 50000;

  private executeDalvikChunk(insns: Uint8Array, insnsSize: number): void {
    if (!this.dalvik) return;
    const interp = this.dalvik;
    interp.setCode(insns);
    interp.setPC(0);
    try {
      const maxInsns = Math.min(this.DALVIK_INSNS_PER_FRAME, insnsSize);
      for (let i = 0; i < maxInsns; i++) {
        if (interp.getPC() >= insns.length) break;
        const opcode = insns[interp.getPC()];
        if (!interp.step(opcode)) break; // step returns false on return
      }
    } catch (e: any) {
      this.log(`[Dalvik] Execution error: ${e?.message}`);
      this.dalvikRunning = false;
    }
  }

  /** Register Android framework API handlers with the Dalvik interpreter.
   *  Maps DEX method indices to ActivityManager/View operations.
   */
  private registerAndroidFrameworkAPIs(): void {
    if (!this.dalvik || !this.dexParser || !this.activityManager) return;

    const interp = this.dalvik;
    const parser = this.dexParser;
    const am = this.activityManager;

    // Build a name-based method table so invoke-* can dispatch by name
    const methodIds = parser.parseMethodIds();
    for (let idx = 0; idx < methodIds.length; idx++) {
      const resolved = parser.resolveMethod(idx);
      const name = resolved.methodName;
      const cls = resolved.className;

      // ── Activity lifecycle methods ────────────────────────────────────
      if (name === 'onCreate') {
        interp.registerMethod(idx, (args) => {
          this.log(`[Android] Activity.onCreate()`);
          return 0;
        });
      } else if (name === 'setContentView') {
        interp.registerMethod(idx, (args) => {
          this.log(`[Android] Activity.setContentView(viewId=${args[1]})`);
          // The first arg (args[0]) is 'this', second is the view reference
          // We just mark it as handled — the view hierarchy was set up during loadAPK
          return 0;
        });
      } else if (name === 'findViewById') {
        interp.registerMethod(idx, (args) => {
          // Return a pseudo-view object ID
          const objId = interp.allocObject({ id: args[1] });
          return objId;
        });
      }

      // ── View methods ──────────────────────────────────────────────────
      else if (name === 'setText') {
        interp.registerMethod(idx, (args) => {
          // args[0] = this (TextView obj), args[1] = string/text resource
          // Try to resolve the string from the string pool
          const text = interp.getString(args[1]) || `res#${args[1]}`;
          this.log(`[Android] TextView.setText("${text}")`);
          // Update the object in the heap
          interp.setObjectField(args[0], 'text', text);
          // Also update the current activity's view if possible
          const activity = am.getCurrentActivity();
          if (activity?.contentView) {
            // Find a TextView in the hierarchy and update it
            this.updateViewText(activity.contentView, text);
          }
          return 0;
        });
      } else if (name === 'getText') {
        interp.registerMethod(idx, (args) => {
          const obj = interp.getObject(args[0]);
          return obj?.text ? interp.allocObject({ type: 'string', value: obj.text }) : 0;
        });
      } else if (name === 'setVisibility') {
        interp.registerMethod(idx, (args) => {
          interp.setObjectField(args[0], 'visibility', args[1]);
          return 0;
        });
      } else if (name === 'invalidate') {
        interp.registerMethod(idx, (args) => {
          // Trigger a re-render
          am.renderFrame();
          this.renderer?.present();
          return 0;
        });
      } else if (name === 'requestLayout' || name === 'forceLayout') {
        interp.registerMethod(idx, (args) => 0);
      } else if (name === 'getWidth' || name === 'getMeasuredWidth') {
        interp.registerMethod(idx, (args) => {
          const surf = this.renderer?.getSurface();
          return surf?.width ?? 800;
        });
      } else if (name === 'getHeight' || name === 'getMeasuredHeight') {
        interp.registerMethod(idx, (args) => {
          const surf = this.renderer?.getSurface();
          return surf?.height ?? 600;
        });
      } else if (name === 'setBackgroundColor') {
        interp.registerMethod(idx, (args) => {
          interp.setObjectField(args[0], 'backgroundColor', args[1]);
          return 0;
        });
      } else if (name === 'setOnClickListener') {
        interp.registerMethod(idx, (args) => {
          // Store the listener method index so input events can invoke it later
          interp.setObjectField(args[0], 'clickListener', args[1]);
          return 0;
        });
      } else if (name === 'addView') {
        interp.registerMethod(idx, (args) => {
          this.log(`[Android] ViewGroup.addView(childId=${args[1]})`);
          return 0;
        });
      } else if (name === 'setOrientation') {
        interp.registerMethod(idx, (args) => {
          interp.setObjectField(args[0], 'orientation', args[1] === 0 ? 'horizontal' : 'vertical');
          return 0;
        });
      }

      // ── Log methods ───────────────────────────────────────────────────
      else if (name === 'd' || name === 'i' || name === 'w' || name === 'e' || name === 'v') {
        interp.registerMethod(idx, (args) => {
          const tag = interp.getString(args[0]) || cls.replace(/^L|;$/g, '');
          const msg = interp.getString(args[1]) || '';
          const level = name === 'e' ? 'ERROR' : name === 'w' ? 'WARN' : name === 'i' ? 'INFO' : 'DEBUG';
          this.log(`[Android][${level}] ${tag}: ${msg}`);
          return 0;
        });
      }

      // ── System methods ────────────────────────────────────────────────
      else if (name === 'getSystemService') {
        interp.registerMethod(idx, (args) => {
          // Return a pseudo service handle
          const objId = interp.allocNextObjectId();
          interp.setHeapObject(objId, { service: args[1] });
          return objId;
        });
      } else if (name === 'getResources') {
        interp.registerMethod(idx, (args) => {
          return interp.allocObject({ type: 'resources' });
        });
      } else if (name === 'getString') {
        interp.registerMethod(idx, (args) => {
          const str = interp.getString(args[1]) || `res#${args[1]}`;
          const objId = interp.allocObject({ type: 'string', value: str });
          interp.registerString(objId, str);
          return objId;
        });
      } else if (name === 'getDisplayMetrics') {
        interp.registerMethod(idx, (args) => {
          // Allocate a DisplayMetrics object with screen dimensions
          const surf = this.renderer?.getSurface();
          const objId = interp.allocObject({
            type: 'displayMetrics',
            density: 160,       // mdpi
            densityDpi: 160,
            scaledDensity: 1.0,
            xdpi: 160,
            ydpi: 160,
            widthPixels: surf?.width ?? 800,
            heightPixels: surf?.height ?? 600,
          });
          return objId;
        });
      } else if (name === 'getIntent' || name === 'getActionBar' || name === 'getFragmentManager'
                 || name === 'getSupportFragmentManager' || name === 'getLoaderManager') {
        interp.registerMethod(idx, (args) => {
          return interp.allocObject({});
        });
      }

      // ── Graphics methods (GLES) ───────────────────────────────────────
      else if (name === 'glClearColor' || name === 'glClear' || name === 'glViewport'
               || name === 'glDrawArrays' || name === 'glDrawElements') {
        // Dispatch to GLES translator if available
        if (this.gles) {
          interp.registerMethod(idx, (args) => {
            if (name === 'glClearColor') {
              this.gles!.clearColorBuffer(
                args[0] / 255, args[1] / 255, args[2] / 255, args[3] / 255
              );
            } else if (name === 'glClear') {
              this.gles!.clear(args[0]);
            } else if (name === 'glViewport') {
              // Viewport is handled by the renderer automatically
            } else if (name === 'glDrawArrays') {
              this.gles!.drawArrays(args[0], args[1], args[2]);
            } else if (name === 'glDrawElements') {
              this.gles!.drawElements(args[0], args[1], args[2], args[3]);
            }
            return 0;
          });
        }
      }

      // ── Bundle / Intent extras ────────────────────────────────────────
      else if (name === 'putExtra' || name === 'getStringExtra' || name === 'getIntExtra'
               || name === 'getBooleanExtra') {
        interp.registerMethod(idx, (args) => {
          // Bundle stubs
          return args.length > 2 ? args[2] : 0;
        });
      }

      // ── toString / equals / hashCode ──────────────────────────────────
      else if (name === 'toString') {
        interp.registerMethod(idx, (args) => {
          const objId = interp.allocNextObjectId();
          const obj = interp.getHeapObject(args[0]);
          const str = obj ? JSON.stringify(obj).substring(0, 64) : 'Object';
          interp.registerString(objId, str);
          return objId;
        });
      } else if (name === 'equals') {
        interp.registerMethod(idx, (args) => {
          return args[0] === args[1] ? 1 : 0;
        });
      } else if (name === 'hashCode') {
        interp.registerMethod(idx, (args) => {
          return args[0] & 0x7FFFFFFF;
        });
      } else if (name === 'getClass') {
        interp.registerMethod(idx, (args) => {
          return interp.allocObject({ type: 'class' });
        });
      }

      // ── Constructors (<init>) ──────────────────────────────────────────
      else if (name === '<init>') {
        // Default constructor: just return the 'this' reference
        interp.registerMethod(idx, (args) => {
          return args[0]; // return 'this'
        });
      }

      // ── Static initializers (<clinit>) ─────────────────────────────────
      else if (name === '<clinit>') {
        interp.registerMethod(idx, (args) => {
          return 0;
        });
      }
    }

    this.log(`[Runtime] Registered Android framework APIs for ${methodIds.length} methods`);
  }

  /** Helper: update a TextView in the view hierarchy by traversing it. */
  private updateViewText(view: View, text: string): void {
    if (view instanceof TextView) {
      view.text = text;
    }
    if (view instanceof LinearLayout || view instanceof SurfaceView) {
      // LinearLayout and FrameLayout have children
      const children = (view as any).children as View[] | undefined;
      if (children) {
        for (const child of children) {
          this.updateViewText(child, text);
        }
      }
    }
  }

  /** Register all DEX methods with the Dalvik interpreter so recursive invoke works.
   *  Methods that already have a handler (from registerAndroidFrameworkAPIs) are skipped.
   */
  private registerDEXMethods(): void {
    if (!this.dalvik || !this.dexParser) return;

    for (const method of this.apkMethods) {
      // Only register if no handler exists yet (don't overwrite framework APIs)
      if (this.dalvik.hasMethod(method.methodIdx)) continue;

      // If the method has bytecode, register a handler that executes it recursively
      if (method.codeItem) {
        const insns = method.codeItem.insns;
        const insnsSize = method.codeItem.insnsSize;
        const rt = this;

        this.dalvik.registerMethod(method.methodIdx, (args) => {
          // Recursively execute this method's bytecode
          const interp = rt.dalvik!;
          // Save current state
          const savedPc = interp.getPC();
          const savedCode = interp.getCode();
          const savedRegs = interp.cloneRegisters();
          const savedFloatRegs = interp.cloneFloatRegs();
          const savedLastResult = interp.getLastResult();
          const savedLastResultFloat = interp.getLastResultFloat();

          // Set up registers for the new method
          const codeItem = method.codeItem!;
          for (let i = 0; i < codeItem.insSize && i < args.length; i++) {
            interp.setRegister(i, args[i]);
          }

          // Execute recursively with the step() method
          try {
            interp.setCode(insns);
            interp.setPC(0);
            const maxSteps = Math.min(insnsSize, 10000); // safety limit
            for (let s = 0; s < maxSteps; s++) {
              if (interp.getPC() >= insns.length) break;
              const opcode = insns[interp.getPC()];
              if (!interp.step(opcode)) break; // step returns false on return
            }
          } catch {
            // Swallow errors in nested execution
          }

          const result = interp.getLastResult();

          // Restore state
          interp.setPC(savedPc);
          interp.setCode(savedCode);
          interp.restoreRegisters(savedRegs);
          interp.restoreFloatRegs(savedFloatRegs);
          interp.setLastResult(savedLastResult, savedLastResultFloat);

          return result;
        });
      } else {
        // No bytecode — register a stub that returns 0
        this.dalvik.registerMethod(method.methodIdx, (args) => {
          return 0;
        });
      }
    }
  }

  run(): void {
    if (this._state !== 'idle' && this._state !== 'paused') return;
    this.setState('running');
    this.log('[Runtime] Execution started');
    this.lastFrameTime = performance.now();
    this.loop();
  }

  pause(): void {
    if (this._state !== 'running') return;
    cancelAnimationFrame(this.animFrameId);
    this.setState('paused');
    this.log('[Runtime] Paused');
  }

  resume(): void {
    if (this._state !== 'paused') return;
    this.run();
  }

  private loop = (): void => {
    if (this._state !== 'running') return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (this.cpu && !this.cpu.halted) {
      if (this.worker && this.workerReady && !this.workerBusy) {
        const ips = this.adaptInstructions(delta);
        this.workerBusy = true;
        this.worker.postMessage({ type: 'run', count: ips });
      } else if (!this.worker) {
        const ips = this.adaptInstructions(delta);
        this.cpu.run(ips);
      }

      if (this.cpu.halted) {
        this.log('[Runtime] CPU halted');
        this.setState('halted');
        this.renderer?.present();
        return;
      }
    }

    // Continue Dalvik execution for APK mode (game loops, animations, event callbacks)
    if (this.dalvik && this.dalvikRunning) {
      // Process queued event callbacks (limit to 3 per frame to avoid frame drops)
      let eventsProcessed = 0;
      while (this.dalvikEventQueue.length > 0 && eventsProcessed < 3) {
        eventsProcessed++;
        const event = this.dalvikEventQueue.shift()!;
        // Find the method's bytecode and execute it
        const method = this.apkMethods.find(m => m.methodIdx === event.methodIdx);
        if (method?.codeItem) {
          const savedPc = this.dalvik.getPC();
          const savedCode = this.dalvik.getCode();
          const savedRegs = this.dalvik.cloneRegisters();
          const savedFloatRegs = this.dalvik.cloneFloatRegs();
          const savedLastResult = this.dalvik.getLastResult();
          const savedLastResultFloat = this.dalvik.getLastResultFloat();

          for (let i = 0; i < event.args.length && i < method.codeItem.insSize; i++) {
            this.dalvik.setRegister(i, event.args[i]);
          }
          this.dalvik.setCode(method.codeItem.insns);
          this.dalvik.setPC(0);
          const maxSteps = Math.min(method.codeItem.insnsSize, 5000);
          for (let s = 0; s < maxSteps; s++) {
            if (this.dalvik.getPC() >= method.codeItem.insns.length) break;
            if (!this.dalvik.step(method.codeItem.insns[this.dalvik.getPC()])) break;
          }

          this.dalvik.setPC(savedPc);
          this.dalvik.setCode(savedCode);
          this.dalvik.restoreRegisters(savedRegs);
          this.dalvik.restoreFloatRegs(savedFloatRegs);
          this.dalvik.setLastResult(savedLastResult, savedLastResultFloat);
        }
      }

      // Continue main Dalvik execution
      const code = this.dalvik.getCode();
      const maxInsns = this.DALVIK_INSNS_PER_FRAME;
      for (let i = 0; i < maxInsns; i++) {
        if (this.dalvik.getPC() >= code.length) { this.dalvikRunning = false; break; }
        if (!this.dalvik.step(code[this.dalvik.getPC()])) { this.dalvikRunning = false; break; }
      }
      this.activityManager?.renderFrame();
    } else if (this.activityManager) {
      // For APK mode without running Dalvik, still render the activity
      this.activityManager.renderFrame();
    }

    // For EXE mode, blit the main window surface to the display
    if (this.windowManager && this.mainHwnd) {
      this.windowManager.present(this.mainHwnd);
    }

    this.renderer?.present();
    this.config.onFPS?.(this.renderer?.fps ?? 0);

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private adaptInstructions(frameDelta: number): number {
    this.framePacingBuffer.push(frameDelta);
    if (this.framePacingBuffer.length > 30) this.framePacingBuffer.shift();

    const avgDelta = this.framePacingBuffer.reduce((a, b) => a + b, 0) / this.framePacingBuffer.length;
    const budgetMs = this.targetFrameTime * 0.8;

    if (avgDelta > this.targetFrameTime * 1.5) {
      this.instructionsPerFrame = Math.max(10000, (this.instructionsPerFrame * 0.7) | 0);
    } else if (avgDelta < budgetMs) {
      this.instructionsPerFrame = Math.min(2000000, (this.instructionsPerFrame * 1.1) | 0);
    }

    return this.instructionsPerFrame;
  }

  private handleInterrupt(cpu: X86Interpreter, num: number): void {
    if (num === 0x10) {
      this.handleVideoBIOS(cpu);
    } else if (num === 0x21) {
      this.handleDOSInterrupt(cpu);
    } else if (num === 0xFE) {
      this.handleThunkInterrupt(cpu);
    } else {
      this.log(`[INT] 0x${num.toString(16)}`);
    }
  }

  // -----------------------------------------------------------------------
  // IAT Thunk dispatch (INT 0xFE)
  // -----------------------------------------------------------------------

  private handleThunkInterrupt(cpu: X86Interpreter): void {
    // The trampoline at the thunk address is: CD FE <idx16>
    // EIP now points just after the CD FE bytes, so the next 2 bytes are the index.
    const idx = cpu.read16(cpu.eip >>> 0);
    cpu.eip = (cpu.eip + 2) >>> 0; // skip past the index

    const thunk = this.thunkTable.get(idx);
    if (!thunk) {
      this.log(`[Thunk] Unknown thunk index ${idx}`);
      cpu.regs[0] = 0; // EAX = 0
      return;
    }

    // Execute the handler — it reads args from the stack and returns a value
    const result = thunk.handler(cpu);
    cpu.regs[0] = result | 0; // EAX = return value

    // Simulate RET for stdcall: callee cleans up args
    const retAddr = cpu.read32(cpu.regs[4] >>> 0); // ESP → return address
    cpu.regs[4] = (cpu.regs[4] + (thunk.stdcall ? 4 + thunk.numArgs * 4 : 4)) | 0;
    cpu.eip = retAddr >>> 0;
  }

  /** Read a null-terminated ASCII string from CPU memory at the given address. */
  private readCString(cpu: X86Interpreter, addr: number): string {
    let s = '';
    let maxLen = 4096;
    while (maxLen-- > 0) {
      const b = cpu.read8(addr >>> 0);
      if (b === 0) break;
      s += String.fromCharCode(b);
      addr++;
    }
    return s;
  }

  /** Write a string into CPU memory at the given address. Returns bytes written. */
  private writeCString(cpu: X86Interpreter, addr: number, str: string): number {
    for (let i = 0; i < str.length; i++) {
      cpu.write8((addr + i) >>> 0, str.charCodeAt(i));
    }
    cpu.write8((addr + str.length) >>> 0, 0);
    return str.length + 1;
  }

  /** Read a 32-bit arg from the stack at ESP + offset. */
  private readStackArg(cpu: X86Interpreter, index: number): number {
    return cpu.read32((cpu.regs[4] + 4 + index * 4) >>> 0);
  }

  /** Register a thunk entry and return the address where the trampoline was written. */
  private registerThunk(dll: string, name: string, numArgs: number, stdcall: boolean, handler: (cpu: X86Interpreter) => number): number {
    const idx = this.nextThunkIdx++;
    const addr = this.THUNK_BASE + idx * 4; // each thunk gets 4 bytes: CD FE <idx16>

    if (addr + 4 <= this.cpu!.mem.length) {
      this.cpu!.write8(addr, 0xCD);      // INT
      this.cpu!.write8(addr + 1, 0xFE);  // 0xFE
      this.cpu!.write16(addr + 2, idx);  // 16-bit function index
    }

    this.thunkTable.set(idx, { dll, name, numArgs, stdcall, handler });
    this.thunkNameMap.set(`${dll}!${name}`, idx); // O(1) lookup by name
    return addr;
  }

  /** Initialize the Win32 API thunk table for all supported imports. */
  private initializeThunkTable(): void {
    const rt = this;
    const wm = this.windowManager!;

    // ── kernel32.dll ────────────────────────────────────────────────────────

    rt.registerThunk('kernel32.dll', 'ExitProcess', 1, true, (cpu) => {
      const exitCode = rt.readStackArg(cpu, 0);
      rt.log(`[kernel32] ExitProcess(${exitCode})`);
      cpu.halted = true;
      return 0;
    });

    rt.registerThunk('kernel32.dll', 'GetModuleHandleA', 1, true, (cpu) => {
      const namePtr = rt.readStackArg(cpu, 0);
      rt.log(`[kernel32] GetModuleHandleA(0x${namePtr.toString(16)})`);
      return 0x00400000; // default image base
    });

    rt.registerThunk('kernel32.dll', 'VirtualAlloc', 4, true, (cpu) => {
      const addr = rt.readStackArg(cpu, 0);
      const size = rt.readStackArg(cpu, 1);
      const allocType = rt.readStackArg(cpu, 2);
      const protect = rt.readStackArg(cpu, 3);
      rt.log(`[kernel32] VirtualAlloc(0x${addr.toString(16)}, 0x${size.toString(16)}, 0x${allocType.toString(16)}, 0x${protect.toString(16)})`);
      // Simple bump allocator from 0x60001000 upward
      const heapPtr = 0x60000000;
      const current = cpu.read32(heapPtr);
      const aligned = (current + 0xFFF) & ~0xFFF; // page-align
      cpu.write32(heapPtr, (aligned + size + 0xFFF) & ~0xFFF); // bump
      return aligned;
    });

    rt.registerThunk('kernel32.dll', 'VirtualFree', 3, true, (cpu) => {
      rt.log(`[kernel32] VirtualFree`);
      return 1; // TRUE
    });

    rt.registerThunk('kernel32.dll', 'GetLastError', 0, true, () => 0);
    rt.registerThunk('kernel32.dll', 'SetLastError', 1, true, () => 0);

    rt.registerThunk('kernel32.dll', 'GetTickCount', 0, true, () => {
      return Date.now() & 0xFFFFFFFF;
    });

    rt.registerThunk('kernel32.dll', 'QueryPerformanceCounter', 1, true, (cpu) => {
      const ptr = rt.readStackArg(cpu, 0);
      const now = performance.now() * 1000; // microseconds
      const lo = (now | 0) >>> 0;
      const hi = ((now / 0x100000000) | 0) >>> 0;
      if (ptr) { cpu.write32(ptr >>> 0, lo); cpu.write32((ptr + 4) >>> 0, hi); }
      return 1; // TRUE
    });

    rt.registerThunk('kernel32.dll', 'QueryPerformanceFrequency', 1, true, (cpu) => {
      const ptr = rt.readStackArg(cpu, 0);
      if (ptr) { cpu.write32(ptr >>> 0, 1000000); cpu.write32((ptr + 4) >>> 0, 0); }
      return 1; // TRUE
    });

    rt.registerThunk('kernel32.dll', 'Sleep', 1, true, (cpu) => {
      // No actual sleep in emulation
      return 0;
    });

    rt.registerThunk('kernel32.dll', 'GetModuleFileNameA', 3, true, (cpu) => {
      const _module = rt.readStackArg(cpu, 0);
      const bufPtr = rt.readStackArg(cpu, 1);
      const size = rt.readStackArg(cpu, 2);
      const name = 'C:\\game.exe';
      const written = Math.min(name.length, size - 1);
      rt.writeCString(cpu, bufPtr, name.substring(0, written));
      return written;
    });

    rt.registerThunk('kernel32.dll', 'GetProcAddress', 2, true, (cpu) => {
      const _module = rt.readStackArg(cpu, 0);
      const procNamePtr = rt.readStackArg(cpu, 1);
      // For ordinal imports (high bit set), return 0 (not found)
      if (procNamePtr & 0xFFFF0000) return 0;
      const name = rt.readCString(cpu, procNamePtr);
      // Try to find the function across all DLLs in the thunk name map
      for (const [key, idx] of rt.thunkNameMap) {
        const parts = key.split('!');
        if (parts[1] === name) {
          const addr = rt.THUNK_BASE + idx * 4;
          rt.log(`[kernel32] GetProcAddress("${name}") → found at 0x${addr.toString(16)}`);
          return addr;
        }
      }
      // Not found — register a dynamic stub thunk that logs and returns 0
      const stubIdx = rt.nextThunkIdx;
      const stubAddr = rt.THUNK_BASE + stubIdx * 4;
      if (rt.cpu && stubAddr + 4 <= rt.cpu.mem.length) {
        rt.cpu.write8(stubAddr, 0xCD);
        rt.cpu.write8(stubAddr + 1, 0xFE);
        rt.cpu.write16(stubAddr + 2, stubIdx);
      }
      // Guess the DLL name from the module handle
      const dllGuess = 'unknown.dll';
      rt.thunkTable.set(stubIdx, {
        dll: dllGuess, name, numArgs: 4, stdcall: true,
        handler: (cpu) => { rt.log(`[kernel32] Dynamic stub: ${name}()`); return 0; },
      });
      rt.thunkNameMap.set(`${dllGuess}!${name}`, stubIdx);
      rt.nextThunkIdx++;
      rt.log(`[kernel32] GetProcAddress("${name}") → dynamic stub at 0x${stubAddr.toString(16)}`);
      return stubAddr;
    });

    rt.registerThunk('kernel32.dll', 'LoadLibraryA', 1, true, (cpu) => {
      const namePtr = rt.readStackArg(cpu, 0);
      const name = rt.readCString(cpu, namePtr);
      rt.log(`[kernel32] LoadLibraryA("${name}")`);
      return 0x10000000; // pseudo handle
    });

    rt.registerThunk('kernel32.dll', 'FreeLibrary', 1, true, () => 1);

    rt.registerThunk('kernel32.dll', 'HeapAlloc', 3, true, (cpu) => {
      const _heap = rt.readStackArg(cpu, 0);
      const _flags = rt.readStackArg(cpu, 1);
      const size = rt.readStackArg(cpu, 2);
      const heapPtr = 0x60000000;
      const current = cpu.read32(heapPtr);
      cpu.write32(heapPtr, (current + size + 0xF) & ~0xF); // 16-byte align
      return current;
    });

    rt.registerThunk('kernel32.dll', 'HeapFree', 3, true, () => 1);
    rt.registerThunk('kernel32.dll', 'HeapCreate', 3, true, (cpu) => {
      return 0x60000000; // return our heap region base
    });

    rt.registerThunk('kernel32.dll', 'GlobalAlloc', 2, true, (cpu) => {
      const _flags = rt.readStackArg(cpu, 0);
      const size = rt.readStackArg(cpu, 1);
      const heapPtr = 0x60000000;
      const current = cpu.read32(heapPtr);
      cpu.write32(heapPtr, (current + size + 0xF) & ~0xF);
      return current;
    });

    rt.registerThunk('kernel32.dll', 'GlobalFree', 1, true, () => 0);

    // Virtual filesystem for EXE mode
    const vfsFiles: Map<string, Uint8Array> = new Map();
    const vfsHandles: Map<number, { path: string; position: number; access: number }> = new Map();
    let vfsNextHandle = 0x100;

    rt.registerThunk('kernel32.dll', 'CreateFileA', 7, true, (cpu) => {
      const pathPtr = rt.readStackArg(cpu, 0);
      const access = rt.readStackArg(cpu, 1);
      const _share = rt.readStackArg(cpu, 2);
      const _sec = rt.readStackArg(cpu, 3);
      const disp = rt.readStackArg(cpu, 4);
      const _flags = rt.readStackArg(cpu, 5);
      const _templ = rt.readStackArg(cpu, 6);
      const path = rt.readCString(cpu, pathPtr);
      rt.log(`[kernel32] CreateFileA("${path}" access=0x${(access>>>0).toString(16)} disp=${disp})`);

      // Create new file if CREATE_ALWAYS (2) or OPEN_ALWAYS (4)
      if (disp === 2 || disp === 4) {
        if (!vfsFiles.has(path)) vfsFiles.set(path, new Uint8Array(0));
      }
      // OPEN_EXISTING (3) — fail if not found
      if (disp === 3 && !vfsFiles.has(path)) {
        return 0xFFFFFFFF; // INVALID_HANDLE_VALUE
      }

      const handle = vfsNextHandle++;
      vfsHandles.set(handle, { path, position: 0, access });
      return handle;
    });

    rt.registerThunk('kernel32.dll', 'ReadFile', 5, true, (cpu) => {
      const handle = rt.readStackArg(cpu, 0);
      const bufPtr = rt.readStackArg(cpu, 1);
      const bytesToRead = rt.readStackArg(cpu, 2);
      const bytesReadPtr = rt.readStackArg(cpu, 3);
      const _overlapped = rt.readStackArg(cpu, 4);

      const fh = vfsHandles.get(handle);
      if (!fh) {
        if (bytesReadPtr) cpu.write32(bytesReadPtr >>> 0, 0);
        return 0;
      }
      const fileData = vfsFiles.get(fh.path);
      if (!fileData) {
        if (bytesReadPtr) cpu.write32(bytesReadPtr >>> 0, 0);
        return 0;
      }

      const available = Math.min(bytesToRead, fileData.length - fh.position);
      if (available <= 0) {
        if (bytesReadPtr) cpu.write32(bytesReadPtr >>> 0, 0);
        return 1; // EOF is not an error
      }

      // Copy file data into CPU memory
      for (let i = 0; i < available; i++) {
        cpu.write8((bufPtr + i) >>> 0, fileData[fh.position + i]);
      }
      fh.position += available;
      if (bytesReadPtr) cpu.write32(bytesReadPtr >>> 0, available);
      return 1; // TRUE
    });

    rt.registerThunk('kernel32.dll', 'WriteFile', 5, true, (cpu) => {
      const handle = rt.readStackArg(cpu, 0);
      const bufPtr = rt.readStackArg(cpu, 1);
      const bytesToWrite = rt.readStackArg(cpu, 2);
      const bytesWrittenPtr = rt.readStackArg(cpu, 3);
      const _overlapped = rt.readStackArg(cpu, 4);

      const fh = vfsHandles.get(handle);
      if (!fh) {
        if (bytesWrittenPtr) cpu.write32(bytesWrittenPtr >>> 0, 0);
        return 0;
      }

      // Read data from CPU memory
      const data = new Uint8Array(bytesToWrite);
      for (let i = 0; i < bytesToWrite; i++) {
        data[i] = cpu.read8((bufPtr + i) >>> 0);
      }

      // Extend file if needed
      let existing = vfsFiles.get(fh.path) ?? new Uint8Array(0);
      const newPos = fh.position + bytesToWrite;
      if (newPos > existing.length) {
        const extended = new Uint8Array(newPos);
        extended.set(existing);
        existing = extended;
      }
      existing.set(data.subarray(0, Math.min(bytesToWrite, existing.length - fh.position)), fh.position);
      vfsFiles.set(fh.path, existing);
      fh.position = newPos;

      if (bytesWrittenPtr) cpu.write32(bytesWrittenPtr >>> 0, bytesToWrite);
      return 1; // TRUE
    });

    rt.registerThunk('kernel32.dll', 'CloseHandle', 1, true, (cpu) => {
      const handle = rt.readStackArg(cpu, 0);
      vfsHandles.delete(handle);
      return 1;
    });

    const _pid = (Math.floor(Math.random() * 60000) + 1000);
    const _tid = (Math.floor(Math.random() * 60000) + 1000);
    rt.registerThunk('kernel32.dll', 'GetCurrentProcessId', 0, true, () => _pid);
    rt.registerThunk('kernel32.dll', 'GetCurrentThreadId', 0, true, () => _tid);

    rt.registerThunk('kernel32.dll', 'CreateThread', 6, true, () => 0);
    rt.registerThunk('kernel32.dll', 'WaitForSingleObject', 2, true, () => 0); // WAIT_OBJECT_0
    rt.registerThunk('kernel32.dll', 'CreateMutexA', 3, true, () => 0x100);
    rt.registerThunk('kernel32.dll', 'ReleaseMutex', 1, true, () => 1);
    rt.registerThunk('kernel32.dll', 'CreateEventA', 4, true, () => 0x200);
    rt.registerThunk('kernel32.dll', 'SetEvent', 1, true, () => 1);
    rt.registerThunk('kernel32.dll', 'ResetEvent', 1, true, () => 1);

    rt.registerThunk('kernel32.dll', 'GetSystemInfo', 1, true, (cpu) => {
      const ptr = rt.readStackArg(cpu, 0);
      if (ptr) {
        cpu.write32((ptr + 0) >>> 0, 0);      // wProcessorArchitecture
        cpu.write32((ptr + 4) >>> 0, 4096);   // dwPageSize
        cpu.write32((ptr + 8) >>> 0, 0x10000); // lpMinimumApplicationAddress
        cpu.write32((ptr + 12) >>> 0, 0x7FFEFFFF); // lpMaximumApplicationAddress
        cpu.write32((ptr + 16) >>> 0, 0x10000); // dwActiveProcessorMask
        cpu.write32((ptr + 20) >>> 0, 1);     // dwNumberOfProcessors
        cpu.write32((ptr + 24) >>> 0, 0x4000); // dwProcessorType
        cpu.write32((ptr + 28) >>> 0, 256 * 1024 * 1024); // dwAllocationGranularity
        cpu.write16((ptr + 32) >>> 0, 6);     // wProcessorLevel
        cpu.write16((ptr + 34) >>> 0, 1);     // wProcessorRevision
      }
      return 0;
    });

    // ── user32.dll ──────────────────────────────────────────────────────────

    rt.registerThunk('user32.dll', 'RegisterClassExA', 1, true, (cpu) => {
      rt.log(`[user32] RegisterClassExA`);
      return 0xC000; // pseudo atom
    });

    rt.registerThunk('user32.dll', 'CreateWindowExA', 12, true, (cpu) => {
      const _exStyle = rt.readStackArg(cpu, 0);
      const _className = rt.readStackArg(cpu, 1);
      const windowNamePtr = rt.readStackArg(cpu, 2);
      const style = rt.readStackArg(cpu, 3);
      const x = rt.readStackArg(cpu, 4);
      const y = rt.readStackArg(cpu, 5);
      const w = rt.readStackArg(cpu, 6) || 800;
      const h = rt.readStackArg(cpu, 7) || 600;
      const title = windowNamePtr ? rt.readCString(cpu, windowNamePtr) : 'Window';
      rt.log(`[user32] CreateWindowExA("${title}" ${w}x${h} style=0x${style.toString(16)})`);
      const hwnd = wm.createWindow(title, w, h);
      if (!rt.mainHwnd) rt.mainHwnd = hwnd;
      return hwnd;
    });

    rt.registerThunk('user32.dll', 'ShowWindow', 2, true, (cpu) => {
      const hwnd = rt.readStackArg(cpu, 0);
      const cmdShow = rt.readStackArg(cpu, 1);
      rt.log(`[user32] ShowWindow(hwnd=${hwnd} cmdShow=${cmdShow})`);
      return 1;
    });

    rt.registerThunk('user32.dll', 'UpdateWindow', 1, true, (cpu) => {
      const hwnd = rt.readStackArg(cpu, 0);
      // Render the window surface to the display
      wm.present(hwnd);
      rt.renderer?.present();
      return 1;
    });

    // System color table for GetSysColorBrush / FillRect system color indices
    const SYS_COLORS: Record<number, number> = {
      0: 0x00808080,  // COLOR_SCROLLBAR
      1: 0x00800000,  // COLOR_BACKGROUND
      2: 0x00800000,  // COLOR_ACTIVECAPTION
      3: 0x00FF0000,  // COLOR_INACTIVECAPTION
      4: 0x00C0C0C0,  // COLOR_MENU
      5: 0x00FFFFFF,  // COLOR_WINDOW
      6: 0x00000000,  // COLOR_WINDOWFRAME
      7: 0x00000000,  // COLOR_MENUTEXT
      8: 0x00000000,  // COLOR_WINDOWTEXT
      9: 0x00FFFFFF,  // COLOR_CAPTIONTEXT
      10: 0x00C0C0C0, // COLOR_ACTIVEBORDER
      11: 0x00C0C0C0, // COLOR_INACTIVEBORDER
      12: 0x00808080, // COLOR_APPWORKSPACE
      13: 0x00C0C0C0, // COLOR_HIGHLIGHT
      14: 0x00000000, // COLOR_HIGHLIGHTTEXT
      15: 0x00C0C0C0, // COLOR_BTNFACE
      16: 0x00808080, // COLOR_BTNSHADOW
      17: 0x00000000, // COLOR_GRAYTEXT
      18: 0x00000000, // COLOR_BTNTEXT
      19: 0x00C0C0C0, // COLOR_INACTIVECAPTIONTEXT
      20: 0x00808080, // COLOR_3DDKSHADOW
      21: 0x00C0C0C0, // COLOR_3DLIGHT
      22: 0x00E0E0E0, // COLOR_INFOTEXT
      23: 0x00FFFFE1, // COLOR_INFOBK
      24: 0x00C0C0C0, // COLOR_HOTLIGHT
      25: 0x00C0C0C0, // COLOR_GRADIENTACTIVECAPTION
      26: 0x00C0C0C0, // COLOR_GRADIENTINACTIVECAPTION
    };

    rt.registerThunk('user32.dll', 'GetMessageA', 4, true, (cpu) => {
      const msgPtr = rt.readStackArg(cpu, 0);
      // If WM_QUIT was posted, return 0 to exit message loop
      if (rt.quitPosted) {
        if (msgPtr) {
          cpu.write32((msgPtr + 4) >>> 0, 0x0012); // WM_QUIT
        }
        return 0;
      }

      // Round-robin: check for pending keyboard events first
      let msgType = 0x000F; // WM_PAINT (default)
      let wParam = 0;
      let lParam = 0;

      // Check for keyboard input from keyState
      const pressedKey = rt.findPressedKey();
      if (pressedKey >= 0) {
        msgType = 0x0100; // WM_KEYDOWN
        wParam = pressedKey;
        // lParam: bit 30 = previous state (0 = was up), bit 31 = transition state (0 = pressed)
        lParam = 0x00000001; // repeat count = 1
      } else if (rt.mouseState.buttons !== 0) {
        msgType = 0x0201; // WM_LBUTTONDOWN
        wParam = 0x0001;  // MK_LBUTTON
        lParam = ((rt.mouseState.y & 0xFFFF) << 16) | (rt.mouseState.x & 0xFFFF);
      } else {
        msgType = 0x000F; // WM_PAINT — default to keep app rendering
      }

      if (msgPtr) {
        cpu.write32((msgPtr + 0) >>> 0, rt.mainHwnd);
        cpu.write32((msgPtr + 4) >>> 0, msgType);
        cpu.write32((msgPtr + 8) >>> 0, wParam);
        cpu.write32((msgPtr + 12) >>> 0, lParam);
        cpu.write32((msgPtr + 16) >>> 0, (Date.now() & 0xFFFFFFFF)); // time
        cpu.write32((msgPtr + 20) >>> 0, rt.mouseState.x);           // pt.x
        cpu.write32((msgPtr + 24) >>> 0, rt.mouseState.y);           // pt.y
      }
      return 1;
    });

    rt.registerThunk('user32.dll', 'PeekMessageA', 5, true, (cpu) => {
      const msgPtr = rt.readStackArg(cpu, 0);
      // Same logic as GetMessageA but never blocks
      if (rt.quitPosted) {
        if (msgPtr) cpu.write32((msgPtr + 4) >>> 0, 0x0012); // WM_QUIT
        return 0;
      }
      // Always return WM_PAINT to keep game loops spinning
      if (msgPtr) {
        cpu.write32((msgPtr + 0) >>> 0, rt.mainHwnd);
        cpu.write32((msgPtr + 4) >>> 0, 0x000F); // WM_PAINT
        cpu.write32((msgPtr + 8) >>> 0, 0);
        cpu.write32((msgPtr + 12) >>> 0, 0);
        cpu.write32((msgPtr + 16) >>> 0, Date.now() & 0xFFFFFFFF);
        cpu.write32((msgPtr + 20) >>> 0, rt.mouseState.x);
        cpu.write32((msgPtr + 24) >>> 0, rt.mouseState.y);
      }
      return 1; // TRUE = message available
    });

    rt.registerThunk('user32.dll', 'GetAsyncKeyState', 1, true, (cpu) => {
      const vKey = rt.readStackArg(cpu, 0);
      // Map Windows virtual key to scancode index
      // Bit 0 = key is currently pressed, bit 15 = key was pressed since last call
      let scancode = -1;
      if (vKey >= 0x41 && vKey <= 0x5A) scancode = SCANCODE_MAP[`Key${String.fromCharCode(vKey)}`] ?? -1;
      else if (vKey >= 0x30 && vKey <= 0x39) scancode = SCANCODE_MAP[`Digit${vKey - 0x30}`] ?? -1;
      else if (vKey === 0x20) scancode = SCANCODE_MAP['Space'] ?? -1;
      else if (vKey === 0x0D) scancode = SCANCODE_MAP['Enter'] ?? -1;
      else if (vKey === 0x1B) scancode = SCANCODE_MAP['Escape'] ?? -1;
      else if (vKey === 0x25) scancode = SCANCODE_MAP['ArrowLeft'] ?? -1;
      else if (vKey === 0x26) scancode = SCANCODE_MAP['ArrowUp'] ?? -1;
      else if (vKey === 0x27) scancode = SCANCODE_MAP['ArrowRight'] ?? -1;
      else if (vKey === 0x28) scancode = SCANCODE_MAP['ArrowDown'] ?? -1;
      else if (vKey === 0x10) scancode = SCANCODE_MAP['ShiftLeft'] ?? -1;
      else if (vKey === 0x11) scancode = SCANCODE_MAP['ControlLeft'] ?? -1;

      if (scancode >= 0 && scancode < 256 && rt.keyState[scancode]) {
        return 0x8001; // bit 15 = pressed since last query, bit 0 = currently down
      }
      return 0;
    });

    rt.registerThunk('user32.dll', 'GetKeyState', 1, true, (cpu) => {
      const vKey = rt.readStackArg(cpu, 0);
      let scancode = -1;
      if (vKey >= 0x41 && vKey <= 0x5A) scancode = SCANCODE_MAP[`Key${String.fromCharCode(vKey)}`] ?? -1;
      else if (vKey >= 0x30 && vKey <= 0x39) scancode = SCANCODE_MAP[`Digit${vKey - 0x30}`] ?? -1;
      else if (vKey === 0x20) scancode = SCANCODE_MAP['Space'] ?? -1;
      else if (vKey === 0x0D) scancode = SCANCODE_MAP['Enter'] ?? -1;
      else if (vKey === 0x25) scancode = SCANCODE_MAP['ArrowLeft'] ?? -1;
      else if (vKey === 0x26) scancode = SCANCODE_MAP['ArrowUp'] ?? -1;
      else if (vKey === 0x27) scancode = SCANCODE_MAP['ArrowRight'] ?? -1;
      else if (vKey === 0x28) scancode = SCANCODE_MAP['ArrowDown'] ?? -1;

      if (scancode >= 0 && scancode < 256 && rt.keyState[scancode]) {
        return 0xFF80; // bit 15 set = key is down, negative = pressed
      }
      return 0x0001; // bit 0 = toggle state (CapsLock etc.)
    });

    rt.registerThunk('user32.dll', 'TranslateMessage', 1, true, () => 1);
    rt.registerThunk('user32.dll', 'DispatchMessageA', 1, true, () => 0);

    rt.registerThunk('user32.dll', 'PostQuitMessage', 1, true, (cpu) => {
      const exitCode = rt.readStackArg(cpu, 0);
      rt.log(`[user32] PostQuitMessage(${exitCode})`);
      rt.quitPosted = true;
      return 0;
    });

    rt.registerThunk('user32.dll', 'DefWindowProcA', 4, true, () => 0);

    rt.registerThunk('user32.dll', 'GetClientRect', 2, true, (cpu) => {
      const hwnd = rt.readStackArg(cpu, 0);
      const rectPtr = rt.readStackArg(cpu, 1);
      const win = wm.getWindow(hwnd);
      if (rectPtr) {
        cpu.write32((rectPtr + 0) >>> 0, 0);
        cpu.write32((rectPtr + 4) >>> 0, 0);
        cpu.write32((rectPtr + 8) >>> 0, win?.width ?? 800);
        cpu.write32((rectPtr + 12) >>> 0, win?.height ?? 600);
      }
      return 1;
    });

    rt.registerThunk('user32.dll', 'InvalidateRect', 3, true, () => 1);
    rt.registerThunk('user32.dll', 'SendMessageA', 4, true, () => 0);
    rt.registerThunk('user32.dll', 'MessageBoxA', 4, true, () => 1); // IDOK
    rt.registerThunk('user32.dll', 'GetDC', 1, true, (cpu) => {
      const hwnd = rt.readStackArg(cpu, 0);
      return wm.getDC(hwnd);
    });
    rt.registerThunk('user32.dll', 'ReleaseDC', 2, true, (cpu) => {
      const _hwnd = rt.readStackArg(cpu, 0);
      const hdc = rt.readStackArg(cpu, 1);
      wm.releaseDC(hdc);
      return 1;
    });
    rt.registerThunk('user32.dll', 'GetSystemMetrics', 1, true, (cpu) => {
      const index = rt.readStackArg(cpu, 0);
      return wm.getSystemMetrics(index);
    });

    // ── gdi32.dll ───────────────────────────────────────────────────────────

    rt.registerThunk('gdi32.dll', 'CreateCompatibleDC', 1, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      return wm.createCompatibleDC(hdc);
    });

    rt.registerThunk('gdi32.dll', 'CreateCompatibleBitmap', 3, true, (cpu) => {
      const _hdc = rt.readStackArg(cpu, 0);
      const w = rt.readStackArg(cpu, 1) || 1;
      const h = rt.readStackArg(cpu, 2) || 1;
      return wm.createBitmap(w, h);
    });

    rt.registerThunk('gdi32.dll', 'SelectObject', 2, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const obj = rt.readStackArg(cpu, 1);
      return wm.selectObject(hdc, obj);
    });

    rt.registerThunk('gdi32.dll', 'DeleteObject', 1, true, (cpu) => {
      const obj = rt.readStackArg(cpu, 0);
      return wm.deleteObject(obj) ? 1 : 0;
    });

    rt.registerThunk('gdi32.dll', 'DeleteDC', 1, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      wm.deleteDC(hdc);
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'BitBlt', 9, true, (cpu) => {
      const destDC = rt.readStackArg(cpu, 0);
      const x = rt.readStackArg(cpu, 1);
      const y = rt.readStackArg(cpu, 2);
      const w = rt.readStackArg(cpu, 3);
      const h = rt.readStackArg(cpu, 4);
      const srcDC = rt.readStackArg(cpu, 5);
      const srcX = rt.readStackArg(cpu, 6);
      const srcY = rt.readStackArg(cpu, 7);
      const rop = rt.readStackArg(cpu, 8);
      wm.gdiBitBlt(destDC, x, y, w, h, srcDC, srcX, srcY, rop);
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'StretchBlt', 11, true, (cpu) => {
      const destDC = rt.readStackArg(cpu, 0);
      const xDst = rt.readStackArg(cpu, 1);
      const yDst = rt.readStackArg(cpu, 2);
      const wDst = rt.readStackArg(cpu, 3);
      const hDst = rt.readStackArg(cpu, 4);
      const srcDC = rt.readStackArg(cpu, 5);
      const xSrc = rt.readStackArg(cpu, 6);
      const ySrc = rt.readStackArg(cpu, 7);
      const wSrc = rt.readStackArg(cpu, 8);
      const hSrc = rt.readStackArg(cpu, 9);
      const rop = rt.readStackArg(cpu, 10);
      wm.gdiStretchBlt(destDC, xDst, yDst, wDst, hDst, srcDC, xSrc, ySrc, wSrc, hSrc, rop);
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'TextOutA', 5, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const x = rt.readStackArg(cpu, 1);
      const y = rt.readStackArg(cpu, 2);
      const strPtr = rt.readStackArg(cpu, 3);
      const _len = rt.readStackArg(cpu, 4);
      const text = rt.readCString(cpu, strPtr);
      wm.gdiTextOut(hdc, x, y, text);
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'FillRect', 3, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const rectPtr = rt.readStackArg(cpu, 1);
      const hbrush = rt.readStackArg(cpu, 2);
      if (rectPtr) {
        const left = cpu.read32((rectPtr + 0) >>> 0);
        const top = cpu.read32((rectPtr + 4) >>> 0);
        const right = cpu.read32((rectPtr + 8) >>> 0);
        const bottom = cpu.read32((rectPtr + 12) >>> 0);
        // System color indices: small values (1-28) are COLOR_xxx+1
        let color: number;
        if (hbrush > 0 && hbrush <= 28) {
          color = SYS_COLORS[hbrush - 1] ?? 0x00FFFFFF;
        } else {
          color = wm.getBrushColor(hbrush);
        }
        const r = color & 0xFF, g = (color >> 8) & 0xFF, b = (color >> 16) & 0xFF;
        wm.gdiFillRect(hdc, left, top, right, bottom, r, g, b);
      }
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'SetTextColor', 2, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const color = rt.readStackArg(cpu, 1);
      return wm.setTextColor(hdc, color);
    });

    rt.registerThunk('gdi32.dll', 'SetBkColor', 2, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const color = rt.readStackArg(cpu, 1);
      return wm.setBkColor(hdc, color);
    });

    rt.registerThunk('gdi32.dll', 'SetBkMode', 2, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const mode = rt.readStackArg(cpu, 1);
      return wm.setBkMode(hdc, mode);
    });

    rt.registerThunk('gdi32.dll', 'CreateSolidBrush', 1, true, (cpu) => {
      const color = rt.readStackArg(cpu, 0);
      return wm.createSolidBrush(color);
    });

    rt.registerThunk('gdi32.dll', 'CreatePen', 3, true, (cpu) => {
      const style = rt.readStackArg(cpu, 0);
      const width = rt.readStackArg(cpu, 1);
      const color = rt.readStackArg(cpu, 2);
      return wm.createPen(style, width, color);
    });

    rt.registerThunk('gdi32.dll', 'Rectangle', 5, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const left = rt.readStackArg(cpu, 1);
      const top = rt.readStackArg(cpu, 2);
      const right = rt.readStackArg(cpu, 3);
      const bottom = rt.readStackArg(cpu, 4);
      wm.gdiRectangle(hdc, left, top, right, bottom);
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'Ellipse', 5, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const left = rt.readStackArg(cpu, 1);
      const top = rt.readStackArg(cpu, 2);
      const right = rt.readStackArg(cpu, 3);
      const bottom = rt.readStackArg(cpu, 4);
      wm.gdiEllipse(hdc, left, top, right, bottom);
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'LineTo', 3, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const x = rt.readStackArg(cpu, 1);
      const y = rt.readStackArg(cpu, 2);
      // LineTo draws from the DC's current position to (x,y)
      const pos = wm.getCurrentPos(hdc);
      wm.gdiLineTo(hdc, pos.x, pos.y, x, y);
      // Update the current position
      wm.moveToEx(hdc, x, y);
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'MoveToEx', 4, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const x = rt.readStackArg(cpu, 1);
      const y = rt.readStackArg(cpu, 2);
      const prevPtr = rt.readStackArg(cpu, 3);
      const prev = wm.moveToEx(hdc, x, y);
      // Write previous position if pointer provided
      if (prevPtr) {
        cpu.write32((prevPtr + 0) >>> 0, prev.x);
        cpu.write32((prevPtr + 4) >>> 0, prev.y);
      }
      return 1;
    });

    rt.registerThunk('gdi32.dll', 'SetPixel', 4, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const x = rt.readStackArg(cpu, 1);
      const y = rt.readStackArg(cpu, 2);
      const color = rt.readStackArg(cpu, 3);
      wm.gdiSetPixel(hdc, x, y, color & 0xFF, (color >> 8) & 0xFF, (color >> 16) & 0xFF);
      return color;
    });

    rt.registerThunk('gdi32.dll', 'GetPixel', 3, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const x = rt.readStackArg(cpu, 1);
      const y = rt.readStackArg(cpu, 2);
      return wm.gdiGetPixel(hdc, x, y);
    });
    rt.registerThunk('gdi32.dll', 'PatBlt', 6, true, (cpu) => {
      const hdc = rt.readStackArg(cpu, 0);
      const x = rt.readStackArg(cpu, 1);
      const y = rt.readStackArg(cpu, 2);
      const w = rt.readStackArg(cpu, 3);
      const h = rt.readStackArg(cpu, 4);
      const rop = rt.readStackArg(cpu, 5);
      wm.gdiPatBlt(hdc, x, y, w, h, rop);
      return 1;
    });

    this.log(`[Runtime] Thunk table initialized: ${this.thunkTable.size} API functions`);
  }

  private handleSyscall(cpu: X86Interpreter, num: number): void {
    this.log(`[SYSCALL] 0x${num.toString(16)} EAX=0x${cpu.regs[0].toString(16)}`);
  }

  private handlePortRead(port: number, size: 1 | 2 | 4): number {
    // PS/2 keyboard data port
    if (port === 0x60 && this.inputBuffer.length > 0) {
      return this.inputBuffer.shift()!.value;
    }
    // Keyboard status port — bit 0 = data ready
    if (port === 0x64) {
      return this.inputBuffer.length > 0 ? 0x01 : 0x00;
    }
    return 0;
  }

  private handlePortWrite(port: number, val: number, size: 1 | 2 | 4): void {
    // Port 0x64 = keyboard command register (acknowledge)
    if (port === 0x64) {
      // Flush input buffer on command
      if (val === 0xF2) this.inputBuffer.length = 0;
    }
  }

  private handleVideoBIOS(cpu: X86Interpreter): void {
    const ah = (cpu.regs[0] >> 8) & 0xFF;
    if (ah === 0x00) {
      const mode = cpu.regs[0] & 0xFF;
      this.log(`[VBIOS] Set video mode 0x${mode.toString(16)}`);
    } else if (ah === 0x0C) {
      const color = cpu.regs[0] & 0xFF;
      const x = cpu.regs[2] & 0xFFFF;
      const y = (cpu.regs[2] >> 16) & 0xFFFF;
      this.renderer?.setPixel(x, y, (color & 4) ? 255 : 0, (color & 2) ? 255 : 0, (color & 1) ? 255 : 0);
    }
  }

  private handleDOSInterrupt(cpu: X86Interpreter): void {
    const ah = (cpu.regs[0] >> 8) & 0xFF;
    if (ah === 0x4C) {
      const exitCode = cpu.regs[0] & 0xFF;
      this.log(`[DOS] Exit with code ${exitCode}`);
      cpu.halted = true;
    }
  }

  exportToHTML(filename = 'runtime-export.html'): void {
    if (!this.renderer) return;

    // For APK mode with Dalvik bytecode, export with embedded interpreter
    if (this.dalvik && this.dexParser && this.apkMethods.length > 0) {
      const mainMethod = this.dexParser.findMainActivity();
      const bytecode = mainMethod?.codeItem?.insns ?? new Uint8Array(0);
      const insnsSize = mainMethod?.codeItem?.insnsSize ?? 0;
      const registersSize = mainMethod?.codeItem?.registersSize ?? 16;
      const insSize = mainMethod?.codeItem?.insSize ?? 1;

      // Build string table
      const header = this.dexParser.parseHeader();
      const dexStrings: string[] = [];
      for (let i = 0; i < header.stringIdsSize; i++) {
        dexStrings.push(this.dexParser.parseString(i));
      }

      // Build method table for export
      const dexMethods = this.apkMethods
        .filter(m => m.codeItem)
        .map(m => ({
          methodIdx: m.methodIdx,
          insns: m.codeItem!.insns,
          insnsSize: m.codeItem!.insnsSize,
          insSize: m.codeItem!.insSize,
          registersSize: m.codeItem!.registersSize,
          methodName: m.methodName,
        }));

      const html = this.exporter.exportFromAPK(
        this.renderer, bytecode, insnsSize, registersSize, insSize,
        dexStrings, dexMethods,
        { title: mainMethod?.className?.replace(/^L|;$/g, '').replace(/\//g, '.') || 'APK Export' }
      );
      this.exporter.downloadHTML(html, filename);
      return;
    }

    // For EXE mode, export with CPU state
    const html = this.cpu
      ? this.exporter.exportFromCPU(this.cpu, this.renderer, this.config.type)
      : this.exporter.exportFromRenderer(this.renderer, new Uint8Array(0), this.config.type, 0);
    this.exporter.downloadHTML(html, filename);
  }

  private syncFromWorker(msg: { regs: number[]; eip: number; eflags: number; segs: number[]; halted: boolean }): void {
    if (!this.cpu) return;
    for (let i = 0; i < 8 && i < msg.regs.length; i++) {
      this.cpu.regs[i] = msg.regs[i] | 0;
    }
    this.cpu.eip = msg.eip >>> 0;
    this.cpu.eflags = msg.eflags | 0;
    for (let i = 0; i < 6 && i < msg.segs.length; i++) {
      this.cpu.segs[i] = msg.segs[i] & 0xFFFF;
    }
    if (msg.halted) {
      this.cpu.halted = true;
      this.log('[Runtime] CPU halted (worker)');
      this.setState('halted');
    }
  }

  private uint8ToBase64(bytes: Uint8Array): string {
    const chunkSize = 0x8000;
    let result = '';
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      result += String.fromCharCode.apply(null, chunk as unknown as number[]);
    }
    return btoa(result);
  }

  private patchIAT(view: DataView, bytes: Uint8Array, importDirRVA: number, loadAddr: number): void {
    // Initialize the thunk table with all known Win32 API implementations
    this.initializeThunkTable();

    this.log('[Runtime] Patching IAT...');
    let descOffset = importDirRVA;

    for (let safety = 0; safety < 256; safety++) {
      if (descOffset + 20 > bytes.length) break;
      const iltRVA = view.getUint32(descOffset, true);
      const nameRVA = view.getUint32(descOffset + 12, true);
      const iatRVA = view.getUint32(descOffset + 16, true);
      if (!nameRVA && !iltRVA) break;

      let dllName = '';
      if (nameRVA < bytes.length) {
        let end = nameRVA;
        while (end < bytes.length && bytes[end] !== 0) end++;
        dllName = String.fromCharCode(...bytes.slice(nameRVA, end)).toLowerCase();
      }

      let iltOffset = iltRVA || iatRVA;
      let funcIdx = 0;
      for (let entrySafety = 0; entrySafety < 1024; entrySafety++) {
        if (iltOffset + 4 > bytes.length) break;
        const entryRaw = view.getUint32(iltOffset, true);
        if (!entryRaw) break;

        const byOrdinal = !!(entryRaw & 0x80000000);
        let funcName = '';
        if (byOrdinal) {
          funcName = `#${entryRaw & 0xFFFF}`;
        } else {
          const hintNameRVA = entryRaw & 0x7FFFFFFF;
          if (hintNameRVA + 2 < bytes.length) {
            let end = hintNameRVA + 2;
            while (end < bytes.length && bytes[end] !== 0) end++;
            funcName = String.fromCharCode(...bytes.slice(hintNameRVA + 2, end));
          }
        }

        // Look up the thunk by DLL + function name (O(1) via nameMap)
        let resolvedAddr = 0;
        const thunkIdx = this.thunkNameMap.get(`${dllName}!${funcName}`);
        if (thunkIdx !== undefined) {
          resolvedAddr = this.THUNK_BASE + thunkIdx * 4;
        }

        if (!resolvedAddr) {
          // Unknown function — register a stub thunk that returns 0
          const stubIdx = this.nextThunkIdx++;
          const stubAddr = this.THUNK_BASE + stubIdx * 4;
          if (stubAddr + 4 <= this.cpu!.mem.length) {
            this.cpu!.write8(stubAddr, 0xCD);
            this.cpu!.write8(stubAddr + 1, 0xFE);
            this.cpu!.write16(stubAddr + 2, stubIdx);
          }
          // Guess 4 args, stdcall for the stub
          this.thunkTable.set(stubIdx, {
            dll: dllName, name: funcName, numArgs: 4, stdcall: true,
            handler: (_cpu) => { this.log(`[IAT] Unimplemented: ${dllName}!${funcName}()`); return 0; },
          });
          this.thunkNameMap.set(`${dllName}!${funcName}`, stubIdx);
          resolvedAddr = stubAddr;
          this.log(`[IAT] Stub: ${dllName}!${funcName}`);
        }

        // Write the resolved thunk address into the IAT
        if (iatRVA && iatRVA + funcIdx * 4 + 4 <= this.cpu!.mem.length) {
          this.cpu!.write32(iatRVA + funcIdx * 4, resolvedAddr);
        }

        iltOffset += 4;
        funcIdx++;
      }

      this.log(`[IAT] Patched ${dllName}: ${funcIdx} functions`);
      descOffset += 20;
    }
  }

  private applyRelocations(view: DataView, loadAddr: number, imageBase: number, relocDirRVA: number, relocDirSize: number): void {
    if (!this.cpu) return;
    this.log('[Runtime] Applying relocations...');
    const delta = (loadAddr - imageBase) | 0;
    if (delta === 0) return;

    let offset = relocDirRVA;
    const end = relocDirRVA + relocDirSize;

    for (let blockSafety = 0; blockSafety < 8192 && offset < end; blockSafety++) {
      if (offset + 8 > end) break;
      const blockVA = view.getUint32(offset, true);
      const blockSize = view.getUint32(offset + 4, true);
      if (blockSize === 0) break;

      const entryCount = (blockSize - 8) / 2;
      for (let i = 0; i < entryCount; i++) {
        const entryOff = offset + 8 + i * 2;
        if (entryOff + 2 > end) break;
        const entry = view.getUint16(entryOff, true);
        const type = (entry >> 12) & 0xF;
        const rva = (entry & 0xFFF) + blockVA;

        if (type === 0) continue; // IMAGE_REL_BASED_ABSOLUTE
        if (type === 3) { // IMAGE_REL_BASED_HIGHLOW
          const addr = rva;
          if (addr + 4 <= this.cpu.mem.length) {
            const current = this.cpu.read32(addr);
            this.cpu.write32(addr, (current + delta) | 0);
          }
        }
      }

      offset += blockSize;
    }
    this.log('[Runtime] Relocations applied');
  }

  destroy(): void {
    cancelAnimationFrame(this.animFrameId);
    this.detachInputHandlers();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.renderer?.destroy();
    this.renderer = null;
    this.cpu = null;
    this.gles = null;
    this.activityManager = null;
    this.setState('idle');
  }

  // -----------------------------------------------------------------------
  // Input handling
  // -----------------------------------------------------------------------

  private boundMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private boundMouseUpHandler: ((e: MouseEvent) => void) | null = null;

  private attachInputHandlers(): void {
    const canvas = this.config.canvas;
    this.boundKeyHandler = (e: KeyboardEvent) => this.onKeyDown(e);
    this.boundKeyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
    this.boundMouseHandler = (e: MouseEvent) => this.onMouseMove(e);
    this.boundMouseDownHandler = (e: MouseEvent) => this.onMouseDown(e);
    this.boundMouseUpHandler = (e: MouseEvent) => this.onMouseUp(e);
    canvas.addEventListener('keydown', this.boundKeyHandler);
    canvas.addEventListener('keyup', this.boundKeyUpHandler);
    canvas.addEventListener('mousemove', this.boundMouseHandler);
    canvas.addEventListener('mousedown', this.boundMouseDownHandler);
    canvas.addEventListener('mouseup', this.boundMouseUpHandler);
    // Focus canvas to receive key events
    canvas.focus();
  }

  private detachInputHandlers(): void {
    const canvas = this.config.canvas;
    if (this.boundKeyHandler) canvas.removeEventListener('keydown', this.boundKeyHandler);
    if (this.boundKeyUpHandler) canvas.removeEventListener('keyup', this.boundKeyUpHandler);
    if (this.boundMouseHandler) canvas.removeEventListener('mousemove', this.boundMouseHandler);
    if (this.boundMouseDownHandler) canvas.removeEventListener('mousedown', this.boundMouseDownHandler);
    if (this.boundMouseUpHandler) canvas.removeEventListener('mouseup', this.boundMouseUpHandler);
    this.boundKeyHandler = null;
    this.boundKeyUpHandler = null;
    this.boundMouseHandler = null;
    this.boundMouseDownHandler = null;
    this.boundMouseUpHandler = null;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const scancode = this.keyToScancode(e.code);
    if (scancode >= 0 && scancode < 256) {
      this.keyState[scancode] = 1;
      // Queue keyboard input buffer write for x86 port 60h emulation
      this.inputBuffer.push({ port: 0x60, value: scancode | 0x80 }); // bit 7 = key down
    }
    // Prevent default browser behavior for game keys
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Enter','Escape','Tab'].includes(e.code)) {
      e.preventDefault();
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const scancode = this.keyToScancode(e.code);
    if (scancode >= 0 && scancode < 256) {
      this.keyState[scancode] = 0;
      this.inputBuffer.push({ port: 0x60, value: scancode & 0x7F }); // bit 7 = key up
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = this.config.canvas.getBoundingClientRect();
    this.mouseState.x = ((e.clientX - rect.left) / rect.width * (this.renderer?.getSurface().width ?? 800)) | 0;
    this.mouseState.y = ((e.clientY - rect.top) / rect.height * (this.renderer?.getSurface().height ?? 600)) | 0;
    this.mouseState.buttons = e.buttons;
  }

  private onMouseDown(e: MouseEvent): void {
    const rect = this.config.canvas.getBoundingClientRect();
    this.mouseState.x = ((e.clientX - rect.left) / rect.width * (this.renderer?.getSurface().width ?? 800)) | 0;
    this.mouseState.y = ((e.clientY - rect.top) / rect.height * (this.renderer?.getSurface().height ?? 600)) | 0;
    this.mouseState.buttons = e.buttons;

    // Queue Dalvik click callbacks for APK mode
    // Always queue — the render loop limits processing to 3/frame to avoid frame drops
    if (this.dalvik && this.apkMethods.length > 0) {
      const onClickIdx = this.findDalvikMethodByName('onClick');
      if (onClickIdx >= 0) {
        this.dalvikEventQueue.push({ methodIdx: onClickIdx, args: [1, this.mouseState.x, this.mouseState.y] });
        this.dalvikRunning = true; // ensure render loop processes events
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    const rect = this.config.canvas.getBoundingClientRect();
    this.mouseState.x = ((e.clientX - rect.left) / rect.width * (this.renderer?.getSurface().width ?? 800)) | 0;
    this.mouseState.y = ((e.clientY - rect.top) / rect.height * (this.renderer?.getSurface().height ?? 600)) | 0;
    this.mouseState.buttons = e.buttons;
  }

  /** Find a Dalvik method index by name across all registered APK methods. */
  private findDalvikMethodByName(name: string): number {
    for (const method of this.apkMethods) {
      if (method.methodName === name && method.codeItem) {
        return method.methodIdx;
      }
    }
    return -1;
  }

  /** Find a currently pressed key by round-robin scanning keyState.
   *  Returns the scancode of a pressed key, or -1 if none. */
  private findPressedKey(): number {
    const start = this.lastPolledKeyIdx;
    for (let i = 0; i < 256; i++) {
      const idx = (start + i) & 0xFF;
      if (this.keyState[idx]) {
        this.lastPolledKeyIdx = (idx + 1) & 0xFF;
        return idx;
      }
    }
    return -1;
  }

  /** Convert a DOM KeyboardEvent.code to a PS/2 set 1 scancode. */
  private keyToScancode(code: string): number {
    return SCANCODE_MAP[code] ?? -1;
  }

  /** Check if a key is currently pressed (by scancode). */
  isKeyDown(scancode: number): boolean {
    return scancode >= 0 && scancode < 256 && this.keyState[scancode] === 1;
  }

  /** Get current mouse position in surface coordinates. */
  getMouseState(): { x: number; y: number; buttons: number } {
    return { ...this.mouseState };
  }
}
