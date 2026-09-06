import { ToolErrorResult } from '../types/forge';

export function validationError(error: string, extra?: Record<string, any>): ToolErrorResult {
  return {
    success: false,
    error,
    code: 'VALIDATION_ERROR',
    ...extra,
  };
}

export function invalidArgumentError(error: string, extra?: Record<string, any>): ToolErrorResult {
  return {
    success: false,
    error,
    code: 'INVALID_ARGUMENT',
    ...extra,
  };
}

export function notFoundError(error: string, extra?: Record<string, any>): ToolErrorResult {
  return {
    success: false,
    error,
    code: 'NOT_FOUND',
    ...extra,
  };
}

export function approvalRequiredError(error: string, extra?: Record<string, any>): ToolErrorResult {
  return {
    success: false,
    error,
    code: 'APPROVAL_REQUIRED',
    ...extra,
  };
}

/**
 * Validates an input payload against a standard JSON Schema draft-07 object definition.
 * Checks for required fields, type mismatches, and allowed enum values.
 */
export function validateSchema(
  schema: {
    type?: string;
    properties?: Record<string, any>;
    required?: string[];
  },
  input: any
): { valid: boolean; error?: string } {
  if (!schema) return { valid: true };

  // If input is null/undefined but schema requires properties
  if (schema.required && schema.required.length > 0 && (input === undefined || input === null)) {
    return {
      valid: false,
      error: `Input is required. Missing fields: ${schema.required.join(', ')}`,
    };
  }

  const safeInput = input || {};

  // Check required fields
  if (schema.required && Array.isArray(schema.required)) {
    for (const req of schema.required) {
      if (safeInput[req] === undefined || safeInput[req] === null || safeInput[req] === '') {
        return {
          valid: false,
          error: `Missing required argument: "${req}"`,
        };
      }
    }
  }

  // Check properties if provided
  if (schema.properties && typeof schema.properties === 'object') {
    for (const [key, propDef] of Object.entries(schema.properties) as [string, any][]) {
      const val = safeInput[key];
      if (val === undefined || val === null) continue;

      // Enum check
      if (Array.isArray(propDef.enum) && !propDef.enum.includes(val)) {
        return {
          valid: false,
          error: `Field "${key}" must be one of: [${propDef.enum.join(', ')}], received "${val}"`,
        };
      }

      // Type checks
      if (propDef.type === 'number' && typeof val !== 'number') {
        return {
          valid: false,
          error: `Field "${key}" must be a number, received ${typeof val}`,
        };
      }
      if (propDef.type === 'string' && typeof val !== 'string') {
        return {
          valid: false,
          error: `Field "${key}" must be a string, received ${typeof val}`,
        };
      }
      if (propDef.type === 'boolean' && typeof val !== 'boolean') {
        return {
          valid: false,
          error: `Field "${key}" must be a boolean, received ${typeof val}`,
        };
      }
      if (propDef.type === 'array' && !Array.isArray(val)) {
        return {
          valid: false,
          error: `Field "${key}" must be an array, received ${typeof val}`,
        };
      }
    }
  }

  return { valid: true };
}
