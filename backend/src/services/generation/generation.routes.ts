import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as generationController from './generation.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { auditMiddleware, AUDITED_ACTIONS } from '../../middleware/audit-logger';

const router = Router();

// All generation routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/generation/start
 * Start letter generation
 */
router.post(
  '/start',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_CREATE, 'Letter'),
  generationController.startGeneration
);

/**
 * GET /api/v1/generation/:jobId/status
 * Get generation status
 */
router.get(
  '/:jobId/status',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE, UserRole.PARALEGAL),
  generationController.getGenerationStatus
);

/**
 * POST /api/v1/generation/:jobId/cancel
 * Cancel generation
 */
router.post(
  '/:jobId/cancel',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_DELETE, 'Letter'),
  generationController.cancelGeneration
);

export default router;

