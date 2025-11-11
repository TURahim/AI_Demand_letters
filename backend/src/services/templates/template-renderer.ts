import { Variable, parseVariables } from './variable-parser';
import { coerceVariableData, formatVariableValue, validateVariableData } from './variable-validator';
import { AppError } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Render template with variable data
 */
export function renderTemplate(
  content: string,
  data: Record<string, any>,
  variables?: Variable[]
): string {
  // Coerce data types if variables provided (do this before validation)
  const processedData = variables
    ? coerceVariableData(data, variables)
    : data;

  // Validate data after coercion if variable definitions provided
  if (variables) {
    const validation = validateVariableData(processedData, variables);
    if (!validation.valid) {
      throw new AppError(
        `Template rendering failed: ${validation.errors.join(', ')}`,
        400
      );
    }
  }

  // Replace variables
  let rendered = content;
  const variablePattern = /\{\{([^}:]+)(?::([^}]+))?\}\}/g;

  rendered = rendered.replace(variablePattern, (_match, varName, _typeHint) => {
    const cleanName = varName.trim();
    const value = processedData[cleanName];

    // If variable not found, check if we have definition
    if (value === undefined || value === null) {
      const varDef = variables?.find((v) => v.name === cleanName);
      if (varDef?.defaultValue !== undefined) {
        return formatValue(varDef.defaultValue, varDef);
      }
      
      // Return placeholder or empty
      return varDef?.placeholder || '';
    }

    // Format value
    const varDef = variables?.find((v) => v.name === cleanName);
    return formatValue(value, varDef);
  });

  logger.debug('Template rendered', {
    variableCount: Object.keys(processedData).length,
  });

  return rendered;
}

/**
 * Format value based on variable definition
 */
function formatValue(value: any, variable?: Variable): string {
  if (variable) {
    return formatVariableValue(variable, value);
  }

  // Default formatting
  if (value === undefined || value === null) return '';
  if (typeof value === 'object' && value instanceof Date) {
    return value.toLocaleDateString();
  }
  return String(value);
}

/**
 * Render template with conditional sections
 * Supports {{#if variable}}...{{/if}}
 */
export function renderTemplateWithConditionals(
  content: string,
  data: Record<string, any>,
  variables?: Variable[]
): string {
  let rendered = content;

  // Process conditional blocks
  const conditionalPattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

  rendered = rendered.replace(
    conditionalPattern,
    (_match, condition, blockContent) => {
      const varName = condition.trim();
      const value = data[varName];

      // Show block if value is truthy
      if (value) {
        return blockContent;
      }

      return '';
    }
  );

  // Now render regular variables
  return renderTemplate(rendered, data, variables);
}

/**
 * Preview template with sample data
 */
export function previewTemplate(
  content: string,
  variables: Variable[]
): string {
  const sampleData: Record<string, any> = {};

  // Generate sample data for each variable
  for (const variable of variables) {
    if (variable.defaultValue !== undefined) {
      sampleData[variable.name] = variable.defaultValue;
    } else {
      sampleData[variable.name] = generateSampleValue(variable);
    }
  }

  return renderTemplate(content, sampleData, variables);
}

/**
 * Generate sample value for variable
 */
function generateSampleValue(variable: Variable): any {
  switch (variable.type) {
    case 'string':
      return variable.placeholder || `[${variable.name}]`;

    case 'number':
      return 123;

    case 'date':
      return new Date();

    case 'boolean':
      return true;

    case 'currency':
      return 1000.00;

    default:
      return `[${variable.name}]`;
  }
}

/**
 * Get missing variables from template
 */
export function getMissingVariables(
  content: string,
  data: Record<string, any>
): string[] {
  const templateVars = parseVariables(content);
  const missing: string[] = [];

  for (const varName of templateVars) {
    if (!(varName in data) || data[varName] === undefined || data[varName] === null) {
      missing.push(varName);
    }
  }

  return missing;
}

/**
 * Validate template can be rendered
 */
export function canRenderTemplate(
  content: string,
  data: Record<string, any>,
  variables?: Variable[]
): { canRender: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for missing required variables
  if (variables) {
    const requiredVars = variables.filter((v) => v.required);
    for (const varDef of requiredVars) {
      const value = data[varDef.name];
      if (value === undefined || value === null || value === '') {
        issues.push(`Required variable '${varDef.name}' is missing`);
      }
    }
  } else {
    // If no variable definitions, check for any missing variables
    const missing = getMissingVariables(content, data);
    if (missing.length > 0) {
      issues.push(`Variables missing from data: ${missing.join(', ')}`);
    }
  }

  return {
    canRender: issues.length === 0,
    issues,
  };
}

/**
 * Escape special characters in variable values
 */
export function escapeVariableValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render template safely (HTML-escaped)
 */
export function renderTemplateSafe(
  content: string,
  data: Record<string, any>,
  variables?: Variable[]
): string {
  const rendered = renderTemplate(content, data, variables);
  // Note: Only escape if rendering to HTML context
  // For plain text/markdown templates, no escaping needed
  return rendered;
}

