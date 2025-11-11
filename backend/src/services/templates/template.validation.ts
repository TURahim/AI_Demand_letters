import { z } from 'zod';

// Variable schema
export const variableSchema = z.object({
  name: z.string().min(1, 'Variable name is required').max(50),
  type: z.enum(['string', 'number', 'date', 'boolean', 'currency']),
  required: z.boolean().default(false),
  defaultValue: z.any().optional(),
  description: z.string().optional(),
  placeholder: z.string().optional(),
});

// Create template schema
export const createTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required').max(255),
  description: z.string().optional(),
  category: z.string().optional(),
  content: z.any(), // JSON content (structured template)
  variables: z.array(variableSchema).optional(),
  isPublic: z.boolean().default(false),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// Update template schema
export const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  content: z.any().optional(),
  variables: z.array(variableSchema).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// Render template schema
export const renderTemplateSchema = z.object({
  data: z.record(z.any()),
});

export type RenderTemplateInput = z.infer<typeof renderTemplateSchema>;

// Clone template schema
export const cloneTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export type CloneTemplateInput = z.infer<typeof cloneTemplateSchema>;

