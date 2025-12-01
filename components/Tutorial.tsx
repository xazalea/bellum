'use client';

import React, { useState, useEffect } from 'react';
import { colors } from '@/lib/ui/design-system';

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector for element to highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void; // Action to perform when step is shown
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to nacho.',
    description: 'Your ultra-fast universal compiler platform. Let\'s take a quick tour to get you started!',
    position: 'center',
  },
  {
    id: 'os-switcher',
    title: 'OS Switcher',
    description: 'Switch between different operating system themes using the switcher in the top-right corner. Each theme provides a unique experience!',
    target: '.os-switcher',
    position: 'bottom',
  },
  {
    id: 'taskbar',
    title: 'Taskbar',
    description: 'The taskbar at the bottom shows all your running VMs. Click on any VM to bring it to focus.',
    target: '.taskbar',
    position: 'top',
  },
  {
    id: 'create-vm',
    title: 'Create Your First VM',
    description: 'Click the start button in the taskbar to create a new virtual machine. You can run Android, Windows, Linux, and more!',
    target: '.taskbar button:first-child',
    position: 'top',
    action: () => {
      // Trigger VM creation dialog
      const event = new CustomEvent('tutorial:create-vm');
      window.dispatchEvent(event);
    },
  },
  {
    id: 'performance',
    title: 'Performance Dashboard',
    description: 'Press Ctrl+Shift+P to toggle the performance dashboard. Monitor FPS, frame times, and system metrics in real-time.',
    position: 'center',
  },
  {
    id: 'vm-controls',
    title: 'VM Controls',
    description: 'Each VM window has controls to start, pause, stop, and reset. Use these to manage your virtual machines.',
    position: 'center',
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You now know the basics of nacho. Start creating VMs and explore the platform. Enjoy your ultra-fast compiler experience!',
    position: 'center',
  },
];

export const Tutorial: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);

  const completeTutorial = () => {
    localStorage.setItem('nacho-tutorial-completed', 'true');
    setIsVisible(false);
    
    // Clear highlight
    if (highlightedElement) {
      highlightedElement.style.outline = '';
      highlightedElement.style.outlineOffset = '';
    }
  };

  const showStep = (stepIndex: number) => {
    if (stepIndex >= tutorialSteps.length) {
      completeTutorial();
      return;
    }

    const step = tutorialSteps[stepIndex];
    setCurrentStep(stepIndex);

    // Clear previous highlight
    if (highlightedElement) {
      highlightedElement.style.outline = '';
      highlightedElement.style.outlineOffset = '';
    }

    // Highlight target element if specified
    if (step.target) {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.style.outline = '3px solid rgba(255, 0, 255, 0.8)';
        element.style.outlineOffset = '4px';
        element.style.transition = 'outline 0.3s ease';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Execute action if specified
    if (step.action) {
      step.action();
    }
  };

  useEffect(() => {
    // Check if user has completed tutorial
    const tutorialCompleted = localStorage.getItem('nacho-tutorial-completed');
    if (!tutorialCompleted) {
      setIsVisible(true);
      // Start tutorial after a brief delay
      setTimeout(() => {
        // We can't easily call showStep inside here due to dependency cycles or stale closures
        // So we just manually set the step
        setCurrentStep(0);
      }, 500);
    }
  }, []);

  // Trigger showStep when currentStep changes, but we need to avoid infinite loops
  // Instead, we'll just use currentStep to render and perform side effects in a separate effect if needed
  useEffect(() => {
     if (isVisible) {
        const step = tutorialSteps[currentStep];
         // Highlight target element if specified
        if (step.target) {
            const element = document.querySelector(step.target) as HTMLElement;
            if (element) {
                setHighlightedElement(element);
                element.style.outline = '3px solid rgba(255, 0, 255, 0.8)';
                element.style.outlineOffset = '4px';
                element.style.transition = 'outline 0.3s ease';
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            if (highlightedElement) {
                highlightedElement.style.outline = '';
                highlightedElement.style.outlineOffset = '';
                setHighlightedElement(null);
            }
        }
        if (step.action) {
            step.action();
        }
     }
  }, [currentStep, isVisible, highlightedElement]);

  const nextStep = () => {
     if (currentStep + 1 >= tutorialSteps.length) {
         completeTutorial();
     } else {
         setCurrentStep(prev => prev + 1);
     }
  };

  const skipTutorial = () => {
    if (confirm('Are you sure you want to skip the tutorial? You can always access it later from settings.')) {
      completeTutorial();
    }
  };

  if (!isVisible) return null;

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9998,
          pointerEvents: 'all',
        }}
      />

      {/* Tutorial Card */}
      <div
        style={{
          position: 'fixed',
          ...getPosition(step.position || 'center'),
          zIndex: 9999,
          background: `
            linear-gradient(135deg, 
              rgba(255, 0, 255, 0.15) 0%, 
              rgba(0, 255, 255, 0.15) 50%, 
              rgba(255, 0, 255, 0.15) 100%
            )
          `,
          backdropFilter: 'blur(20px)',
          border: '2px solid rgba(255, 0, 255, 0.5)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: `
            0 0 40px rgba(255, 0, 255, 0.5),
            0 0 80px rgba(0, 255, 255, 0.3),
            inset 0 0 20px rgba(255, 0, 255, 0.1)
          `,
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '2px',
            marginBottom: '24px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #ff00ff, #00ffff)',
              borderRadius: '2px',
              transition: 'width 0.3s ease',
              boxShadow: '0 0 10px rgba(255, 0, 255, 0.8)',
            }}
          />
        </div>

        {/* Step Counter */}
        <div
          style={{
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          Step {currentStep + 1} of {tutorialSteps.length}
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '16px',
            background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(255, 0, 255, 0.5)',
          }}
        >
          {step.title}
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: '16px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.9)',
            marginBottom: '32px',
          }}
        >
          {step.description}
        </p>

        {/* Actions */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          {currentStep < tutorialSteps.length - 1 && (
            <button
              onClick={skipTutorial}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              Skip
            </button>
          )}
          <button
            onClick={currentStep === tutorialSteps.length - 1 ? completeTutorial : nextStep}
            style={{
              padding: '10px 24px',
              background: 'linear-gradient(135deg, #ff00ff, #00ffff)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 20px rgba(255, 0, 255, 0.5)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 0, 255, 0.8)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 0, 255, 0.5)';
            }}
          >
            {currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 
              0 0 40px rgba(255, 0, 255, 0.5),
              0 0 80px rgba(0, 255, 255, 0.3),
              inset 0 0 20px rgba(255, 0, 255, 0.1);
          }
          50% {
            box-shadow: 
              0 0 60px rgba(255, 0, 255, 0.7),
              0 0 100px rgba(0, 255, 255, 0.5),
              inset 0 0 30px rgba(255, 0, 255, 0.2);
          }
        }
      `}</style>
    </>
  );
};

function getPosition(position: string): React.CSSProperties {
  switch (position) {
    case 'top':
      return { top: '20px', left: '50%', transform: 'translateX(-50%)' };
    case 'bottom':
      return { bottom: '100px', left: '50%', transform: 'translateX(-50%)' };
    case 'left':
      return { left: '20px', top: '50%', transform: 'translateY(-50%)' };
    case 'right':
      return { right: '20px', top: '50%', transform: 'translateY(-50%)' };
    case 'center':
    default:
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  }
}
