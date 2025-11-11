/**
 * Analytics Controller
 * Handles HTTP requests for analytics endpoints
 */

import { Request, Response } from 'express';
import { z } from 'zod';
import analyticsService from './analytics.service';
import { asyncHandler } from '../../middleware/async-handler';
import logger from '../../utils/logger';

// Validation schemas
const usageStatsSchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard metrics for the authenticated user's firm
 */
export const getDashboardMetrics = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.user!.firmId;

  logger.info('Fetching dashboard metrics', { firmId, userId: req.user!.id });

  const metrics = await analyticsService.getDashboardMetrics(firmId);

  res.status(200).json({
    status: 'success',
    message: 'Dashboard metrics retrieved successfully',
    data: { metrics },
  });
});

/**
 * GET /api/analytics/usage
 * Get usage statistics for the authenticated user's firm
 */
export const getUsageStatistics = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.user!.firmId;
  const { days } = usageStatsSchema.parse(req.query);

  logger.info('Fetching usage statistics', { firmId, userId: req.user!.id, days });

  const statistics = await analyticsService.getUsageStatistics(firmId, days);

  res.status(200).json({
    status: 'success',
    message: 'Usage statistics retrieved successfully',
    data: { statistics },
  });
});

/**
 * GET /api/analytics/firm-stats
 * Get firm-wide statistics (admin/partner only)
 */
export const getFirmStatistics = asyncHandler(async (req: Request, res: Response) => {
  const firmId = req.user!.firmId;

  logger.info('Fetching firm statistics', { firmId, userId: req.user!.id });

  const statistics = await analyticsService.getFirmStatistics(firmId);

  res.status(200).json({
    status: 'success',
    message: 'Firm statistics retrieved successfully',
    data: { statistics },
  });
});

