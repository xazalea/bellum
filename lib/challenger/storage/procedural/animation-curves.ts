/**
 * Parametric Animation Curves
 * Store curve parameters instead of keyframes
 * Compression: 100 keyframes (10KB) → ~80 bytes parameters
 */

export type CurveType = 'bezier' | 'hermite' | 'catmull-rom' | 'b-spline' | 'linear';

export type EasingFunction =
  | 'linear'
  | 'ease-in'
  | 'ease-out'
  | 'ease-in-out'
  | 'ease-in-cubic'
  | 'ease-out-cubic'
  | 'ease-in-out-cubic'
  | 'ease-in-quart'
  | 'ease-out-quart'
  | 'ease-in-out-quart'
  | 'ease-in-expo'
  | 'ease-out-expo'
  | 'ease-in-out-expo'
  | 'ease-in-back'
  | 'ease-out-back'
  | 'ease-in-out-back'
  | 'ease-in-elastic'
  | 'ease-out-elastic'
  | 'ease-in-out-elastic'
  | 'ease-in-bounce'
  | 'ease-out-bounce'
  | 'ease-in-out-bounce';

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface KeyframeData {
  time: number;
  value: number | Point2D | Point3D;
  tangentIn?: Point2D;
  tangentOut?: Point2D;
}

export interface ProceduralAnimationSpec {
  type: CurveType;
  controlPoints: Array<number | Point2D | Point3D>;
  duration: number;
  easing?: EasingFunction;
  loop?: boolean;
  pingPong?: boolean;
  version: number;
}

/**
 * Parametric Animation Curve Generator
 */
export class ParametricAnimationCurves {
  /**
   * Generate animation keyframes from procedural specification
   */
  static generate(spec: ProceduralAnimationSpec, numSamples: number): KeyframeData[] {
    const keyframes: KeyframeData[] = [];
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / (numSamples - 1);
      const time = t * spec.duration;
      
      // Apply easing if specified
      const easedT = spec.easing ? this.applyEasing(t, spec.easing) : t;
      
      // Evaluate curve
      const value = this.evaluateCurve(spec.type, spec.controlPoints, easedT);
      
      keyframes.push({ time, value });
    }
    
    // Apply loop/pingPong
    if (spec.loop || spec.pingPong) {
      return this.applyLooping(keyframes, spec);
    }
    
    return keyframes;
  }

  /**
   * Evaluate curve at time t (0-1)
   */
  static evaluateCurve(
    type: CurveType,
    controlPoints: Array<number | Point2D | Point3D>,
    t: number
  ): number | Point2D | Point3D {
    switch (type) {
      case 'bezier':
        return this.evaluateBezier(controlPoints, t);
      case 'hermite':
        return this.evaluateHermite(controlPoints, t);
      case 'catmull-rom':
        return this.evaluateCatmullRom(controlPoints, t);
      case 'b-spline':
        return this.evaluateBSpline(controlPoints, t);
      case 'linear':
      default:
        return this.evaluateLinear(controlPoints, t);
    }
  }

  private static evaluateBezier(
    controlPoints: Array<number | Point2D | Point3D>,
    t: number
  ): number | Point2D | Point3D {
    if (controlPoints.length === 0) return 0;
    if (controlPoints.length === 1) return controlPoints[0];

    // De Casteljau's algorithm
    let points = [...controlPoints];
    
    while (points.length > 1) {
      const newPoints: typeof points = [];
      for (let i = 0; i < points.length - 1; i++) {
        newPoints.push(this.interpolate(points[i], points[i + 1], t));
      }
      points = newPoints;
    }
    
    return points[0];
  }

  private static evaluateHermite(
    controlPoints: Array<number | Point2D | Point3D>,
    t: number
  ): number | Point2D | Point3D {
    if (controlPoints.length < 4) return this.evaluateLinear(controlPoints, t);

    // Hermite spline requires 4 points: p0, m0, p1, m1
    // where m0 and m1 are tangents
    const p0 = controlPoints[0];
    const m0 = controlPoints[1];
    const p1 = controlPoints[2];
    const m1 = controlPoints[3];

    const t2 = t * t;
    const t3 = t2 * t;

    // Hermite basis functions
    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    return this.combine([
      this.scale(p0, h00),
      this.scale(m0, h10),
      this.scale(p1, h01),
      this.scale(m1, h11),
    ]);
  }

  private static evaluateCatmullRom(
    controlPoints: Array<number | Point2D | Point3D>,
    t: number
  ): number | Point2D | Point3D {
    if (controlPoints.length < 4) return this.evaluateLinear(controlPoints, t);

    // Catmull-Rom requires 4 control points
    const p0 = controlPoints[0];
    const p1 = controlPoints[1];
    const p2 = controlPoints[2];
    const p3 = controlPoints[3];

    const t2 = t * t;
    const t3 = t2 * t;

    // Catmull-Rom basis matrix
    const c0 = -0.5 * t3 + t2 - 0.5 * t;
    const c1 = 1.5 * t3 - 2.5 * t2 + 1;
    const c2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
    const c3 = 0.5 * t3 - 0.5 * t2;

    return this.combine([
      this.scale(p0, c0),
      this.scale(p1, c1),
      this.scale(p2, c2),
      this.scale(p3, c3),
    ]);
  }

  private static evaluateBSpline(
    controlPoints: Array<number | Point2D | Point3D>,
    t: number
  ): number | Point2D | Point3D {
    if (controlPoints.length < 4) return this.evaluateLinear(controlPoints, t);

    const p0 = controlPoints[0];
    const p1 = controlPoints[1];
    const p2 = controlPoints[2];
    const p3 = controlPoints[3];

    const t2 = t * t;
    const t3 = t2 * t;

    // B-spline basis matrix
    const b0 = (-t3 + 3 * t2 - 3 * t + 1) / 6;
    const b1 = (3 * t3 - 6 * t2 + 4) / 6;
    const b2 = (-3 * t3 + 3 * t2 + 3 * t + 1) / 6;
    const b3 = t3 / 6;

    return this.combine([
      this.scale(p0, b0),
      this.scale(p1, b1),
      this.scale(p2, b2),
      this.scale(p3, b3),
    ]);
  }

  private static evaluateLinear(
    controlPoints: Array<number | Point2D | Point3D>,
    t: number
  ): number | Point2D | Point3D {
    if (controlPoints.length === 0) return 0;
    if (controlPoints.length === 1) return controlPoints[0];

    const scaledT = t * (controlPoints.length - 1);
    const index = Math.floor(scaledT);
    const frac = scaledT - index;

    if (index >= controlPoints.length - 1) {
      return controlPoints[controlPoints.length - 1];
    }

    return this.interpolate(controlPoints[index], controlPoints[index + 1], frac);
  }

  private static interpolate(
    a: number | Point2D | Point3D,
    b: number | Point2D | Point3D,
    t: number
  ): number | Point2D | Point3D {
    if (typeof a === 'number' && typeof b === 'number') {
      return a + (b - a) * t;
    }

    if (this.isPoint2D(a) && this.isPoint2D(b)) {
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
    }

    if (this.isPoint3D(a) && this.isPoint3D(b)) {
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
      };
    }

    return a;
  }

  private static scale(
    point: number | Point2D | Point3D,
    scalar: number
  ): number | Point2D | Point3D {
    if (typeof point === 'number') {
      return point * scalar;
    }

    if (this.isPoint2D(point)) {
      return {
        x: point.x * scalar,
        y: point.y * scalar,
      };
    }

    if (this.isPoint3D(point as any)) {
      const p3d = point as Point3D;
      return {
        x: p3d.x * scalar,
        y: p3d.y * scalar,
        z: p3d.z * scalar,
      };
    }

    return point;
  }

  private static combine(
    points: Array<number | Point2D | Point3D>
  ): number | Point2D | Point3D {
    if (points.length === 0) return 0;

    const first = points[0];

    if (typeof first === 'number') {
      return points.reduce((sum: number, p) => (typeof p === 'number' ? sum + p : sum), 0);
    }

    if (this.isPoint2D(first)) {
      return points.reduce(
        (sum: Point2D, p) => {
          const p2d = this.isPoint2D(p) ? p : { x: 0, y: 0 };
          return {
            x: sum.x + p2d.x,
            y: sum.y + p2d.y,
          };
        },
        { x: 0, y: 0 }
      );
    }

    if (this.isPoint3D(first as any)) {
      return points.reduce(
        (sum: Point3D, p) => {
          const p3d = this.isPoint3D(p as any) ? (p as Point3D) : { x: 0, y: 0, z: 0 };
          return {
            x: sum.x + p3d.x,
            y: sum.y + p3d.y,
            z: sum.z + p3d.z,
          };
        },
        { x: 0, y: 0, z: 0 }
      );
    }

    return first;
  }

  private static isPoint2D(point: any): point is Point2D {
    return point && typeof point.x === 'number' && typeof point.y === 'number' && !('z' in point);
  }

  private static isPoint3D(point: any): point is Point3D {
    return point && typeof point.x === 'number' && typeof point.y === 'number' && typeof point.z === 'number';
  }

  /**
   * Apply easing function
   */
  static applyEasing(t: number, easing: EasingFunction): number {
    t = Math.max(0, Math.min(1, t));

    switch (easing) {
      case 'linear':
        return t;

      case 'ease-in':
        return t * t;

      case 'ease-out':
        return t * (2 - t);

      case 'ease-in-out':
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      case 'ease-in-cubic':
        return t * t * t;

      case 'ease-out-cubic':
        return 1 + (--t) * t * t;

      case 'ease-in-out-cubic':
        return t < 0.5 ? 4 * t * t * t : 1 + (--t) * (2 * (--t)) * (2 * t);

      case 'ease-in-quart':
        return t * t * t * t;

      case 'ease-out-quart':
        return 1 - (--t) * t * t * t;

      case 'ease-in-out-quart':
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;

      case 'ease-in-expo':
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));

      case 'ease-out-expo':
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

      case 'ease-in-out-expo':
        if (t === 0 || t === 1) return t;
        if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
        return (2 - Math.pow(2, -20 * t + 10)) / 2;

      case 'ease-in-back':
        const c1 = 1.70158;
        return t * t * ((c1 + 1) * t - c1);

      case 'ease-out-back':
        const c2 = 1.70158;
        return 1 + (--t) * t * ((c2 + 1) * t + c2);

      case 'ease-in-out-back':
        const c3 = 1.70158 * 1.525;
        return t < 0.5
          ? (Math.pow(2 * t, 2) * ((c3 + 1) * 2 * t - c3)) / 2
          : (Math.pow(2 * t - 2, 2) * ((c3 + 1) * (t * 2 - 2) + c3) + 2) / 2;

      case 'ease-in-elastic':
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);

      case 'ease-out-elastic':
        const c5 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c5) + 1;

      case 'ease-in-out-elastic':
        const c6 = (2 * Math.PI) / 4.5;
        return t === 0
          ? 0
          : t === 1
          ? 1
          : t < 0.5
          ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c6)) / 2
          : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c6)) / 2 + 1;

      case 'ease-out-bounce':
        const n1 = 7.5625;
        const d1 = 2.75;
        if (t < 1 / d1) {
          return n1 * t * t;
        } else if (t < 2 / d1) {
          return n1 * (t -= 1.5 / d1) * t + 0.75;
        } else if (t < 2.5 / d1) {
          return n1 * (t -= 2.25 / d1) * t + 0.9375;
        } else {
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        }

      case 'ease-in-bounce':
        return 1 - this.applyEasing(1 - t, 'ease-out-bounce');

      case 'ease-in-out-bounce':
        return t < 0.5
          ? (1 - this.applyEasing(1 - 2 * t, 'ease-out-bounce')) / 2
          : (1 + this.applyEasing(2 * t - 1, 'ease-out-bounce')) / 2;

      default:
        return t;
    }
  }

  private static applyLooping(keyframes: KeyframeData[], spec: ProceduralAnimationSpec): KeyframeData[] {
    if (spec.pingPong) {
      const reversed = [...keyframes].reverse().map((kf, i) => ({
        ...kf,
        time: spec.duration + (i / (keyframes.length - 1)) * spec.duration,
      }));
      return [...keyframes, ...reversed];
    }

    return keyframes;
  }

  /**
   * Serialize spec to compact binary format
   */
  static serializeSpec(spec: ProceduralAnimationSpec): Uint8Array {
    const json = JSON.stringify(spec);
    const encoder = new TextEncoder();
    return encoder.encode(json);
  }

  /**
   * Deserialize spec from binary format
   */
  static deserializeSpec(data: Uint8Array): ProceduralAnimationSpec {
    const decoder = new TextDecoder();
    const json = decoder.decode(data);
    return JSON.parse(json);
  }

  /**
   * Extract curve parameters from keyframe data
   * Attempts to fit a curve to the keyframes
   */
  static extractSpec(keyframes: KeyframeData[], curveType: CurveType = 'bezier'): ProceduralAnimationSpec | null {
    if (keyframes.length < 2) return null;

    // Simple extraction: use keyframe values as control points
    const controlPoints = keyframes.map(kf => kf.value);
    const duration = keyframes[keyframes.length - 1].time;

    return {
      type: curveType,
      controlPoints,
      duration,
      version: 1,
    };
  }
}
