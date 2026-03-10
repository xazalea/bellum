/**
 * Security Headers Configuration
 * Configures CSP, CORS, HSTS, and other security headers
 */

export interface SecurityHeadersConfig {
  csp: ContentSecurityPolicyConfig;
  cors: CORSConfig;
  hsts: HSTSConfig;
  frameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  xssProtection: boolean;
  contentTypeOptions: boolean;
  referrerPolicy: ReferrerPolicy;
  permissionsPolicy: PermissionsPolicyConfig;
}

export interface ContentSecurityPolicyConfig {
  enabled: boolean;
  reportOnly: boolean;
  reportUri?: string;
  directives: {
    'default-src': string[];
    'script-src': string[];
    'style-src': string[];
    'img-src': string[];
    'font-src': string[];
    'connect-src': string[];
    'frame-src': string[];
    'object-src': string[];
    'base-uri': string[];
    'form-action': string[];
    'frame-ancestors': string[];
    'upgrade-insecure-requests': boolean;
  };
}

export interface CORSConfig {
  enabled: boolean;
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

export interface HSTSConfig {
  enabled: boolean;
  maxAge: number;
  includeSubDomains: boolean;
  preload: boolean;
}

export type ReferrerPolicy = 
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url';

export interface PermissionsPolicyConfig {
  geolocation: string[];
  camera: string[];
  microphone: string[];
  'display-capture': string[];
  fullscreen: string[];
  webusb: string[];
  serial: string[];
  bluetooth: string[];
}

const DEFAULT_CSP_CONFIG: ContentSecurityPolicyConfig = {
  enabled: true,
  reportOnly: false,
  directives: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for inline scripts in Next.js
      "'unsafe-eval'", // Required for some WASM modules
      'blob:',
      'https://cdn.jsdelivr.net',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for CSS-in-JS
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
    ],
    'font-src': [
      "'self'",
      'https://fonts.gstatic.com',
      'https://fonts.googleapis.com',
    ],
    'connect-src': [
      "'self'",
      'https://api.github.com',
      'wss:',
      'https:',
    ],
    'frame-src': [
      "'self'",
      'blob:',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'self'"],
    'upgrade-insecure-requests': true,
  },
};

const DEFAULT_CORS_CONFIG: CORSConfig = {
  enabled: true,
  origins: ['*'], // Configure based on environment
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400,
};

const DEFAULT_HSTS_CONFIG: HSTSConfig = {
  enabled: true,
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
};

const DEFAULT_PERMISSIONS_POLICY: PermissionsPolicyConfig = {
  geolocation: ["'self'"],
  camera: [],
  microphone: [],
  'display-capture': [],
  fullscreen: ["'self'"],
  webusb: [],
  serial: [],
  bluetooth: [],
};

/**
 * Generate CSP header value
 */
export function generateCSPHeader(config: ContentSecurityPolicyConfig): string {
  if (!config.enabled) return '';

  const directives: string[] = [];

  for (const [directive, values] of Object.entries(config.directives)) {
    if (directive === 'upgrade-insecure-requests') {
      if (values) {
        directives.push('upgrade-insecure-requests');
      }
    } else {
      const sources = values as string[];
      if (sources.length > 0) {
        directives.push(`${directive} ${sources.join(' ')}`);
      }
    }
  }

  if (config.reportUri) {
    directives.push(`report-uri ${config.reportUri}`);
  }

  return directives.join('; ');
}

/**
 * Generate CORS headers
 */
export function generateCORSHeaders(
  origin: string | undefined,
  config: CORSConfig
): Record<string, string> {
  if (!config.enabled) {
    return {};
  }

  const headers: Record<string, string> = {};

  // Check if origin is allowed
  const isAllowed = config.origins.includes('*') || 
    (origin && config.origins.includes(origin));

  if (!isAllowed && origin) {
    return headers;
  }

  headers['Access-Control-Allow-Origin'] = config.origins.includes('*') ? '*' : origin || '';
  
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  headers['Access-Control-Allow-Methods'] = config.methods.join(', ');
  headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
  headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
  headers['Access-Control-Max-Age'] = config.maxAge.toString();

  return headers;
}

/**
 * Generate HSTS header value
 */
export function generateHSTSHeader(config: HSTSConfig): string {
  if (!config.enabled) return '';

  let value = `max-age=${config.maxAge}`;
  
  if (config.includeSubDomains) {
    value += '; includeSubDomains';
  }
  
  if (config.preload) {
    value += '; preload';
  }

  return value;
}

/**
 * Generate Permissions Policy header value
 */
export function generatePermissionsPolicyHeader(config: PermissionsPolicyConfig): string {
  const policies: string[] = [];

  for (const [feature, sources] of Object.entries(config)) {
    if (sources.length === 0) {
      policies.push(`${feature}=()`);
    } else {
      policies.push(`${feature}=(${sources.join(' ')})`);
    }
  }

  return policies.join(', ');
}

/**
 * Generate all security headers
 */
export function generateSecurityHeaders(
  origin: string | undefined,
  config: Partial<SecurityHeadersConfig> = {}
): Record<string, string> {
  const cspConfig = { ...DEFAULT_CSP_CONFIG, ...config.csp };
  const corsConfig = { ...DEFAULT_CORS_CONFIG, ...config.cors };
  const hstsConfig = { ...DEFAULT_HSTS_CONFIG, ...config.hsts };
  const permissionsPolicy = { ...DEFAULT_PERMISSIONS_POLICY, ...config.permissionsPolicy };

  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'X-Frame-Options': config.frameOptions || 'SAMEORIGIN',
    'Referrer-Policy': config.referrerPolicy || 'strict-origin-when-cross-origin',
  };

  // CSP
  const cspHeader = generateCSPHeader(cspConfig);
  if (cspHeader) {
    if (cspConfig.reportOnly) {
      headers['Content-Security-Policy-Report-Only'] = cspHeader;
    } else {
      headers['Content-Security-Policy'] = cspHeader;
    }
  }

  // CORS
  const corsHeaders = generateCORSHeaders(origin, corsConfig);
  Object.assign(headers, corsHeaders);

  // HSTS
  const hstsHeader = generateHSTSHeader(hstsConfig);
  if (hstsHeader) {
    headers['Strict-Transport-Security'] = hstsHeader;
  }

  // Permissions Policy
  headers['Permissions-Policy'] = generatePermissionsPolicyHeader(permissionsPolicy);

  return headers;
}

/**
 * CSP Violation Report Handler
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    'referrer': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'disposition': string;
    'blocked-uri': string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

export interface CSPViolationLog {
  id: string;
  timestamp: number;
  documentUri: string;
  violatedDirective: string;
  blockedUri: string;
  sourceFile?: string;
  lineNumber?: number;
  userAgent?: string;
  ip?: string;
}

// Store for CSP violations (in production, use a proper logging system)
const cspViolations: CSPViolationLog[] = [];
const MAX_VIOLATIONS = 1000;

/**
 * Process CSP violation report
 */
export function processCSPViolation(
  report: CSPViolationReport,
  metadata?: { userAgent?: string; ip?: string }
): CSPViolationLog {
  const log: CSPViolationLog = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    documentUri: report['csp-report']['document-uri'],
    violatedDirective: report['csp-report']['violated-directive'],
    blockedUri: report['csp-report']['blocked-uri'],
    sourceFile: report['csp-report']['source-file'],
    lineNumber: report['csp-report']['line-number'],
    userAgent: metadata?.userAgent,
    ip: metadata?.ip,
  };

  cspViolations.push(log);

  // Keep only recent violations
  if (cspViolations.length > MAX_VIOLATIONS) {
    cspViolations.shift();
  }

  // Log for debugging
  console.warn('CSP Violation:', log);

  return log;
}

/**
 * Get recent CSP violations
 */
export function getCSPViolations(limit = 100): CSPViolationLog[] {
  return cspViolations.slice(-limit);
}

/**
 * Clear CSP violations
 */
export function clearCSPViolations(): void {
  cspViolations.length = 0;
}

/**
 * Session Security Configuration
 */
export interface SessionSecurityConfig {
  sessionTimeout: number;
  maxAge: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  rolling: boolean;
  keys: string[];
}

const DEFAULT_SESSION_CONFIG: SessionSecurityConfig = {
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  rolling: true,
  keys: [], // Should be set from environment
};

/**
 * Generate secure session cookie options
 */
export function getSessionCookieOptions(
  config: Partial<SessionSecurityConfig> = {}
): Record<string, unknown> {
  const finalConfig = { ...DEFAULT_SESSION_CONFIG, ...config };

  return {
    httpOnly: finalConfig.httpOnly,
    secure: finalConfig.secure,
    sameSite: finalConfig.sameSite,
    maxAge: finalConfig.maxAge,
    path: '/',
  };
}

/**
 * Validate session security
 */
export function validateSessionSecurity(session: {
  id: string;
  createdAt: number;
  lastAccessedAt: number;
  ip?: string;
  userAgent?: string;
}): { valid: boolean; reason?: string } {
  const now = Date.now();
  const config = DEFAULT_SESSION_CONFIG;

  // Check session timeout
  if (now - session.lastAccessedAt > config.sessionTimeout) {
    return { valid: false, reason: 'Session timed out' };
  }

  // Check max age
  if (now - session.createdAt > config.maxAge) {
    return { valid: false, reason: 'Session expired' };
  }

  return { valid: true };
}

/**
 * Security headers middleware for Next.js
 */
export function securityHeadersMiddleware(
  config: Partial<SecurityHeadersConfig> = {}
): (req: Request) => Record<string, string> {
  return (req: Request) => {
    const origin = req.headers.get('origin') || undefined;
    return generateSecurityHeaders(origin, config);
  };
}

export default {
  generateSecurityHeaders,
  generateCSPHeader,
  generateCORSHeaders,
  generateHSTSHeader,
  generatePermissionsPolicyHeader,
  processCSPViolation,
  getCSPViolations,
  clearCSPViolations,
  getSessionCookieOptions,
  validateSessionSecurity,
  securityHeadersMiddleware,
  DEFAULT_CSP_CONFIG,
  DEFAULT_CORS_CONFIG,
  DEFAULT_HSTS_CONFIG,
  DEFAULT_PERMISSIONS_POLICY,
};