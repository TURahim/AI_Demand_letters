import { z } from 'zod';

/**
 * Update letter validation schema
 */
export const updateLetterSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.any().optional(),
  recipientName: z.string().optional(),
  recipientAddress: z.string().optional(),
  caseReference: z.string().optional(),
  status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED', 'SENT', 'ARCHIVED']).optional(),
  metadata: z.any().optional(),
});

export type UpdateLetterInput = z.infer<typeof updateLetterSchema>;

