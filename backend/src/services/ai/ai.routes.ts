import { Router } from 'express';
import { UserRole } from '@prisma/client';
import * as aiController from './ai.controller';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';
import { auditMiddleware, AUDITED_ACTIONS } from '../../middleware/audit-logger';

const router = Router();

// All AI routes require authentication
router.use(authenticate);

/**
 * POST /api/v1/ai/generate
 * Generate demand letter from inputs
 */
router.post(
  '/generate',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_CREATE, 'Letter'),
  aiController.generateLetter
);

/**
 * POST /api/v1/ai/refine
 * Refine existing demand letter
 */
router.post(
  '/refine',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_UPDATE, 'Letter'),
  aiController.refineLetter
);

/**
 * POST /api/v1/ai/adjust-tone
 * Adjust tone of demand letter
 */
router.post(
  '/adjust-tone',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_UPDATE, 'Letter'),
  aiController.adjustTone
);

/**
 * POST /api/v1/ai/analyze-documents
 * Analyze uploaded documents
 */
router.post(
  '/analyze-documents',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_UPDATE, 'Document'),
  aiController.analyzeDocuments
);

/**
 * POST /api/v1/ai/feedback
 * Get feedback on draft letter
 */
router.post(
  '/feedback',
  authorize(UserRole.ADMIN, UserRole.PARTNER, UserRole.ASSOCIATE),
  auditMiddleware(AUDITED_ACTIONS.LETTER_UPDATE, 'Letter'),
  aiController.provideFeedback
);

export default router;

