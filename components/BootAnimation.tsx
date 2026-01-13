'use client';

/**
 * Boot Animation Component
 * Professional boot sequence with smooth animations
 * 
 * Features:
 * - Smooth fade-in/fade-out
 * - Progress indicators
 * - System status messages
 * - Brand animation
 * - Boot time display
 */

import { useState, useEffect } from 'react';

interface BootAnimationProps {
  osType: 'windows' | 'android';
  onComplete: () => void;
}

interface BootStep {
  message: string;
  duration: number;
}

export function BootAnimation({ osType, onComplete }: BootAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [bootTime, setBootTime] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const windowsSteps: BootStep[] = [
    { message: 'Initializing WebGPU runtime...', duration: 100 },
    { message: 'Loading NT kernel...', duration: 150 },
    { message: 'Starting Win32 subsystem...', duration: 100 },
    { message: 'Initializing DirectX translator...', duration: 150 },
    { message: 'Loading system services...', duration: 200 },
    { message: 'Starting Explorer shell...', duration: 200 },
    { message: 'Ready', duration: 100 },
  ];

  const androidSteps: BootStep[] = [
    { message: 'Initializing WebGPU runtime...', duration: 100 },
    { message: 'Loading Android kernel...', duration: 150 },
    { message: 'Starting system services...', duration: 150 },
    { message: 'Initializing Dalvik VM...', duration: 200 },
    { message: 'Loading Android Framework...', duration: 200 },
    { message: 'Starting SystemUI...', duration: 100 },
    { message: 'Ready', duration: 100 },
  ];

  const steps = osType === 'windows' ? windowsSteps : androidSteps;

  useEffect(() => {
    const startTime = Date.now();

    const bootSequence = async () => {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        
        // Animate progress
        const step = steps[i];
        const startProgress = (i / steps.length) * 100;
        const endProgress = ((i + 1) / steps.length) * 100;
        
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            const next = prev + (endProgress - startProgress) / (step.duration / 10);
            return Math.min(next, endProgress);
          });
        }, 10);

        await new Promise(resolve => setTimeout(resolve, step.duration));
        clearInterval(progressInterval);
        setProgress(endProgress);
      }

      setBootTime(Date.now() - startTime);

      // Fade out
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(onComplete, 500);
      }, 500);
    };

    bootSequence();
  }, [osType]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: osType === 'windows'
          ? 'linear-gradient(135deg, #0078D7 0%, #1E3A8A 100%)'
          : 'linear-gradient(135deg, #3DDC84 0%, #1A73E8 100%)',
      }}
    >
      <div className="text-center">
        {/* Logo/Brand */}
        <div className="mb-8 animate-pulse">
          <div className="text-6xl font-bold text-white mb-2">
            {osType === 'windows' ? '⊞' : '🤖'}
          </div>
          <div className="text-2xl font-bold text-white">
            {osType === 'windows' ? 'Windows 11' : 'Android 14'}
          </div>
          <div className="text-sm text-white/70">Web Edition</div>
        </div>

        {/* Progress Bar */}
        <div className="w-96 mx-auto mb-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="text-white/90 text-sm animate-fade-in">
          {steps[currentStep]?.message}
        </div>

        {/* Boot Time */}
        {bootTime > 0 && (
          <div className="mt-4 text-white/70 text-xs">
            Boot time: {bootTime}ms
            {bootTime < 1000 && (
              <span className="text-green-400 ml-2">⚡ Target achieved!</span>
            )}
          </div>
        )}

        {/* Spinner */}
        <div className="mt-6">
          <div className="inline-block w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      </div>
    </div>
  );
}

export default BootAnimation;
