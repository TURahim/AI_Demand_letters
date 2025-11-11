import { z } from 'zod';

/**
 * Start generation validation schema
 */
export const startGenerationSchema = z.object({
  // Case information
  caseType: z.string().min(1, 'Case type is required'),
  incidentDate: z.string().or(z.date()),
  incidentDescription: z.string().min(10, 'Incident description must be at least 10 characters'),
  location: z.string().optional(),

  // Parties
  clientName: z.string().min(1, 'Client name is required'),
  clientContact: z.string().optional(),
  defendantName: z.string().min(1, 'Defendant name is required'),
  defendantAddress: z.string().min(1, 'Defendant address is required'),

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
  }),

  // Supporting documents
  documentIds: z.array(z.string()).optional(),

  // Template
  templateId: z.string().optional(),

  // Letter details
  title: z.string().optional(),
  recipientName: z.string().optional(),
  recipientAddress: z.string().optional(),
  caseReference: z.string().optional(),

  // Customization
  specialInstructions: z.string().optional(),
  tone: z.enum(['professional', 'assertive', 'diplomatic', 'urgent']).optional(),
  temperature: z.number().min(0).max(1).optional(),
  maxTokens: z.number().min(100).max(4096).optional(),
});

export type StartGenerationInput = z.infer<typeof startGenerationSchema>;

