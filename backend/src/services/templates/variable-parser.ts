import logger from '../../utils/logger';

/**
 * Variable definition interface
 */
export interface Variable {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'currency';
  required: boolean;
  defaultValue?: any;
  description?: string;
  placeholder?: string;
}

/**
 * Parse variables from template content
 * Extracts {{variable_name}} patterns
 */
export function parseVariables(content: string): string[] {
  const variablePattern = /\{\{([^}]+)\}\}/g;
  const matches = content.matchAll(variablePattern);
  const variables = new Set<string>();

  for (const match of matches) {
    const variableName = match[1].trim();
    variables.add(variableName);
  }

  logger.debug('Variables parsed from template', {
    count: variables.size,
    variables: Array.from(variables),
  });

  return Array.from(variables);
}

/**
 * Validate that all required variables are present in content
 */
export function validateRequiredVariables(
  content: string,
  requiredVariables: string[]
): { valid: boolean; missing: string[] } {
  const contentVariables = parseVariables(content);
  const missing = requiredVariables.filter(
    (varName) => !contentVariables.includes(varName)
  );

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get variable metadata from content with type hints
 * Supports syntax: {{variable_name:type}}
 */
export function parseVariablesWithTypes(content: string): Variable[] {
  const variablePattern = /\{\{([^}:]+)(?::([^}]+))?\}\}/g;
  const matches = content.matchAll(variablePattern);
  const variablesMap = new Map<string, Variable>();

  for (const match of matches) {
    const variableName = match[1].trim();
    const typeHint = match[2]?.trim();

    if (!variablesMap.has(variableName)) {
      variablesMap.set(variableName, {
        name: variableName,
        type: parseTypeHint(typeHint) || 'string',
        required: true,
      });
    }
  }

  return Array.from(variablesMap.values());
}

/**
 * Parse type hint from variable syntax
 */
function parseTypeHint(
  hint?: string
): 'string' | 'number' | 'date' | 'boolean' | 'currency' | undefined {
  if (!hint) return undefined;

  const lowerHint = hint.toLowerCase();

  if (lowerHint.includes('number') || lowerHint.includes('int')) return 'number';
  if (lowerHint.includes('date')) return 'date';
  if (lowerHint.includes('bool')) return 'boolean';
  if (lowerHint.includes('currency') || lowerHint.includes('money')) return 'currency';

  return 'string';
}

/**
 * Extract variable definitions from structured template metadata
 */
export function extractVariableDefinitions(
  content: string,
  metadata?: any
): Variable[] {
  const parsedVars = parseVariablesWithTypes(content);

  // If metadata contains variable definitions, merge them
  if (metadata?.variables && Array.isArray(metadata.variables)) {
    const metadataVars = metadata.variables as Variable[];
    const varsMap = new Map(parsedVars.map((v) => [v.name, v]));

    // Merge metadata definitions
    for (const metaVar of metadataVars) {
      if (varsMap.has(metaVar.name)) {
        // Update existing with metadata
        varsMap.set(metaVar.name, {
          ...varsMap.get(metaVar.name)!,
          ...metaVar,
        });
      } else {
        // Add new from metadata
        varsMap.set(metaVar.name, metaVar);
      }
    }

    return Array.from(varsMap.values());
  }

  return parsedVars;
}

/**
 * Check if template has valid variable syntax
 */
export function hasValidSyntax(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check for unclosed variables
  const openCount = (content.match(/\{\{/g) || []).length;
  const closeCount = (content.match(/\}\}/g) || []).length;

  if (openCount !== closeCount) {
    errors.push(
      `Mismatched variable brackets: ${openCount} opening, ${closeCount} closing`
    );
  }

  // Check for nested variables (not supported)
  const nestedPattern = /\{\{[^}]*\{\{/g;
  if (nestedPattern.test(content)) {
    errors.push('Nested variables are not supported');
  }

  // Check for empty variables
  const emptyPattern = /\{\{\s*\}\}/g;
  if (emptyPattern.test(content)) {
    errors.push('Empty variable placeholders found');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get variable usage statistics
 */
export function getVariableStats(content: string): Record<
  string,
  {
    count: number;
    positions: number[];
  }
> {
  const variablePattern = /\{\{([^}]+)\}\}/g;
  const stats: Record<string, { count: number; positions: number[] }> = {};

  let match;
  while ((match = variablePattern.exec(content)) !== null) {
    const variableName = match[1].trim();

    if (!stats[variableName]) {
      stats[variableName] = { count: 0, positions: [] };
    }

    stats[variableName].count++;
    stats[variableName].positions.push(match.index);
  }

  return stats;
}

