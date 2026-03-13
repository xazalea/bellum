/**
 * Audit Logging System
 * Logs security-relevant events for auditing and compliance
 */

export type AuditEventType = 
  | 'auth_login'
  | 'auth_logout'
  | 'auth_failed'
  | 'auth_token_refresh'
  | 'file_upload'
  | 'file_download'
  | 'file_delete'
  | 'file_access'
  | 'api_request'
  | 'api_error'
  | 'security_violation'
  | 'csp_violation'
  | 'rate_limit_exceeded'
  | 'permission_denied'
  | 'settings_change'
  | 'account_change';

export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditEvent {
  id: string;
  type: AuditEventType;
  severity: AuditSeverity;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  action?: string;
  details?: Record<string, unknown>;
  success: boolean;
  errorMessage?: string;
}

export interface AuditLogConfig {
  enabled: boolean;
  logToConsole: boolean;
  logToServer: boolean;
  serverEndpoint: string;
  batchSize: number;
  flushInterval: number;
  retentionDays: number;
}

type AuditCallback = (event: AuditEvent) => void;

const DEFAULT_CONFIG: AuditLogConfig = {
  enabled: true,
  logToConsole: true,
  logToServer: true,
  serverEndpoint: '/api/audit',
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  retentionDays: 90,
};

/**
 * Audit Logger
 */
class AuditLogger {
  private config: AuditLogConfig;
  private events: AuditEvent[] = [];
  private callbacks: Set<AuditCallback> = new Set();
  private flushTimer: number | null = null;
  private sessionId: string;

  constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
    
    if (this.config.logToServer) {
      this.startFlushTimer();
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log an audit event
   */
  log(params: {
    type: AuditEventType;
    severity?: AuditSeverity;
    userId?: string;
    ip?: string;
    resource?: string;
    action?: string;
    details?: Record<string, unknown>;
    success: boolean;
    errorMessage?: string;
  }): AuditEvent {
    if (!this.config.enabled) {
      return null as any; // Should not happen in practice
    }

    const event: AuditEvent = {
      id: this.generateEventId(),
      type: params.type,
      severity: params.severity || (params.success ? 'info' : 'warning'),
      timestamp: Date.now(),
      userId: params.userId,
      sessionId: this.sessionId,
      ip: params.ip,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      resource: params.resource,
      action: params.action,
      details: params.details,
      success: params.success,
      errorMessage: params.errorMessage,
    };

    // Add to buffer
    this.events.push(event);

    // Log to console
    if (this.config.logToConsole) {
      this.logToConsole(event);
    }

    // Notify callbacks
    for (const callback of this.callbacks) {
      try {
        callback(event);
      } catch (e) {
        console.error('Audit callback error:', e);
      }
    }

    // Flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }

    return event;
  }

  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(event: AuditEvent): void {
    const prefix = `[AUDIT ${event.severity.toUpperCase()}]`;
    const message = `${event.type}: ${event.success ? 'SUCCESS' : 'FAILED'}`;
    const details = event.details ? JSON.stringify(event.details) : '';
    
    switch (event.severity) {
      case 'critical':
        console.error(prefix, message, details, event);
        break;
      case 'warning':
        console.warn(prefix, message, details, event);
        break;
      default:
        console.info(prefix, message, details);
    }
  }

  /**
   * Log authentication event
   */
  logAuth(
    type: 'auth_login' | 'auth_logout' | 'auth_failed' | 'auth_token_refresh',
    params: {
      userId?: string;
      ip?: string;
      success: boolean;
      errorMessage?: string;
      details?: Record<string, unknown>;
    }
  ): AuditEvent {
    return this.log({
      type,
      severity: params.success ? 'info' : 'warning',
      ...params,
    });
  }

  /**
   * Log file operation
   */
  logFile(
    action: 'upload' | 'download' | 'delete' | 'access',
    params: {
      userId?: string;
      resource: string;
      success: boolean;
      errorMessage?: string;
      details?: Record<string, unknown>;
    }
  ): AuditEvent {
    return this.log({
      type: `file_${action}` as AuditEventType,
      userId: params.userId,
      resource: params.resource,
      action,
      success: params.success,
      errorMessage: params.errorMessage,
      details: params.details,
    });
  }

  /**
   * Log API request
   */
  logAPI(
    params: {
      userId?: string;
      resource: string;
      action?: string;
      success: boolean;
      errorMessage?: string;
      details?: Record<string, unknown>;
    }
  ): AuditEvent {
    return this.log({
      type: params.success ? 'api_request' : 'api_error',
      severity: params.success ? 'info' : 'warning',
      ...params,
    });
  }

  /**
   * Log security violation
   */
  logSecurity(
    params: {
      type: 'security_violation' | 'csp_violation' | 'rate_limit_exceeded' | 'permission_denied';
      userId?: string;
      ip?: string;
      resource?: string;
      details?: Record<string, unknown>;
    }
  ): AuditEvent {
    return this.log({
      severity: 'critical',
      ...params,
      success: false,
    });
  }

  /**
   * Log settings change
   */
  logSettings(
    params: {
      userId?: string;
      resource?: string;
      action?: string;
      details?: Record<string, unknown>;
      success: boolean;
    }
  ): AuditEvent {
    return this.log({
      type: 'settings_change',
      severity: 'info',
      ...params,
    });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer !== null) return;
    
    this.flushTimer = window.setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush events to server
   */
  async flush(): Promise<void> {
    if (!this.config.logToServer || this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];

    try {
      const response = await fetch(this.config.serverEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToSend }),
      });

      if (!response.ok) {
        // Re-add events on failure
        this.events = [...eventsToSend, ...this.events];
        console.error('Failed to flush audit logs:', response.status);
      }
    } catch (error) {
      // Re-add events on failure
      this.events = [...eventsToSend, ...this.events];
      console.error('Failed to flush audit logs:', error);
    }
  }

  /**
   * Get events from buffer
   */
  getEvents(filter?: {
    type?: AuditEventType;
    userId?: string;
    severity?: AuditSeverity;
    since?: number;
  }): AuditEvent[] {
    let events = [...this.events];

    if (filter) {
      if (filter.type) {
        events = events.filter(e => e.type === filter.type);
      }
      if (filter.userId) {
        events = events.filter(e => e.userId === filter.userId);
      }
      if (filter.severity) {
        events = events.filter(e => e.severity === filter.severity);
      }
      if (filter.since !== undefined) {
        const since = filter.since;
        events = events.filter(e => e.timestamp >= since);
      }
    }

    return events;
  }

  /**
   * Subscribe to audit events
   */
  subscribe(callback: AuditCallback): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  /**
   * Clear event buffer
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Export events as JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      exportedAt: new Date().toISOString(),
      events: this.events,
    }, null, 2);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AuditLogConfig>): void {
    this.config = { ...this.config, ...config };
    
    if (this.config.logToServer && this.flushTimer === null) {
      this.startFlushTimer();
    } else if (!this.config.logToServer && this.flushTimer !== null) {
      this.stopFlushTimer();
    }
  }
}

// Singleton instance
export const auditLog = new AuditLogger();

// Convenience functions
export function logAuditEvent(params: Parameters<AuditLogger['log']>[0]): AuditEvent {
  return auditLog.log(params);
}

export function logAuth(
  type: Parameters<AuditLogger['logAuth']>[0],
  params: Parameters<AuditLogger['logAuth']>[1]
): AuditEvent {
  return auditLog.logAuth(type, params);
}

export function logSecurityViolation(params: Parameters<AuditLogger['logSecurity']>[0]): AuditEvent {
  return auditLog.logSecurity(params);
}