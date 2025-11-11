/**
 * Analytics Routes
 * Defines API routes for analytics endpoints
 */

import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { UserRole } from '@prisma/client';
import * as analyticsController from './analytics.controller';

const router = Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get dashboard metrics
 * @access  Private (All roles)
 */
router.get('/dashboard', analyticsController.getDashboardMetrics);

/**
 * @route   GET /api/v1/analytics/usage
 * @desc    Get usage statistics
 * @access  Private (All roles)
 */
router.get('/usage', analyticsController.getUsageStatistics);

/**
 * @route   GET /api/v1/analytics/firm-stats
 * @desc    Get firm-wide statistics
 * @access  Private (Admin, Partner only)
 */
router.get(
  '/firm-stats',
  authorize(UserRole.ADMIN, UserRole.PARTNER),
  analyticsController.getFirmStatistics
);

export default router;

