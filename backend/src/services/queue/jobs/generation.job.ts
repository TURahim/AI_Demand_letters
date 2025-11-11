/**
 * Letter generation job data types
 */

export interface LetterGenerationJobData {
  letterId: string;
  firmId: string;
  userId: string;
  
  // Case information
  caseType: string;
  incidentDate: string | Date;
  incidentDescription: string;
  location?: string;

  // Parties
  clientName: string;
  clientContact?: string;
  defendantName: string;
  defendantAddress?: string;

  // Damages
  damages?: {
    medical?: number;
    lostWages?: number;
    propertyDamage?: number;
    painAndSuffering?: number;
    other?: Record<string, number>;
    itemizedMedical?: Array<{ description: string; amount: number }>;
    notes?: string;
  };

  // Supporting documents
  documentIds?: string[];

  // Template
  templateId?: string;
  templateContent?: string;

  // Customization
  specialInstructions?: string;
  tone?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LetterGenerationJobResult {
  success: boolean;
  letterId: string;
  content: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost?: number;
  error?: string | StructuredGenerationError;
  generatedAt: Date;
}

export interface StructuredGenerationError {
  title: string;
  reason: string;
  probableCause: string;
  suggestedAction: string;
}

