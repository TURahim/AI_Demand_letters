import { z } from 'zod';
import { ExportFormat } from '@prisma/client';

/**
 * Export request schema
 */
export const exportRequestSchema = z.object({
  format: z.nativeEnum(ExportFormat).default('DOCX'),
  includeHeader: z.boolean().optional().default(true),
  includeFooter: z.boolean().optional().default(true),
  firmBranding: z.boolean().optional().default(true),
});

export type ExportRequestInput = z.infer<typeof exportRequestSchema>;

