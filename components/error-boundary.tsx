'use client';

import React from 'react';
import { safeAnimate, presets, spring } from '@/lib/animation/engine';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private containerRef = React.createRef<HTMLDivElement>();
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  componentDidUpdate(_: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    if (this.state.hasError && !prevState.hasError && this.containerRef.current) {
      safeAnimate(this.containerRef.current, {
        opacity: [0, 1],
        scale: [0.96, 1],
        duration: 350,
        ease: spring({ mass: 1, stiffness: 80, damping: 18 }),
      });
      // Animate children with stagger
      const children = this.containerRef.current.querySelectorAll('[data-eb-anim]');
      const els = Array.from(children).filter((el): el is HTMLElement => el instanceof HTMLElement);
      if (els.length > 0) safeAnimate(els, {
        opacity: [0, 1],
        translateY: [8, 0],
        duration: 300,
        delay: (_: number, i: number) => i * 80,
        ease: 'out(3)',
      });
    }
  }

  handleReset = (): void => {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
    if (this.containerRef.current) {
      safeAnimate(this.containerRef.current, {
        opacity: [1, 0],
        scale: [1, 0.98],
        duration: 200,
        ease: 'in(3)',
      });
      this.resetTimer = setTimeout(() => {
        this.resetTimer = null;
        this.setState({ hasError: false, error: null });
      }, 220);
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  componentWillUnmount(): void {
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = null;
    }
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.handleReset);
      }

      return (
        <div
          ref={this.containerRef}
          className="flex items-center justify-center min-h-[300px] p-8"
          style={{ opacity: 0 }}
        >
          <div className="text-center max-w-sm">
            <div data-eb-anim className="mb-6 flex justify-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <AlertTriangle size={24} className="text-destructive/60" />
              </div>
            </div>
            <h2 data-eb-anim className="text-sm font-semibold text-foreground mb-2">
              Something went wrong
            </h2>
            <p data-eb-anim className="text-[11px] text-muted-foreground/60 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              data-eb-anim
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
