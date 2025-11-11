import {
  parseVariables,
  validateRequiredVariables,
  parseVariablesWithTypes,
  hasValidSyntax,
  getVariableStats,
} from '../../services/templates/variable-parser';

describe('Variable Parser', () => {
  describe('parseVariables', () => {
    it('should parse simple variables', () => {
      const content = 'Hello {{name}}, welcome to {{company}}!';
      const variables = parseVariables(content);

      expect(variables).toEqual(['name', 'company']);
    });

    it('should handle no variables', () => {
      const content = 'Hello world!';
      const variables = parseVariables(content);

      expect(variables).toEqual([]);
    });

    it('should handle duplicate variables', () => {
      const content = '{{name}} and {{name}} are friends';
      const variables = parseVariables(content);

      expect(variables).toEqual(['name']);
    });

    it('should trim whitespace from variable names', () => {
      const content = '{{ name }} and {{ company }}';
      const variables = parseVariables(content);

      expect(variables).toEqual(['name', 'company']);
    });

    it('should handle variables with underscores', () => {
      const content = '{{client_name}} and {{case_number}}';
      const variables = parseVariables(content);

      expect(variables).toEqual(['client_name', 'case_number']);
    });
  });

  describe('validateRequiredVariables', () => {
    it('should validate all required variables present', () => {
      const content = 'Dear {{client_name}}, your case {{case_number}} is ready.';
      const required = ['client_name', 'case_number'];

      const result = validateRequiredVariables(content, required);

      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing required variables', () => {
      const content = 'Dear {{client_name}}, your case is ready.';
      const required = ['client_name', 'case_number'];

      const result = validateRequiredVariables(content, required);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['case_number']);
    });
  });

  describe('parseVariablesWithTypes', () => {
    it('should parse variables with type hints', () => {
      const content = '{{name:string}} owes {{amount:currency}} as of {{date:date}}';
      const variables = parseVariablesWithTypes(content);

      expect(variables).toHaveLength(3);
      expect(variables[0]).toMatchObject({
        name: 'name',
        type: 'string',
        required: true,
      });
      expect(variables[1]).toMatchObject({
        name: 'amount',
        type: 'currency',
        required: true,
      });
      expect(variables[2]).toMatchObject({
        name: 'date',
        type: 'date',
        required: true,
      });
    });

    it('should default to string type when no hint provided', () => {
      const content = '{{name}}';
      const variables = parseVariablesWithTypes(content);

      expect(variables[0].type).toBe('string');
    });

    it('should parse number type hints', () => {
      const content = '{{count:number}} items';
      const variables = parseVariablesWithTypes(content);

      expect(variables[0].type).toBe('number');
    });

    it('should parse boolean type hints', () => {
      const content = '{{is_active:boolean}}';
      const variables = parseVariablesWithTypes(content);

      expect(variables[0].type).toBe('boolean');
    });
  });

  describe('hasValidSyntax', () => {
    it('should validate correct syntax', () => {
      const content = 'Hello {{name}}, welcome!';
      const result = hasValidSyntax(content);

      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect mismatched brackets', () => {
      const content = 'Hello {{name}, welcome!';
      const result = hasValidSyntax(content);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect nested variables', () => {
      const content = 'Hello {{name {{nested}}}}, welcome!';
      const result = hasValidSyntax(content);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Nested variables are not supported');
    });

    it('should detect empty variables', () => {
      const content = 'Hello {{  }}, welcome!';
      const result = hasValidSyntax(content);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty variable placeholders found');
    });

    it('should handle multiple syntax errors', () => {
      const content = 'Hello {{ }} and {{unclosed';
      const result = hasValidSyntax(content);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('getVariableStats', () => {
    it('should count variable usage', () => {
      const content = '{{name}} is friends with {{name}} and {{company}}';
      const stats = getVariableStats(content);

      expect(stats['name'].count).toBe(2);
      expect(stats['company'].count).toBe(1);
    });

    it('should track variable positions', () => {
      const content = '{{name}} and {{company}}';
      const stats = getVariableStats(content);

      expect(stats['name'].positions).toHaveLength(1);
      expect(stats['company'].positions).toHaveLength(1);
      expect(stats['name'].positions[0]).toBeLessThan(
        stats['company'].positions[0]
      );
    });

    it('should handle no variables', () => {
      const content = 'Hello world!';
      const stats = getVariableStats(content);

      expect(Object.keys(stats)).toHaveLength(0);
    });
  });
});

