/**
 * Procedural Generation Tests
 */

import { describe, it, expect } from '@jest/globals';
import { ProceduralMeshGenerator } from '../procedural/mesh-generator';
import { ShaderMaterialGenerator } from '../procedural/shader-materials';
import { ParametricAudioSynthesizer } from '../procedural/audio-synthesis';
import { ParametricAnimationCurves } from '../procedural/animation-curves';

describe('Procedural Generation', () => {
  describe('Mesh Generator', () => {
    it('should generate a sphere with correct vertex count', () => {
      const spec = {
        type: 'sphere' as const,
        seed: 12345,
        params: { radius: 1, widthSegments: 8, heightSegments: 4 },
        version: 1,
      };
      
      const mesh = ProceduralMeshGenerator.generate(spec);
      
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.indices.length).toBeGreaterThan(0);
    });

    it('should generate deterministic meshes from same seed', () => {
      const spec = {
        type: 'noise_displaced_plane' as const,
        seed: 12345,
        params: { width: 10, height: 10, widthSegments: 10, heightSegments: 10, noiseScale: 0.5 },
        version: 1,
      };
      
      const mesh1 = ProceduralMeshGenerator.generate(spec);
      const mesh2 = ProceduralMeshGenerator.generate(spec);
      
      expect(mesh1.positions).toEqual(mesh2.positions);
    });

    it('should serialize and deserialize specs', () => {
      const spec = {
        type: 'cube' as const,
        seed: 12345,
        params: { width: 1, height: 1, depth: 1 },
        version: 1,
      };
      
      const serialized = ProceduralMeshGenerator.serializeSpec(spec);
      const deserialized = ProceduralMeshGenerator.deserializeSpec(serialized);
      
      expect(deserialized).toEqual(spec);
    });
  });

  describe('Shader Material Generator', () => {
    it('should generate textures with correct dimensions', () => {
      const spec = {
        shader: 'fbm_noise' as const,
        seed: 12345,
        params: { frequency: 2.0, octaves: 4 },
        width: 64,
        height: 64,
        version: 1,
      };
      
      const imageData = ShaderMaterialGenerator.generate(spec);
      
      expect(imageData.width).toBe(64);
      expect(imageData.height).toBe(64);
      expect(imageData.data.length).toBe(64 * 64 * 4);
    });

    it('should generate deterministic textures from same seed', () => {
      const spec = {
        shader: 'perlin_noise' as const,
        seed: 12345,
        params: { scale: 10.0 },
        width: 32,
        height: 32,
        version: 1,
      };
      
      const img1 = ShaderMaterialGenerator.generate(spec);
      const img2 = ShaderMaterialGenerator.generate(spec);
      
      expect(img1.data).toEqual(img2.data);
    });
  });

  describe('Audio Synthesizer', () => {
    it('should generate audio with correct duration', async () => {
      const synthesizer = new ParametricAudioSynthesizer();
      
      const spec = {
        oscillator: 'sine' as const,
        envelope: { attack: 0.1, decay: 0.2, sustain: 0.7, release: 0.5 },
        sampleRate: 44100,
        duration: 1.0,
        seed: 12345,
        version: 1,
      };
      
      const audioBuffer = await synthesizer.generate(spec);
      
      expect(audioBuffer.duration).toBeCloseTo(1.0, 1);
      expect(audioBuffer.sampleRate).toBe(44100);
    });
  });

  describe('Animation Curves', () => {
    it('should generate keyframes with correct count', () => {
      const spec = {
        type: 'bezier' as const,
        controlPoints: [0, 0.5, 1],
        duration: 2.0,
        version: 1,
      };
      
      const keyframes = ParametricAnimationCurves.generate(spec, 60);
      
      expect(keyframes.length).toBe(60);
      expect(keyframes[0].time).toBe(0);
      expect(keyframes[59].time).toBeCloseTo(2.0, 1);
    });

    it('should apply easing functions correctly', () => {
      const t = 0.5;
      
      const linear = ParametricAnimationCurves.applyEasing(t, 'linear');
      const easeIn = ParametricAnimationCurves.applyEasing(t, 'ease-in');
      const easeOut = ParametricAnimationCurves.applyEasing(t, 'ease-out');
      
      expect(linear).toBe(0.5);
      expect(easeIn).toBeLessThan(0.5);
      expect(easeOut).toBeGreaterThan(0.5);
    });
  });
});
