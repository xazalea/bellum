/**
 * Universal Input Manager
 * Handles keyboard, gamepad, and touch input with customizable mappings
 */

export type InputType = 'keyboard' | 'gamepad' | 'touch';
export type InputAction = 
  | 'up' | 'down' | 'left' | 'right'
  | 'jump' | 'attack' | 'defend' | 'interact'
  | 'menu' | 'pause' | 'select' | 'cancel'
  | 'l1' | 'r1' | 'l2' | 'r2'
  | 'l3' | 'r3' | 'start' | 'back';

export interface InputMapping {
  type: InputType;
  code: string; // key code, button index, or touch zone
  action: InputAction;
  modifiers?: string[]; // shift, ctrl, alt for keyboard
}

export interface InputProfile {
  id: string;
  name: string;
  gameId?: string;
  mappings: InputMapping[];
  createdAt: number;
  updatedAt: number;
}

export interface InputState {
  action: InputAction;
  pressed: boolean;
  timestamp: number;
  value?: number; // for analog inputs (0-1)
}

export interface GamepadState {
  connected: boolean;
  id: string;
  index: number;
  buttons: boolean[];
  axes: number[];
  timestamp: number;
}

type InputCallback = (state: InputState) => void;

// Default keyboard mappings (WASD + common keys)
const DEFAULT_KEYBOARD_MAPPINGS: InputMapping[] = [
  { type: 'keyboard', code: 'KeyW', action: 'up' },
  { type: 'keyboard', code: 'KeyA', action: 'left' },
  { type: 'keyboard', code: 'KeyS', action: 'down' },
  { type: 'keyboard', code: 'KeyD', action: 'right' },
  { type: 'keyboard', code: 'ArrowUp', action: 'up' },
  { type: 'keyboard', code: 'ArrowLeft', action: 'left' },
  { type: 'keyboard', code: 'ArrowDown', action: 'down' },
  { type: 'keyboard', code: 'ArrowRight', action: 'right' },
  { type: 'keyboard', code: 'Space', action: 'jump' },
  { type: 'keyboard', code: 'KeyJ', action: 'attack' },
  { type: 'keyboard', code: 'KeyK', action: 'defend' },
  { type: 'keyboard', code: 'KeyE', action: 'interact' },
  { type: 'keyboard', code: 'Escape', action: 'menu' },
  { type: 'keyboard', code: 'KeyP', action: 'pause' },
  { type: 'keyboard', code: 'Enter', action: 'select' },
  { type: 'keyboard', code: 'Backspace', action: 'cancel' },
  { type: 'keyboard', code: 'KeyQ', action: 'l1' },
  { type: 'keyboard', code: 'KeyR', action: 'r1' },
  { type: 'keyboard', code: 'Digit1', action: 'l2' },
  { type: 'keyboard', code: 'Digit2', action: 'r2' },
];

// Default gamepad mappings (Xbox/PlayStation style)
const DEFAULT_GAMEPAD_MAPPINGS: InputMapping[] = [
  { type: 'gamepad', code: 'button_0', action: 'jump' },      // A/Cross
  { type: 'gamepad', code: 'button_1', action: 'cancel' },    // B/Circle
  { type: 'gamepad', code: 'button_2', action: 'menu' },      // X/Square
  { type: 'gamepad', code: 'button_3', action: 'interact' },  // Y/Triangle
  { type: 'gamepad', code: 'button_4', action: 'l1' },        // LB/L1
  { type: 'gamepad', code: 'button_5', action: 'r1' },        // RB/R1
  { type: 'gamepad', code: 'button_6', action: 'back' },      // Back/Select
  { type: 'gamepad', code: 'button_7', action: 'start' },     // Start
  { type: 'gamepad', code: 'button_8', action: 'l3' },        // Left stick click
  { type: 'gamepad', code: 'button_9', action: 'r3' },        // Right stick click
  { type: 'gamepad', code: 'button_10', action: 'menu' },     // Xbox/PS button
  { type: 'gamepad', code: 'button_11', action: 'up' },       // D-pad up
  { type: 'gamepad', code: 'button_12', action: 'down' },     // D-pad down
  { type: 'gamepad', code: 'button_13', action: 'left' },     // D-pad left
  { type: 'gamepad', code: 'button_14', action: 'right' },    // D-pad right
  { type: 'gamepad', code: 'axis_0_neg', action: 'left' },    // Left stick left
  { type: 'gamepad', code: 'axis_0_pos', action: 'right' },   // Left stick right
  { type: 'gamepad', code: 'axis_1_neg', action: 'up' },      // Left stick up
  { type: 'gamepad', code: 'axis_1_pos', action: 'down' },    // Left stick down
  { type: 'gamepad', code: 'button_6', action: 'l2' },        // LT/L2
  { type: 'gamepad', code: 'button_7', action: 'r2' },        // RT/R2
];

// Default touch mappings (mobile zones)
const DEFAULT_TOUCH_MAPPINGS: InputMapping[] = [
  { type: 'touch', code: 'zone_left', action: 'left' },
  { type: 'touch', code: 'zone_right', action: 'right' },
  { type: 'touch', code: 'zone_up', action: 'up' },
  { type: 'touch', code: 'zone_down', action: 'down' },
  { type: 'touch', code: 'zone_a', action: 'jump' },
  { type: 'touch', code: 'zone_b', action: 'attack' },
  { type: 'touch', code: 'zone_x', action: 'defend' },
  { type: 'touch', code: 'zone_y', action: 'interact' },
];

// Preset profiles for popular games
const PRESET_PROFILES: Record<string, Partial<InputMapping>[]> = {
  'fps': [
    { type: 'keyboard', code: 'KeyW', action: 'up' },
    { type: 'keyboard', code: 'Mouse0', action: 'attack' },
    { type: 'keyboard', code: 'Mouse2', action: 'defend' },
    { type: 'keyboard', code: 'KeyR', action: 'interact' },
  ],
  'platformer': [
    { type: 'keyboard', code: 'Space', action: 'jump' },
    { type: 'keyboard', code: 'KeyZ', action: 'attack' },
    { type: 'keyboard', code: 'KeyX', action: 'defend' },
  ],
  'racing': [
    { type: 'keyboard', code: 'ArrowUp', action: 'up' },
    { type: 'keyboard', code: 'ArrowDown', action: 'down' },
    { type: 'keyboard', code: 'ArrowLeft', action: 'left' },
    { type: 'keyboard', code: 'ArrowRight', action: 'right' },
    { type: 'keyboard', code: 'Space', action: 'defend' }, // brake
  ],
};

class InputManager {
  private profiles: Map<string, InputProfile> = new Map();
  private activeProfile: InputProfile | null = null;
  private callbacks: Map<InputAction, Set<InputCallback>> = new Map();
  private gamepads: Map<number, GamepadState> = new Map();
  private keyStates: Map<string, boolean> = new Map();
  private touchStates: Map<string, boolean> = new Map();
  private animationFrame: number | null = null;
  private hapticEnabled: boolean = true;
  private deadzone: number = 0.15;

  constructor() {
    this.createDefaultProfile();
    this.setupEventListeners();
  }

  /**
   * Create the default input profile
   */
  private createDefaultProfile(): void {
    const profile: InputProfile = {
      id: 'default',
      name: 'Default',
      mappings: [
        ...DEFAULT_KEYBOARD_MAPPINGS,
        ...DEFAULT_GAMEPAD_MAPPINGS,
        ...DEFAULT_TOUCH_MAPPINGS,
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.profiles.set(profile.id, profile);
    this.activeProfile = profile;
  }

  /**
   * Set up event listeners for all input types
   */
  private setupEventListeners(): void {
    // Keyboard events
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));

    // Gamepad events
    window.addEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));

    // Start gamepad polling
    this.startGamepadPolling();
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    
    const code = event.code;
    this.keyStates.set(code, true);
    
    const mapping = this.findMapping('keyboard', code);
    if (mapping) {
      this.emitInput({
        action: mapping.action,
        pressed: true,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle keyup events
   */
  private handleKeyUp(event: KeyboardEvent): void {
    const code = event.code;
    this.keyStates.set(code, false);
    
    const mapping = this.findMapping('keyboard', code);
    if (mapping) {
      this.emitInput({
        action: mapping.action,
        pressed: false,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle gamepad connected
   */
  private handleGamepadConnected(event: GamepadEvent): void {
    console.log('[InputManager] Gamepad connected:', event.gamepad.id);
    this.gamepads.set(event.gamepad.index, {
      connected: true,
      id: event.gamepad.id,
      index: event.gamepad.index,
      buttons: [],
      axes: [],
      timestamp: Date.now(),
    });
  }

  /**
   * Handle gamepad disconnected
   */
  private handleGamepadDisconnected(event: GamepadEvent): void {
    console.log('[InputManager] Gamepad disconnected:', event.gamepad.id);
    this.gamepads.delete(event.gamepad.index);
  }

  /**
   * Start polling gamepad state
   */
  private startGamepadPolling(): void {
    const poll = () => {
      const gamepads = navigator.getGamepads();
      
      for (const gamepad of gamepads) {
        if (!gamepad) continue;
        
        const prevState = this.gamepads.get(gamepad.index);
        if (!prevState) continue;

        // Check button changes
        for (let i = 0; i < gamepad.buttons.length; i++) {
          const pressed = gamepad.buttons[i].pressed;
          const wasPressed = prevState.buttons[i] || false;
          
          if (pressed !== wasPressed) {
            const mapping = this.findMapping('gamepad', `button_${i}`);
            if (mapping) {
              this.emitInput({
                action: mapping.action,
                pressed,
                timestamp: Date.now(),
                value: gamepad.buttons[i].value,
              });
              
              // Haptic feedback
              if (pressed && this.hapticEnabled) {
                this.triggerHaptic(gamepad.index, 'light');
              }
            }
          }
          
          prevState.buttons[i] = pressed;
        }

        // Check axis changes
        for (let i = 0; i < gamepad.axes.length; i++) {
          const value = gamepad.axes[i];
          const prevValue = prevState.axes[i] || 0;
          
          // Apply deadzone
          const adjustedValue = Math.abs(value) > this.deadzone ? value : 0;
          
          // Check for significant change
          if (Math.abs(adjustedValue - prevValue) > 0.1) {
            const negMapping = this.findMapping('gamepad', `axis_${i}_neg`);
            const posMapping = this.findMapping('gamepad', `axis_${i}_pos`);
            
            if (adjustedValue < -this.deadzone && negMapping) {
              this.emitInput({
                action: negMapping.action,
                pressed: true,
                timestamp: Date.now(),
                value: Math.abs(adjustedValue),
              });
            } else if (adjustedValue > this.deadzone && posMapping) {
              this.emitInput({
                action: posMapping.action,
                pressed: true,
                timestamp: Date.now(),
                value: adjustedValue,
              });
            } else {
              // Released
              if (negMapping) {
                this.emitInput({
                  action: negMapping.action,
                  pressed: false,
                  timestamp: Date.now(),
                  value: 0,
                });
              }
              if (posMapping) {
                this.emitInput({
                  action: posMapping.action,
                  pressed: false,
                  timestamp: Date.now(),
                  value: 0,
                });
              }
            }
          }
          
          prevState.axes[i] = adjustedValue;
        }
        
        prevState.timestamp = Date.now();
      }
      
      this.animationFrame = requestAnimationFrame(poll);
    };
    
    this.animationFrame = requestAnimationFrame(poll);
  }

  /**
   * Find a mapping for the given input
   */
  private findMapping(type: InputType, code: string): InputMapping | undefined {
    if (!this.activeProfile) return undefined;
    
    return this.activeProfile.mappings.find(
      m => m.type === type && m.code === code
    );
  }

  /**
   * Emit input to subscribers
   */
  private emitInput(state: InputState): void {
    const callbacks = this.callbacks.get(state.action);
    if (callbacks) {
      callbacks.forEach(cb => cb(state));
    }
  }

  /**
   * Trigger haptic feedback
   */
  private async triggerHaptic(gamepadIndex: number, intensity: 'light' | 'medium' | 'heavy'): Promise<void> {
    try {
      const gamepad = navigator.getGamepads()[gamepadIndex];
      if (!gamepad || !('vibrationActuator' in gamepad)) return;
      
      const actuator = (gamepad as any).vibrationActuator;
      if (!actuator) return;
      
      const durations = {
        light: { duration: 50, strongMagnitude: 0.1, weakMagnitude: 0.3 },
        medium: { duration: 100, strongMagnitude: 0.3, weakMagnitude: 0.5 },
        heavy: { duration: 150, strongMagnitude: 0.5, weakMagnitude: 0.8 },
      };
      
      const config = durations[intensity];
      await actuator.playEffect('dual-rumble', {
        duration: config.duration,
        strongMagnitude: config.strongMagnitude,
        weakMagnitude: config.weakMagnitude,
      });
    } catch (error) {
      // Haptic not supported or failed
    }
  }

  // Public API

  /**
   * Subscribe to an input action
   */
  on(action: InputAction, callback: InputCallback): () => void {
    if (!this.callbacks.has(action)) {
      this.callbacks.set(action, new Set());
    }
    this.callbacks.get(action)!.add(callback);
    
    return () => {
      this.callbacks.get(action)?.delete(callback);
    };
  }

  /**
   * Check if an action is currently pressed
   */
  isPressed(action: InputAction): boolean {
    if (!this.activeProfile) return false;
    
    for (const mapping of this.activeProfile.mappings) {
      if (mapping.action !== action) continue;
      
      if (mapping.type === 'keyboard') {
        if (this.keyStates.get(mapping.code)) return true;
      }
      
      if (mapping.type === 'touch') {
        if (this.touchStates.get(mapping.code)) return true;
      }
    }
    
    return false;
  }

  /**
   * Get all connected gamepads
   */
  getConnectedGamepads(): GamepadState[] {
    return Array.from(this.gamepads.values());
  }

  /**
   * Set the active input profile
   */
  setActiveProfile(profileId: string): void {
    const profile = this.profiles.get(profileId);
    if (profile) {
      this.activeProfile = profile;
    }
  }

  /**
   * Get the active input profile
   */
  getActiveProfile(): InputProfile | null {
    return this.activeProfile;
  }

  /**
   * Create a new input profile
   */
  createProfile(name: string, gameId?: string): InputProfile {
    const profile: InputProfile = {
      id: `profile_${Date.now()}`,
      name,
      gameId,
      mappings: [...DEFAULT_KEYBOARD_MAPPINGS, ...DEFAULT_GAMEPAD_MAPPINGS],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    this.profiles.set(profile.id, profile);
    return profile;
  }

  /**
   * Update a mapping in the active profile
   */
  updateMapping(mapping: InputMapping): void {
    if (!this.activeProfile) return;
    
    const index = this.activeProfile.mappings.findIndex(
      m => m.type === mapping.type && m.action === mapping.action
    );
    
    if (index >= 0) {
      this.activeProfile.mappings[index] = mapping;
    } else {
      this.activeProfile.mappings.push(mapping);
    }
    
    this.activeProfile.updatedAt = Date.now();
  }

  /**
   * Load a preset profile
   */
  loadPreset(presetName: keyof typeof PRESET_PROFILES): void {
    const preset = PRESET_PROFILES[presetName];
    if (!preset || !this.activeProfile) return;
    
    // Merge preset with default mappings
    for (const mapping of preset) {
      if (mapping.type && mapping.code && mapping.action) {
        this.updateMapping(mapping as InputMapping);
      }
    }
  }

  /**
   * Enable/disable haptic feedback
   */
  setHapticEnabled(enabled: boolean): void {
    this.hapticEnabled = enabled;
  }

  /**
   * Set gamepad deadzone
   */
  setDeadzone(value: number): void {
    this.deadzone = Math.max(0, Math.min(0.5, value));
  }

  /**
   * Export profile to JSON
   */
  exportProfile(profileId: string): string | null {
    const profile = this.profiles.get(profileId);
    if (!profile) return null;
    
    return JSON.stringify(profile, null, 2);
  }

  /**
   * Import profile from JSON
   */
  importProfile(json: string): InputProfile | null {
    try {
      const profile = JSON.parse(json) as InputProfile;
      profile.id = `imported_${Date.now()}`;
      profile.updatedAt = Date.now();
      this.profiles.set(profile.id, profile);
      return profile;
    } catch {
      return null;
    }
  }

  /**
   * Handle touch input (called from UI)
   */
  handleTouch(zone: string, pressed: boolean): void {
    this.touchStates.set(zone, pressed);
    
    const mapping = this.findMapping('touch', zone);
    if (mapping) {
      this.emitInput({
        action: mapping.action,
        pressed,
        timestamp: Date.now(),
      });
      
      // Haptic feedback for touch
      if (pressed && this.hapticEnabled && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown.bind(this));
    window.removeEventListener('keyup', this.handleKeyUp.bind(this));
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected.bind(this));
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected.bind(this));
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }
}

// Singleton instance
export const inputManager = new InputManager();

// Hook for React components
export function useInput() {
  return inputManager;
}