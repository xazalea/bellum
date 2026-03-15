/**
 * Error Tracking Configuration
 * Provides centralized error handling and reporting
 */

interface ErrorContext {
  userId?: string;
  gameId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorReport {
  message: string;
  stack?: string;
  name: string;
  timestamp: number;
  url: string;
  userAgent: string;
  context?: ErrorContext;
  breadcrumbs: Breadcrumb[];
}

interface Breadcrumb {
  timestamp: number;
  category: string;
  message: string;
  data?: Record<string, unknown>;
}

class ErrorTracker {
  private breadcrumbs: Breadcrumb[] = [];
  private maxBreadcrumbs = 50;
  private userId: string | undefined;
  private enabled = true;

  /**
   * Initialize error tracker
   */
  init(options?: { userId?: string; enabled?: boolean }): void {
    if (options?.userId) this.userId = options.userId;
    if (options?.enabled !== undefined) this.enabled = options.enabled;

    // Set up global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError.bind(this));
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this));
    }
  }

  /**
   * Set user ID for error context
   */
  setUserId(userId: string | undefined): void {
    this.userId = userId;
  }

  /**
   * Add breadcrumb for error context
   */
  addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
    this.breadcrumbs.push({
      timestamp: Date.now(),
      category,
      message,
      data,
    });

    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Capture error
   */
  captureError(error: Error, context?: ErrorContext): void {
    if (!this.enabled) return;

    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      context: {
        userId: this.userId,
        ...context,
      },
      breadcrumbs: [...this.breadcrumbs],
    };

    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('[ErrorTracker]', error, context);
    }

    // Send to error tracking service
    this.sendReport(report);
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'error', context?: ErrorContext): void {
    if (!this.enabled) return;

    const report: ErrorReport = {
      message,
      name: level.toUpperCase(),
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      context: {
        userId: this.userId,
        ...context,
      },
      breadcrumbs: [...this.breadcrumbs],
    };

    // Log to console
    if (level === 'error') {
      console.error('[ErrorTracker]', message, context);
    } else if (level === 'warning') {
      console.warn('[ErrorTracker]', message, context);
    } else {
      console.log('[ErrorTracker]', message, context);
    }

    // Send to error tracking service
    if (level === 'error') {
      this.sendReport(report);
    }
  }

  /**
   * Handle global error
   */
  private handleGlobalError(event: ErrorEvent): void {
    this.captureError(event.error || new Error(event.message), {
      action: 'global_error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  }

  /**
   * Handle unhandled promise rejection
   */
  private handleUnhandledRejection(event: PromiseRejectionEvent): void {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));

    this.captureError(error, {
      action: 'unhandled_rejection',
    });
  }

  /**
   * Send error report to service
   */
  private async sendReport(report: ErrorReport): Promise<void> {
    const endpoint = process.env.SENTRY_DSN 
      ? 'https://sentry.io/api/envelope/'
      : process.env.ERROR_TRACKING_ENDPOINT;

    if (!endpoint) return;

    try {
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      });
    } catch (e) {
      // Silently fail to avoid infinite loops
    }
  }
}

// Export singleton instance
export const errorTracker = new ErrorTracker();

// Export convenience functions
export const captureError = errorTracker.captureError.bind(errorTracker);
export const captureMessage = errorTracker.captureMessage.bind(errorTracker);
export const addBreadcrumb = errorTracker.addBreadcrumb.bind(errorTracker);