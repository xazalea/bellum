/**
 * Input Validation Module
 * Comprehensive validation using Joi-like schemas
 */

export type ValidationType = 
  | 'string' 
  | 'number' 
  | 'boolean' 
  | 'object' 
  | 'array' 
  | 'date'
  | 'file';

export interface ValidationRule {
  type: ValidationType;
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: unknown[];
  custom?: (value: unknown) => boolean | string;
  message?: string;
  children?: Record<string, ValidationRule>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  sanitized?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface FileValidationOptions {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFilenameLength: number;
}

const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSizeBytes: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [],
  allowedExtensions: [],
  maxFilenameLength: 255,
};

/**
 * Input Validator
 */
class InputValidator {
  /**
   * Validate a value against a rule
   */
  validate(value: unknown, rule: ValidationRule, field: string = 'value'): ValidationResult {
    const errors: ValidationError[] = [];

    // Check required
    if (value === undefined || value === null) {
      if (rule.required) {
        errors.push({ field, message: rule.message || `${field} is required` });
      }
      return { valid: errors.length === 0, errors };
    }

    // Type validation
    const typeError = this.validateType(value, rule, field);
    if (typeError) {
      errors.push(typeError);
      return { valid: false, errors };
    }

    // Type-specific validation
    switch (rule.type) {
      case 'string':
        errors.push(...this.validateString(value as string, rule, field));
        break;
      case 'number':
        errors.push(...this.validateNumber(value as number, rule, field));
        break;
      case 'array':
        errors.push(...this.validateArray(value as unknown[], rule, field));
        break;
      case 'object':
        errors.push(...this.validateObject(value as Record<string, unknown>, rule, field));
        break;
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (result !== true) {
        errors.push({
          field,
          message: typeof result === 'string' ? result : rule.message || 'Custom validation failed',
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate type
   */
  private validateType(value: unknown, rule: ValidationRule, field: string): ValidationError | null {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    
    if (rule.type === 'date') {
      if (!(value instanceof Date) && isNaN(Date.parse(value as string))) {
        return { field, message: `${field} must be a valid date` };
      }
      return null;
    }

    if (actualType !== rule.type) {
      return { field, message: `${field} must be of type ${rule.type}` };
    }

    return null;
  }

  /**
   * Validate string
   */
  private validateString(value: string, rule: ValidationRule, field: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (rule.min !== undefined && value.length < rule.min) {
      errors.push({
        field,
        message: `${field} must be at least ${rule.min} characters`,
      });
    }

    if (rule.max !== undefined && value.length > rule.max) {
      errors.push({
        field,
        message: `${field} must be at most ${rule.max} characters`,
      });
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push({
        field,
        message: rule.message || `${field} has invalid format`,
      });
    }

    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        field,
        message: `${field} must be one of: ${rule.enum.join(', ')}`,
      });
    }

    return errors;
  }

  /**
   * Validate number
   */
  private validateNumber(value: number, rule: ValidationRule, field: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (isNaN(value)) {
      errors.push({ field, message: `${field} must be a valid number` });
      return errors;
    }

    if (rule.min !== undefined && value < rule.min) {
      errors.push({
        field,
        message: `${field} must be at least ${rule.min}`,
      });
    }

    if (rule.max !== undefined && value > rule.max) {
      errors.push({
        field,
        message: `${field} must be at most ${rule.max}`,
      });
    }

    return errors;
  }

  /**
   * Validate array
   */
  private validateArray(value: unknown[], rule: ValidationRule, field: string): ValidationError[] {
    const errors: ValidationError[] = [];

    if (rule.min !== undefined && value.length < rule.min) {
      errors.push({
        field,
        message: `${field} must have at least ${rule.min} items`,
      });
    }

    if (rule.max !== undefined && value.length > rule.max) {
      errors.push({
        field,
        message: `${field} must have at most ${rule.max} items`,
      });
    }

    return errors;
  }

  /**
   * Validate object
   */
  private validateObject(
    value: Record<string, unknown>,
    rule: ValidationRule,
    field: string
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (rule.children) {
      for (const [key, childRule] of Object.entries(rule.children)) {
        const childValue = value[key];
        const result = this.validate(childValue, childRule, `${field}.${key}`);
        errors.push(...result.errors);
      }
    }

    return errors;
  }

  /**
   * Validate an object against a schema
   */
  validateSchema<T extends Record<string, unknown>>(
    data: Record<string, unknown>,
    schema: Record<string, ValidationRule>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    for (const [field, rule] of Object.entries(schema)) {
      const result = this.validate(data[field], rule, field);
      errors.push(...result.errors);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validate file upload
   */
  validateFile(file: File, options: Partial<FileValidationOptions> = {}): ValidationResult {
    const opts = { ...DEFAULT_FILE_OPTIONS, ...options };
    const errors: ValidationError[] = [];

    // Check file size
    if (file.size > opts.maxSizeBytes) {
      errors.push({
        field: 'file',
        message: `File size exceeds maximum of ${opts.maxSizeBytes} bytes`,
        value: file.size,
      });
    }

    // Check MIME type
    if (opts.allowedMimeTypes.length > 0 && !opts.allowedMimeTypes.includes(file.type)) {
      errors.push({
        field: 'file',
        message: `File type ${file.type} is not allowed`,
        value: file.type,
      });
    }

    // Check extension
    if (opts.allowedExtensions.length > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !opts.allowedExtensions.includes(ext)) {
        errors.push({
          field: 'file',
          message: `File extension .${ext} is not allowed`,
          value: ext,
        });
      }
    }

    // Check filename length
    if (file.name.length > opts.maxFilenameLength) {
      errors.push({
        field: 'file',
        message: `Filename exceeds maximum length of ${opts.maxFilenameLength}`,
        value: file.name.length,
      });
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Sanitize string input
   */
  sanitizeString(value: string): string {
    return value
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as T;
  }

  /**
   * Create validation middleware for API routes
   */
  createMiddleware(schema: Record<string, ValidationRule>) {
    return (data: Record<string, unknown>): ValidationResult => {
      return this.validateSchema(data, schema);
    };
  }
}

// Common validation patterns
export const Patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  url: /^https?:\/\/[^\s/$.?#].[^\s]*$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  username: /^[a-zA-Z0-9_-]{3,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
};

// Common validation rules
export const Rules = {
  required: (type: ValidationType): ValidationRule => ({ type, required: true }),
  optional: (type: ValidationType): ValidationRule => ({ type }),
  string: (min?: number, max?: number): ValidationRule => ({ type: 'string', min, max }),
  number: (min?: number, max?: number): ValidationRule => ({ type: 'number', min, max }),
  email: (): ValidationRule => ({ type: 'string', pattern: Patterns.email }),
  url: (): ValidationRule => ({ type: 'string', pattern: Patterns.url }),
  uuid: (): ValidationRule => ({ type: 'string', pattern: Patterns.uuid }),
  enum: (values: unknown[]): ValidationRule => ({ type: 'string', enum: values }),
  array: (min?: number, max?: number): ValidationRule => ({ type: 'array', min, max }),
  object: (children: Record<string, ValidationRule>): ValidationRule => ({ type: 'object', children }),
};

// Singleton instance
export const inputValidator = new InputValidator();

// Convenience functions
export function validateInput(
  data: Record<string, unknown>,
  schema: Record<string, ValidationRule>
): ValidationResult {
  return inputValidator.validateSchema(data, schema);
}

export function validateFile(file: File, options?: Partial<FileValidationOptions>): ValidationResult {
  return inputValidator.validateFile(file, options);
}

export function sanitizeInput<T extends Record<string, unknown>>(data: T): T {
  return inputValidator.sanitizeObject(data);
}