/**
 * Prediction Engine
 * 
 * Predicts future states to enable zero-latency rendering.
 * Runs ahead of authoritative time to render optimistically.
 * 
 * Prediction Methods:
 * - Input prediction: Extrapolate input based on history
 * - Motion prediction: Extrapolate object motion
 * - Camera prediction: Predict camera movement  
 * - Physics prediction: Predict physics state
 * 
 * Confidence scoring ensures high-quality predictions are used for rendering,
 * while low-confidence predictions are corrected asynchronously.
 */

import type { Transform, Camera } from './motion-vectors';

export interface InputState {
  keyboard: Map<string, boolean>;
  mouse: { x: number; y: number; buttons: number };
  gamepad: { axes: number[]; buttons: boolean[] } | null;
  touch: { x: number; y: number; pressure: number }[];
  timestamp: number;
}

export interface PredictionResult<T> {
  value: T;
  confidence: number; // [0, 1]
  method: 'linear' | 'quadratic' | 'kalman' | 'ml';
}

export interface PhysicsState {
  position: Float32Array;
  velocity: Float32Array;
  acceleration: Float32Array;
  rotation: Float32Array;
  angularVelocity: Float32Array;
}

/**
 * Input History Tracker
 */
class InputHistory {
  private history: InputState[] = [];
  private maxHistory: number = 16;

  record(state: InputState): void {
    this.history.push(this.cloneInputState(state));
    
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
  }

  getRecent(count: number): InputState[] {
    return this.history.slice(-count);
  }

  getLatest(): InputState | null {
    return this.history[this.history.length - 1] || null;
  }

  private cloneInputState(state: InputState): InputState {
    return {
      keyboard: new Map(state.keyboard),
      mouse: { ...state.mouse },
      gamepad: state.gamepad ? {
        axes: [...state.gamepad.axes],
        buttons: [...state.gamepad.buttons]
      } : null,
      touch: state.touch.map(t => ({ ...t })),
      timestamp: state.timestamp
    };
  }

  clear(): void {
    this.history = [];
  }
}

/**
 * Motion History for Objects
 */
class MotionHistory {
  private history: Map<string, Transform[]> = new Map();
  private maxHistory: number = 8;

  record(objectId: string, transform: Transform): void {
    if (!this.history.has(objectId)) {
      this.history.set(objectId, []);
    }
    
    const objHistory = this.history.get(objectId)!;
    objHistory.push(this.cloneTransform(transform));
    
    if (objHistory.length > this.maxHistory) {
      objHistory.shift();
    }
  }

  getHistory(objectId: string, count: number): Transform[] {
    const objHistory = this.history.get(objectId);
    if (!objHistory) return [];
    return objHistory.slice(-count);
  }

  private cloneTransform(t: Transform): Transform {
    return {
      position: new Float32Array(t.position),
      rotation: new Float32Array(t.rotation),
      scale: new Float32Array(t.scale)
    };
  }

  clear(): void {
    this.history.clear();
  }
}

/**
 * Kalman Filter for Smooth Predictions
 */
class KalmanFilter {
  private x: number; // State estimate
  private p: number; // Estimate covariance
  private q: number; // Process noise
  private r: number; // Measurement noise

  constructor(initialValue: number, processNoise: number = 0.1, measurementNoise: number = 0.5) {
    this.x = initialValue;
    this.p = 1.0;
    this.q = processNoise;
    this.r = measurementNoise;
  }

  update(measurement: number): number {
    // Prediction
    this.p = this.p + this.q;
    
    // Update
    const k = this.p / (this.p + this.r); // Kalman gain
    this.x = this.x + k * (measurement - this.x);
    this.p = (1 - k) * this.p;
    
    return this.x;
  }

  predict(steps: number): number {
    // Simple constant velocity assumption
    return this.x;
  }
}

/**
 * Prediction Engine
 */
export class PredictionEngine {
  private inputHistory: InputHistory;
  private motionHistory: MotionHistory;
  private cameraHistory: Camera[] = [];
  private physicsStates: Map<string, PhysicsState[]> = new Map();
  
  // Kalman filters for smooth predictions
  private kalmanFilters: Map<string, KalmanFilter[]> = new Map();
  
  // Prediction accuracy tracking
  private predictionAccuracy: Map<string, number[]> = new Map();

  constructor() {
    this.inputHistory = new InputHistory();
    this.motionHistory = new MotionHistory();
    
    console.log('[PredictionEngine] Initialized');
  }

  /**
   * Record input state
   */
  recordInput(state: InputState): void {
    this.inputHistory.record(state);
  }

  /**
   * Record object transform
   */
  recordTransform(objectId: string, transform: Transform): void {
    this.motionHistory.record(objectId, transform);
  }

  /**
   * Record camera state
   */
  recordCamera(camera: Camera): void {
    this.cameraHistory.push(this.cloneCamera(camera));
    
    if (this.cameraHistory.length > 16) {
      this.cameraHistory.shift();
    }
  }

  /**
   * Record physics state
   */
  recordPhysics(objectId: string, state: PhysicsState): void {
    if (!this.physicsStates.has(objectId)) {
      this.physicsStates.set(objectId, []);
    }
    
    const history = this.physicsStates.get(objectId)!;
    history.push(this.clonePhysicsState(state));
    
    if (history.length > 8) {
      history.shift();
    }
  }

  /**
   * Predict input state N frames ahead
   */
  predictInput(framesAhead: number): PredictionResult<InputState> {
    const recent = this.inputHistory.getRecent(4);
    
    if (recent.length < 2) {
      // Not enough history, return latest or default
      const latest = this.inputHistory.getLatest();
      return {
        value: latest || this.getDefaultInputState(),
        confidence: latest ? 0.3 : 0.0,
        method: 'linear'
      };
    }

    // Analyze input patterns
    const latest = recent[recent.length - 1];
    const predicted: InputState = {
      keyboard: new Map(latest.keyboard),
      mouse: { ...latest.mouse },
      gamepad: latest.gamepad ? {
        axes: [...latest.gamepad.axes],
        buttons: [...latest.gamepad.buttons]
      } : null,
      touch: latest.touch.map(t => ({ ...t })),
      timestamp: latest.timestamp + framesAhead * 16 // Assume 60fps
    };

    // Mouse motion prediction (linear extrapolation)
    if (recent.length >= 2) {
      const prev = recent[recent.length - 2];
      const dx = latest.mouse.x - prev.mouse.x;
      const dy = latest.mouse.y - prev.mouse.y;
      
      predicted.mouse.x += dx * framesAhead;
      predicted.mouse.y += dy * framesAhead;
    }

    // Calculate confidence based on input stability
    const confidence = this.calculateInputConfidence(recent);

    return {
      value: predicted,
      confidence,
      method: 'linear'
    };
  }

  /**
   * Predict object motion N frames ahead
   */
  predictMotion(objectId: string, framesAhead: number): PredictionResult<Transform> {
    const history = this.motionHistory.getHistory(objectId, 4);
    
    if (history.length < 2) {
      const latest = history[history.length - 1];
      return {
        value: latest || this.getDefaultTransform(),
        confidence: latest ? 0.3 : 0.0,
        method: 'linear'
      };
    }

    // Linear extrapolation
    const latest = history[history.length - 1];
    const prev = history[history.length - 2];
    
    const positionDelta = new Float32Array([
      latest.position[0] - prev.position[0],
      latest.position[1] - prev.position[1],
      latest.position[2] - prev.position[2]
    ]);
    
    const predicted: Transform = {
      position: new Float32Array([
        latest.position[0] + positionDelta[0] * framesAhead,
        latest.position[1] + positionDelta[1] * framesAhead,
        latest.position[2] + positionDelta[2] * framesAhead
      ]),
      rotation: new Float32Array(latest.rotation), // Simplified: no rotation prediction
      scale: new Float32Array(latest.scale)
    };

    // Confidence based on motion consistency
    const confidence = this.calculateMotionConfidence(history);

    return {
      value: predicted,
      confidence,
      method: 'linear'
    };
  }

  /**
   * Predict camera state N frames ahead
   */
  predictCamera(framesAhead: number): PredictionResult<Camera> {
    if (this.cameraHistory.length < 2) {
      const latest = this.cameraHistory[this.cameraHistory.length - 1];
      return {
        value: latest || this.getDefaultCamera(),
        confidence: latest ? 0.3 : 0.0,
        method: 'linear'
      };
    }

    const latest = this.cameraHistory[this.cameraHistory.length - 1];
    const prev = this.cameraHistory[this.cameraHistory.length - 2];
    
    // Linear extrapolation for camera position
    const positionDelta = new Float32Array([
      latest.position[0] - prev.position[0],
      latest.position[1] - prev.position[1],
      latest.position[2] - prev.position[2]
    ]);
    
    const predicted: Camera = {
      position: new Float32Array([
        latest.position[0] + positionDelta[0] * framesAhead,
        latest.position[1] + positionDelta[1] * framesAhead,
        latest.position[2] + positionDelta[2] * framesAhead
      ]),
      rotation: new Float32Array(latest.rotation), // Simplified
      fov: latest.fov,
      near: latest.near,
      far: latest.far,
      viewMatrix: new Float32Array(latest.viewMatrix),
      projectionMatrix: new Float32Array(latest.projectionMatrix)
    };

    const confidence = this.calculateCameraConfidence(this.cameraHistory.slice(-4));

    return {
      value: predicted,
      confidence,
      method: 'linear'
    };
  }

  /**
   * Predict physics state N frames ahead
   */
  predictPhysics(objectId: string, framesAhead: number, deltaTime: number): PredictionResult<PhysicsState> {
    const history = this.physicsStates.get(objectId);
    
    if (!history || history.length < 1) {
      return {
        value: this.getDefaultPhysicsState(),
        confidence: 0.0,
        method: 'linear'
      };
    }

    const latest = history[history.length - 1];
    
    // Physics integration (simplified Euler)
    const predicted: PhysicsState = {
      position: new Float32Array([
        latest.position[0] + latest.velocity[0] * deltaTime * framesAhead,
        latest.position[1] + latest.velocity[1] * deltaTime * framesAhead,
        latest.position[2] + latest.velocity[2] * deltaTime * framesAhead
      ]),
      velocity: new Float32Array([
        latest.velocity[0] + latest.acceleration[0] * deltaTime * framesAhead,
        latest.velocity[1] + latest.acceleration[1] * deltaTime * framesAhead,
        latest.velocity[2] + latest.acceleration[2] * deltaTime * framesAhead
      ]),
      acceleration: new Float32Array(latest.acceleration),
      rotation: new Float32Array(latest.rotation),
      angularVelocity: new Float32Array(latest.angularVelocity)
    };

    const confidence = history.length >= 2 ? 0.8 : 0.5;

    return {
      value: predicted,
      confidence,
      method: 'linear'
    };
  }

  /**
   * Calculate input confidence based on stability
   */
  private calculateInputConfidence(history: InputState[]): number {
    if (history.length < 2) return 0.3;
    
    // Check mouse movement consistency
    const recent = history.slice(-3);
    const velocities: number[] = [];
    
    for (let i = 1; i < recent.length; i++) {
      const dx = recent[i].mouse.x - recent[i - 1].mouse.x;
      const dy = recent[i].mouse.y - recent[i - 1].mouse.y;
      velocities.push(Math.sqrt(dx * dx + dy * dy));
    }
    
    // Low variance = high confidence
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    
    return Math.max(0.3, 1.0 / (1.0 + variance * 0.01));
  }

  /**
   * Calculate motion confidence based on consistency
   */
  private calculateMotionConfidence(history: Transform[]): number {
    if (history.length < 3) return 0.5;
    
    // Calculate velocity variance
    const velocities: number[] = [];
    
    for (let i = 1; i < history.length; i++) {
      const dx = history[i].position[0] - history[i - 1].position[0];
      const dy = history[i].position[1] - history[i - 1].position[1];
      const dz = history[i].position[2] - history[i - 1].position[2];
      velocities.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    
    return Math.max(0.3, 1.0 / (1.0 + variance * 10.0));
  }

  /**
   * Calculate camera confidence
   */
  private calculateCameraConfidence(history: Camera[]): number {
    if (history.length < 2) return 0.5;
    
    // Similar to motion confidence
    const velocities: number[] = [];
    
    for (let i = 1; i < history.length; i++) {
      const dx = history[i].position[0] - history[i - 1].position[0];
      const dy = history[i].position[1] - history[i - 1].position[1];
      const dz = history[i].position[2] - history[i - 1].position[2];
      velocities.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
    }
    
    const avgVelocity = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    const variance = velocities.reduce((sum, v) => sum + Math.pow(v - avgVelocity, 2), 0) / velocities.length;
    
    return Math.max(0.5, 1.0 / (1.0 + variance * 5.0));
  }

  /**
   * Record prediction accuracy for learning
   */
  recordAccuracy(predictionId: string, accuracy: number): void {
    if (!this.predictionAccuracy.has(predictionId)) {
      this.predictionAccuracy.set(predictionId, []);
    }
    
    const history = this.predictionAccuracy.get(predictionId)!;
    history.push(accuracy);
    
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get average prediction accuracy
   */
  getAverageAccuracy(predictionId: string): number {
    const history = this.predictionAccuracy.get(predictionId);
    if (!history || history.length === 0) return 0.5;
    
    return history.reduce((a, b) => a + b, 0) / history.length;
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.inputHistory.clear();
    this.motionHistory.clear();
    this.cameraHistory = [];
    this.physicsStates.clear();
    this.kalmanFilters.clear();
  }

  // Helper methods for defaults
  
  private getDefaultInputState(): InputState {
    return {
      keyboard: new Map(),
      mouse: { x: 0, y: 0, buttons: 0 },
      gamepad: null,
      touch: [],
      timestamp: Date.now()
    };
  }

  private getDefaultTransform(): Transform {
    return {
      position: new Float32Array([0, 0, 0]),
      rotation: new Float32Array([0, 0, 0, 1]),
      scale: new Float32Array([1, 1, 1])
    };
  }

  private getDefaultCamera(): Camera {
    return {
      position: new Float32Array([0, 0, 0]),
      rotation: new Float32Array([0, 0, 0, 1]),
      fov: 60,
      near: 0.1,
      far: 1000,
      viewMatrix: new Float32Array(16).fill(0),
      projectionMatrix: new Float32Array(16).fill(0)
    };
  }

  private getDefaultPhysicsState(): PhysicsState {
    return {
      position: new Float32Array([0, 0, 0]),
      velocity: new Float32Array([0, 0, 0]),
      acceleration: new Float32Array([0, 0, 0]),
      rotation: new Float32Array([0, 0, 0, 1]),
      angularVelocity: new Float32Array([0, 0, 0])
    };
  }

  private cloneCamera(c: Camera): Camera {
    return {
      position: new Float32Array(c.position),
      rotation: new Float32Array(c.rotation),
      fov: c.fov,
      near: c.near,
      far: c.far,
      viewMatrix: new Float32Array(c.viewMatrix),
      projectionMatrix: new Float32Array(c.projectionMatrix)
    };
  }

  private clonePhysicsState(s: PhysicsState): PhysicsState {
    return {
      position: new Float32Array(s.position),
      velocity: new Float32Array(s.velocity),
      acceleration: new Float32Array(s.acceleration),
      rotation: new Float32Array(s.rotation),
      angularVelocity: new Float32Array(s.angularVelocity)
    };
  }
}

console.log('[PredictionEngine] Module loaded');
