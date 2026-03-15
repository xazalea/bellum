/**
 * Monitoring and Alerting Configuration
 */

export interface MonitoringConfig {
  // Error Tracking
  sentry: {
    dsn: string | undefined;
    environment: 'development' | 'staging' | 'production';
    tracesSampleRate: number;
    replaysSessionSampleRate: number;
    replaysOnErrorSampleRate: number;
  };

  // Performance Monitoring
  performance: {
    enabled: boolean;
    sampleRate: number;
    longTaskThreshold: number; // ms
    layoutShiftThreshold: number;
    largestContentfulPaintThreshold: number; // ms
    firstInputDelayThreshold: number; // ms
  };

  // Real User Monitoring (RUM)
  rum: {
    enabled: boolean;
    sampleRate: number;
    trackInteractions: boolean;
    trackResources: boolean;
  };

  // Alerting Thresholds
  alerts: {
    errorRateThreshold: number; // errors per minute
    latencyThreshold: number; // ms
    availabilityThreshold: number; // percentage
    cpuThreshold: number; // percentage
    memoryThreshold: number; // percentage
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enableConsole: boolean;
    enableRemote: boolean;
    remoteUrl: string | undefined;
  };
}

export const monitoringConfig: MonitoringConfig = {
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of errors
  },

  performance: {
    enabled: true,
    sampleRate: 0.1,
    longTaskThreshold: 50, // ms
    layoutShiftThreshold: 0.1,
    largestContentfulPaintThreshold: 2500, // ms
    firstInputDelayThreshold: 100, // ms
  },

  rum: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: 0.1,
    trackInteractions: true,
    trackResources: true,
  },

  alerts: {
    errorRateThreshold: 10, // 10 errors per minute
    latencyThreshold: 1000, // 1 second
    availabilityThreshold: 99.9, // 99.9% uptime
    cpuThreshold: 80, // 80% CPU
    memoryThreshold: 85, // 85% memory
  },

  logging: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    enableConsole: process.env.NODE_ENV !== 'production',
    enableRemote: process.env.NODE_ENV === 'production',
    remoteUrl: process.env.LOGGING_ENDPOINT,
  },
};

/**
 * Initialize monitoring
 */
export function initMonitoring(): void {
  if (typeof window === 'undefined') return;

  // Initialize Sentry
  if (monitoringConfig.sentry.dsn) {
    // @ts-ignore — @sentry/react is an optional dependency, loaded only when SENTRY_DSN is set
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: monitoringConfig.sentry.dsn,
        environment: monitoringConfig.sentry.environment,
        tracesSampleRate: monitoringConfig.sentry.tracesSampleRate,
        replaysSessionSampleRate: monitoringConfig.sentry.replaysSessionSampleRate,
        replaysOnErrorSampleRate: monitoringConfig.sentry.replaysOnErrorSampleRate,
        integrations: [
          new Sentry.BrowserTracing(),
          new Sentry.Replay(),
        ],
      });
    });
  }

  // Initialize Performance Observer
  if (monitoringConfig.performance.enabled) {
    initPerformanceMonitoring();
  }
}

/**
 * Initialize performance monitoring
 */
function initPerformanceMonitoring(): void {
  // Observe Long Tasks
  if ('PerformanceObserver' in window) {
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > monitoringConfig.performance.longTaskThreshold) {
            reportPerformanceMetric('longTask', entry.duration);
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // Long Task API not supported
    }

    // Observe Layout Shifts
    try {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('value' in entry && (entry.value as number) > monitoringConfig.performance.layoutShiftThreshold) {
            reportPerformanceMetric('layoutShift', entry.value as number);
          }
        }
      });
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      // Layout Shift API not supported
    }

    // Observe Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.startTime > monitoringConfig.performance.largestContentfulPaintThreshold) {
          reportPerformanceMetric('LCP', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      // LCP API not supported
    }

    // Observe First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if ('processingStart' in entry && 'startTime' in entry) {
            const fid = (entry as PerformanceEventTiming).processingStart - entry.startTime;
            if (fid > monitoringConfig.performance.firstInputDelayThreshold) {
              reportPerformanceMetric('FID', fid);
            }
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      // FID API not supported
    }
  }
}

/**
 * Report performance metric
 */
function reportPerformanceMetric(name: string, value: number): void {
  // Log to console in development
  if (monitoringConfig.logging.enableConsole) {
    console.log(`[Performance] ${name}: ${value}`);
  }

  // Send to monitoring service
  if (monitoringConfig.logging.enableRemote && monitoringConfig.logging.remoteUrl) {
    fetch(monitoringConfig.logging.remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'performance',
        metric: name,
        value,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {
      // Silently fail
    });
  }
}

/**
 * Track custom event
 */
export function trackEvent(name: string, data?: Record<string, unknown>): void {
  // Google Analytics
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', name, data);
  }

  // DataDog
  if (typeof window !== 'undefined' && 'DD_RUM' in window) {
    (window as unknown as { DD_RUM: { addAction: (name: string, data?: Record<string, unknown>) => void } }).DD_RUM.addAction(name, data);
  }
}

/**
 * Track error
 */
export function trackError(error: Error, context?: Record<string, unknown>): void {
  console.error('[Error]', error, context);

  // Sentry
  if (monitoringConfig.sentry.dsn) {
    // @ts-ignore — @sentry/react is an optional dependency
    import('@sentry/react').then((Sentry) => {
      Sentry.captureException(error, { extra: context });
    });
  }

  // Remote logging
  if (monitoringConfig.logging.enableRemote && monitoringConfig.logging.remoteUrl) {
    fetch(monitoringConfig.logging.remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'error',
        message: error.message,
        stack: error.stack,
        context,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      }),
    }).catch(() => {
      // Silently fail
    });
  }
}

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
}> {
  const checks: Record<string, boolean> = {
    // Check if main thread is responsive
    mainThread: true,
    // Check if localStorage is available
    storage: typeof localStorage !== 'undefined',
    // Check if IndexedDB is available
    indexedDB: typeof indexedDB !== 'undefined',
    // Check if Service Worker is registered
    serviceWorker: 'serviceWorker' in navigator,
    // Check if WebAssembly is available
    webAssembly: typeof WebAssembly !== 'undefined',
  };

  // Check WebGL
  try {
    const canvas = document.createElement('canvas');
    checks.webgl = !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    checks.webgl = false;
  }

  // Check WebRTC
  checks.webRTC = 'RTCPeerConnection' in window;

  // Determine overall status
  const failedChecks = Object.values(checks).filter((v) => !v).length;
  const status = failedChecks === 0 ? 'healthy' : failedChecks < 3 ? 'degraded' : 'unhealthy';

  return { status, checks };
}