import { z } from 'zod';

/**
 * Generate demand letter validation schema
 */
export const generateLetterSchema = z.object({
  // Case information
  caseType: z.string().min(1, 'Case type is required'),
  incidentDate: z.string().or(z.date()),
  incidentDescription: z.string().min(10, 'Incident description must be at least 10 characters'),
  location: z.string().optional(),

  // Parties
  clientName: z.string().min(1, 'Client name is required'),
  clientContact: z.string().optional(),
  defendantName: z.string().min(1, 'Defendant name is required'),
  defendantAddress: z.string().min(1, 'Defendant address is required').optional(),

  // Damages
  damages: z.object({
    medical: z.number().min(0).optional(),
    lostWages: z.number().min(0).optional(),
    propertyDamage: z.number().min(0).optional(),
    painAndSuffering: z.number().min(0).optional(),
    other: z.record(z.number().min(0)).optional(),
    itemizedMedical: z.array(z.object({
      description: z.string(),
      amount: z.number().min(0),
    })).optional(),
    notes: z.string().optional(),
  }).optional().default({}),

  // Supporting documents
  documentIds: z.array(z.string()).optional(),

  // Template and customization
  templateContent: z.string().optional(),
  specialInstructions: z.string().optional(),
  tone: z.enum(['professional', 'firm', 'conciliatory', 'assertive', 'diplomatic', 'urgent']).optional(),

  // Generation options
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(4096).optional(),
});

export type GenerateLetterInput = z.infer<typeof generateLetterSchema>;

/**
 * Refine letter validation schema
 */
export const refineLetterSchema = z.object({
  originalDraft: z.string().min(1, 'Original draft is required'),
  refinementInstructions: z.string().min(1, 'Refinement instructions are required'),
  specificChanges: z.string().optional(),
  additionalContext: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(4096).optional(),
});

export type RefineLetterInput = z.infer<typeof refineLetterSchema>;

/**
 * Adjust tone validation schema
 */
export const adjustToneSchema = z.object({
  currentDraft: z.string().min(1, 'Current draft is required'),
  requestedTone: z.enum(['professional', 'firm', 'conciliatory', 'assertive', 'diplomatic', 'urgent']),
  toneGuidelines: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(4096).optional(),
});

export type AdjustToneInput = z.infer<typeof adjustToneSchema>;

/**
 * Analyze documents validation schema
 */
export const analyzeDocumentsSchema = z.object({
  documentIds: z.array(z.string()).min(1, 'At least one document ID is required'),
  analysisType: z.enum(['summary', 'damages', 'timeline', 'liability']).default('summary'),
});

export type AnalyzeDocumentsInput = z.infer<typeof analyzeDocumentsSchema>;

/**
 * Provide feedback validation schema
 */
export const provideFeedbackSchema = z.object({
  draft: z.string().min(1, 'Draft is required'),
});

export type ProvideFeedbackInput = z.infer<typeof provideFeedbackSchema>;

