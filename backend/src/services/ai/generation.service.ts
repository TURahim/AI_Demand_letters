import { bedrockClient, ClaudeMessage } from './bedrock.client';
import {
  buildSystemPrompt,
  buildDemandLetterPrompt,
  buildDocumentAnalysisPrompt,
  validatePromptVariables,
} from './prompt-builder';
import {
  buildContextFromDocuments,
  buildCaseSummary,
  buildDamagesBreakdown,
  buildPartyInfo,
  validateContextSize,
} from './context-builder';
import { getModelLimits } from './bedrock.config';
import { AppError } from '../../middleware/error-handler';
import logger from '../../utils/logger';

/**
 * Generate demand letter from inputs
 */
export async function generateDemandLetter(input: {
  // Case information
  caseType: string;
  incidentDate: string | Date;
  incidentDescription: string;
  location?: string;

  // Parties
  clientName: string;
  clientContact?: string;
  defendantName: string;
  defendantAddress: string;

  // Damages
  damages: {
    medical?: number;
    lostWages?: number;
    propertyDamage?: number;
    painAndSuffering?: number;
    other?: Record<string, number>;
    itemizedMedical?: Array<{ description: string; amount: number }>;
  };

  // Supporting documents
  documentIds?: string[];
  firmId: string;

  // Template and customization
  templateContent?: string;
  specialInstructions?: string;
  tone?: string;
  
  // Generation options
  temperature?: number;
  maxTokens?: number;
}): Promise<{
  letter: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  metadata: {
    modelId: string;
    requestId: string;
    generatedAt: Date;
  };
}> {
  try {
    // Validate required fields
    const validation = validatePromptVariables(input, [
      'caseType',
      'incidentDate',
      'incidentDescription',
      'clientName',
      'defendantName',
      'defendantAddress',
    ]);

    if (!validation.valid) {
      throw new AppError(
        `Missing required fields: ${validation.missing.join(', ')}`,
        400
      );
    }

    logger.info('Generating demand letter', {
      caseType: input.caseType,
      clientName: input.clientName,
      defendantName: input.defendantName,
      hasDocuments: !!input.documentIds?.length,
    });

    // Build context from documents
    const documentsContext = input.documentIds && input.documentIds.length > 0
      ? await buildContextFromDocuments(input.documentIds, input.firmId)
      : 'No supporting documents provided.';

    // Build case summary
    const caseSummary = buildCaseSummary({
      caseType: input.caseType,
      incidentDate: input.incidentDate,
      incidentDescription: input.incidentDescription,
      location: input.location,
    });

    // Build damages breakdown
    const damagesBreakdown = buildDamagesBreakdown(input.damages);

    // Build party information
    const clientInfo = buildPartyInfo({
      name: input.clientName,
    });
    
    const defendantInfo = buildPartyInfo({
      name: input.defendantName,
      address: input.defendantAddress,
    });

    // Build main prompt
    const userPrompt = await buildDemandLetterPrompt({
      caseInfo: caseSummary,
      clientName: clientInfo,
      clientContact: input.clientContact || 'To be provided',
      defendantName: input.defendantName,
      defendantAddress: defendantInfo,
      templateInstructions: input.templateContent || 'Use standard demand letter format',
      documentsSummary: documentsContext,
      damagesBreakdown,
      specialInstructions: input.specialInstructions,
    });

    // Validate context size
    const limits = getModelLimits();
    const contextValidation = validateContextSize(userPrompt, limits.maxInputTokens);
    
    if (!contextValidation.valid) {
      throw new AppError(
        `Input context too large: ${contextValidation.currentTokens} tokens (max: ${contextValidation.maxTokens})`,
        400
      );
    }

    // Get system prompt
    const systemPrompt = await buildSystemPrompt();

    // Prepare messages
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    // Invoke model
    const response = await bedrockClient.invoke(messages, {
      system: systemPrompt,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    });

    logger.info('Demand letter generated successfully', {
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
      letterLength: response.text.length,
    });

    return {
      letter: response.text,
      usage: response.usage,
      metadata: {
        modelId: response.metadata.modelId,
        requestId: response.metadata.requestId,
        generatedAt: new Date(),
      },
    };
  } catch (error: any) {
    logger.error('Demand letter generation failed', {
      error: error.message,
      caseType: input.caseType,
    });
    throw error;
  }
}

/**
 * Analyze documents for key information
 */
export async function analyzeDocuments(
  documentIds: string[],
  firmId: string,
  analysisType: 'summary' | 'damages' | 'timeline' | 'liability' = 'summary'
): Promise<{
  analysis: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}> {
  try {
    if (!documentIds || documentIds.length === 0) {
      throw new AppError('No documents provided for analysis', 400);
    }

    logger.info('Analyzing documents', {
      documentCount: documentIds.length,
      analysisType,
      firmId,
    });

    // Build context
    const documentsContext = await buildContextFromDocuments(
      documentIds,
      firmId,
      getModelLimits().maxInputTokens * 0.5 // Use 50% of input limit
    );

    // Build analysis prompt
    const userPrompt = await buildDocumentAnalysisPrompt({
      documentContent: documentsContext,
      analysisType,
    });

    // Prepare messages
    const messages: ClaudeMessage[] = [
      {
        role: 'user',
        content: userPrompt,
      },
    ];

    // Invoke model
    const response = await bedrockClient.invoke(messages, {
      temperature: 0.3, // Lower temperature for more focused analysis
    });

    logger.info('Document analysis completed', {
      analysisType,
      inputTokens: response.usage.inputTokens,
      outputTokens: response.usage.outputTokens,
    });

    return {
      analysis: response.text,
      usage: response.usage,
    };
  } catch (error: any) {
    logger.error('Document analysis failed', {
      error: error.message,
      analysisType,
      documentCount: documentIds.length,
    });
    throw error;
  }
}

