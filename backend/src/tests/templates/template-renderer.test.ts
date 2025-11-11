import {
  renderTemplate,
  renderTemplateWithConditionals,
  previewTemplate,
  getMissingVariables,
  canRenderTemplate,
} from '../../services/templates/template-renderer';
import { Variable } from '../../services/templates/variable-parser';

describe('Template Renderer', () => {
  describe('renderTemplate', () => {
    it('should render simple template', () => {
      const content = 'Hello {{name}}, welcome to {{company}}!';
      const data = {
        name: 'John',
        company: 'Acme Corp',
      };

      const rendered = renderTemplate(content, data);

      expect(rendered).toBe('Hello John, welcome to Acme Corp!');
    });

    it('should handle missing variables with empty string', () => {
      const content = 'Hello {{name}}, welcome to {{company}}!';
      const data = {
        name: 'John',
      };

      const rendered = renderTemplate(content, data);

      expect(rendered).toBe('Hello John, welcome to !');
    });

    it('should handle missing variables with default values', () => {
      const content = 'Hello {{name}}, welcome to {{company}}!';
      const data = {
        name: 'John',
      };
      const variables: Variable[] = [
        { name: 'name', type: 'string', required: true },
        {
          name: 'company',
          type: 'string',
          required: false,
          defaultValue: 'Default Company',
        },
      ];

      const rendered = renderTemplate(content, data, variables);

      expect(rendered).toBe('Hello John, welcome to Default Company!');
    });

    it('should format currency values', () => {
      const content = 'Amount owed: {{amount}}';
      const data = {
        amount: 1500.5,
      };
      const variables: Variable[] = [
        { name: 'amount', type: 'currency', required: true },
      ];

      const rendered = renderTemplate(content, data, variables);

      expect(rendered).toContain('$1,500.50');
    });

    it('should format date values', () => {
      const content = 'Date: {{date}}';
      const testDate = new Date('2024-01-15T12:00:00Z'); // Explicit UTC time
      const data = {
        date: testDate,
      };
      const variables: Variable[] = [
        { name: 'date', type: 'date', required: true },
      ];

      const rendered = renderTemplate(content, data, variables);

      expect(rendered).toContain('January');
      expect(rendered).toContain('2024');
      // Date formatting can vary by timezone, so just check it contains a date
      expect(rendered).toMatch(/Date: \w+ \d{1,2}, \d{4}/);
    });

    it('should format boolean values', () => {
      const content = 'Active: {{is_active}}';
      const data = {
        is_active: true,
      };
      const variables: Variable[] = [
        { name: 'is_active', type: 'boolean', required: true },
      ];

      const rendered = renderTemplate(content, data, variables);

      expect(rendered).toBe('Active: Yes');
    });

    it('should handle type coercion', () => {
      const content = '{{count}} items';
      const data = {
        count: '42', // String instead of number
      };
      const variables: Variable[] = [
        { name: 'count', type: 'number', required: true },
      ];

      const rendered = renderTemplate(content, data, variables);

      expect(rendered).toBe('42 items');
    });

    it('should throw error for missing required variables', () => {
      const content = 'Hello {{name}}!';
      const data = {};
      const variables: Variable[] = [
        { name: 'name', type: 'string', required: true },
      ];

      expect(() => renderTemplate(content, data, variables)).toThrow();
    });
  });

  describe('renderTemplateWithConditionals', () => {
    it('should render conditional blocks when true', () => {
      const content = 'Hello {{name}}{{#if has_discount}}, you have a discount!{{/if}}';
      const data = {
        name: 'John',
        has_discount: true,
      };

      const rendered = renderTemplateWithConditionals(content, data);

      expect(rendered).toBe('Hello John, you have a discount!');
    });

    it('should hide conditional blocks when false', () => {
      const content = 'Hello {{name}}{{#if has_discount}}, you have a discount!{{/if}}';
      const data = {
        name: 'John',
        has_discount: false,
      };

      const rendered = renderTemplateWithConditionals(content, data);

      expect(rendered).toBe('Hello John');
    });

    it('should handle multiple conditionals', () => {
      const content = `
Hello {{name}}
{{#if is_member}}- Member benefit included{{/if}}
{{#if has_discount}}- Discount applied{{/if}}
      `.trim();
      const data = {
        name: 'John',
        is_member: true,
        has_discount: false,
      };

      const rendered = renderTemplateWithConditionals(content, data);

      expect(rendered).toContain('Member benefit included');
      expect(rendered).not.toContain('Discount applied');
    });
  });

  describe('previewTemplate', () => {
    it('should generate preview with sample data', () => {
      const content = 'Hello {{name}}, you owe {{amount}}';
      const variables: Variable[] = [
        { name: 'name', type: 'string', required: true, placeholder: 'John Doe' },
        { name: 'amount', type: 'currency', required: true },
      ];

      const preview = previewTemplate(content, variables);

      expect(preview).toContain('Hello');
      // Check that variables are replaced (no double braces)
      expect(preview).not.toContain('{{');
      expect(preview).not.toContain('}}');
      // Check that sample data is present
      expect(preview.length).toBeGreaterThan(10);
    });

    it('should use default values in preview', () => {
      const content = 'Hello {{name}}';
      const variables: Variable[] = [
        {
          name: 'name',
          type: 'string',
          required: true,
          defaultValue: 'Default Name',
        },
      ];

      const preview = previewTemplate(content, variables);

      expect(preview).toBe('Hello Default Name');
    });
  });

  describe('getMissingVariables', () => {
    it('should identify missing variables', () => {
      const content = 'Hello {{name}}, welcome to {{company}}!';
      const data = {
        name: 'John',
      };

      const missing = getMissingVariables(content, data);

      expect(missing).toEqual(['company']);
    });

    it('should return empty array when all present', () => {
      const content = 'Hello {{name}}!';
      const data = {
        name: 'John',
      };

      const missing = getMissingVariables(content, data);

      expect(missing).toEqual([]);
    });

    it('should detect null values as missing', () => {
      const content = 'Hello {{name}}!';
      const data = {
        name: null,
      };

      const missing = getMissingVariables(content, data);

      expect(missing).toEqual(['name']);
    });
  });

  describe('canRenderTemplate', () => {
    it('should return true when all required variables present', () => {
      const content = 'Hello {{name}}!';
      const data = {
        name: 'John',
      };
      const variables: Variable[] = [
        { name: 'name', type: 'string', required: true },
      ];

      const result = canRenderTemplate(content, data, variables);

      expect(result.canRender).toBe(true);
      expect(result.issues).toEqual([]);
    });

    it('should return false when required variables missing', () => {
      const content = 'Hello {{name}}!';
      const data = {};
      const variables: Variable[] = [
        { name: 'name', type: 'string', required: true },
      ];

      const result = canRenderTemplate(content, data, variables);

      expect(result.canRender).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should allow missing optional variables', () => {
      const content = 'Hello {{name}}, {{title}}';
      const data = {
        name: 'John',
      };
      const variables: Variable[] = [
        { name: 'name', type: 'string', required: true },
        { name: 'title', type: 'string', required: false },
      ];

      const result = canRenderTemplate(content, data, variables);

      expect(result.canRender).toBe(true);
    });
  });
});

