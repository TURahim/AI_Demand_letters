import { Request, Response } from 'express';
import * as generationService from './generation.service';
import { startGenerationSchema } from './generation.validation';
import { asyncHandler } from '../../middleware/async-handler';
import logger from '../../utils/logger';

/**
 * Start letter generation
 * POST /api/v1/generation/start
 */
export const startGeneration = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Start generation request', { userId, firmId, body: req.body });

  // Validate input
  try {
    const validatedData = startGenerationSchema.parse(req.body);
    
    // Start generation
    const result = await generationService.startLetterGeneration({
      ...validatedData,
      firmId,
      userId,
    });

    res.status(202).json({
      status: 'success',
      message: 'Letter generation started',
      data: result,
    });
  } catch (error: any) {
    if (error instanceof Error && 'issues' in error) {
      logger.warn('Generation validation error', {
        error: error.message,
        issues: (error as any).issues,
        body: req.body,
      });
    } else {
      logger.error('Unexpected generation error', { error: error?.message, body: req.body });
    }
    throw error;
  }
});

/**
 * Get generation status
 * GET /api/v1/generation/:jobId/status
 */
export const getGenerationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;

  logger.info('Get generation status', { jobId });

  const status = await generationService.getGenerationStatus(jobId);

  res.status(200).json({
    status: 'success',
    message: 'Generation status retrieved',
    data: status,
  });
});

/**
 * Cancel generation
 * POST /api/v1/generation/:jobId/cancel
 */
export const cancelGeneration = asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  const userId = req.user!.id;
  const firmId = req.user!.firmId;

  logger.info('Cancel generation request', { jobId, userId, firmId });

  await generationService.cancelGeneration(jobId, firmId, userId);

  res.status(200).json({
    status: 'success',
    message: 'Generation cancelled',
    data: null,
  });
});

