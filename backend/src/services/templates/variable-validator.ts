import { Variable } from './variable-parser';
import { AppError } from '../../middleware/error-handler';

/**
 * Validate variable data against definitions
 */
export function validateVariableData(
  data: Record<string, any>,
  variables: Variable[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const variable of variables) {
    const value = data[variable.name];

    // Check required
    if (variable.required && (value === undefined || value === null || value === '')) {
      errors.push(`Required variable '${variable.name}' is missing`);
      continue;
    }

    // Skip validation if not provided and not required
    if (!variable.required && (value === undefined || value === null)) {
      continue;
    }

    // Type validation
    const typeError = validateVariableType(variable, value);
    if (typeError) {
      errors.push(typeError);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate variable type
 */
function validateVariableType(variable: Variable, value: any): string | null {
  switch (variable.type) {
    case 'string':
      if (typeof value !== 'string') {
        return `Variable '${variable.name}' must be a string`;
      }
      break;

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        return `Variable '${variable.name}' must be a number`;
      }
      break;

    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return `Variable '${variable.name}' must be a valid date`;
      }
      break;

    case 'boolean':
      if (typeof value !== 'boolean') {
        return `Variable '${variable.name}' must be a boolean`;
      }
      break;

    case 'currency':
      if (typeof value !== 'number' || isNaN(value) || value < 0) {
        return `Variable '${variable.name}' must be a positive number`;
      }
      break;
  }

  return null;
}

/**
 * Coerce variable values to correct types
 */
export function coerceVariableData(
  data: Record<string, any>,
  variables: Variable[]
): Record<string, any> {
  const coerced: Record<string, any> = {};

  for (const variable of variables) {
    const value = data[variable.name];

    // Use default if not provided
    if (value === undefined || value === null) {
      if (variable.defaultValue !== undefined) {
        coerced[variable.name] = variable.defaultValue;
      }
      continue;
    }

    // Coerce to correct type
    coerced[variable.name] = coerceValue(variable.type, value);
  }

  // Include any extra data not in variable definitions
  for (const [key, value] of Object.entries(data)) {
    if (!(key in coerced)) {
      coerced[key] = value;
    }
  }

  return coerced;
}

/**
 * Coerce value to specific type
 */
function coerceValue(type: Variable['type'], value: any): any {
  switch (type) {
    case 'string':
      return String(value);

    case 'number':
      const num = Number(value);
      return isNaN(num) ? 0 : num;

    case 'date':
      const date = new Date(value);
      return isNaN(date.getTime()) ? new Date() : date;

    case 'boolean':
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true' || value === '1';
      }
      return Boolean(value);

    case 'currency':
      const currency = Number(value);
      return isNaN(currency) ? 0 : Math.max(0, currency);

    default:
      return value;
  }
}

/**
 * Format variable value for display
 */
export function formatVariableValue(variable: Variable, value: any): string {
  if (value === undefined || value === null) {
    return variable.placeholder || '';
  }

  switch (variable.type) {
    case 'date':
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

    case 'currency':
      const num = Number(value);
      if (isNaN(num)) return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(num);

    case 'number':
      return String(value);

    case 'boolean':
      return value ? 'Yes' : 'No';

    case 'string':
    default:
      return String(value);
  }
}

/**
 * Validate variable name
 */
export function validateVariableName(name: string): {
  valid: boolean;
  error?: string;
} {
  // Must be alphanumeric with underscores
  const validPattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  if (!validPattern.test(name)) {
    return {
      valid: false,
      error:
        'Variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
    };
  }

  // Reserved words
  const reserved = ['undefined', 'null', 'true', 'false', 'this', 'function'];
  if (reserved.includes(name.toLowerCase())) {
    return {
      valid: false,
      error: `'${name}' is a reserved word and cannot be used as a variable name`,
    };
  }

  return { valid: true };
}

/**
 * Ensure all required variables are satisfied
 */
export function ensureRequiredVariables(
  data: Record<string, any>,
  variables: Variable[]
): void {
  const validation = validateVariableData(data, variables);

  if (!validation.valid) {
    throw new AppError(
      `Template variable validation failed: ${validation.errors.join(', ')}`,
      400
    );
  }
}

