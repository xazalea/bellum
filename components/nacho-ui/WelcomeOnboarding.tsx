'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Compass, Fingerprint, User, ArrowRight, X } from 'lucide-react';
import { Button } from './Button';
import { authService } from '@/lib/firebase/auth-service';
import { cn } from '@/lib/utils';

type OnboardingStep = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const steps: OnboardingStep[] = [
  {
    title: "Welcome to Nacho",
    description: "Your universal runtime for Windows and Android apps. Run anything, anywhere, instantly.",
    icon: <Compass className="h-16 w-16 text-nacho-primary" />,
  },
  {
    title: "Passwordless & Secure",
    description: "We use device fingerprinting combined with your username. No passwords to remember, ever.",
    icon: <Fingerprint className="h-16 w-16 text-nacho-primary" />,
  },
  {
    title: "Choose Your Username",
    description: "Pick a unique username to sync your library and preferences across devices.",
    icon: <User className="h-16 w-16 text-nacho-primary" />,
  },
];

export function WelcomeOnboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has seen onboarding or already has an account
    const hasSeenOnboarding = localStorage.getItem('nacho_onboarding_complete');
    const currentUser = authService.getCurrentUser();
    
    if (hasSeenOnboarding || currentUser?.username) {
      setDismissed(true);
    }
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!dismissed) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleSkip();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [dismissed]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('nacho_onboarding_complete', 'true');
    setDismissed(true);
  };

  const handleRegister = async () => {
    if (!usernameInput.trim()) {
      setError('Please enter a username');
      return;
    }

    if (usernameInput.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-z0-9_]+$/i.test(usernameInput)) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }

    setIsRegistering(true);
    setError(null);

    try {
      await authService.claimUsername(usernameInput);
      localStorage.setItem('nacho_onboarding_complete', 'true');
      setDismissed(true);
    } catch (e: any) {
      setError(e.message || 'Failed to register username');
    } finally {
      setIsRegistering(false);
    }
  };

  if (dismissed) return null;

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="relative w-full max-w-md bg-nacho-card border border-nacho-border rounded-[2rem] p-8 shadow-2xl"
        >
          {/* Close button */}
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-nacho-card-hover border border-nacho-border flex items-center justify-center text-nacho-subtext hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-nacho-primary"
            aria-label="Skip onboarding"
            tabIndex={0}
          >
            <X size={16} />
          </button>

          {/* Progress indicator */}
          <div className="flex gap-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  index <= currentStep 
                    ? "bg-nacho-primary" 
                    : "bg-nacho-border"
                )}
              />
            ))}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Icon */}
              <div className="flex justify-center">
                <div className="h-24 w-24 rounded-full bg-nacho-bg border border-nacho-border flex items-center justify-center">
                  {currentStepData.icon}
                </div>
              </div>

              {/* Text */}
              <div className="text-center space-y-3">
                <h2 className="text-2xl md:text-3xl font-bold text-white font-display">
                  {currentStepData.title}
                </h2>
                <p className="text-nacho-subtext leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {/* Username input (last step) */}
              {isLastStep && (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your username"
                    className="w-full bg-nacho-bg border border-nacho-border rounded-xl px-4 py-3 text-white placeholder:text-nacho-subtext/50 focus:outline-none focus:border-nacho-primary focus:ring-2 focus:ring-nacho-primary/50 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    autoFocus
                    aria-label="Username"
                    aria-invalid={!!error}
                    aria-describedby={error ? "username-error" : undefined}
                  />
                  {error && (
                    <p id="username-error" role="alert" className="text-xs font-semibold text-red-400 pl-1">{error}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4">
                {isLastStep ? (
                  <Button
                    onClick={handleRegister}
                    disabled={isRegistering || !usernameInput.trim()}
                    className="w-full justify-center min-h-[44px]"
                    loading={isRegistering}
                  >
                    Create Account
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    className="w-full justify-between min-h-[44px]"
                  >
                    Continue
                    <ArrowRight size={18} aria-hidden="true" />
                  </Button>
                )}

                <button
                  onClick={handleSkip}
                  className="text-sm text-nacho-subtext hover:text-white transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-nacho-primary rounded-lg"
                >
                  {isLastStep ? 'Skip for now' : 'Browse as guest'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
