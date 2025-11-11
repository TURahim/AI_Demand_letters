import { Request, Response } from 'express';
import * as generationService from './generation.service';
import * as refinementService from './refinement.service';
import { trackAIUsage, calculateUsageCost, checkUsageLimits } from './usage-tracker';
import {
  generateLetterSchema,
  refineLetterSchema,
  adjustToneSchema,
  analyzeDocumentsSchema,
  provideFeedbackSchema,
} from './ai.validation';
import { asyncHandler } from '../../middleware/async-handler';
import { BEDROCK_CONFIG } from './bedrock.config';
import logger from '../../utils/logger';

/**
 * Generate demand letter
 * POST /api/v1/ai/generate
 */
export const generateLetter = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Generate letter request', { userId, firmId });

  // Check usage limits
  const limitsCheck = await checkUsageLimits(firmId, userId);
  if (!limitsCheck.withinLimits) {
    res.status(429).json({
      status: 'error',
      message: limitsCheck.message || 'Usage limits exceeded',
      data: {
        currentUsage: limitsCheck.currentUsage,
        limits: limitsCheck.limits,
      },
    });
    return;
  }

  // Validate input
  const validatedData = generateLetterSchema.parse(req.body);

  // Generate letter
  const result = await generationService.generateDemandLetter({
    ...validatedData,
    firmId,
  });

  // Calculate cost
  const cost = calculateUsageCost(
    result.usage.inputTokens,
    result.usage.outputTokens,
    BEDROCK_CONFIG.modelId
  );

  // Track usage
  await trackAIUsage({
    userId,
    firmId,
    operationType: 'generate',
    modelId: result.metadata.modelId,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cost,
    requestId: result.metadata.requestId,
    metadata: {
      caseType: validatedData.caseType,
      documentCount: validatedData.documentIds?.length || 0,
    },
  });

  res.status(200).json({
    status: 'success',
    message: 'Demand letter generated successfully',
    data: {
      letter: result.letter,
      usage: result.usage,
      cost,
      metadata: result.metadata,
    },
  });
});

/**
 * Refine demand letter
 * POST /api/v1/ai/refine
 */
export const refineLetter = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Refine letter request', { userId, firmId });

  // Check usage limits
  const limitsCheck = await checkUsageLimits(firmId, userId);
  if (!limitsCheck.withinLimits) {
    res.status(429).json({
      status: 'error',
      message: limitsCheck.message || 'Usage limits exceeded',
    });
    return;
  }

  // Validate input
  const validatedData = refineLetterSchema.parse(req.body);

  // Refine letter
  const result = await refinementService.refineLetter(validatedData);

  // Calculate cost
  const cost = calculateUsageCost(
    result.usage.inputTokens,
    result.usage.outputTokens,
    BEDROCK_CONFIG.modelId
  );

  // Track usage
  await trackAIUsage({
    userId,
    firmId,
    operationType: 'refine',
    modelId: result.metadata.modelId,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cost,
    requestId: result.metadata.requestId,
  });

  res.status(200).json({
    status: 'success',
    message: 'Letter refined successfully',
    data: {
      refinedLetter: result.refinedLetter,
      usage: result.usage,
      cost,
      metadata: result.metadata,
    },
  });
});

/**
 * Adjust letter tone
 * POST /api/v1/ai/adjust-tone
 */
export const adjustTone = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Adjust tone request', { userId, firmId });

  // Check usage limits
  const limitsCheck = await checkUsageLimits(firmId, userId);
  if (!limitsCheck.withinLimits) {
    res.status(429).json({
      status: 'error',
      message: limitsCheck.message || 'Usage limits exceeded',
    });
    return;
  }

  // Validate input
  const validatedData = adjustToneSchema.parse(req.body);

  // Adjust tone
  const result = await refinementService.adjustTone(validatedData);

  // Calculate cost
  const cost = calculateUsageCost(
    result.usage.inputTokens,
    result.usage.outputTokens,
    BEDROCK_CONFIG.modelId
  );

  // Track usage
  await trackAIUsage({
    userId,
    firmId,
    operationType: 'tone_adjust',
    modelId: result.metadata.modelId,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cost,
    requestId: result.metadata.requestId,
    metadata: {
      requestedTone: validatedData.requestedTone,
    },
  });

  res.status(200).json({
    status: 'success',
    message: 'Tone adjusted successfully',
    data: {
      adjustedLetter: result.adjustedLetter,
      usage: result.usage,
      cost,
      metadata: result.metadata,
    },
  });
});

/**
 * Analyze documents
 * POST /api/v1/ai/analyze-documents
 */
export const analyzeDocuments = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Analyze documents request', { userId, firmId });

  // Check usage limits
  const limitsCheck = await checkUsageLimits(firmId, userId);
  if (!limitsCheck.withinLimits) {
    res.status(429).json({
      status: 'error',
      message: limitsCheck.message || 'Usage limits exceeded',
    });
    return;
  }

  // Validate input
  const validatedData = analyzeDocumentsSchema.parse(req.body);

  // Analyze documents
  const result = await generationService.analyzeDocuments(
    validatedData.documentIds,
    firmId,
    validatedData.analysisType
  );

  // Calculate cost
  const cost = calculateUsageCost(
    result.usage.inputTokens,
    result.usage.outputTokens,
    BEDROCK_CONFIG.modelId
  );

  // Track usage
  await trackAIUsage({
    userId,
    firmId,
    operationType: 'analyze',
    modelId: BEDROCK_CONFIG.modelId,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cost,
    documentIds: validatedData.documentIds,
    metadata: {
      analysisType: validatedData.analysisType,
    },
  });

  res.status(200).json({
    status: 'success',
    message: 'Documents analyzed successfully',
    data: {
      analysis: result.analysis,
      usage: result.usage,
      cost,
    },
  });
});

/**
 * Provide feedback on draft
 * POST /api/v1/ai/feedback
 */
export const provideFeedback = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Provide feedback request', { userId, firmId });

  // Check usage limits
  const limitsCheck = await checkUsageLimits(firmId, userId);
  if (!limitsCheck.withinLimits) {
    res.status(429).json({
      status: 'error',
      message: limitsCheck.message || 'Usage limits exceeded',
    });
    return;
  }

  // Validate input
  const validatedData = provideFeedbackSchema.parse(req.body);

  // Provide feedback
  const result = await refinementService.provideFeedback(validatedData.draft);

  // Calculate cost
  const cost = calculateUsageCost(
    result.usage.inputTokens,
    result.usage.outputTokens,
    BEDROCK_CONFIG.modelId
  );

  // Track usage
  await trackAIUsage({
    userId,
    firmId,
    operationType: 'feedback',
    modelId: BEDROCK_CONFIG.modelId,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    cost,
  });

  res.status(200).json({
    status: 'success',
    message: 'Feedback generated successfully',
    data: {
      feedback: result.feedback,
      suggestions: result.suggestions,
      strengths: result.strengths,
      improvements: result.improvements,
      usage: result.usage,
      cost,
    },
  });
});

