/**
 * Request Validation Utilities (M2-SEC, M3-SEC)
 *
 * SECURITY: Validates incoming requests before processing:
 * - Content-Type validation prevents MIME type attacks
 * - Body size limits prevent DoS via large payloads
 * - Input sanitization for common attack vectors
 */

import logger from '@/lib/logger';

/**
 * Default limits for request validation
 */
export const REQUEST_LIMITS = {
  /** Default max body size: 100KB */
  DEFAULT_MAX_BODY_SIZE: 100 * 1024,

  /** Max body size for file uploads: 10MB */
  MAX_FILE_UPLOAD_SIZE: 10 * 1024 * 1024,

  /** Max body size for webhooks: 1MB */
  MAX_WEBHOOK_SIZE: 1 * 1024 * 1024,

  /** Max string field length */
  MAX_STRING_LENGTH: 10000,

  /** Max array length in requests */
  MAX_ARRAY_LENGTH: 1000,
} as const;

/**
 * Validation result type
 */
interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate Content-Type header (M2-SEC)
 *
 * SECURITY: Prevents MIME type confusion attacks by validating
 * that requests have the expected Content-Type.
 *
 * @param request - The incoming request
 * @param expected - Expected content type (default: 'application/json')
 * @returns true if content type matches, false otherwise
 *
 * @example
 * if (!validateContentType(request)) {
 *   return Response.json({ error: 'Invalid content type' }, { status: 415 });
 * }
 */
export function validateContentType(
  request: Request,
  expected: string = 'application/json'
): boolean {
  const contentType = request.headers.get('Content-Type');

  // No content type header
  if (!contentType) {
    logger.warn('[VALIDATION] Missing Content-Type header');
    return false;
  }

  // Check if content type includes expected type
  // This handles cases like 'application/json; charset=utf-8'
  const isValid = contentType.toLowerCase().includes(expected.toLowerCase());

  if (!isValid) {
    logger.warn('[VALIDATION] Invalid Content-Type', {
      expected,
      received: contentType,
    });
  }

  return isValid;
}

/**
 * Parse and validate JSON body with size limits (M3-SEC)
 *
 * SECURITY: Prevents DoS attacks by:
 * - Checking Content-Length header before reading
 * - Limiting actual body size after reading
 * - Validating JSON structure
 *
 * @param request - The incoming request
 * @param maxSizeBytes - Maximum allowed body size in bytes
 * @returns Validation result with parsed data or error
 *
 * @example
 * const result = await parseJsonBody<CreateMemberInput>(request);
 * if (!result.success) {
 *   return Response.json({ error: result.error }, { status: 400 });
 * }
 * const data = result.data;
 */
export async function parseJsonBody<T>(
  request: Request,
  maxSizeBytes: number = REQUEST_LIMITS.DEFAULT_MAX_BODY_SIZE
): Promise<ValidationResult<T>> {
  // Check Content-Length header first (early rejection)
  const contentLength = request.headers.get('Content-Length');

  if (contentLength) {
    const declaredSize = parseInt(contentLength, 10);
    if (isNaN(declaredSize)) {
      return {
        success: false,
        error: 'Invalid Content-Length header',
      };
    }
    if (declaredSize > maxSizeBytes) {
      logger.warn('[VALIDATION] Request body too large (Content-Length)', {
        declaredSize,
        maxSizeBytes,
      });
      return {
        success: false,
        error: `Request body too large. Maximum size is ${formatBytes(maxSizeBytes)}.`,
      };
    }
  }

  try {
    // Read body as text to check actual size
    const body = await request.text();

    // Verify actual size
    if (body.length > maxSizeBytes) {
      logger.warn('[VALIDATION] Request body too large (actual)', {
        actualSize: body.length,
        maxSizeBytes,
      });
      return {
        success: false,
        error: `Request body too large. Maximum size is ${formatBytes(maxSizeBytes)}.`,
      };
    }

    // Empty body
    if (!body || body.trim() === '') {
      return {
        success: false,
        error: 'Request body is empty',
      };
    }

    // Parse JSON
    const data = JSON.parse(body) as T;

    return {
      success: true,
      data,
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      logger.warn('[VALIDATION] Invalid JSON in request body');
      return {
        success: false,
        error: 'Invalid JSON in request body',
      };
    }

    logger.error('[VALIDATION] Error parsing request body', error);
    return {
      success: false,
      error: 'Failed to parse request body',
    };
  }
}

/**
 * Validate required fields in an object
 *
 * @param data - The object to validate
 * @param requiredFields - Array of required field names
 * @returns Validation result
 *
 * @example
 * const fieldResult = validateRequiredFields(data, ['email', 'username']);
 * if (!fieldResult.success) {
 *   return Response.json({ error: fieldResult.error }, { status: 400 });
 * }
 */
export function validateRequiredFields(
  data: Record<string, unknown>,
  requiredFields: string[]
): ValidationResult<void> {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      success: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  return { success: true };
}

/**
 * Validate string length
 *
 * @param value - The string to validate
 * @param fieldName - Name of the field (for error messages)
 * @param maxLength - Maximum allowed length
 * @param minLength - Minimum required length (default: 0)
 * @returns Validation result
 */
export function validateStringLength(
  value: string,
  fieldName: string,
  maxLength: number = REQUEST_LIMITS.MAX_STRING_LENGTH,
  minLength: number = 0
): ValidationResult<void> {
  if (typeof value !== 'string') {
    return {
      success: false,
      error: `${fieldName} must be a string`,
    };
  }

  if (value.length < minLength) {
    return {
      success: false,
      error: `${fieldName} must be at least ${minLength} characters`,
    };
  }

  if (value.length > maxLength) {
    return {
      success: false,
      error: `${fieldName} must not exceed ${maxLength} characters`,
    };
  }

  return { success: true };
}

/**
 * Validate array length
 *
 * @param array - The array to validate
 * @param fieldName - Name of the field (for error messages)
 * @param maxLength - Maximum allowed length
 * @returns Validation result
 */
export function validateArrayLength(
  array: unknown[],
  fieldName: string,
  maxLength: number = REQUEST_LIMITS.MAX_ARRAY_LENGTH
): ValidationResult<void> {
  if (!Array.isArray(array)) {
    return {
      success: false,
      error: `${fieldName} must be an array`,
    };
  }

  if (array.length > maxLength) {
    return {
      success: false,
      error: `${fieldName} must not exceed ${maxLength} items`,
    };
  }

  return { success: true };
}

/**
 * Sanitize string input by removing potentially dangerous characters
 *
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Trim whitespace
    .trim();
}

/**
 * Validate email format
 *
 * @param email - The email to validate
 * @returns true if valid email format
 */
export function isValidEmail(email: string): boolean {
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UUID format
 *
 * @param id - The string to validate
 * @returns true if valid UUID format
 */
export function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Validate CUID format (Prisma default)
 *
 * @param id - The string to validate
 * @returns true if valid CUID format
 */
export function isValidCuid(id: string): boolean {
  // CUID format: starts with 'c', followed by alphanumeric chars
  const cuidRegex = /^c[a-z0-9]{24}$/;
  return cuidRegex.test(id);
}

/**
 * Validate Whop ID format (starts with specific prefix)
 *
 * @param id - The ID to validate
 * @param prefix - Expected prefix (e.g., 'biz_', 'mem_', 'user_')
 * @returns true if valid Whop ID format
 */
export function isValidWhopId(id: string, prefix: string): boolean {
  if (!id.startsWith(prefix)) {
    return false;
  }
  // Whop IDs are alphanumeric after the prefix
  const idPart = id.slice(prefix.length);
  return /^[a-zA-Z0-9]+$/.test(idPart);
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Combined request validation middleware
 *
 * @example
 * const validation = await validateRequest<CreateMemberInput>(request, {
 *   contentType: 'application/json',
 *   maxBodySize: 50 * 1024,
 *   requiredFields: ['email', 'username'],
 * });
 *
 * if (!validation.success) {
 *   return Response.json({ error: validation.error }, { status: 400 });
 * }
 */
export async function validateRequest<T extends Record<string, unknown>>(
  request: Request,
  options: {
    contentType?: string;
    maxBodySize?: number;
    requiredFields?: string[];
  } = {}
): Promise<ValidationResult<T>> {
  const {
    contentType = 'application/json',
    maxBodySize = REQUEST_LIMITS.DEFAULT_MAX_BODY_SIZE,
    requiredFields = [],
  } = options;

  // Validate Content-Type
  if (!validateContentType(request, contentType)) {
    return {
      success: false,
      error: `Invalid Content-Type. Expected: ${contentType}`,
    };
  }

  // Parse and validate body size
  const bodyResult = await parseJsonBody<T>(request, maxBodySize);
  if (!bodyResult.success) {
    return bodyResult;
  }

  // Validate required fields
  if (requiredFields.length > 0 && bodyResult.data) {
    const fieldResult = validateRequiredFields(
      bodyResult.data as Record<string, unknown>,
      requiredFields
    );
    if (!fieldResult.success) {
      return fieldResult as ValidationResult<T>;
    }
  }

  return {
    success: true,
    data: bodyResult.data,
  };
}
